process.env.NODE_ENV = 'test';
process.env.MONGODB_TEST_URI ||= 'mongodb://127.0.0.1:27017/placeholder';
process.env.JWT_SECRET ||= 'e2e-test-secret';
process.env.FRONTEND_URL ||= 'http://localhost:3000';
