import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Schema, StandingsResponse } from './types'

const DEFAULT_SCHEMA: Schema = {
  points: { 1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1 },
  pole: 0,
  fastest_lap: 1,
  cutoff: 10,
  fastest_lap_requires_cutoff: true
}

function App() {
  const [schema, setSchema] = useState<Schema>(DEFAULT_SCHEMA)
  const [year, setYear] = useState(2021)
  const [pointsInput, setPointsInput] = useState('25,18,15,12,10,8,6,4,2,1')

  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const schParam = urlParams.get('sch')
    const yearParam = urlParams.get('year')
    
    if (yearParam) {
      setYear(parseInt(yearParam))
    }
    
    if (schParam) {
      try {
        const parsedSchema = JSON.parse(decodeURIComponent(schParam))
        setSchema(parsedSchema)
        
  
        const pointsArray = []
        for (let i = 1; i <= parsedSchema.cutoff; i++) {
          pointsArray.push(parsedSchema.points[i] || 0)
        }
        setPointsInput(pointsArray.join(','))
      } catch (error) {
        console.error('Failed to parse schema from URL:', error)
      }
    }
  }, [])


  useEffect(() => {
    const pointsArray = []
    for (let i = 1; i <= schema.cutoff; i++) {
      pointsArray.push(schema.points[i] || 0)
    }
    setPointsInput(pointsArray.join(','))
  }, [schema.cutoff])


  const updatePointsFromInput = () => {
    const pointsArray = pointsInput.split(',').map(p => parseInt(p.trim()) || 0)
    const newPoints: Record<number, number> = {}
    
    for (let i = 1; i <= schema.cutoff; i++) {
      newPoints[i] = pointsArray[i - 1] || 0
    }
    
    setSchema(prev => ({
      ...prev,
      points: newPoints
    }))
  }

 
  const applySchema = () => {
    updatePointsFromInput()
    
   
    const schParam = encodeURIComponent(JSON.stringify(schema))
    const newUrl = `?year=${year}&sch=${schParam}`
    window.history.pushState({}, '', newUrl)
  }


  const resetToOfficial = () => {
    setSchema(DEFAULT_SCHEMA)
    setPointsInput('25,18,15,12,10,8,6,4,2,1')
    
   
    const newUrl = `?year=${year}`
    window.history.pushState({}, '', newUrl)
  }

  
  const copyPermalink = () => {
    const schParam = encodeURIComponent(JSON.stringify(schema))
    const url = `${window.location.origin}${window.location.pathname}?year=${year}&sch=${schParam}`
    navigator.clipboard.writeText(url)
    alert('Permalink copied to clipboard!')
  }


  const { data, isLoading, error } = useQuery({
    queryKey: ['standings', year, JSON.stringify(schema)],
    queryFn: async (): Promise<StandingsResponse> => {
      const schParam = encodeURIComponent(JSON.stringify(schema))
      const response = await axios.get(`/api/standings?year=${year}&sch=${schParam}`)
      return response.data
    },
    enabled: !!schema
  })


  const chartData = data?.bump_top_movers.reduce((acc, entry) => {
    const existing = acc.find(item => item.round === entry.round)
    if (existing) {
      existing[`${entry.driver_code}_new`] = entry.pos_new
      existing[`${entry.driver_code}_official`] = entry.pos_official
    } else {
      acc.push({
        round: entry.round,
        [`${entry.driver_code}_new`]: entry.pos_new,
        [`${entry.driver_code}_official`]: entry.pos_official
      })
    }
    return acc
  }, [] as any[]) || []

  const driverCodes = [...new Set(data?.bump_top_movers.map(e => e.driver_code) || [])]

  return (
    <div className="app">
      <div className="header">
        <h1>F1 Scoring MVP</h1>
        <p>Compare custom points schemas vs official FIA standings</p>
      </div>

      <div className="layout">
        {/* Left Panel - Points Editor */}
        <div className="panel">
          <h2>Points Editor</h2>
          
          <div className="form-group">
            <label>Season Year</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value) || 2021)}
              min="2021"
              max="2021"
            />
          </div>

          <div className="form-group">
            <label>Points Cutoff (1-20)</label>
            <input
              type="number"
              value={schema.cutoff}
              onChange={(e) => setSchema(prev => ({ ...prev, cutoff: parseInt(e.target.value) || 10 }))}
              min="1"
              max="20"
            />
          </div>

          <div className="form-group">
            <label>Points for Positions 1-{schema.cutoff} (comma-separated)</label>
            <input
              type="text"
              value={pointsInput}
              onChange={(e) => setPointsInput(e.target.value)}
              placeholder="25,18,15,12,10,8,6,4,2,1"
            />
          </div>

          <div className="form-group">
            <label>Pole Bonus</label>
            <input
              type="number"
              value={schema.pole}
              onChange={(e) => setSchema(prev => ({ ...prev, pole: parseInt(e.target.value) || 0 }))}
              min="0"
            />
          </div>

          <div className="form-group">
            <label>Fastest Lap Bonus</label>
            <input
              type="number"
              value={schema.fastest_lap}
              onChange={(e) => setSchema(prev => ({ ...prev, fastest_lap: parseInt(e.target.value) || 0 }))}
              min="0"
            />
          </div>

          <div className="checkbox-group">
            <input
              type="checkbox"
              id="fastest_lap_requires_cutoff"
              checked={schema.fastest_lap_requires_cutoff}
              onChange={(e) => setSchema(prev => ({ ...prev, fastest_lap_requires_cutoff: e.target.checked }))}
            />
            <label htmlFor="fastest_lap_requires_cutoff">Fastest lap requires top {schema.cutoff} finish</label>
          </div>

          <div className="buttons">
            <button className="btn btn-primary" onClick={applySchema}>
              Apply
            </button>
            <button className="btn btn-secondary" onClick={resetToOfficial}>
              Reset to Official
            </button>
            <button className="btn btn-outline" onClick={copyPermalink}>
              Copy Permalink
            </button>
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="panel">
          <h2>Results Comparison</h2>
          
          {isLoading && <div className="loading">Loading standings...</div>}
          
          {error && (
            <div className="error">
              Error loading data: {error instanceof Error ? error.message : 'Unknown error'}
            </div>
          )}
          
          {data && (
            <>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Driver</th>
                      <th>Team</th>
                      <th>Position</th>
                      <th>ΔPos</th>
                      <th>Points</th>
                      <th>ΔPts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.driver_table.map((driver) => (
                      <tr key={driver.driver_code}>
                        <td>{driver.driver_code}</td>
                        <td>{driver.team}</td>
                        <td>
                          {driver.pos_official} → {driver.pos_new}
                        </td>
                        <td className={driver.delta_pos > 0 ? 'delta-positive' : driver.delta_pos < 0 ? 'delta-negative' : ''}>
                          {driver.delta_pos > 0 ? `↑${driver.delta_pos}` : driver.delta_pos < 0 ? `↓${Math.abs(driver.delta_pos)}` : '0'}
                        </td>
                        <td>
                          {driver.pts_official} → {driver.pts_new}
                        </td>
                        <td className={driver.delta_pts > 0 ? 'delta-positive' : driver.delta_pts < 0 ? 'delta-negative' : ''}>
                          {driver.delta_pts > 0 ? `+${driver.delta_pts}` : driver.delta_pts < 0 ? `${driver.delta_pts}` : '0'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3>Top Movers - Position Changes</h3>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="round" />
                    <YAxis reversed />
                    <Tooltip />
                    <Legend />
                    {driverCodes.map((driver, index) => (
                      <Line
                        key={`${driver}_new`}
                        type="monotone"
                        dataKey={`${driver}_new`}
                        stroke={`hsl(${index * 60}, 70%, 50%)`}
                        strokeWidth={2}
                        name={`${driver} (New)`}
                      />
                    ))}
                    {driverCodes.map((driver, index) => (
                      <Line
                        key={`${driver}_official`}
                        type="monotone"
                        dataKey={`${driver}_official`}
                        stroke={`hsl(${index * 60}, 70%, 50%)`}
                        strokeWidth={1}
                        strokeDasharray="5 5"
                        name={`${driver} (Official)`}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
