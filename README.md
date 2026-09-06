# Smagalhães Supabase — Teste

Este repositório recria uma versão isolada do **Controle de Embarque Smagalhães** para testar a resposta do Supabase sem afetar o sistema principal em produção.

## Objetivo

Validar, em ambiente separado:

- estrutura de tabelas no Supabase;
- motoristas e chapeiras;
- programação de embarque;
- confirmação de veículos carregados;
- chamada de motoristas;
- log de alterações;
- responsividade do painel;
- preparação para realtime.

## O que já existe neste teste

- Painel operacional.
- Controle de embarques.
- Nova programação de teste.
- Chamada de motoristas.
- Motoristas com alteração de status.
- Log de alterações gerado por ações operacionais.
- Destaque verde para embarques concluídos.
- Modo simulação local quando Supabase ainda não está configurado.
- Estrutura SQL inicial em `supabase/schema.sql`.

## Como rodar localmente

```bash
npm install
npm run dev
```

Depois acesse:

```txt
http://localhost:3000
```

## Como conectar ao Supabase

1. Crie um projeto no Supabase.
2. Abra o SQL Editor.
3. Execute o arquivo:

```txt
supabase/schema.sql
```

4. Copie `.env.example` para `.env.local`.
5. Preencha:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

6. Rode novamente:

```bash
npm run dev
```

## Observação importante sobre segurança

As políticas RLS do arquivo `schema.sql` estão propositalmente abertas para teste controlado.

Antes de produção, substituir por políticas baseadas em:

- usuário autenticado;
- nível de acesso;
- permissões por área;
- bloqueio de alterações indevidas.

## Produção atual

Este repositório não substitui o sistema atual. Ele serve apenas como laboratório para decidir se vale migrar do banco atual para Supabase.

Sistema principal permanece no repositório:

```txt
DevGBispo/Smagalhaes
```
