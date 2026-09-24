# OChart Legacy — Auditoria

Status: **fase 1 — inventário estrutural concluído**.

O repositório legado `4avalonuse/ochart` permanece intocado.

## Decisão de infraestrutura

O Ochama **pode e deve reutilizar a infraestrutura já comprovada quando isso fizer sentido**. Não vamos reconstruir o que não precisa ser reconstruído.

Podem ser reaproveitados, após validação de contrato:

- Cloudflare Worker `oraculum-data-api`;
- banco D1 e catálogo de datasets;
- estrutura de candles;
- APIs Yahoo / Binance.US já existentes;
- cache/backend quando útil;
- testes de contrato de dados;
- bibliotecas externas já utilizadas pelo gráfico.

O que será reconstruído é principalmente a **organização e os contratos do frontend**, não o backend por princípio.

## Inventário inicial

### Entrada / orquestração

`src/app.js`

- Responsabilidade declarada: bootstrap.
- Problema observado: ainda concentra inicialização, FIT, drawer, foco, eventos de UI, desenhos, diagnósticos, toast e teclado.
- Direção: `app/` com bootstrap/lifecycle/controllers de UI separados.

### Chart

`src/core/chart-engine.js`

- Coordena criação, atualização, escala, tipo, desenhos, overlays e viewport.
- Está relativamente coeso, mas ainda conhece detalhes de desenhos e validação.
- Direção: `chart/engine.js` como coordenador fino, com contratos explícitos.

`src/core/chart-config.js`

- Construção da configuração Chart.js.
- Direção: `chart/config.js`.

`src/core/chart-datasets.js`

- Conversão de dados internos para datasets Chart.js.
- Direção: `chart/datasets.js`.

`src/core/chart-plugins.js`

- Configuração dos plugins do Chart.js.
- Direção: `chart/plugins.js`.

`src/core/renderer.js`

- 13 linhas; hoje é uma camada muito fina sobre o engine.
- Não deve virar abstração artificial apenas para preencher uma pasta.

### Viewport / interação

`src/core/chart-zoom.js`

- **423 linhas**.
- É o maior sinal estrutural da primeira rodada.
- Mistura viewport X/Y, pan, escala, pinch, hit-test do eixo, FIT e estado de gesto.
- Direção: separar matemática/viewport de reconhecimento de gesto e estado de interação.

`src/core/y-viewport.js`

- 180 linhas.
- Responsabilidade relativamente clara: matemática do viewport Y linear/log.
- Direção: preservar conceito e avaliar se o contrato deve virar parte de `viewport/`.

`src/core/interaction-manager.js`

- 161 linhas.
- Já representa a direção correta: uma camada dona da entrada física.
- Direção: evoluir para `interaction/`, separando pointer/gestures/hit-test somente quando houver responsabilidade real.

### Dados

`src/core/data-loader.js`

- 99 linhas.
- Porta de entrada de dados e fallback/cache.
- Direção: `data/loader.js`.

`src/core/sanitizer.js`

- **533 linhas**.
- É o segundo maior alerta.
- Sanitização parece carregar mais regras do que uma função de limpeza simples deveria carregar.
- Direção: auditoria detalhada antes de dividir. Separar contrato OHLC, normalização, validação e estatísticas somente se as responsabilidades realmente estiverem misturadas.

`src/core/api-source.js`, `api-config.js`, `api-health.js`

- Responsabilidades de comunicação/configuração/health.
- Direção: `data/sources/` + infraestrutura de API, sem permitir que a camada de dados conheça UI.

`src/core/dataset-utils.js`

- 29 linhas; utilitário pequeno e coeso.
- Pode permanecer utilitário ou entrar no domínio de catálogo/dataset.

`src/core/sync.js`

- Coordena fetch → sanitize → janela → render → status → HUD → toast.
- **É um dos principais pontos de acoplamento encontrados.**
- Direção: quebrar em fluxo de dados + estado + apresentação. `sync` não deveria atualizar DOM diretamente nem conhecer HUD/toast.

### Drawings

`src/ui/drawing-tools.js`

- 233 linhas.
- Facade/orquestrador razoável, mas ainda mistura estado, UI, operações e integração com engine.
- Direção: `drawings/` para domínio e `ui/toolbar` para apresentação.

`drawing-manager.js`

- 271 linhas.
- Mantém objetos, histórico, geometria, hit-test e conversão para annotations.
- Direção: separar modelo/coleção, geometria e hit-test se o conteúdo confirmar a mistura.

`event-handlers.js`

- Já foi corrigido para não ser dono dos listeners físicos.
- Direção: tornar adapter de intenção de desenho, não controlador global de input.

`storage-manager.js`

- 242 linhas.
- Persistência de drawings + viewport + config.
- Direção: `drawings/storage.js`, com contrato de estado compartilhado explícito.

`overlay-manager.js`, `toolbar.js`, `annotations.js`

- Separar domínio de desenho da apresentação e da tradução para Chart.js.

### UI

`controls.js`

- Mistura catálogo, seleção de provider/intervalo, sincronização, escala, tipo, tema, tabela, logs e toast.
- **Outro ponto forte de acoplamento.**
- Direção: separar controles visuais de catálogo/estado de mercado e comandos do gráfico.

`dev-hud.js`, `toast.js`

- Feedback/diagnóstico.
- Direção: `ui/diagnostics` e `ui/feedback`.

`theme-manager.js`

- UI/theme.
- Direção: `ui/theme`.

`technical-indicators.js`, `metrics.js`, `utils/indicators.js`

- Há um domínio futuro claro de `studies/`.
- Antes de mover, verificar duplicação entre cálculo, apresentação e registro dos estudos.

`offset-window.js`

- Manipulação de janela temporal.
- Precisa ser comparado com o novo conceito de viewport; pode ser domínio de dados/viewport ou ser eliminado se duplicar o viewport.

## Primeiros alertas

Os maiores candidatos a refatoração são:

```
1. sanitizer.js       533 linhas
2. chart-zoom.js      423 linhas
3. sync.js            acoplamento DATA + UI + janela + render
4. controls.js        acoplamento UI + catálogo + sync + estado
5. app.js             bootstrap + vários controladores de interface
6. drawing-manager.js  domínio + geometria + hit-test
```

O número de linhas é tratado como **sinal de investigação**, não como regra rígida.

## Regra para o Ochama

Não vamos simplesmente mover `core/foo.js` para `foo/bar.js`.

Cada módulo só será criado quando houver uma responsabilidade/contrato claro.

## Próxima etapa

Fase 2: **autópsia funcional detalhada**, começando por `app.js → sync.js → data-loader/api-source → ChartEngine → ChartZoom/InteractionManager`, seguindo o fluxo real de uma ação do usuário desde o clique/toque até o dado chegar ao gráfico.
