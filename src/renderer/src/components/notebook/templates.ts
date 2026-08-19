/** Conteúdo inicial oferecido quando o caderno de um card ainda está vazio —
 * ver CardNotebook. Puro Markdown (com as extensões do próprio caderno:
 * admonitions, diretivas de math/detalhes), sem nada específico do editor. */

export const BLANK_NOTEBOOK_MARKDOWN = ''

export const TECHNICAL_TEMPLATE_MARKDOWN = `## 1. Contexto do problema

_Descreva o que motivou este ticket: o que foi relatado, quando começou, quem é afetado._

## 2. Evidências e prints

_Cole prints (Ctrl+V) ou arraste imagens aqui._

## 3. Investigação realizada

_Passos seguidos para investigar a causa._

## 4. Consultas e códigos utilizados

\`\`\`sql
-- consultas usadas na investigação
\`\`\`

## 5. Causa identificada

_O que de fato causou o problema._

## 6. Solução aplicada

_O que foi feito para resolver._

## 7. Testes realizados

- [ ] Teste 1
- [ ] Teste 2

## 8. Pendências

_O que ainda falta, se houver._

## 9. Tickets relacionados

_Use o botão "Vincular ticket" na barra de ferramentas ou o comando \`/ticket\`._
`
