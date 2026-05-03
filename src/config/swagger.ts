import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Africa By Road API',
      version: '1.0.0',
      description: 'Backend API for Africa By Road - Road trip community platform',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'token',
        },
      },
      schemas: {
        Tourist: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            nationality: { type: 'string' },
            isEmailVerified: { type: 'boolean' },
            isPaid: { type: 'boolean' },
            registrationStatus: { type: 'string', enum: ['pending', 'in_progress', 'complete'] },
          },
        },
        Message: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            author: { $ref: '#/components/schemas/Tourist' },
            content: { type: 'string' },
            attachments: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['image', 'video'] },
                  url: { type: 'string' },
                  caption: { type: 'string' },
                },
              },
            },
            likeCount: { type: 'integer' },
            replyCount: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Reply: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            messageId: { type: 'string' },
            author: { $ref: '#/components/schemas/Tourist' },
            content: { type: 'string' },
            likeCount: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Contestant: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            country: { type: 'string' },
            bio: { type: 'string' },
            imageUrl: { type: 'string' },
            votes: { type: 'integer' },
            status: { type: 'string', enum: ['pending', 'active', 'eliminated', 'winner'] },
          },
        },
        LeaderboardEntry: {
          type: 'object',
          properties: {
            rank: { type: 'integer' },
            contestantId: { type: 'string' },
            name: { type: 'string' },
            country: { type: 'string' },
            votes: { type: 'integer' },
            imageUrl: { type: 'string' },
          },
        },
        GiveawaySpin: {
          type: 'object',
          properties: {
            spinsRemaining: { type: 'integer' },
            prize: { type: 'string' },
            message: { type: 'string' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            error: { type: 'string' },
          },
        },
      },
    },
    security: [
      { bearerAuth: [] },
      { cookieAuth: [] },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);