import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { env, resolveCorsOrigin } from './shared/config/env';
import { openApiSpec } from './shared/http/docs/openapi';
import { errorHandler, notFoundHandler } from './shared/http/middleware/errorHandler';
import { requestIdMiddleware } from './shared/http/middleware/requestId';
import { globalRateLimiter } from './shared/http/middleware/rate-limit';
import { originCheck } from './shared/http/middleware/originCheck';
import {
  registerIdentityRoutes,
  registerCatalogRoutes,
  registerOrderingRoutes,
  registerReviewsRoutes,
  registerEngagementRoutes,
  registerPromotionsRoutes,
  registerReportingRoutes,
} from './modules';

const app = express();
if (env.TRUST_PROXY > 0) app.set('trust proxy', env.TRUST_PROXY);

app.use(requestIdMiddleware);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: resolveCorsOrigin(),
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(originCheck);
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

if (env.NODE_ENV !== 'test') {
  app.use(globalRateLimiter);
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
app.get('/api/docs.json', (_req, res) => {
  res.json(openApiSpec);
});

// Uploaded images only: no directory listing, no sniffing, and a CSP that keeps any
// file from running script if it is opened directly.
app.use(
  '/uploads',
  express.static(env.UPLOAD_DIR_ABS, {
    index: false,
    dotfiles: 'deny',
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; sandbox");
    },
  }),
);

const apiV1 = express.Router();
registerIdentityRoutes(apiV1);
registerCatalogRoutes(apiV1);
registerOrderingRoutes(apiV1);
registerReviewsRoutes(apiV1);
registerEngagementRoutes(apiV1);
registerPromotionsRoutes(apiV1);
registerReportingRoutes(apiV1);
app.use('/api/v1', apiV1);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
