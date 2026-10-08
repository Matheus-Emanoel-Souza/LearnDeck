# LearnDeck Web — Cadastro, Login, Limites e Painel Admin (Fase 1)

> Plano salvo em 2026-10-08 pra ajuste futuro. Ainda não implementado.

## Contexto

O LearnDeck hoje é 100% local: desktop via Electron+better-sqlite3 (um arquivo
por máquina) ou PWA via sql.js+IndexedDB (um banco por navegador) — ver
`docs/architecture.md` e `docs/WEBAPP.md`. Nenhuma das duas versões tem
conceito de usuário, login ou servidor (`docs/database.md` é explícito: "Não
há tabela de usuários").

O pedido agora é transformar isso num site multiusuário: cadastro por
e-mail+senha com código de verificação, redefinição de senha por código,
limite de uso por pessoa, uma trava de capacidade global e um painel admin.
Isso é uma mudança de arquitetura, não uma feature — exige banco multiusuário
real e um backend com servidor, coisas que não existem hoje no projeto.

Decisões já confirmadas com o usuário:
- Hospedagem: **Vercel** (deploy) + **Supabase** (Postgres gerenciado).
- E-mail transacional: **Resend** (envio dos códigos).
- Limite por usuário: **300 cards** + **50MB de anexos** (preparado agora,
  **aplicado só na Fase 2**, quando os cards existirem no site).
- Limite global: **500 usuários cadastrados** — novo cadastro é bloqueado
  automaticamente ao atingir o limite.
- Trava manual extra: botão no painel admin pra travar **todo CRUD** (além
  do bloqueio automático de cadastro), pro admin acionar na mão.
- "Forçar redefinir senha" no admin = dispara o **mesmo e-mail de código**
  do fluxo "esqueci minha senha" (admin nunca vê/define a senha do usuário).
- Usuário não tem conta no Supabase/Resend/Vercel ainda — precisa de guia
  passo a passo.
- **Escopo desta fase**: só autenticação + limites + trava + painel admin +
  uma tela básica pós-login ("Bem-vindo, {nome}"). Kanban/cronômetro/
  Pomodoro/caderno ficam pra uma fase futura (portar depois, sem redesenhar
  o que for construído agora).

## Abordagem

Novo app **Next.js 14 (App Router) + TypeScript** em `LearnDeck/web/`,
projeto independente (`package.json` próprio) — não toca em nada de
`src/main`, `src/preload`, `src/renderer` ou `src/web` do Electron/PWA
existentes (mesma disciplina que `docs/WEBAPP.md` já usa: zero risco pra
versão desktop).

Banco: Postgres no Supabase, acessado via **Drizzle ORM** (`drizzle-orm` +
driver `postgres`) — `docs/architecture.md` já registra Drizzle como "o
caminho natural" se o projeto precisasse de sync/multiusuário no futuro, e
ele mantém SQL explícito/auditável, no mesmo espírito dos repositórios atuais.

Sessão: JWT assinado (lib `jose`) em cookie `httpOnly`+`secure`, sem tabela
de sessões — simples o suficiente pra 500 usuários, sem estado extra pra
gerenciar. Logout = apaga o cookie. Trocar a senha invalida sessões antigas
comparando `iat` do token com `users.password_changed_at`.

Senha: hash com `bcryptjs`.

### Schema (Postgres, Drizzle)

- `users`: `id` uuid pk, `name`, `email` (unique), `phone`, `password_hash`,
  `role` (`user`|`admin`, default `user`), `email_verified_at` (nullable),
  `password_changed_at`, `card_count` int default 0, `storage_bytes_used`
  bigint default 0 (as duas últimas só preparam a Fase 2), `created_at`.
- `email_codes`: `id`, `user_id` (fk cascade), `code` (6 dígitos),
  `purpose` (`signup`|`reset`), `expires_at`, `consumed_at` (nullable),
  `created_at`. Índice em `(user_id, purpose)`.
- `app_settings`: linha única (`id boolean primary key default true`),
  `max_users` int default 500, `writes_locked` boolean default false,
  `updated_at`.

### Fluxos de API (`web/src/app/api/auth/*`, `web/src/app/api/admin/*`)

1. **Signup** `POST /api/auth/signup` — valida corpo (zod), rejeita se
   `writes_locked` ou se `COUNT(users) >= max_users` (mensagens claras e
   diferentes pra cada caso), rejeita e-mail já verificado, cria usuário
   (`email_verified_at = NULL`), gera código de 6 dígitos (`email_codes`,
   `purpose='signup'`, expira em 15min), envia por Resend.
2. **Verificar cadastro** `POST /api/auth/verify-signup` — confere código
   não expirado/não consumido, marca `email_verified_at`, consome o código,
   abre sessão (login automático). Se o e-mail bater com `ADMIN_EMAIL` (env
   var), promove `role='admin'` nesse momento — é assim que o primeiro admin
   nasce, sem precisar editar banco manualmente.
3. **Login** `POST /api/auth/login` — exige `email_verified_at` preenchido,
   compara senha com bcrypt, abre sessão. **Não** é bloqueado por
   `writes_locked` (senão ninguém, nem o admin, conseguiria entrar pra
   destravar).
4. **Esqueci a senha** `POST /api/auth/forgot` — gera código
   `purpose='reset'` e envia e-mail; resposta idêntica exista ou não o
   e-mail (evita descobrir quem está cadastrado).
5. **Redefinir senha** `POST /api/auth/reset` — valida código, grava novo
   hash, `password_changed_at = now()` (invalida sessões antigas), consome
   código.
6. `GET /api/auth/me`, `POST /api/auth/logout`.
7. **Admin** `GET /api/admin/users` (lista nome/e-mail/verificado/criado em),
   `POST /api/admin/users/:id/force-reset` (reaproveita a lógica do item 4),
   `GET`/`PATCH /api/admin/settings` (`max_users`, `writes_locked`). Todas
   exigem `role='admin'` (checado em `web/src/middleware.ts`, que também
   protege `/app/*` exigindo sessão válida).

### Páginas (`web/src/app/*`)

`login`, `signup`, `verify` (digitar código), `forgot-password`,
`reset-password`, `app/page.tsx` (placeholder "Bem-vindo, {nome}" +
logout — é só a base pra Fase 2 plugar o Kanban), `admin/page.tsx` (tabela
de usuários + botão "Forçar redefinição" por linha), `admin/settings/page.tsx`
(toggle de trava + campo de limite).

### E-mails (Resend)

`web/src/lib/email/templates.ts`: dois templates HTML simples (código de
cadastro, código de redefinição) — texto claro, sem necessidade de domínio
verificado pra testar (Resend libera envio pro próprio e-mail do dev em
sandbox; domínio verificado só é preciso pra mandar pra qualquer destinatário
em produção — isso entra no guia de setup).

### Guia de setup (novo `docs/SAAS-SETUP.md`, ainda não criado)

Passo a passo pra quem nunca usou nenhuma das 3 contas:
1. Supabase: criar projeto grátis, copiar a connection string do pooler
   (porta 6543) pra `DATABASE_URL`.
2. Resend: criar conta grátis, gerar API key pra `RESEND_API_KEY`; nota
   sobre domínio verificado pra produção.
3. Vercel: criar conta grátis, importar o repo (ou só a pasta `web/`),
   configurar as env vars (`DATABASE_URL`, `RESEND_API_KEY`, `JWT_SECRET`,
   `ADMIN_EMAIL`), deploy.
4. Rodar `npm run db:push` (Drizzle) uma vez contra o `DATABASE_URL` pra
   criar as tabelas.

## Arquivos principais a criar

```
LearnDeck/web/
  package.json, tsconfig.json, next.config.ts, drizzle.config.ts
  src/db/schema.ts, src/db/client.ts
  src/lib/auth/{password,session,codes}.ts
  src/lib/email/{resend,templates}.ts
  src/lib/limits.ts
  src/middleware.ts
  src/app/{login,signup,verify,forgot-password,reset-password}/page.tsx
  src/app/app/page.tsx
  src/app/admin/page.tsx
  src/app/admin/settings/page.tsx
  src/app/api/auth/{signup,verify-signup,login,logout,forgot,reset,me}/route.ts
  src/app/api/admin/users/route.ts
  src/app/api/admin/users/[id]/force-reset/route.ts
  src/app/api/admin/settings/route.ts
docs/SAAS-SETUP.md
```

## Verificação

Sem servidor/contas ainda — não dá pra rodar fim a fim até o usuário criar
Supabase/Resend/Vercel e colar as chaves num `.env.local` (não versionado).
Depois disso, roteiro de teste manual (o usuário faz, por política do
projeto — nunca eu abrindo navegador):

1. `npm install && npm run db:push && npm run dev` em `LearnDeck/web/`.
2. Cadastrar um usuário → checar e-mail → confirmar código → cair logado em
   "Bem-vindo".
3. Logout → login com a mesma conta.
4. "Esqueci a senha" → código por e-mail → redefinir → login com a senha
   nova (a antiga deve falhar).
5. Promover o primeiro admin: cadastrar com o e-mail igual a `ADMIN_EMAIL`,
   confirmar o código — deve logar como admin. Acessar `/admin`, ver a
   lista, clicar "Forçar redefinição" num outro usuário de teste e confirmar
   que o e-mail chega.
6. Ligar a trava manual em `/admin/settings` → confirmar que login ainda
   funciona mas qualquer ação de escrita futura (quando existir) será
   bloqueada (nesta fase não há CRUD de dados ainda pra testar isso além do
   próprio cadastro, que também respeita a trava).
7. Testar o limite global: baixar `max_users` pra 1 em `/admin/settings` e
   confirmar que um segundo cadastro é recusado com mensagem clara.
