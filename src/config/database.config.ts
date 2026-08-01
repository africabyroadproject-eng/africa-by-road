import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  uri: process.env.NODE_ENV === 'test' ? process.env.MONGODB_TEST_URI : process.env.MONGODB_URI,
}));
