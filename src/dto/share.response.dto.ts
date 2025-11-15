import { z } from "zod";

export const fileShareResponseSchema = z.object({
	id: z.string().uuid(),
	fileId: z.string().uuid(),
	createdBy: z.string(),
	filename: z.string(),
	size: z.number(),
	expiryAt: z.date()
});

export type FileShareRequestDTO = z.infer<typeof fileShareResponseSchema>;