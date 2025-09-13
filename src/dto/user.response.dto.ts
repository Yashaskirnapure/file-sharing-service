import { z } from "zod";

export const userResponseSchema = z.object({
    id: z.string(),
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    joinedAt: z.date().transform((d) => d.toISOString()), 
});

export type UserResponseDTO = z.infer<typeof userResponseSchema>;
