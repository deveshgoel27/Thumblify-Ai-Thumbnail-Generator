import mongoose from 'mongoose';

const connectDB = async ()=> {
    mongoose.connection.on('connected',()=>console.log('MongoDB connected'))
    // Let the caller decide what to do on failure (e.g. exit cleanly)
    // instead of silently swallowing it and letting the app start with no DB.
    await mongoose.connect(process.env.MONGODB_URI as string)
}

export default connectDB;