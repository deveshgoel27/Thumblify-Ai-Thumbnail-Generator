import express from 'express';
import { loginUser, logoutUser, registerUser, verifyUser } from '../controllers/AuthController';
import protect from '../middleware/auth';

const AuthRouter = express.Router();

AuthRouter.post('/register', registerUser)
AuthRouter.post('/login', loginUser)
AuthRouter.get('/verify', protect, verifyUser)
AuthRouter.post('/logout', protect, logoutUser)


export default AuthRouter
