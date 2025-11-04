//db.config.ts
import mongoose from 'mongoose';
import colors from 'colors';

const options: object = {
  autoIndex: true,
  maxPoolSize: 1000,
  wtimeoutMS: 60000,
  connectTimeoutMS: 60000,
  socketTimeoutMS: 60000,
  serverSelectionTimeoutMS: 60000,
  family: 4,
};

export const connectDB = async (): Promise<void> => {
  try {
    const isTest = process.env.NODE_ENV === 'test';
    const uri = isTest ? process.env.MONGODB_TEST_URI : process.env.MONGODB_URI;

    if (!uri) throw new Error('MongoDB URI not provided');

    const dbConn = await mongoose.connect(uri, options);
    const dbName = dbConn.connection.name;

    console.log(
      colors.cyan.bold.underline(`Database connected: ${dbConn.connection.host}/${dbName}`)
    );
  } catch (error) {
    console.error(colors.red.bold('Error connecting to database:'), error);
    process.exit(1);
  }
};
