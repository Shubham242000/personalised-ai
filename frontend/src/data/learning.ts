import type { HistoryItem, QuickStart, Skill } from "../types/learning";

export const skills: Skill[] = [
  { name: "Research", level: 3, gap: true },
  { name: "Writing", level: 5, gap: false },
  { name: "Design", level: 2, gap: true },
  { name: "Planning", level: 4, gap: false },
  { name: "Execution", level: 4, gap: false },
];

export const history: HistoryItem[] = [
  {
    topic: "Homepage messaging brief",
    time: "2h ago",
    completion: 85,
    preview: "Positioning options, tone variants, and hero copy directions...",
  },
  {
    topic: "Design handoff checklist",
    time: "Yesterday",
    completion: 60,
    preview: "Started structure and acceptance criteria, pending QA notes",
  },
  {
    topic: "Launch content plan",
    time: "2 days ago",
    completion: 100,
    preview: "Channel strategy, calendar, and writing workflow finalized",
  },
  {
    topic: "Stakeholder update draft",
    time: "4 days ago",
    completion: 100,
    preview: "Executive summary, blockers, and next actions completed",
  },
];

export const quickStarts: QuickStart[] = [
  { label: "Draft a design brief", icon: "🧩" },
  { label: "Write a product launch outline", icon: "✍️" },
  { label: "Summarize competitor positioning", icon: "🔎" },
  { label: "Plan next week priorities", icon: "📌" },
];
