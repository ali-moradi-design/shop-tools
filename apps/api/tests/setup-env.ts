/**
 * Must run before any app module imports env.ts.
 * Mongo URI is overwritten by the test helper after memory server starts;
 * a placeholder satisfies Zod at first import.
 */
process.env.NODE_ENV = 'test';
process.env.PORT = '4000';
process.env.MONGODB_URI =
  process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/shop-tools-test-placeholder';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-key-min8';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-min8';
process.env.ACCESS_TOKEN_TTL = '15m';
process.env.REFRESH_TOKEN_TTL = '7d';
process.env.CORS_ORIGIN = '*';
process.env.UPLOAD_DIR = 'uploads';
process.env.COOKIE_SECURE = 'false';
process.env.COOKIE_SAME_SITE = 'lax';
