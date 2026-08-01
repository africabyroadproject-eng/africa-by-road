import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Model } from 'mongoose';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { Tourist, TouristDocument } from '../src/modules/auth/schemas/tourist.schema';
import { EmailService } from '../src/modules/auth/services/email.service';

describe('AppModule (e2e)', () => {
  let mongod: MongoMemoryServer;
  let app: INestApplication;
  let touristModel: Model<TouristDocument>;
  let sentOtp: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_TEST_URI = mongod.getUri();
    process.env.JWT_SECRET = 'e2e-test-secret';
    process.env.FRONTEND_URL = 'http://localhost:3000';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();

    touristModel = moduleFixture.get(getModelToken(Tourist.name));
    jest.spyOn(moduleFixture.get(EmailService), 'sendOtpEmail').mockImplementation(async (_email, _name, otp) => {
      sentOtp = otp;
      return true;
    });
  });

  afterAll(async () => {
    await app?.close();
    await mongod?.stop();
  });

  describe('public routes', () => {
    it('GET /public/landing-page returns content without auth', async () => {
      const res = await request(app.getHttpServer()).get('/api/public/landing-page').expect(200);
      expect(res.body.data.title).toBe('Africa by Road');
    });

    it('GET /vote/leaderboard returns an empty leaderboard without auth', async () => {
      const res = await request(app.getHttpServer()).get('/api/vote/leaderboard').expect(200);
      expect(res.body.data).toEqual([]);
    });
  });

  describe('auth flow', () => {
    const email = 'e2e-user@example.com';
    const password = 'Str0ng!Passw0rd';
    let authToken: string;
    let authCookie: string;

    it('POST /auth/register rejects an incomplete payload', async () => {
      await request(app.getHttpServer()).post('/api/auth/register').send({ email }).expect(400);
    });

    it('POST /auth/register creates an unverified tourist', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email, password, firstName: 'E2E', lastName: 'User' })
        .expect(201);

      expect(res.body.token).toBeDefined();
      expect(res.body.user.isEmailVerified).toBe(false);
    });

    it('POST /auth/verify-email/confirm-otp verifies with the emailed OTP, not the stored hash', async () => {
      const stored = await touristModel.findOne({ email }).select('+emailOtpCode');
      expect(stored?.emailOtpCode).toBeDefined();
      expect(stored?.emailOtpCode).not.toBe(sentOtp);

      const res = await request(app.getHttpServer())
        .post('/api/auth/verify-email/confirm-otp')
        .send({ email, otp: sentOtp })
        .expect(200);

      expect(res.body.user.isEmailVerified).toBe(true);
      expect(res.body.token).toBeDefined();
    });

    it('POST /auth/login succeeds with the verified credentials', async () => {
      const res = await request(app.getHttpServer()).post('/api/auth/login').send({ email, password }).expect(200);

      expect(res.body.token).toBeDefined();
      authToken = res.body.token;
      authCookie = String(res.headers['set-cookie']?.[0]).split(';')[0];
    });

    it('GET /profile rejects a request with no token', async () => {
      await request(app.getHttpServer()).get('/api/profile').expect(401);
    });

    it('GET /profile succeeds with a valid bearer token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.profile.email).toBe(email);
    });

    it('GET /auth/session accepts the secure cookie session', async () => {
      const res = await request(app.getHttpServer()).get('/api/auth/session').set('Cookie', authCookie).expect(200);
      expect(res.body.user.email).toBe(email);
    });

    it('blocks a cookie-authenticated state change without an allowed Origin', async () => {
      await request(app.getHttpServer()).post('/api/auth/logout').set('Cookie', authCookie).expect(403);
    });

    it('allows a cookie-authenticated state change from the configured frontend', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Cookie', authCookie)
        .set('Origin', 'http://localhost:3000')
        .expect(200);
    });

    it('rejects an unsigned payment webhook', async () => {
      await request(app.getHttpServer())
        .post('/api/payments/webhook')
        .send({ reference: 'fake', status: 'success', customer: { email } })
        .expect(401);
    });
  });
});
