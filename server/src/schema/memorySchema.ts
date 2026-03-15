import { z } from "zod";

export const ListMemoryQuerySchema = z.object({
  topic: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const UpsertMemoryRequestSchema = z.object({
  topic: z.string().trim().min(1).max(120),
  summary: z.string().trim().min(1).max(5000),
  confidence: z.number().int().min(0).max(100).optional(),
  coverage: z.number().int().min(0).max(100).optional(),
  lastReviewedAt: z.string().datetime().optional(),
});

export type ListMemoryQuery = z.infer<typeof ListMemoryQuerySchema>;
export type UpsertMemoryRequest = z.infer<typeof UpsertMemoryRequestSchema>;
