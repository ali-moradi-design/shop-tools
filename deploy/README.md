# Deploy

Live at https://shop-tools.ali-moradi-develop.com. One VPS, host Nginx in front, every app in
`/srv/apps/<name>`. The reusable deploy comes from
[deploy-kit](https://github.com/ali-moradi-design/deploy-kit) (`deploy-app.yml` + `server/deploy-app`).

- `compose.yaml` — MySQL 8.4 (no published port, internal network, 128 MB buffer pool,
  `performance_schema` off), API (applies the migrations on start) and web (the only published
  port, `127.0.0.1:3105`). API and web run read-only, non-root, with `no-new-privileges` and
  memory limits. Images: `ghcr.io/ali-moradi-design/shop-tools-{api,web}:${IMAGE_TAG}`.
- `.env.example` — the names in `/srv/apps/shop-tools/.env` (mode 600, owner `deploy`).
- `nginx.conf` — `/etc/nginx/sites-available/shop-tools`; `nginx -t` before
  `systemctl reload nginx`, then `certbot --nginx --redirect -d shop-tools.ali-moradi-develop.com`.

## How a change reaches the server

PR → CI green → squash merge. CI on `main` then starts `.github/workflows/docker.yml`
(`workflow_run`): it builds and pushes both images tagged with the commit SHA, and the deploy job
connects with a key whose forced command is `deploy-app shop-tools`. The server sets `IMAGE_TAG`,
pulls, runs `docker compose up -d --wait` and rolls back by itself when the new containers are
not healthy. The deploy job then checks `/`, `/robots.txt` and `/api/health` through Nginx.

## Once, after the first deploy

```bash
cd /srv/apps/shop-tools && sudo -u deploy docker compose exec -T api node dist/scripts/seed.js
```

Nightly demo reset (crontab of `deploy`):

```cron
20 3 * * * cd /srv/apps/shop-tools && docker compose exec -T api node dist/scripts/reset-demo.js 2>&1 | logger -t shop-tools-reset
```

Manual rollback:

```bash
cd /srv/apps/shop-tools && sudo -u deploy cp .env.previous .env && sudo -u deploy docker compose up -d --wait
```
