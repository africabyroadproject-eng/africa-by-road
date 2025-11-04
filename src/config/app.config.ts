//app.config.ts
import express from 'express';
import dotenv from 'dotenv';
import { connectDB } from './db.config';
import authRoutes from '../routes/auth.routes';
import cookieParser from 'cookie-parser';
import appRoutes from '../routes/app.routes';
import publicRoutes from '../routes/public.routes';
import paymentsRoutes from '../routes/payments.routes';


dotenv.config();

const app = express();

// Connect to DB
connectDB()
    .then(() => {
        console.log('Database connection initialized');
    })
    .catch((error) => {
        console.error('Failed to connect to database:', error);
        process.exit(1);
    });

app.use(express.json());
app.use(cookieParser());
// Mount your auth routes with a base path
app.use('/api/auth', authRoutes);
app.use('/api/app', appRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/payments', paymentsRoutes);
// Optionally add a health check route
app.get('/', (_, res) => {
    res.send('Africa By Road API is running');
});

// Serve static files from the public directory
app.use(express.static('public'));

// Optionally add error handler later
// app.use(errorHandler);
const mongoURI = process.env.MONGODB_URI;

if (!mongoURI) {
  throw new Error('MongoDB URI is not defined in environment variables');
}

export default app;
