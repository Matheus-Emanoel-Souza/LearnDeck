# Roadmap — LearnDeck

Desenvolvimento incremental: uma etapa por vez, testada antes de avançar para a próxima.
Marcado como funcionalidade implementada apenas depois de rodar e ser validada.

## Legenda

- [x] Concluído
- [ ] Pendente

## Fase 0 — Fundação do projeto ✅

- [x] Documentação inicial (`docs/architecture.md`, `docs/database.md`, `docs/decisions.md`, `docs/roadmap.md`)
- [x] Scaffold Electron + Vite + React + TypeScript (`electron-vite`)
- [x] Configuração de lint (ESLint)
- [x] Camada de banco: conexão SQLite + runner de migrations + `001_init.sql` com o schema completo
- [x] Janela principal abre e mostra uma tela placeholder ("LearnDeck" + versão + workspace carregado do SQLite)
- [x] Commit: *"chore: scaffold do projeto Electron+React+TS+SQLite"*

## Fase 1 — Grupos e Cards (CRUD básico, sem Kanban visual ainda) ✅

- [x] Repositório + service de `Group` (criar, listar em árvore, editar, soft-delete)
- [x] Repositório + service de `Card` (criar, listar por grupo, editar, soft-delete)
- [x] IPC + API tipada (`window.api.groups.*`, `window.api.cards.*`)
- [x] Tela simples listando grupos e cards (sem colunas ainda) para validar a camada de dados
- [x] Commit: *"feat: painel inicial de grupos e cards (CRUD básico)"*

## Fase 2 — Kanban ✅

- [x] Colunas fixas: Backlog, A estudar, Estudando, Pausado, Revisar, Concluído
- [x] Mover card entre colunas (drag-and-drop nativo HTML5)
- [x] Toda mudança de status grava em `status_history` (regra já existia desde a Fase 1)
- [x] Reordenar cards dentro da coluna (`position`, drop sobre outro card insere antes dele)
- [x] Commit: *"feat: quadro Kanban visual com drag-and-drop entre colunas"*
- [x] Drag-and-drop confirmado pelo usuário: card movido entre colunas persiste após
      fechar e reabrir o app

## Fase 3 — Detalhe do card ✅

- [x] Tela de detalhe (inicialmente modal, depois promovida a tela inteira dedicada — ver Fase 3.1):
      descrição (edição), tags, comentários
- [x] Aba de histórico (linha do tempo de mudanças de status)
- [x] Commit: *"feat: visualização detalhada do card (Fase 3)"*

## Fase 3.1 — Tela cheia dedicada ao card ✅

- [x] Modal substituído por uma tela inteira (`CardDetailPage`), sem overlay, com botão de voltar
- [x] Navegação direta entre cards relacionados sem passar pelo quadro Kanban
- [x] Commit: *"feat: tela cheia dedicada ao card (substitui o modal)"*

## Fase 4 — Cronômetro ✅

- [x] Botão "Iniciar estudo" / "Parar" na tela do card
- [x] Regra: só uma sessão aberta por card por vez
- [x] Grava `study_sessions` (início, fim, duração)
- [x] Exibe tempo total acumulado no card (campo desnormalizado `total_study_seconds`)
- [x] Lista de sessões anteriores na tela do card
- [x] Commit: *"feat: backend de cronômetro, Pomodoro e relacionamentos entre cards"*

## Fase 5 — Pomodoro ✅

- [x] Configuração global (foco/pausa curta/pausa longa/ciclos), editável na própria tela do card
- [x] Timer de Pomodoro por card, ligado ao cronômetro (ciclo de foco = sessão de estudo)
- [x] Contagem de pomodoros concluídos por card (campo desnormalizado `pomodoros_completed`)
- [ ] Notificação sonora/visual ao trocar de ciclo (fica para depois — hoje só o contador visual)
- [x] Commit: *"feat: backend de cronômetro, Pomodoro e relacionamentos entre cards"*

## Fase 6 — Relacionamentos entre cards ✅

- [x] Criar/remover relação entre dois cards (`prerequisite_of`, `blocks`, `related_to`, `part_of`)
- [x] Exibir relações na tela do card (com link para navegar até o card relacionado), busca por
      título no workspace inteiro (não só no grupo atual)
- [x] Commit: *"feat: backend de cronômetro, Pomodoro e relacionamentos entre cards"*

## Fase 7 — Dashboard e métricas ✅

- [x] Quantidade de cards por status, agrupados em aberto/em andamento/concluído
- [x] Horas estudadas e Pomodoros concluídos (workspace inteiro)
- [x] Gráficos (barra empilhada de andamento + barras por status), paleta validada
      (contraste/daltonismo) com a skill de dataviz
- [ ] Horas por matéria (grupo) e evolução por semana (fica para depois)
- [x] Commit: *"feat: dashboard com contagens, horas estudadas e graficos"*

## Fase 8 — Empacotamento ✅ (adiantada — validada já na Fase 1)

- [x] `electron-builder` configurado para gerar instalador `.exe` (NSIS), self-contained
- [x] Script único de build (`npm run dist`) gerando o instalador em `dist/`
- [x] Instalador testado manualmente (assistente abre, detecta pt-BR, opção usuário/todos)
- [ ] Ícone próprio do app (hoje usa o ícone padrão do Electron — ver `build/`)
- [ ] Atalho no Menu Iniciar/Desktop e desinstalador testados até o fim (instalação completa)

## Fase 9 — Atualização automática ✅

- [x] `electron-updater` + publish via GitHub Releases (`electron-builder.yml`)
- [x] Checagem e download em segundo plano ao abrir o app (só em build empacotado, não em dev)
- [x] Diálogo perguntando se quer reiniciar agora ou aplicar a atualização ao fechar o app
- [x] Commit: *"feat: atualizacao automatica via GitHub Releases (electron-updater)"*

## Backlog futuro (fora do MVP, arquitetura já permite)

- Sincronização/backup em nuvem
- Múltiplos workspaces
- Exportação de dados (CSV/JSON)
- Atalhos de teclado globais, tray icon com timer visível
- Temas (claro/escuro)
