import express, { NextFunction, Request, Response } from 'express';
import cors from "cors";
import 'dotenv/config'
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

// Vercel serves every deployment over HTTPS behind a proxy, and runs this file
// as a serverless function instead of a long-running server.
const onVercel = !!process.env.VERCEL;
const isProduction = onVercel || process.env.NODE_ENV === 'production';

const app = express();

if (isProduction) {
    // Without this, express-session refuses to set a `secure` cookie: the proxy
    // terminates TLS, so Express itself only sees a plain http connection.
    app.set('trust proxy', 1);
}

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

// Make sure MongoDB is connected before any route touches it
app.use(async (req: Request, res: Response, next: NextFunction) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        next(error);
    }
});

// Reuse the Mongoose connection instead of opening a second one to Mongo
const clientPromise = connectDB().then((instance) => instance.connection.getClient());
clientPromise.catch(() => { /* reported by the middleware above and the store's error handler */ });

const sessionStore = MongoStore.create({
    clientPromise,
    collectionName: 'sessions',
});

// connect-mongo emits its errors on the store; with no listener Node treats
// them as unhandled and kills the process.
sessionStore.on('error', (error: unknown) => console.error('[session store]', error));

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
    store: sessionStore,
}))

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
    res.send('Server is Live!');
});

app.use('/api/auth', AuthRouter)
app.use('/api/thumbnail', ThumbnailRouter)
app.use('/api/user', UserRouter)

// Catches the database errors passed on by the middleware above
app.use((error: any, req: Request, res: Response, _next: NextFunction) => {
    console.error('[server]', error?.message || error);
    res.status(500).json({ message: 'Server error. Please try again.' });
});

// Locally this runs as a normal server; on Vercel the exported app is invoked
// per request, so there is nothing to listen on.
if (!onVercel) {
    const port = process.env.PORT || 3000;

    connectDB()
        .then(() => {
            app.listen(port, () => console.log(`Server is running at http://localhost:${port}`));
        })
        .catch((error: any) => {
            console.error('Failed to connect to MongoDB. Check MONGODB_URI in your .env file.');
            console.error(error?.message || error);
            process.exit(1);
        });
}

export default app;
