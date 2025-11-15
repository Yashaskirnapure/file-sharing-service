import { Router } from "express";
import { authMiddleware } from "../middlewares/auth";
import { accessShareLink, generateShareLink, getAllShareLinks, revokeShareLink } from "../controllers/share.controllers";

const shareRouter = Router();
shareRouter.get('/links', authMiddleware, getAllShareLinks);
shareRouter.get('/links/:id', accessShareLink);
shareRouter.post('/links/generate', authMiddleware, generateShareLink);
shareRouter.post('/links/revoke', authMiddleware, revokeShareLink);

export default shareRouter;