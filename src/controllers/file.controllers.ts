import { Request, Response } from "express";
import { prisma } from "../config/prisma.client";
import { s3Client } from "../config/minio.client";
import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { FileResponseDTO, fileResponseSchema } from "../dto/file.response";
import { FileRequestDTO } from "../dto/file.request";
import { File, LockedFileRow, FileStatus } from "../models/file";
import { Prisma } from "@prisma/client";

export async function getAllFiles(req: Request, res: Response): Promise<void> {
    try {
        const userId: string | undefined = req.user?.userId;
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const files: File[] = await prisma.file.findMany({
            where: { ownerId: userId, status: FileStatus.AVAILABLE },
        });

        const filteredFiles: FileResponseDTO[] = files.map((file) =>
            fileResponseSchema.parse({
                id: file.id,
                filename: file.filename,
                size: Number(file.size),
                contentType: file.contentType,
                createdAt: file.createdAt,
            })
        );

        res.status(200).json(filteredFiles);
    } catch (err: any) {
        console.error("[getAllFiles]", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function handleFileView(req: Request, res: Response): Promise<void> {
    try {
        const fileId: string = req.params.id;
        const userId: string | undefined = req.user?.userId;
        if (!userId){
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const existingFile: File | null = await prisma.file.findFirst({
            where: { id: fileId, ownerId: userId },
        });

        if (!existingFile){
            res.status(404).json({ message: "File not found." });
            return;
        }

        const storagePath = `uploads/${existingFile.ownerId}/${existingFile.id}`;
        const command = new GetObjectCommand({
            Bucket: process.env.MINIO_BUCKET as string,
            Key: storagePath,
        });

        const accessUrl: string = await getSignedUrl(s3Client, command, { expiresIn: 300 }); // 5 min
        res.status(200).json({ accessUrl });
    } catch (err) {
        console.error("[handleFileView]", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function handleFileUpload(req: Request, res: Response): Promise<void> {
    try {
        const ownerId: string | undefined = req.user?.userId;
        if (!ownerId){
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const files: FileRequestDTO[] = req.body.files;
        if (!files?.length){
            res.status(400).json({ error: "No files provided" });
            return;
        }

        const createdFiles: File[] = await prisma.$transaction(
            files.map((file) =>
                prisma.file.create({
                    data: {
                        filename: file.filename,
                        size: file.size,
                        contentType: file.contentType,
                        ownerId,
                    },
                })
            )
        );

        const fileResponses = await Promise.all(
            createdFiles.map(async (f) => {
                const storagePath = `uploads/${ownerId}/${f.id}`;
                const command = new PutObjectCommand({
                    Bucket: process.env.MINIO_BUCKET as string,
                    Key: storagePath,
                    ContentType: f.contentType,
                });

                const uploadUrl: string = await getSignedUrl(s3Client, command, { expiresIn: 300 });
                return { id: f.id, filename: f.filename, uploadUrl };
            })
        );

        res.status(200).json(fileResponses);
    } catch (err: any) {
        console.error("[handleFileUpload]", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function handleFileDelete(req: Request, res: Response): Promise<void> {
    try {
        const ownerId: string | undefined = req.user?.userId;
        if (!ownerId){
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const files: string[] = req.body.fileIds;
        if (!files?.length){
            res.status(400).json({ error: "No files provided" });
            return;
        }

        // Transaction: Lock rows and mark as DELETING
        const fileRecords: LockedFileRow[] = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            const rows = await tx.$queryRaw<LockedFileRow[]>`
                SELECT id, "ownerId"
                FROM files
                WHERE "ownerId" = ${ownerId} AND id = ANY(${files})
                FOR UPDATE
            `;

            if (rows.length !== files.length) {
                throw new Error("Permission denied for one or more files");
            }

            await tx.file.updateMany({
                where: { ownerId, id: { in: files } },
                data: { status: FileStatus.DELETING },
            });

            return rows;
        });

        // Delete files from S3 in parallel
        await Promise.all(
            fileRecords.map(async (f) => {
                const storageKey = `uploads/${f.ownerId}/${f.id}`;
                try {
                    await s3Client.send(
                        new DeleteObjectCommand({
                            Bucket: process.env.MINIO_BUCKET as string,
                            Key: storageKey,
                        })
                    );
                } catch (err) {
                    console.error(`[handleFileDelete] Failed to delete ${storageKey}`, err);
                }
            })
        );

        res.status(200).json({ message: "Deletion initiated" });
    } catch (err: any) {
        console.error("[handleFileDelete]", err);
        if (err.message.includes("Permission denied")) {
            res.status(403).json({ error: err.message });
        } else {
            res.status(500).json({ error: "Something went wrong" });
        }
    }
}
