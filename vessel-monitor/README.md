# Smagalhães — Vessel Monitor POC

Projeto experimental **backend-only** de monitoramento dos navios presentes na programação diária (sem frontend e sem integração com a produção do Smagalhaes).

Stack: Cloudflare Workers, D1 e Cron Triggers. Importação inicial em JSON normalizado; adapters de teste (fixture) e inspeção de conectividade dos portais. Não afirma que páginas públicas fornecem API; não produz gate, ETA ou deadline inventados.

Consulte `docs/POC.md` para fluxo e implantação.