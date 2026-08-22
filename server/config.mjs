import 'dotenv/config';

export const config = {
  apiPort: Number(process.env.API_PORT || 8787),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/liferoute',
  tomtomApiKey: process.env.TOMTOM_API_KEY?.trim() || '',
  jwtSecret: process.env.JWT_SECRET || 'development-only-change-this-secret',
};