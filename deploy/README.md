# Deploy (roadmap phase 8)

- `compose.yaml` — MongoDB (auth on, no published port, internal network, 0.25 GB
  cache, memory limits), API (read-only filesystem, non-root, `no-new-privileges`)
  and web (only port, bound to `127.0.0.1:3104`). Images come from ghcr.io.
- `.env.example` — secrets to put in `/srv/apps/leather-shop/.env`.
- `nginx.conf` — host Nginx site; run `nginx -t` before `systemctl reload nginx`,
  then `certbot --nginx -d shop-leather.ali-moradi-develop.com`.

First start and seed:

```bash
docker compose pull && docker compose up -d
docker compose exec api node dist/scripts/seed.js
```

Nightly demo reset (crontab of the deploy user):

```cron
30 3 * * * cd /srv/apps/leather-shop && docker compose exec -T api node dist/scripts/reset-demo.js
```

Building the web image needs a reachable API (prerendering reads the catalog), see
the comment at the top of `apps/web/Dockerfile`.
