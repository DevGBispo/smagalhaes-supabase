# SMAGALHAES Monitor — Cloudflare Worker

## Teste pelo celular
Deploy esta branch como **novo** Worker via Cloudflare (nao alterar Smagalhaes original).
- Entrypoint: `worker.js`; branch: `poc/vessel-monitor-mobile`
- Nome: `smagalhaes-vessel-monitor-poc`
- Build command: deixe vazio; Deploy: `npx wrangler deploy`
- Nao e projeto Next.js; nao execute `next build`, OpenNext ou `npm run build`.

**Seguranca:** antes de abrir o endereco, configure secret Cloudflare `ACCESS_PASSWORD` com pelo menos 20 caracteres. Login HTTP Basic: usuario `monitor` e a senha secreta escolhida no painel. Sem segredo configurado, a API retorna 503 (falha fechada); `/health` permanece publico. Nao coloque a senha no GitHub.

Rota `/` exibe a pagina responsiva; `/health` verifica Worker; `/api/navios`, `/api/navio`, `/api/consultar` operam os dados do relatorio de 02/10/2026. A programacao esta embutida no codigo para validacao e nao muda automaticamente. A consulta on-demand ao Ecoporto e real, se o site permitir acesso e conservar tabela HTML de 17 colunas. BTP, Santos Brasil, DP World nao possuem leitor nesta versao.

**Limites:** os resultados da Ecoporto sao armazenados SOMENTE na memoria temporaria de cada instancia Worker (cache de ate 5 min). Nao ha historico duravel, monitoramento independente e nem importacao publica de novos PDF/JSON. Para isso, precisaremos vincular D1 e autenticar endpoints de administracao. Endpoint `/api/consultar` retorna falha real quando portal inacessivel.