import { z } from 'zod';

const fileRequestSchema = z.object({
    filename: z.string().min(1, "Filename is required"),
    size: z.bigint(),
    contentType: z.string(),
});

export type FileRequestDTO = z.infer<typeof fileRequestSchema>