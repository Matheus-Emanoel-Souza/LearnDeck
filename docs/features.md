# Funcionalidades — LearnDeck

Ver progresso detalhado em [`roadmap.md`](./roadmap.md). Este documento resume o estado atual
em alto nível.

## Implementadas

- Grupos hierárquicos (matérias/projetos, subgrupos ilimitados)
- Criação de cards (título + descrição opcional) dentro de um grupo
- Quadro Kanban visual com colunas fixas e drag-and-drop (Backlog, A estudar, Estudando,
  Pausado, Revisar, Concluído)
- Histórico de mudanças de status por card (gravado automaticamente, com tela de visualização)
- Tela inteira dedicada ao card (não modal): descrição editável, tags, comentários, histórico
- Cronômetro individual por card (uma sessão aberta por vez, sessões anteriores listadas)
- Pomodoro configurável (foco/pausa curta/pausa longa/ciclos), ciclo de foco conta como sessão
  de estudo
- Relacionamentos entre cards (pré-requisito, bloqueia, relacionado, parte de), com busca por
  título no workspace inteiro e navegação direta entre cards relacionados
- Dashboard com contagem de cards por status (aberto/em andamento/concluído), horas estudadas,
  Pomodoros concluídos e gráficos
- Instalador `.exe` para Windows, funcionando totalmente offline, com dependências embutidas
- Atualização automática via internet (GitHub Releases, `electron-updater`)
- Layout em paleta lavanda/roxo claro, estilo app de estudos

## Pendentes (pós-MVP)

- Notificação sonora/visual ao trocar de ciclo do Pomodoro
- Horas por matéria (grupo) e evolução por semana no dashboard
- Ícone próprio do instalador (hoje usa o ícone padrão do Electron)
- Sincronização/backup em nuvem
- Múltiplos workspaces
- Exportação de dados
- Temas claro/escuro (hoje só claro)
