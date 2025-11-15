import { Request, Response } from "express";
import { prisma } from "../config/prisma.client";
import { s3Client } from "../config/minio.client";
import { fileShareRequestSchema } from "../dto/share.request.dto";
import { FileStatus } from "../models/file";
import { fileShareResponseSchema } from "../dto/share.response.dto";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function getAllShareLinks(req: Request, res: Response): Promise<void> {
	try{
		const userId = req.user?.userId;
		if (!userId) {
			res.status(401).json({ message: "Unauthorized" });
			return;
		}

		const shareLinks: any[] = await prisma.$queryRaw`
		SELECT 
			s.id AS "shareId",
			s."fileId",
			s."createdBy",
			s."expiryAt",
			f.filename,
			f.size
		FROM share_links s
		INNER JOIN files f ON s."fileId" = f.id
		WHERE 
			s."createdBy" = ${userId}
			AND s."expiryAt" > NOW()
		ORDER BY s."expiryAt" ASC
		`;

		const response = shareLinks.map((link) => {
			return fileShareResponseSchema.parse({
				id: link.shareId,
				fileId: link.fileId,
				createdBy: link.createdBy,
				filename: link.filename,
				size: Number(link.size),
				expiryAt: new Date(link.expiryAt)
			})
		})

		res.status(200).json(response);
	}catch(err: any){
		if (err.name === "ZodError") {
			res.status(400).json({ error: "Invalid request", details: err.errors });
		} else {
			console.error("[getAllShareLinks]: ", err);
			res.status(500).json({ error: "Internal server error" });
		}
	}
}

export async function generateShareLink(req: Request, res: Response): Promise<void> {
	try {
		const userId = req.user?.userId;
		if (!userId) {
			res.status(401).json({ message: "Unauthorized" });
			return;
		}

		const { fileId, duration } = fileShareRequestSchema.parse(req.body);
		const file = await prisma.file.findFirst({
			where: {
				id: fileId,
				ownerId: userId,
				status: FileStatus.AVAILABLE
			}
		});

		if (!file) {
			res.status(404).json({ message: "File not found or unavailable" });
			return;
		}

		const now = new Date();
		let expiresAt: Date;
		switch (duration) {
			case '1h':
				expiresAt = new Date(now.getTime() + 1 * 60 * 60 * 1000);
				break;
			case '24h':
				expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
				break;
			case '7d':
				expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
				break;
			default:
				res.status(400).json({ message: "Invalid duration" });
				return;
		}

		const shareLink = await prisma.shareLink.create({
			data: {
				fileId: file.id,
				createdBy: userId,
				duration,
				expiryAt: expiresAt
			}
		});

		res.status(200).json({
			message: "Share link created",
			shareId: shareLink.id,
			expiresAt: shareLink.expiryAt
		});

	} catch (err: any) {
		if (err.name === "ZodError") {
			res.status(400).json({ error: "Invalid request", details: err.errors });
		} else {
			console.error("[generateShareLink]: ", err);
			res.status(500).json({ error: "Internal server error" });
		}
	}
}

export async function accessShareLink(req: Request, res: Response): Promise<void> {
	try{
		const shareId = req.params.id;
		console.log(shareId);
		const existingLink = await prisma.shareLink.findFirst({
			where: { fileId: shareId },
		});

		if (!existingLink){
			res.status(404).json({ message: "File not found." });
			return;
		}

		const storagePath = `uploads/${existingLink.createdBy}/${existingLink.fileId}`;
		const command = new GetObjectCommand({
			Bucket: process.env.MINIO_BUCKET as string,
			Key: storagePath,
		});

		const accessUrl: string = await getSignedUrl(s3Client, command, { expiresIn: 300 });
		res.status(200).json({ accessUrl });
	}catch(err: any){
		console.error("[generateShareLink]: ", err);
		res.status(500).json({ error: "Internal server error" });
	}
}

export async function revokeShareLink(req: Request, res: Response): Promise<void> {
	try {
		const { ids } = req.body;

		if (!Array.isArray(ids) || ids.length === 0) {
			res.status(400).json({ message: "A non-empty 'ids' array is required." });
			return;
		}

		const existingLinks = await prisma.shareLink.findMany({
			where: { id: { in: ids } },
		});

		const existingIds = existingLinks.map(link => link.id);
		const notFoundIds = ids.filter(id => !existingIds.includes(id));

		await prisma.shareLink.deleteMany({
			where: { id: { in: existingIds } },
		});

		res.status(200).json({
			message: "Share links revoked successfully.",
			deletedCount: existingIds.length,
			notFound: notFoundIds,
		});
	} catch (err: any) {
		console.error("[revokeShareLink]: ", err);
		res.status(500).json({ error: "Internal server error" });
	}
}