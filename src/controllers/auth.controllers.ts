import { Request, Response } from "express";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { prisma } from "../config/prisma.client";
import { UserRequestDTO, userRequestSchema } from "../dto/user.request.dto";
import { UserResponseDTO, userResponseSchema } from "../dto/user.response.dto";
import { LoginRequestDTO, loginRequestSchema } from "../dto/login.request.dto";

export async function handleRegister(req: Request, res: Response): Promise<void> {
    try{
        const { name, email, password } = req.body
        const validUserRequest: UserRequestDTO = userRequestSchema.parse({ name, email, password });
        
        const existingUser = await prisma.user.findFirst({
            where: { email: validUserRequest.email }
        });

        if(existingUser){
            res.status(409).json({ message: "Email already in use." });
            return;
        }

        const encryptedPassword = await bcrypt.hash(validUserRequest.password, 10);
        const newUser = await prisma.user.create({
            data: {
                name: validUserRequest.name,
                email: validUserRequest.email,
                password: encryptedPassword,
            }
        });

        const validUserResponse: UserResponseDTO = userResponseSchema.parse(newUser);
        res.status(200).json(validUserResponse);
    }catch(err: any){
        console.error("[handleRegister]", err);
        if (err.name === "ZodError") {
            res.status(400).json({ message: "Invalid request data", errors: err.errors });
            return;
        }
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function handleLogin(req: Request, res: Response): Promise<void> {
    try{
        const { email, password } = req.body;
        const validLoginRequest: LoginRequestDTO = loginRequestSchema.parse({ email, password });

        const existingUser = await prisma.user.findFirst({
            where: { email: validLoginRequest.email }
        });

        if(!existingUser){
            res.status(402).json({ message: "User not found." });
            return;
        }

        const validPassword = await bcrypt.compare(validLoginRequest.password, existingUser.password);
        if (!validPassword) {
            res.status(401).json({ message: "Invalid credentials" });
            return;
        }
      
        const token = jwt.sign(
            { userId: existingUser.id, name: existingUser.name, email: existingUser.email },
            process.env.JWT_SECRET as string,
            { expiresIn: "1h" }
        );
      
        const validUserResponse: UserResponseDTO = userResponseSchema.parse(existingUser);
        res.status(200).json({
            user: validUserResponse,
            accessToken: token
        });
    }catch(err: any){
        console.error("[handleLogin]", err);
        if (err.name === "ZodError") {
            res.status(400).json({ message: "Invalid request data", errors: err.errors });
            return;
        }
        res.status(500).json({ message: "Internal server error" });
    }
}