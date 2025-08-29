export type Schema = {
  points: Record<number, number>;
  pole: number;
  fastest_lap: number;
  cutoff: number;
  fastest_lap_requires_cutoff: boolean;
};

export type DriverTableEntry = {
  driver_code: string;
  team: string;
  pts_official: number;
  pts_new: number;
  delta_pts: number;
  pos_official: number;
  pos_new: number;
  delta_pos: number;
};

export type BumpChartEntry = {
  driver_code: string;
  round: number;
  pos_official: number;
  pos_new: number;
};

export type StandingsResponse = {
  driver_table: DriverTableEntry[];
  bump_top_movers: BumpChartEntry[];
};
