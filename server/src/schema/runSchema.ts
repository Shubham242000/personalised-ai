import { z } from "zod";

export const RunParamsSchema = z.object({
  id: z.string().trim().min(1),
});
