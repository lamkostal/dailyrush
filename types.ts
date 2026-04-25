
export interface DailySelection {
  date: string; // ISO format YYYY-MM-DD
  value: number; // 1-10
  timestamp: number;
  note?: string;
}

export type NumberRange = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
