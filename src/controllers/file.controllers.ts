import { Request, Response } from "express";
import { prisma } from "../config/prisma.client";
import { s3Client } from "../config/minio.client";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { FileResponseDTO, fileResponseSchema } from "../dto/file.response";
import { FileRequestDTO } from "../dto/file.request";

export async function getAllFiles(req: Request, res: Response): Promise<void>{
    try{
        const userId = req.user?.userId;
        if (!userId){
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const files = await prisma.file.findMany({
            where: {
                ownerId: userId,
                //status: "AVAILABLE"
            }
        });

        const filteredFiles: FileResponseDTO[] = files.map((file) => {
            return fileResponseSchema.parse({
                id: file.id,
                filename: file.filename,
                size: Number(file.size),
                contentType: file.contentType,
                createdAt: file.createdAt
            });
        });

        res.status(200).json(filteredFiles);
    }catch(err: any){
        console.error("[getAllFiles]", err);
        if (err.name === "ZodError") {
            res.status(400).json({ message: "Invalid request data", errors: err.errors });
            return;
        }
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function handleFileView(req: Request, res: Response){
    try{
        const body = req.body;
        const ownerId = req.user?.userId;
        
        if (!ownerId){
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
    }catch(err){

    }
}

export async function handleFileUpload(req: Request, res: Response): Promise<void>{
    try{
        const body = req.body;
        const ownerId = req.user?.userId;
        
        if (!ownerId){
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const files: FileRequestDTO[] = req.body.files;
        
        if(!files || files.length === 0){
            res.status(400).json({ error: "No files provided" });
            return;
        }

        console.log(process.env.MINIO_BUCKET)
        const createdFiles = await prisma.$transaction(
            files.map((file) => 
                prisma.file.create({
                    data: {
                        filename: file.filename,
                        size: file.size,
                        contentType: file.contentType,
                        ownerId: ownerId!,
                    },
                })
            )
        )

        const fileResponses = await Promise.all(
            createdFiles.map(async (f) => {
                const storagePath = `uploads/${ownerId}/${f.id}`;
                const command = new PutObjectCommand({
                    Bucket: process.env.MINIO_BUCKET as string,
                    Key: storagePath,
                    ContentType: f.contentType,
                });

                const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 * 5 });
                return {
                    id: f.id,
                    filename: f.filename,
                    uploadUrl
                }
            })
        );

        res.status(200).json(fileResponses);
    }catch(err: any){
        console.error("[handleFileUpload]", err);
        if (err.name === "ZodError") {
            res.status(400).json({ message: "Invalid request data", errors: err.errors });
            return;
        }
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function handleFileDownload(req: Request, res: Response){}
export async function handleFileDelete(req: Request, res: Response){}