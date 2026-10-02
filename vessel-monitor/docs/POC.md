# POC: apenas backend (sem frontend)

## O que foi entregue
- Worker com API JSON e agendamento `*/30 * * * *`.
- D1: importações, reservas, navios ativos, observações, mudanças e execuções.
- Deduplicação por **terminal + navio + viagem**: várias reservas do mesmo navio resultam em um monitorado.
- Campo `imported_deadline` separado de `observed_deadline` (fonte externa não sobrescreve a programação).
- Teste de reachability HTTP nos portais públicos BTP, Ecoporto e Santos Brasil sem extrair dados indefinidos.
- Modo `mock` com observações configuráveis para provar a lógica antes de integrar fontes autorizadas.

## Limitações importantes
- `ADAPTER_MODE=probe` (padrão) **não coleta status real de navios**. Um HTTP 200 não prova API nem licença para scraping.
- Importação aceita **JSON normalizado**, não PDF/XLSX neste MVP. O exemplo foi transcrito manualmente do relatório; `40'` não significa automaticamente 40HC.
- `gate_open`, `eta`, `etb` e `deadline` externos só são preenchidos com dados reais após criar adapters verificados ou via mock identificado como simulação.
- Não altera status de reservas, não acessa o sistema Smagalhaes, não contorna CAPTCHA/login.
- Os exemplos não são uma confirmação dos valores em tempo real.

## Como executar localmente
1. `npm install`
2. `npx wrangler d1 create vessel_monitor` — copie o UUID da resposta e substitua `REPLACE_WITH_YOUR_D1_DATABASE_UUID` em `wrangler.jsonc`.
3. `cp .dev.vars.example .dev.vars` — crie um ADMIN_TOKEN aleatório (mínimo 24 caracteres); não versione tokens.
4. `npm run migrate`
5. `npm test`
6. `npm run dev`
7. `POST /api/program/import` com `Authorization: Bearer <ADMIN_TOKEN>`, `Content-Type: application/json` e JSON em `examples/import.json`.
8. `GET /api/vessels`, `POST /api/monitor/run`, `GET /api/changes`, `GET /api/runs`, `POST /api/sources/probe`.

Exemplo:
```sh
curl -X POST http://127.0.0.1:8787/api/program/import \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  --data-binary @examples/import.json
curl -H "Authorization: Bearer $ADMIN_TOKEN" http://127.0.0.1:8787/api/vessels
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" http://127.0.0.1:8787/api/monitor/run
```

### Teste de detecção de mudanças
Em `.dev.vars`, use `ADAPTER_MODE=mock`, `ALLOW_DEMO=true`, e configure `DEMO_OBSERVATIONS_JSON` para uma embarcação importada. Execute `/api/monitor/run` uma vez para estabelecer baseline. Altere a hora de `deadline` no JSON, reinicie `wrangler dev` e execute novamente. Consulte `/api/changes`: somente a segunda execução deve criar o evento. Esse dado é **simulado**.

## Deployment (somente após teste e autorização)
1. Acesse a conta Cloudflare com Wrangler autenticado (`npx wrangler login`).
2. Execute `npx wrangler d1 create vessel_monitor` na conta, substitua o UUID no config, e `npm run migrate:remote`.
3. Defina `ADMIN_TOKEN` via `npx wrangler secret put ADMIN_TOKEN`.
4. Deixe `ADAPTER_MODE=probe` e `ALLOW_DEMO=false` em produção para não publicar dados fictícios.
5. Execute `npm run deploy`; verifique cron, logs e `GET /health`.
6. Adapters com parsing real só devem ser habilitados após confirmação dos endpoints, formato e acesso permitido.

**Aviso:** Cron já está definido no código, mas só passa a executar após deploy real. O projeto não implanta automaticamente na sua conta Cloudflare.
