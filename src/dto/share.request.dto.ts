import { z } from "zod";

export const fileShareRequestSchema = z.object({
  fileId: z.string().uuid(),
  duration: z.enum(["1h", "24h", "7d"]),
});

export type FileShareRequestDTO = z.infer<typeof fileShareRequestSchema>;