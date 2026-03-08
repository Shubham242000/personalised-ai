export type SidebarTab = "profile" | "history";

export type Skill = {
  name: string;
  level: number;
  gap: boolean;
};

export type HistoryItem = {
  topic: string;
  time: string;
  completion: number;
  preview: string;
};

export type QuickStart = {
  label: string;
  icon: string;
};
