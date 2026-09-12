import express, { Request, Response } from 'express';
import cors from "cors";
import 'dotenv/config'
import mongoose from 'mongoose';
import connectDB from "./configs/db";
import session from 'express-session';
import MongoStore from 'connect-mongo';
import AuthRouter from './routes/AuthRoutes';
import ThumbnailRouter from './routes/ThumbnailRoutes';
import UserRouter from './routes/UserRoutes';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary explicitly from env
cloudinary.config({ cloudinary_url: process.env.CLOUDINARY_URL });

declare module 'express-session' {
    interface SessionData {
        isLoggedIn: boolean;
        userId: string;
    }
}

(async () => {
    try {
        await connectDB()
    } catch (error: any) {
        console.error("Failed to connect to MongoDB. Check MONGODB_URI in your .env file.")
        console.error(error?.message || error)
        process.exit(1)
    }

    const app = express();
    const isProduction = process.env.NODE_ENV === 'production';

    // Middleware
    // CLIENT_URL lets the deployed frontend origin be added without touching
    // code (same env var already used for the password-reset email link).
    const allowedOrigins = [
        'http://localhost:5173',
        'http://localhost:3000',
        process.env.CLIENT_URL,
    ].filter(Boolean) as string[];

    app.use(cors({
        origin: allowedOrigins,
        credentials: true,
    }))

   app.use(session({
    secret: process.env.SESSION_SECRET as string,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        // Cross-site cookies (separate client/server domains in production)
        // require SameSite=None + Secure. Locally, over plain http, that
        // combination would make browsers drop the cookie entirely — so
        // only turn it on in production.
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
    },
    store: MongoStore.create({
            // Reuse the connection connectDB already established instead of
            // opening a second, separately-configured connection to Mongo.
            client: mongoose.connection.getClient(),
            collectionName: 'sessions',
        })
   }))

    app.use(express.json());

    const port = process.env.PORT || 3000;

    app.get('/', (req: Request, res: Response) => {
        res.send('Server is Live!');
    });

    app.use('/api/auth', AuthRouter)
    app.use('/api/thumbnail', ThumbnailRouter)
    app.use('/api/user', UserRouter)

    app.listen(port, () => {
        console.log(`Server is running at http://localhost:${port}`);
    });
})();