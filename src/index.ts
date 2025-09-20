import express, { Application }  from 'express';
import morgan from 'morgan';
import dotenv from 'dotenv';

import fileRouter from './routers/file.router';
import authRouter from './routers/auth.router';
import minioRouter from './routers/minio.router';
import cors from "cors";

dotenv.config();
const app: Application = express();

app.use(cors());
app.use(morgan("common"));
app.use('/api/webhooks/minio', minioRouter);

app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/file', fileRouter);

app.listen(5000, () => { console.log("Server running on 5000") })