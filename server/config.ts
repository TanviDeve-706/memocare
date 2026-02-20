import path from 'path';

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  sessionSecret: process.env.SESSION_SECRET || 'devsecretchange',
  databaseUrl: process.env.DATABASE_URL || path.resolve('./memocare.db'),
  uploadDir: process.env.UPLOAD_DIR || './server/public/uploads',
  clientOrigin: process.env.CLIENT_ORIGIN || true, // Allow all origins in development
};
