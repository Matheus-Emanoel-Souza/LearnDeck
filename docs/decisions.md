# Decisões técnicas — LearnDeck

## 2026-08-14 — Instalador NSIS falha sem "Modo de desenvolvedor" do Windows

**Contexto:** `npm run dist` empacota o app corretamente (`dist\win-unpacked\LearnDeck.exe`
funciona), mas a etapa final que gera o instalador único (`Setup.exe` via NSIS) falha ao
extrair uma dependência interna do `electron-builder` (`winCodeSign`), porque esse pacote
contém symlinks (arquivos `.dylib` do macOS, irrelevantes para o build Windows) e a conta do
Windows usada não tem o privilégio `SeCreateSymbolicLinkPrivilege` — que só é concedido a
processos elevados (admin) ou quando o **Modo de desenvolvedor** do Windows está ativado.

**Situação atual:** o app funciona perfeitamente como pasta portátil
(`dist\win-unpacked\LearnDeck.exe` + arquivos ao lado) — pode ser zipada e rodada em qualquer
Windows x64 sem instalação. Falta apenas o passo de empacotar isso em um único `Setup.exe`.

**Como resolver (ação do usuário, não automatizável sem privilégio elevado):** ativar
**Configurações → Privacidade e segurança → Para desenvolvedores → Modo de desenvolvedor**
(pede confirmação de administrador), depois rodar `npm run dist` de novo. Alternativa: rodar o
terminal "Como administrador" uma única vez para esse comando. Nenhuma mudança de código é
necessária — é puramente uma permissão do Windows.

**Resolvido em 2026-08-14:** usuário ativou o Modo de desenvolvedor e `npm run dist` passou a
gerar `dist\LearnDeck-Setup-0.1.0.exe` (NSIS) normalmente. Instalador testado (abre o
assistente, detecta idioma pt-BR do sistema, oferece instalação só para o usuário atual ou
para todos) — não foi executado até o fim para não alterar o sistema sem pedido explícito.

## 2026-08-14 — `postinstall` roda `electron-builder install-app-deps`

**Contexto:** ao rodar o app pela primeira vez, `better-sqlite3` (módulo nativo, compilado em
C++) falhou com `NODE_MODULE_VERSION` incompatível — ele tinha sido compilado contra o Node.js
do sistema (ABI 127) durante o `npm install`, não contra o Node.js embutido no Electron (ABI
125).

**Decisão:** script `postinstall` roda `electron-builder install-app-deps`, que recompila/baixa
o binário pré-compilado correto de `better-sqlite3` para a versão do Electron declarada em
`devDependencies`. Isso acontece automaticamente depois de todo `npm install`, sem passo manual.

**Sinal de que funcionou:** o app abre e mostra o workspace "Meus estudos" carregado do SQLite
(em vez de travar com `UnhandledPromiseRejectionWarning` ao abrir a conexão).

Registro das decisões relevantes, com o motivo e as alternativas descartadas. Novas decisões
importantes devem ser adicionadas aqui (mais recente no topo).

## 2026-08-14 — IDs como UUID (TEXT) em vez de INTEGER AUTOINCREMENT

**Decisão:** todas as tabelas usam `id TEXT PRIMARY KEY` com UUID v4 gerado na aplicação.

**Motivo:** o usuário pediu para pensar em sincronização/backup em nuvem no futuro sem
reconstruir a aplicação. IDs autoincrement colidem entre dispositivos diferentes; UUID não.
Custo: chaves um pouco maiores em disco/índice — irrelevante no volume de dados de um app de
estudos pessoal.

## 2026-08-14 — Campos desnormalizados em `cards` (`total_study_seconds`, `pomodoros_completed`)

**Decisão:** manter esses dois contadores como cache em `cards`, recalculados pelo
`TimerService`/`PomodoroService` a cada evento, em vez de sempre agregar `study_sessions`/
`pomodoros` em runtime.

**Motivo:** o Kanban vai renderizar N cards ao mesmo tempo; evitar N agregações SQL a cada
render/atualização de tela. `study_sessions`/`pomodoros` continuam sendo a fonte da verdade —
os campos podem ser recalculados a qualquer momento (rotina simples a adicionar se algum dia
os dois números saírem de sincronia, ex.: após uma edição manual no banco).

**Alternativa descartada:** view SQL agregando em tempo real — mais "correta" em teoria, mas
sem necessidade real no volume de dados de um app pessoal, e complica migrations futuras.

## 2026-08-14 — Electron + electron-vite em vez de Tauri

**Decisão:** Electron como runtime desktop, com `electron-vite` para o build.

**Motivo:** o usuário pediu explicitamente para priorizar o ecossistema Node.js. Tauri exigiria
lógica nativa em Rust para qualquer coisa fora de UI pura, o que não se encaixa no pedido.
Electron também tem o precedente do próprio padrão de projeto do usuário (RadarTorres usa
WPF/.NET nativo do Windows — decisão equivalente: priorizar a stack que o time já domina).

**Trade-off aceito:** bundle final maior (~80-120 MB) e maior consumo de RAM que uma alternativa
nativa. Aceitável para um app de uso pessoal, single-window, sem processamento pesado.

## 2026-08-14 — SQL puro + `better-sqlite3`, sem ORM

**Decisão:** repositórios com SQL explícito, sem Prisma/TypeORM/Sequelize.

**Motivo:** `better-sqlite3` é síncrono e roda só no processo main (sem múltiplos clientes
concorrentes) — o principal ganho de um ORM assíncrono (pool de conexões, migrations
automáticas complexas) não se aplica aqui. Menos dependências pesadas no instalador final.

**Quando revisitar:** se o schema crescer muito ou precisarmos de queries dinâmicas complexas
(ex.: filtros arbitrários no dashboard), migrar para **Drizzle ORM** é o caminho natural — ele
também usa `better-sqlite3` por baixo, então dá para migrar tabela por tabela sem reescrever
tudo.

## 2026-08-14 — Nome do projeto: LearnDeck (não StudyFlow)

**Decisão:** o repositório já existia como `LearnDeck` (pasta e `git init` feitos antes desta
conversa). Mantido esse nome como identidade oficial do produto, em vez de renomear para
"StudyFlow" (nome usado na primeira descrição do projeto).

**Motivo:** evitar inconsistência entre nome do repositório/pasta e nome exibido no app;
confirmado com o usuário.
