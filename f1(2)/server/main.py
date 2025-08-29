from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import json
from typing import Dict, List, Optional, Any
from urllib.parse import unquote

app = FastAPI(title="F1 Scoring MVP")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


DEFAULT_SCHEMA = {
    "points": {1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1},
    "pole": 0,
    "fastest_lap": 1,
    "cutoff": 10,
    "fastest_lap_requires_cutoff": True
}


with open("data.json", "r") as f:
    SEASON_DATA = json.load(f)

def compute_race_points(results: List[Dict], schema: Dict) -> Dict[str, int]:
    """Compute points for a single race"""
    driver_points = {}
    
    for result in results:
        driver = result["driver_code"]
        position = result["position"]
        got_pole = result["got_pole"]
        got_fastest_lap = result["got_fastest_lap"]
        
        points = 0
        
        # Position points
        if position is not None and position <= schema["cutoff"]:
            points += schema["points"].get(position, 0)
        
        # Pole bonus
        if got_pole and schema["pole"] > 0:
            points += schema["pole"]
        
        # Fastest lap bonus
        if got_fastest_lap and schema["fastest_lap"] > 0:
            if not schema["fastest_lap_requires_cutoff"] or (position is not None and position <= schema["cutoff"]):
                points += schema["fastest_lap"]
        
        driver_points[driver] = points
    
    return driver_points

def compute_standings(season_data: Dict, schema: Dict) -> Dict[str, Any]:
    """Compute complete standings for a season"""
    driver_totals = {}
    driver_teams = {}
    round_positions = []
    
  
    for race in season_data["races"]:
        for result in race["results"]:
            driver = result["driver_code"]
            if driver not in driver_totals:
                driver_totals[driver] = 0
                driver_teams[driver] = result["team"]
    
   
    for race in season_data["races"]:
        race_points = compute_race_points(race["results"], schema)
        
       
        for driver, points in race_points.items():
            driver_totals[driver] += points
        
        
        current_standings = sorted(
            [(driver, driver_totals[driver]) for driver in driver_totals],
            key=lambda x: (-x[1], x[0])
        )
        
        
        round_pos = {}
        for pos, (driver, _) in enumerate(current_standings, 1):
            round_pos[driver] = pos
        round_positions.append(round_pos)
    
    
    final_standings = sorted(
        [(driver, points) for driver, points in driver_totals.items()],
        key=lambda x: (-x[1], x[0])
    )
    
    
    driver_table = []
    for pos, (driver, points) in enumerate(final_standings, 1):
        driver_table.append({
            "driver_code": driver,
            "team": driver_teams[driver],
            "pts_new": points,
            "pos_new": pos
        })
    
    
    bump_top_movers = []
    for round_idx, round_pos in enumerate(round_positions, 1):
        for driver, pos in round_pos.items():
            if len(bump_top_movers) < 6:  
                bump_top_movers.append({
                    "driver_code": driver,
                    "round": round_idx,
                    "pos_new": pos
                })
    
    return {
        "driver_table": driver_table,
        "bump_top_movers": bump_top_movers
    }

def diff_vs_official(season_data: Dict, schema_new: Dict) -> Dict[str, Any]:
    """Compare new schema vs official standings"""
    
    official_standings = compute_standings(season_data, DEFAULT_SCHEMA)
    
    
    new_standings = compute_standings(season_data, schema_new)
    
    
    official_lookup = {}
    for driver in official_standings["driver_table"]:
        official_lookup[driver["driver_code"]] = {
            "pts": driver["pts_new"],
            "pos": driver["pos_new"]
        }
    
    
    diff_table = []
    for driver in new_standings["driver_table"]:
        driver_code = driver["driver_code"]
        official = official_lookup.get(driver_code, {"pts": 0, "pos": 999})
        
        diff_table.append({
            "driver_code": driver_code,
            "team": driver["team"],
            "pts_official": official["pts"],
            "pts_new": driver["pts_new"],
            "delta_pts": driver["pts_new"] - official["pts"],
            "pos_official": official["pos"],
            "pos_new": driver["pos_new"],
            "delta_pos": official["pos"] - driver["pos_new"]  # Positive = gained positions
        })
    
    
    diff_table.sort(key=lambda x: (-x["delta_pos"], -x["delta_pts"]))
    
    
    bump_top_movers = []
    for round_idx, round_pos in enumerate(new_standings["bump_top_movers"], 1):
        driver_code = round_pos["driver_code"]
        official_pos = official_lookup.get(driver_code, {}).get("pos", 999)
        bump_top_movers.append({
            "driver_code": driver_code,
            "round": round_idx,
            "pos_official": official_pos,
            "pos_new": round_pos["pos_new"]
        })
    
    return {
        "driver_table": diff_table,
        "bump_top_movers": bump_top_movers[:6]  
    }

@app.get("/api/standings")
async def get_standings(year: int, sch: Optional[str] = None):
    """Get standings comparison for a given year and schema"""
    
    season_data = None
    for season in SEASON_DATA["seasons"]:
        if season["year"] == year:
            season_data = season
            break
    
    if not season_data:
        raise HTTPException(status_code=404, detail=f"Season {year} not found")
    
    
    schema = DEFAULT_SCHEMA
    if sch:
        try:
            schema = json.loads(unquote(sch))
        except (json.JSONDecodeError, TypeError):
            raise HTTPException(status_code=400, detail="Invalid schema format")
    
   
    if "points" not in schema or "cutoff" not in schema:
        raise HTTPException(status_code=400, detail="Schema must include 'points' and 'cutoff'")
    
    
    cutoff = schema["cutoff"]
    for i in range(1, cutoff + 1):
        if i not in schema["points"]:
            schema["points"][i] = 0
    
    
    result = diff_vs_official(season_data, schema)
    
    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
