import { z } from "zod";

export const CreateConversationRequestSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
});

export const ListConversationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
  cursor: z.string().trim().min(1).optional(),
});

export const ConversationParamsSchema = z.object({
  id: z.string().trim().min(1),
});

export const UpdateConversationRequestSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    completion: z.number().int().min(0).max(100).optional(),
    archived: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export type ListConversationsQuery = z.infer<typeof ListConversationsQuerySchema>;
export type UpdateConversationRequest = z.infer<typeof UpdateConversationRequestSchema>;
