import { z } from "zod";

export const loginRequestSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password is required")
});

export type LoginRequestDTO = z.infer<typeof loginRequestSchema>;