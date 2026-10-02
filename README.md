# Smagalhaes Vessel Monitor — standalone Worker deployment

Branch isolated from `main` of smagalhaes-supabase. This branch deliberately contains only a Cloudflare Worker backend, not the Next.js site.

Deploy as a **new Cloudflare Worker**, choose repo `DevGBispo/smagalhaes-supabase`, branch `poc/vessel-monitor-standalone`, root directory `/`, build `npm run build`, deploy `npx wrangler deploy`. Worker name `smagalhaes-vessel-monitor-poc`.

**Stage 1:** `GET /health` works even without a D1 binding. Protected API routes return 503 until D1 is attached and `ADMIN_TOKEN` set. `ADAPTER_MODE=probe` performs reachability checks only; never claims ship data is collected. Automated cron only performs empty database reads after D1 binding; without D1 it fails harmlessly but creates logs. If desired disable cron in dashboard until DB is attached.

**Stage 2:** Create D1 database `vessel_monitor_poc` in Cloudflare, apply `migrations/0001_init.sql` using D1 console or Wrangler, add Worker D1 binding `DB`, set secret `ADMIN_TOKEN` (at least 24 random characters, do not commit). **Never replace a production binding.** Test `/health`, import sample via `/api/program/import`, and `/api/monitor/run`.

See docs/POC.md for data format. No frontend; no terminal scraping implemented yet.
