import { Router } from "express";
import { handleLogin, handleRegister } from "../controllers/auth.controllers";

const authRouter = Router();
authRouter.post('/register', handleRegister);
authRouter.post('/login', handleLogin);

export default authRouter;