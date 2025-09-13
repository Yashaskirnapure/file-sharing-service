import express, { Application }  from 'express';
import morgan from 'morgan';
import dotenv from 'dotenv';

import fileRouter from './routers/file.router';
import authRouter from './routers/auth.router';
import { authMiddleware } from './middlewares/auth';

dotenv.config();
const app: Application = express();

app.use(express.json());
app.use(morgan("common"));
app.use('/api/auth', authRouter);
app.use('/api/file', authMiddleware, fileRouter);

app.listen(5000, () => { console.log("Server running on 5000") })