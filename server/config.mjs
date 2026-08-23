import 'dotenv/config';

export const config = {
  apiPort: Number(process.env.API_PORT || 8787),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/liferoute',
  tomtomApiKey: process.env.TOMTOM_API_KEY?.trim() || '',
  jwtSecret: process.env.JWT_SECRET || 'development-only-change-this-secret',
  // Optional per the tech-stack doc's "AI Provider API Key" section — unset
  // means the rules-based recommendation in ai.mjs is used as-is, with no
  // behavior change. See server/aiExplain.mjs.
  groqApiKey: process.env.GROQ_API_KEY?.trim() || '',
  groqModel: process.env.GROQ_MODEL?.trim() || 'llama-3.1-8b-instant',
};