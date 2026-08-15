# Roadmap — LearnDeck

Desenvolvimento incremental: uma etapa por vez, testada antes de avançar para a próxima.
Marcado como funcionalidade implementada apenas depois de rodar e ser validada.

## Legenda

- [x] Concluído
- [ ] Pendente

## Fase 0 — Fundação do projeto

- [x] Documentação inicial (`docs/architecture.md`, `docs/database.md`, `docs/decisions.md`, `docs/roadmap.md`)
- [ ] Scaffold Electron + Vite + React + TypeScript (`electron-vite`)
- [ ] Configuração de lint/format (ESLint + Prettier)
- [ ] Camada de banco: conexão SQLite + runner de migrations + `001_init.sql` com o schema completo
- [ ] Janela principal abre e mostra uma tela placeholder ("LearnDeck" + versão)
- [ ] Commit: *"chore: scaffold do projeto Electron+React+TS+SQLite"*

## Fase 1 — Grupos e Cards (CRUD básico, sem Kanban visual ainda)

- [ ] Repositório + service de `Group` (criar, listar em árvore, editar, soft-delete)
- [ ] Repositório + service de `Card` (criar, listar por grupo, editar, soft-delete)
- [ ] IPC + API tipada (`window.api.groups.*`, `window.api.cards.*`)
- [ ] Tela simples listando grupos e cards (sem colunas ainda) para validar a camada de dados
- [ ] Commit: *"feat: CRUD de grupos e cards"*

## Fase 2 — Kanban

- [ ] Colunas fixas: Backlog, A estudar, Estudando, Pausado, Revisar, Concluído
- [ ] Mover card entre colunas (clique/drag-and-drop)
- [ ] Toda mudança de status grava em `status_history`
- [ ] Reordenar cards dentro da coluna (`position`)
- [ ] Commit: *"feat: quadro Kanban com histórico de status"*

## Fase 3 — Detalhe do card

- [ ] Modal/tela de detalhe: descrição (edição), tags, comentários
- [ ] Aba de histórico (linha do tempo de mudanças de status)
- [ ] Commit: *"feat: visualização detalhada do card"*

## Fase 4 — Cronômetro

- [ ] Botão "Iniciar estudo" / "Parar" no card e no detalhe
- [ ] Regra: só uma sessão aberta por card por vez
- [ ] Grava `study_sessions` (início, fim, duração)
- [ ] Exibe tempo total acumulado no card (campo desnormalizado `total_study_seconds`)
- [ ] Lista de sessões anteriores no detalhe do card
- [ ] Commit: *"feat: cronômetro de estudo por card"*

## Fase 5 — Pomodoro

- [ ] Configuração global (foco/pausa curta/pausa longa/ciclos) editável em Configurações
- [ ] Timer de Pomodoro por card, ligado ao cronômetro (ciclo de foco = sessão de estudo)
- [ ] Contagem de pomodoros concluídos por card (campo desnormalizado `pomodoros_completed`)
- [ ] Notificação sonora/visual ao trocar de ciclo
- [ ] Commit: *"feat: Pomodoro configurável por card"*

## Fase 6 — Relacionamentos entre cards

- [ ] Criar/remover relação entre dois cards (`prerequisite_of`, `blocks`, `related_to`, `part_of`)
- [ ] Exibir relações no detalhe do card (com link para navegar até o card relacionado)
- [ ] Commit: *"feat: relacionamentos entre cards"*

## Fase 7 — Dashboard e métricas (pós-MVP)

- [ ] Horas estudadas hoje / semana
- [ ] Horas por matéria (grupo) e por card
- [ ] Quantidade de Pomodoros, cards concluídos vs. pendentes
- [ ] Média diária de estudo, evolução por semana (gráfico)
- [ ] Commit: *"feat: dashboard de métricas"*

## Fase 8 — Empacotamento

- [ ] `electron-builder` configurado para gerar instalador `.exe` (NSIS), self-contained,
      seguindo o mesmo padrão do RadarTorres (instala em Program Files, atalho no Menu
      Iniciar, desinstalador registrado)
- [ ] Script único de build (`npm run dist`) gerando o instalador em `dist/`
- [ ] Commit: *"chore: pipeline de empacotamento do instalador"*

## Backlog futuro (fora do MVP, arquitetura já permite)

- Sincronização/backup em nuvem
- Múltiplos workspaces
- Exportação de dados (CSV/JSON)
- Atalhos de teclado globais, tray icon com timer visível
- Temas (claro/escuro)
