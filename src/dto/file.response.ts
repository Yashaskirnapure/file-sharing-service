import { uuid, z } from 'zod';

export const fileResponseSchema = z.object({
    id: z.string().uuid(),
    filename: z.string().min(1, "Filename is required"),
    size: z.bigint(),
    contentType: z.string(),
    createdAt: z.date(),
});

export type FileResponseDTO = z.infer<typeof fileResponseSchema>