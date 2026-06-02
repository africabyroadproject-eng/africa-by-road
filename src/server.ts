import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { connectDB } from './config/db.config';
import app from './config/app.config';

const PORT = process.env.PORT || 3000;

let server: ReturnType<typeof app.listen>;

async function start(): Promise<void> {
    try {
        await connectDB();
        server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

function gracefulShutdown(signal: string): void {
    console.log(`${signal} received. Shutting down gracefully...`);
    server?.close(() => {
        mongoose.disconnect().catch(() => {});
        process.exit(0);
    });
    setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

start();
