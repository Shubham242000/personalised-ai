import type { HistoryItem, QuickStart, Skill } from "../types/learning";

export const skills: Skill[] = [
  { name: "TypeScript", level: 3, gap: true },
  { name: "React", level: 5, gap: false },
  { name: "System Design", level: 2, gap: true },
  { name: "Node.js", level: 4, gap: false },
  { name: "CSS", level: 4, gap: false },
];

export const history: HistoryItem[] = [
  {
    topic: "React useCallback deep dive",
    time: "2h ago",
    completion: 85,
    preview: "Covered memoization, dependency arrays, and when NOT to use it...",
  },
  {
    topic: "TypeScript utility types",
    time: "Yesterday",
    completion: 60,
    preview: "Partial, Required, Pick, Omit - stopped before Conditional types",
  },
  {
    topic: "Zustand vs Redux",
    time: "2 days ago",
    completion: 100,
    preview: "Full comparison, boilerplate analysis, when to use each",
  },
  {
    topic: "Async/Await patterns",
    time: "4 days ago",
    completion: 100,
    preview: "Error handling, Promise.all, race conditions",
  },
];

export const quickStarts: QuickStart[] = [
  { label: "Fill my TypeScript gaps", icon: "⚡" },
  { label: "Continue System Design path", icon: "🗺️" },
  { label: "Quiz me on weak topics", icon: "🎯" },
  { label: "What should I learn next?", icon: "✦" },
];
