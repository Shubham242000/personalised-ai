import { z } from "zod";

export const SkillRequestSchema = z.object({
  skillName: z.string().min(1),
  rating: z.number().int().min(1).max(10)
});