import { Router } from "express";
import { authMiddleware } from "../middlewares/auth";
import { handleFileUpload, handleFileDownload, getAllFiles, handleFileView } from "../controllers/file.controllers";

const fileRouter = Router();
fileRouter.get('/', authMiddleware, getAllFiles);
fileRouter.get('/view/:id', authMiddleware, handleFileView);
fileRouter.post('/upload', authMiddleware, handleFileUpload);
fileRouter.get('/download', authMiddleware, handleFileDownload);

export default fileRouter;