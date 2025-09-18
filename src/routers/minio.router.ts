import { Router, Request, Response } from "express";
import { handleMinIOWebhook } from "../controllers/minio.controllers";

const minioRouter: Router = Router();
minioRouter.post('/', handleMinIOWebhook);
minioRouter.get('/health', (req: Request, res: Response) => {
	res.status(200).json({
		status: 'healthy',
		service: 'minio-webhook-handler',
		timestamp: new Date().toISOString()
	});
})

export default minioRouter;