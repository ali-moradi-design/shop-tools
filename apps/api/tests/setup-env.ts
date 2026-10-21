/**
 * Must run before any app module imports env.ts.
 * DATABASE_URL points at the *_test database that global-setup rebuilds.
 */
process.env.NODE_ENV = 'test';
process.env.PORT = '4000';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'mysql://root:root@127.0.0.1:3306/toolbench_test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-key-min8';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-min8';
process.env.ACCESS_TOKEN_TTL = '15m';
process.env.REFRESH_TOKEN_TTL = '7d';
process.env.CORS_ORIGIN = '*';
process.env.UPLOAD_DIR = 'uploads';
process.env.COOKIE_SECURE = 'false';
process.env.COOKIE_SAME_SITE = 'lax';
