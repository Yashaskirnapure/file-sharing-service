import { prisma } from "../config/prisma.client";
import { Request, Response } from "express";

interface MinIORecord {
	eventName: string;
	s3: {
		bucket: {
			name: string;
		};
		object: {
			key: string;
			size: number;
			eTag: string;
		};
	};
}

interface MinIOWebhook {
	Records: MinIORecord[];
}

export async function objectCreationHandler(req: Request): Promise<void> {
	const webhook: MinIOWebhook = req.body;
	const correlationId = `create-${Date.now()}`;

	if (!webhook.Records || !Array.isArray(webhook.Records)) { throw new Error('Invalid webhook payload'); }
	for (const record of webhook.Records) {
		if (!record.eventName.startsWith('s3:ObjectCreated:')) {
			console.log(`[${correlationId}] Skipping non-creation event: ${record.eventName}`);
			continue;
		}

		const { key, size } = record.s3.object;
		const bucket = record.s3.bucket.name;

		console.log(`[${correlationId}] Processing object creation: ${bucket}/${key}`);

		try {
			const parts = key.split('/');
			const fileId = parts[parts.length - 1];
			const result = await prisma.file.updateMany({
				where: {
					id: fileId,
					status: 'PENDING'
				},
				data: {
					status: 'AVAILABLE',
					size: BigInt(size),
					completedAt: new Date()
				}
			});

			if (result.count === 0) {
				console.warn(`[${correlationId}] No pending upload found for storagePath: ${key}`);
			} else {
				console.log(`[${correlationId}] Successfully updated ${result.count} record(s) to AVAILABLE`);
			}

		} catch (error) {
			console.error(`[${correlationId}] Error updating database for ${key}:`, error);
			throw error;
		}
	}
}

export async function objectDeletionHandler(req: Request): Promise<void> {
	const webhook: MinIOWebhook = req.body;
	const correlationId = `delete-${Date.now()}`;

	if (!webhook.Records || !Array.isArray(webhook.Records)) { throw new Error('Invalid webhook payload'); }
	for (const record of webhook.Records) {
		if (!record.eventName.startsWith('s3:ObjectRemoved:')) {
			console.log(`[${correlationId}] Skipping non-deletion event: ${record.eventName}`);
			continue;
		}

		const { key } = record.s3.object;
		console.log(`[${correlationId}] Processing object deletion: ${key}`);

		try {
			const parts = key.split('/');
			const fileId = parts[parts.length - 1];
			const result = await prisma.file.updateMany({
				where: {
					id: fileId,
					status: { not: 'DELETED' }
				},
				data: {
					status: 'DELETED',
					deletedAt: new Date()
				}
			});

			if (result.count === 0) {
				console.warn(`[${correlationId}] No file record found for deletion: ${key}`);
			} else {
				console.log(`[${correlationId}] Successfully marked ${result.count} record(s) as DELETED`);
			}

		} catch (error) {
			console.error(`[${correlationId}] Error processing deletion for ${key}:`, error);
			throw error;
		}
	}
}

export const handleMinIOWebhook = async (req: Request, res: Response) => {
	const correlationId = `webhook-${Date.now()}`;

	try {
		console.log(`[${correlationId}] Received MinIO webhook`);
		const webhook: MinIOWebhook = req.body;

		if (!webhook.Records || !Array.isArray(webhook.Records)) {
			console.error(`[${correlationId}] Invalid webhook payload`);
			return res.status(400).json({ error: 'Invalid payload' });
		}

		const hasCreationEvents = webhook.Records.some(r => r.eventName.startsWith('s3:ObjectCreated:'));
		const hasDeletionEvents = webhook.Records.some(r => r.eventName.startsWith('s3:ObjectRemoved:'));

		if (hasCreationEvents) { await objectCreationHandler(req); }
		if (hasDeletionEvents) { await objectDeletionHandler(req); }

		console.log(`[${correlationId}] Webhook processed successfully`);
		res.status(200).json({ success: true, correlationId });
	} catch (error) {
		console.error(`[${correlationId}] Webhook processing failed:`, error);
		res.status(500).json({
			error: 'Processing failed',
			correlationId,
			message: error instanceof Error ? error.message : 'Unknown error'
		});
	}
};