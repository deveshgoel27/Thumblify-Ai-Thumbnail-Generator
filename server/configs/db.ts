import mongoose from 'mongoose';

/**
 * Connects to MongoDB and caches the promise.
 *
 * On Vercel each cold start runs this module again, and requests can arrive
 * before the connection is ready — so every request awaits this same promise
 * instead of opening a new connection.
 */
let connectionPromise: Promise<typeof mongoose> | null = null;

const connectDB = (): Promise<typeof mongoose> => {
    if (!connectionPromise) {
        const uri = process.env.MONGODB_URI;

        if (!uri) {
            return Promise.reject(new Error('MONGODB_URI is not set'));
        }

        mongoose.connection.on('connected', () => console.log('MongoDB connected'));

        connectionPromise = mongoose.connect(uri).catch((error) => {
            connectionPromise = null; // let the next request try again
            throw error;
        });
    }

    return connectionPromise;
};

export default connectDB;
