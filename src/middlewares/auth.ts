import { Request, Response } from "express";
import jwt from 'jsonwebtoken';

interface JwtUserPayload {
    userId: string;
    name: string;
    email: string;
}

export function authMiddleware(req: Request, res: Response, next: Function): void{
    try{
        const authHeader = req.headers.authorization;
        const token = authHeader?.split(' ')[1];
        if (!token) {
            res.status(401).json({ message: "No token provided" });
            return;
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtUserPayload;
        req.user = decoded;
        console.log(decoded)
        next();
    }catch(err: any){
        console.log(err);
        res.status(403).json({ message: "Invalid or expired token" });
    }
}