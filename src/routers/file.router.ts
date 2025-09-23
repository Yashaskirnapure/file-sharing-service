import { Router } from "express";
import { authMiddleware } from "../middlewares/auth";
import {
	handleFileUpload,
	getAllFiles,
	handleFileView,
	handleFileDelete
} from "../controllers/file.controllers";

const fileRouter = Router();
fileRouter.get('/', authMiddleware, getAllFiles);
fileRouter.get('/view/:id', authMiddleware, handleFileView);
fileRouter.post('/upload', authMiddleware, handleFileUpload);
fileRouter.post('/delete', authMiddleware, handleFileDelete);

export default fileRouter;