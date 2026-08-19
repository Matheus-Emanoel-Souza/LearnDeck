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
- [x] Ícone próprio do app no instalador Windows (commit: *"feat: icone personalizado no instalador Windows"*)
- [ ] Atalho no Menu Iniciar/Desktop e desinstalador testados até o fim (instalação completa)

## Fase 9 — Atualização automática ✅

- [x] `electron-updater` + publish via GitHub Releases (`electron-builder.yml`)
- [x] Checagem e download em segundo plano ao abrir o app (só em build empacotado, não em dev)
- [x] Diálogo perguntando se quer reiniciar agora ou aplicar a atualização ao fechar o app
- [x] Commit: *"feat: atualizacao automatica via GitHub Releases (electron-updater)"*

## Fase 10 — Colunas dinâmicas, anexos, prazos, subtarefas e notificações ✅

Pós-MVP, incrementos pedidos depois da Fase 9.

- [x] ID visível e copiável em cada card (`CardIdBadge`) — commit: *"feat: ID visivel e copiavel em cada card"*
- [x] Relacionar card por lista completa do workspace (além da busca por título) — commit: *"feat: relacionar card por lista completa (botao + selecao por clique)"*
- [x] Dashboard: gráfico de pizza (cards abertos por matéria) e gráfico de linha (cards abertos
      ao longo da semana) — commit: *"feat: dashboard com grafico de pizza (cards por materia) e linha (semana)"*
- [x] Ícone personalizado no instalador Windows — commit: *"feat: icone personalizado no instalador Windows"*
- [x] Tela de Configurações com verificação manual de atualizações — commit: *"feat: tela de Configuracoes com verificacao manual de atualizacoes"*
- [x] Colunas dinâmicas do quadro Kanban: criar, renomear, reordenar, duplicar, colorir, excluir
      (por workspace, substitui o enum fixo de status) — commit: *"feat: colunas dinamicas do quadro Kanban (criar, renomear, duplicar, colorir, excluir)"*
- [x] Anexar arquivos ao card: selecionar, abrir, remover — commit: *"feat: anexar arquivos ao card (selecionar, abrir, remover)"*
- [x] Calendário, prazos (card e subtarefa), subtarefas e central de notificações de atraso —
      commit: *"feat: calendario, prazos, subtarefas e central de notificacoes"*
- [x] UI ligada de ponta a ponta (quadro, dashboard, configurações, tela do card) — commit: *"feat: liga colunas dinamicas, prazos, subtarefas e notificacoes na UI"*
- [x] Menu de ações do card (⋮) no Kanban, substituindo a necessidade de abrir o card pra achar
      cronômetro/comentário/relação: Novo apontamento, Enviar comunicação, Agrupar ticket, Abrir
      ticket filho — atalhos para funcionalidades já existentes, sem lógica nova
- [x] Caderno do card: aba com editor Markdown visual (MDXEditor), modelo em branco/técnico,
      autosave com trava otimista e histórico de versões, imagens via anexo (colar/arrastar/
      selecionar), blocos de informação/aviso/erro/sucesso, seção recolhível, fórmulas KaTeX,
      diagramas Mermaid, gráficos, palavras-chave `#tag`, link entre cards, comandos `/` — ver
      `docs/architecture.md#caderno-do-card`

## Limitações conhecidas do Caderno (não implementadas nesta etapa)

- Redimensionar ou alinhar imagem: sem suporte nativo no MDXEditor, exigiria um nó de imagem
  customizado (fora do escopo de reaproveitar uma biblioteca pronta).
- Sem "usuário responsável pela última edição": o app não tem sistema de usuários (ver
  `docs/decisions.md`), só a data/hora da última atualização é mostrada.
- Testes automatizados do editor em si (colar imagem, alternar visual/Markdown, diagramas)
  ficaram só como roteiro manual (ver resumo da implementação) — o projeto não tinha framework
  de testes antes desta etapa; os testes automatizados novos (`npm test`) cobrem a lógica pura
  (repositório do caderno com trava otimista, parser de gráfico, conversão de `#tag`).

## Backlog futuro (fora do MVP, arquitetura já permite)

- Sincronização/backup em nuvem
- Múltiplos workspaces
- Exportação de dados (CSV/JSON)
- Atalhos de teclado globais, tray icon com timer visível
- Temas (claro/escuro)
- Caderno: redimensionamento/alinhamento de imagem, busca/filtro por `#tag` no workspace inteiro
