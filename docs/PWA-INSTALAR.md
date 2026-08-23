# Botão "Instalar como app" (PWA)

Como o build web oferece instalação na tela inicial / área de trabalho, por que o
código é do jeito que é, e como reaproveitar isso em outro projeto.

Só existe no **build web**. O Electron não passa por nada disso — o cartão é montado
em `src/web/main.tsx`, fora de `App`, e o CSS é importado pelo próprio componente.
Nenhum arquivo compartilhado com o desktop foi tocado (ver [WEBAPP.md](./WEBAPP.md)).

---

## A ideia central: são dois caminhos incompatíveis

Não existe uma forma única de instalar um PWA. O componente lida com duas realidades:

| | Chromium (Android, Chrome/Edge desktop) | Safari no iPhone |
|---|---|---|
| API de instalação | `beforeinstallprompt` | **não existe** |
| Dá para abrir o diálogo por código? | sim | não |
| O que o app faz | botão que instala de verdade | **ensina** o caminho manual |

No iPhone, nenhum site consegue se instalar sozinho — a Apple não expõe isso. Tudo o
que dá para fazer é mostrar "toque em Compartilhar → Adicionar à Tela de Início".

---

## As peças

### 1. `src/web/public/manifest.webmanifest`

```json
{
  "name": "LearnDeck",
  "short_name": "LearnDeck",
  "start_url": ".",
  "scope": ".",
  "display": "standalone",
  "icons": [{ "src": "icon.png", "sizes": "1024x1024", "type": "image/png", "purpose": "any" }]
}
```

- **`display: "standalone"`** é o que faz abrir sem barra de endereço. Sem isso, vira aba comum.
- **`start_url` e `scope` relativos (`"."`)** — o app é servido em `/LearnDeck/` no GitHub
  Pages, não na raiz. Com `"/"` quebraria.
- **`sizes` com o valor real** (`1024x1024`, não `"any"`). `"any"` é para vetor; com PNG,
  o Chrome quer um tamanho declarado (≥ 512px) para considerar o app instalável.

### 2. Meta tags no `src/web/index.html`

```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black" />
<meta name="apple-mobile-web-app-title" content="LearnDeck" />
<link rel="apple-touch-icon" href="./icon.png" />
```

O iOS mais antigo **ignora o manifest** e usa estas tags. Sem `apple-mobile-web-app-capable`,
o atalho na tela inicial abre com a barra do Safari em vez de tela cheia.

Dois detalhes:

- `apple-touch-icon` **precisa ser PNG**. O iOS não aceita SVG aqui — o resultado seria
  um ícone branco ou um print da página.
- Usamos `black` no status bar, não `black-translucent`. O translúcido faz o conteúdo
  passar por baixo do relógio/notch, o que exigiria `viewport-fit=cover` e
  `env(safe-area-inset-top)` no layout. Como o layout atual não trata isso, `black` evita
  sobreposição sem mexer em nada.

### 3. Service worker

Já registrado em `src/web/main.tsx`. Além do offline, **a presença dele é critério de
instalabilidade** no Chrome — sem service worker, `beforeinstallprompt` nunca dispara.

### 4. O componente — `src/web/InstallPrompt.tsx`

O trecho que faz a mágica:

```ts
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault()                     // 1. cancela a barrinha padrão do Chrome
  setDeferred(event as BeforeInstallPromptEvent) // 2. GUARDA o evento
  setMode('chromium')                        // 3. mostra o NOSSO cartão
})
```

O Chrome dispara esse evento quando decide que o site é instalável. Sem
`preventDefault()`, ele mostra uma barrinha genérica. Ao cancelar e **guardar o evento
num estado**, o app assume o controle: mostra o próprio cartão, no próprio tema, e
dispara o diálogo nativo quando quiser.

Depois, no clique:

```ts
await deferred.prompt()      // abre o diálogo nativo do navegador
await deferred.userChoice    // espera aceitar/recusar
setDeferred(null)            // descarta — serve UMA vez só
```

E o caminho do iPhone, que é só instrução:

```ts
if (isIOS()) setMode('ios')
```

---

## Regras que quebram quem implementa isso pela primeira vez

1. **`prompt()` só funciona dentro de um clique real do usuário.** Chamar no carregamento
   da página é ignorado pelo navegador.
2. **O evento é de uso único.** Depois de `prompt()`, zere a variável e espere um novo
   `beforeinstallprompt`.
3. **Precisa de HTTPS** (ou `localhost`). Abrir o arquivo direto nunca vai funcionar.
4. **O Chrome faz throttle do evento.** Depois que ele dispara uma vez, pode não
   redisparar tão cedo no mesmo perfil — mesmo limpando o `localStorage` do app. Não
   confunda isso com bug no código.

---

## Quando o cartão NÃO aparece (de propósito)

```ts
if (isStandalone()) return                                  // já está instalado
if (localStorage.getItem(DISMISSED_KEY) === '1') return      // já dispensou antes
```

`isStandalone()` checa duas coisas porque cada plataforma expõe de um jeito:

```ts
const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true
const displayMode = window.matchMedia?.('(display-mode: standalone)').matches === true
```

`navigator.standalone` é proprietário do Safari; `display-mode: standalone` é o padrão.

O "dispensar" grava `learndeck.installDismissed` no `localStorage` — para limpar durante
testes:

```js
localStorage.removeItem('learndeck.installDismissed'); location.reload()
```

Note que clicar em **Instalar** não grava essa flag; só o **✕** grava.

---

## Como testar

```bash
npm run build:webapp
npx vite preview --config vite.web.config.ts --port 8901
# abre http://localhost:8901/LearnDeck/
```

- **O cartão não apareceu?** Chrome → DevTools → **Application → Manifest**. Ele lista
  exatamente qual critério de instalabilidade está faltando.
- **Testar o caminho do iPhone no desktop:** DevTools → Device Toolbar (Ctrl+Shift+M) →
  escolher um iPhone → recarregar. O `isIOS()` passa a dar `true` e o cartão troca para
  a versão com instruções.
- **Testar o componente sem depender da heurística do Chrome:** dispare o evento na mão
  pelo console —

  ```js
  const ev = new Event('beforeinstallprompt')
  ev.prompt = async () => console.log('prompt() chamado')
  ev.userChoice = Promise.resolve({ outcome: 'accepted' })
  window.dispatchEvent(ev)
  ```

---

## Reaproveitar em outro projeto

O mínimo é:

1. `manifest.webmanifest` com `display: standalone`, `start_url`/`scope` relativos e
   ícone PNG com `sizes` declarado
2. As meta tags `apple-*` no `<head>`, com `apple-touch-icon` em PNG
3. Um service worker registrado, mesmo que trivial:
   ```js
   self.addEventListener('fetch', () => {})
   ```
4. `InstallPrompt.tsx` + `installPrompt.css` — são genéricos, só trocar os textos e a
   chave do `localStorage`
5. Servir por HTTPS

---

## Limitação conhecida

O caminho do Chromium foi testado de ponta a ponta (evento, cartão, `prompt()`,
dispensar e persistência). O caminho do iPhone (`mode === 'ios'`) **não foi executado**:
foi só revisado no código. A diferença entre os dois é um `if` na user agent e o texto
exibido, mas a verificação real ainda falta — use o Device Toolbar do DevTools ou um
iPhone antes de confiar nele.
