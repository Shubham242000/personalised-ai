import { z } from "zod";

export const AgentResearchRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(8000),
  conversationId: z.string().trim().min(1).optional(),
});

export type AgentResearchRequest = z.infer<typeof AgentResearchRequestSchema>;
