
export interface DailySelection {
  date: string; // ISO format YYYY-MM-DD
  value: number;
  timestamp: number;
  note?: string;
}

export type TrackMode = 'score' | 'point';

export interface Track {
  id: string;
  name: string;
  mode: TrackMode;
  minScore: number;
  maxScore: number;
  showLeastSquares: boolean;
  showEma: boolean;
  history: DailySelection[];
  createdAt: number;
}
