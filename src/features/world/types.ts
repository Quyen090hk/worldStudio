export type DailyTask = {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
};

export type WorldProfile = {
  name: string;
  description: string;
  memo?: string;
  dailyTasks?: Record<string, DailyTask[]>;
  createdAt: string;
  updatedAt: string;
};
