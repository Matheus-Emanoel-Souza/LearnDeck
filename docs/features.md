# Funcionalidades — LearnDeck

Ver progresso detalhado em [`roadmap.md`](./roadmap.md). Este documento resume o estado atual
em alto nível.

## Implementadas

- Grupos hierárquicos (matérias/projetos, subgrupos ilimitados)
- Criação de cards (título + descrição opcional) dentro de um grupo
- Quadro Kanban visual com **colunas dinâmicas** por workspace: criar, renomear, reordenar
  (arrastar cabeçalho), colorir, duplicar e excluir (só se vazia) — menu de contexto (botão
  direito) no cabeçalho da coluna
- Drag-and-drop nativo de cards entre e dentro das colunas
- Histórico de mudanças de status por card (gravado automaticamente, com tela de visualização)
- Tela inteira dedicada ao card (não modal): descrição editável, tags, comentários, histórico,
  subtarefas, arquivos, prazo
- **Menu de ações do card (⋮)** no canto do card do Kanban: Novo apontamento (cronômetro),
  Enviar comunicação (comentário), Agrupar ticket (relacionar) e Abrir ticket filho (card
  relacionado) — atalhos que abrem a tela do card já na seção correspondente, sem lógica nova
- ID visível e copiável em cada card (`CardIdBadge`)
- Cronômetro individual por card (uma sessão aberta por vez, sessões anteriores listadas)
- Pomodoro configurável (foco/pausa curta/pausa longa/ciclos), ciclo de foco conta como sessão
  de estudo
- Relacionamentos entre cards (pré-requisito, bloqueia, relacionado, parte de), com busca por
  título ou por lista completa do workspace, e navegação direta entre cards relacionados
- Anexar arquivos ao card: selecionar, abrir com o programa padrão do sistema, remover
- Prazo opcional por card (data + hora) e por subtarefa, com indicação visual de atraso
- Subtarefas por card, com prazo próprio e marcação de concluída
- Calendário (`CalendarPage`): visão mensal de cards e subtarefas com prazo, clique abre o
  card correspondente
- Central de notificações: alertas de prazos vencidos (card ou subtarefa), deduplicados,
  marcáveis como lidos, com sininho de contagem não lida no cabeçalho
- Dashboard com contagem de cards por status (aberto/em andamento/concluído), horas estudadas,
  Pomodoros concluídos, gráfico de pizza (cards abertos por matéria) e gráfico de linha (cards
  abertos ao longo da semana)
- Tela de Configurações com verificação manual de atualizações
- Instalador `.exe` para Windows, com ícone próprio, funcionando totalmente offline, com
  dependências embutidas
- Atualização automática via internet (GitHub Releases, `electron-updater`)
- Layout em paleta lavanda/roxo claro, estilo app de estudos

## Pendentes (pós-MVP)

- Notificação sonora/visual ao trocar de ciclo do Pomodoro (hoje a central de notificações só
  cobre prazos vencidos, não ciclos de Pomodoro)
- Horas por matéria (grupo) e evolução por semana no dashboard (a linha atual é do workspace
  inteiro, não por matéria)
- Sincronização/backup em nuvem
- Múltiplos workspaces
- Exportação de dados
- Temas claro/escuro (hoje só claro)
