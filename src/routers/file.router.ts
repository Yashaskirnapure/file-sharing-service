import { Router } from "express";
import { handleFileUpload, handleFileDownload, getAllFiles } from "../controllers/file.controllers";

const fileRouter = Router();
fileRouter.get('/files/:userId', getAllFiles)
fileRouter.post('/upload', handleFileUpload);
fileRouter.get('/download', handleFileDownload);

export default fileRouter;