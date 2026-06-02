//app.config.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from '../routes/auth.routes';
import cookieParser from 'cookie-parser';
import appRoutes from '../routes/app.routes';
import publicRoutes from '../routes/public.routes';
import paymentsRoutes from '../routes/payments.routes';
import profileRoutes from '../routes/profile.routes';
import communityRoutes from '../routes/community.routes';
import giveawaysRoutes from '../routes/giveaway.routes';
import voteRoutes from '../routes/vote.routes';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import { auditLog } from '../middleware/audit.mw';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler.mw';
import { authLimiter } from '../middleware/rateLimit.mw';

const app = express();

app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
}));
app.use(auditLog);

// Mount routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/app', appRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/giveaway', giveawaysRoutes);
app.use('/api/vote', voteRoutes);

// Swagger docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (_, res) => {
    res.json(swaggerSpec);
});

// Optionally add a health check route
app.get('/', (_, res) => {
    res.send('Africa By Road API is running');
});

// Serve static files from the public directory
app.use(express.static('public'));

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
