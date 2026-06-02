import dotenv from 'dotenv';
dotenv.config();
import { connectDB } from './config/db.config';
import app from './config/app.config';

const PORT = process.env.PORT || 3000;

async function start(): Promise<void> {
    try {
        await connectDB();
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down gracefully...');
    process.exit(0);
});

start();
