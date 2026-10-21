# Deploy (roadmap phase 8)

- `compose.yaml` — MySQL 8.4 (no published port, internal network, 128 MB buffer
  pool, `performance_schema` off, memory limits), API (read-only filesystem, non-root, `no-new-privileges`)
  and web (only port, bound to `127.0.0.1:3105`). Images come from ghcr.io.
- `.env.example` — secrets to put in `/srv/apps/shop-tools/.env`.
- `nginx.conf` — host Nginx site; run `nginx -t` before `systemctl reload nginx`,
  then `certbot --nginx -d shop-tools.ali-moradi-develop.com`.

First start and seed:

```bash
docker compose pull && docker compose up -d   # the API applies the migrations on start
docker compose exec api node dist/scripts/seed.js
```

Nightly demo reset (crontab of the deploy user):

```cron
30 3 * * * cd /srv/apps/shop-tools && docker compose exec -T api node dist/scripts/reset-demo.js
```

The web image builds without the API (pages are rendered per request); `API_URL`
is read at runtime.
