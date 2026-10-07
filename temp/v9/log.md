# Diário de Iterações — FONTE

## [07/10 - 19h56] — DIRECIONAMENTO WHATSAPP, CORREÇÃO DE IMAGENS LATERAIS EM RESIDÊNCIA, ALTURA DE ATELIÊS E CALIBRAGEM PRECISA DE SCROLL (MENU & GAVETA ARQUIVO)
* **Direcionamento do Compartilhamento por WhatsApp:**
  * Configurado o encaminhamento de WhatsApp em `src/js/zoom-viewer.js` para o telefone alvo `+55 11 94253-XXXX`.
  * Implementada sanitização com remoção de caracteres não numéricos (`targetPhone.replace(/\D/g, '')`) gerando o parâmetro oficial `phone=551194253XXXX` na API do WhatsApp, garantindo compatibilidade imediata com qualquer número real inserido futuramente.
* **Correção das Imagens Laterais de Residência (Eliminação da Barra Cinza):**
  * Removido o `background-color: #888888;` inline dos wrappers de imagem em `src/js/residencia.js`.
  * Em `src/css/layout.css`, eliminada a altura fixa rígida (`height: 320px`) e o fundo `#f0f0f0` de `.residencia-card-image-wrap`.
  * Padronização em `aspect-ratio: 4 / 3;`, `width: 100%;`, `height: 100%;`, `object-fit: cover;`, `object-position: center;` com fundo transparente/branco do sistema, fazendo com que a fotografia preencha 100% da área do card centralizada, com o mesmo aspect ratio, sem barra cinza, sem deformidades e sem cortes indevidos.
* **Adequação da Altura de Ateliês (100dvh — Padrão de Residência):**
  * Substituído o cálculo encurtado `calc(100dvh - var(--header-height, 60px) - 40px)` em `.atelies-container`, `.atelies-empty-pane` e `.atelies-drawer-pane`.
  * Estabelecida a altura canônica de tela inteira: `min-height: 100dvh; height: 100dvh; max-height: 100dvh;` em `src/css/layout.css`, equalizando Ateliês exatamente ao padrão estrutural de Residência.
* **Rolagem dos Botões do Menu do Cabeçalho com Alinhamento do Topo do Texto:**
  * Atualizada a navegação em `src/js/app.js`: ao clicar nos links do menu do cabeçalho ou submenus de seção, a posição alvo calcula o topo do texto do título da seção (`.section-hero-title`), alinhando o início das letras com a base do cabeçalho fixo do site (`- headerHeight`).
* **Rolagem Estabilizada e Precisa na Planilha de Arquivo (Topo da Gaveta no Topo da Tela):**
  * A função `scrollToDrawerTop` em `src/js/zoom-viewer.js` foi aprimorada com busca automática de `.universal-drawer`, compensação da altura do cabeçalho (`- headerHeight`) e duplo `requestAnimationFrame`.
  * Ao abrir um item na tabela de Arquivo (`src/js/arq.js`), o scroll suave alinha milimetricamente o topo da gaveta aberta à base do cabeçalho; a linha clicada (`.arq-table-row`) fica assentada imediatamente acima da gaveta, fora da área de scroll visível.
  * O duplo rAF garante medição exata mesmo quando outro item estava previamente aberto e sofre colapso de layout simultâneo.

## [07/10 - 10h40] — ATIVAÇÃO DO COMPARTILHAR EM RESIDÊNCIA E ATELIÊS & CALIBRAGEM DOS THUMBS DE ATELIÊS (PADRÃO ARTISTAS RESIDENTES)
* **Abertura do Cluster de Compartilhamento em Residência e Ateliês:**
  * Corrigida a captura indevida de cliques: o seletor genérico `.drawer-subtab-btn:not([data-action="close-drawer"])` capturava os botões de compartilhamento, cancelava a propagação (`stopPropagation()`) e disparava re-renderização completa da gaveta com aba `undefined`.
  * O seletor de troca de sub-abas foi restrito a `.drawer-subtab-btn[data-tab]`, tanto em `src/js/residencia.js` quanto em `src/js/atelies.js`.
  * Adicionados event listeners dedicados para `[data-action="toggle-share"]` nos painéis das gavetas, permitindo que o cluster horizontal de compartilhamento (Copiar Link, WhatsApp, E-mail) expanda e recolha com precisão imediata.
* **Calibragem dos Thumbs de Ateliês Idênticos aos Artistas Residentes:**
  * Eliminada a distorção e o esticamento vertical do print 1: `.atelies-photo-card` agora tem `height: auto`, sem `height: 100%` que forçava colapso dos metadados.
  * O wrapper de foto `.atelies-photo-wrapper` possui proporção matemática `aspect-ratio: 3 / 4`, borda estrutural `border: var(--border-width, 1px) solid var(--border-color)` e background `#e6e6e6`.
  * Grid `.atelies-gallery-grid` padronizado exatamente como `.residencia-artists-grid`: 5 colunas (`repeat(5, 1fr)`), `gap: 12px`, padding generoso de `48px var(--content-indent-left, 60px) 64px`, `align-content: start` e rolagem vertical suave no campo delimitado de 100dvh (`max-height: 100dvh; overflow-y: auto; scrollbar-width: none`).
  * Nome do artista (`.atelies-photo-name`) visível e legível em todos os cards com `margin-top: 8px`.
* **Sincronização de Entry Point:** Atualização do `<title>` em `index.html` para `FONTE [07/10 - 10h40]`.

## [06/10 - 17h12] — GAP DE 5 COLUNAS NO ZOOM, SETAS DE LOOP (❯ / ↪), ROLAGEM VERTICAL EM ATELIÊS & BOTÕES DE COMPARTILHAMENTO AO LADO DO ✕
* **Gap à Direita da Última Foto no Modo Zoom:**
  * O `padding-right` de `.zoom-horizontal-track` em `src/css/zoom-gallery.css` foi atualizado para exatamente `calc(100vw * 5 / 12)` (5 colunas matemáticas completas do grid mestre de 12 colunas).
* **Navegação Contínua e Setas em Loop Ativo (❯ / ↪) na Galeria Zoom:**
  * Eliminado o estado desabilitado (`disabled`) dos botões Anterior e Próxima no início e fim da galeria.
  * **Primeira Foto (`currentIndex === 0`):** O botão anterior exibe o caractere `↪` e permanece 100% ativo; ao ser clicado (ou via seta esquerda do teclado), navega imediatamente em transição suave para a última foto da galeria. Em posições intermediárias, exibe o normal `❮`.
  * **Última Foto (`currentIndex === total - 1`):** O botão próxima exibe o caractere `↪` e permanece 100% ativo; ao ser clicado (ou via seta direita do teclado), navega imediatamente em transição suave para a primeira foto da galeria. Em posições intermediárias, exibe o normal `❯`.
* **Rolagem Vertical Delimitada no Campo de Thumbs de Ateliês:**
  * Configuração rigorosa de `.atelies-gallery-grid` em `src/js/atelies.js` e `src/css/layout.css` com `height: 100%`, `max-height: 100dvh`, `overflow-y: auto`, `align-content: start` e `grid-template-rows: auto`.
  * Preservação do campo em `100dvh` com rolagem vertical suave e barra nativa oculta (`scrollbar-width: none`), permitindo visualizar e rolar todos os artistas tanto em Ateliês Atuais quanto Anteriores.
* **Arrumação Definitiva dos Botões de Compartilhamento e Botão ✕:**
  * Restauração integral de `src/css/components.css` eliminando o erro de sintaxe de fechamento de chave em `.header-subnav-menu`.
  * O botão `✕` (`.drawer-subtab-close-btn`) está rigorosamente posicionado à direita de tudo em `.drawer-subtabs-actions`, assentado exatamente sobre a linha divisória vertical entre as colunas 8 e 9 (área de texto e área de imagens).
  * O botão de compartilhar (`.drawer-share-toggle-btn`) aparece sozinho à esquerda do botão `✕` como sub-aba autônoma de 38px.
  * Ao clicar no botão de compartilhar, a gaveta expande horizontalmente à sua esquerda os 3 botões de ação (`.drawer-share-actions`: Copiar Link, WhatsApp, E-mail) em linha contínua unificada na mesma altura (38px), mantendo o botão `✕` intacto na sua posição à direita.
  * Integração real de cópia para clipboard (`navigator.clipboard.writeText`) e links diretos para WhatsApp e e-mail.
* **Sincronização de Entry Point:** Atualização do `<title>` em `index.html` para `FONTE [06/10 - 17h12]`.

## [06/10 - 05h40] — ALINHAMENTO DA SUB-ABA X NA LINHA 8|9, CALIBRAGEM DE RADIUS & CLUSTER HORIZONTAL EXPANSÍVEL DE COMPARTILHAMENTO
* **Alinhamento da Sub-Aba ✕ sobre a Linha Divisória 8|9:**
  * O `padding-right` de `.drawer-subtabs-bar` foi definido rigorosamente como `0`, assentando a borda direita da sub-aba `✕` com precisão sobre o limite divisório entre a coluna textual (colunas 1 a 8) e a coluna de mídia (colunas 9 a 12).
* **Calibragem Rígida do Radius da Sub-Aba ✕:**
  * **Em Programação:** Bordas superiores mantêm raio idêntico às demais sub-abas de fichário (`border-radius: var(--folder-tab-radius, 16px 16px 0 0)`).
  * **Nos Demais Casos (Gaveta Universal com Galeria até o Topo):** Apenas o canto superior esquerdo recebe raio de curvatura (`border-top-left-radius: 16px`), com o canto superior direito reto (`border-top-right-radius: 0`) e borda direita eliminada (`border-right: none`) para fusão matemática contínua com a linha 8|9.
* **Cluster Horizontal Expansível de Compartilhamento à Esquerda do ✕:**
  * Inserção do botão âncora de 'compartilhar' (ícone SVG canônico) à esquerda do botão `✕`.
  * **Estado Fechado:** Apresenta cantos superiores esquerdo e direito arredondados (`16px 16px 0 0`), operando como sub-aba autônoma de 38px × 38px.
  * **Estado Expandido (Abertura Horizontal à Esquerda):** Ao ser clicado, expande-se para a esquerda revelando 3 botões em bloco unificado contínuo (estilo `< / contador / >`, sem gaps):
    1. **Copiar Link:** Primeiro ícone à esquerda, dotado de `border-top-left-radius: 16px`;
    2. **WhatsApp:** Ícone intermediário com bordas retas e divisor vertical simples de 1px;
    3. **E-mail:** Ícone intermediário com bordas retas e divisor vertical simples de 1px;
    4. **Compartilhar (Âncora):** Passa a ter apenas `border-top-right-radius: 16px` e fundo ativo contrastante.
  * Delegação global de eventos com fechamento ao clicar fora e feedback tátil/visual imediato nas ações.
* **Sincronização de Entry Point:** Atualização do `<title>` em `index.html` para `FONTE [06/10 - 05h40]`.

## [06/10 - 05h19] — PAGINAÇÃO EM 20 ITENS NO ARQUIVO, THUMB DE ALINE SETTON, GALERIA LATERAL DE RESIDÊNCIA & CORREÇÃO DE SOBREPOSIÇÃO DE GAVETA EM PROGRAMAÇÃO
* **Registro de Diagnóstico Z-Axis:** O eixo Z (z-axis) do logotipo FONTE versus imagens da galeria zoom ainda não está adequado (registrado para ajuste posterior).
* **Paginação da Planilha do Arquivo em Grupos de 20:**
  * O catálogo do Arquivo (`EVENTOS`, `PESSOAS`, `TEXTOS`) agora pagina os registros rigorosamente em grupos de 20 itens por página (`itemsPerPage = 20`).
  * Inserção do rodapé de paginação em `#table-footer-container` com botões anterior (`‹ Anterior`), páginas numéricas com estado ativo e próxima (`Próxima ›`), além do contador informativo de itens e páginas.
  * Reset automático de página (`currentPage = 1`) ao alternar as facetas de modo de exibição e ancoragem suave ao topo da tabela ao trocar de página.
* **Correção do Thumb de Aline Setton em Ateliês:**
  * Correção definitiva da fotografia de perfil de Aline Setton para a URL canônica validada: `https://firebrick-mallard-266745.hostingersite.com/media/pages/eventos/aline-setton/3e5313c0d1-1789686086/aline_setton-1400x1400-q82.webp`.
  * Sincronização do avatar no dataset JSON (`site-teste.json`), no resolvedor de estado (`state.js`) e salvaguarda direta no renderizador de cartões de ateliês (`atelies.js`), eliminando quebra de imagem ou ausência de thumb.
* **Galeria Lateral Dinâmica em Residência (Seleção de Cards e Abertura de Gaveta):**
  * **Aba Programas:** Exibe as 3 últimas residências individuais somadas às 3 últimas residências coletivas (total de 6 cards ordenados cronologicamente).
  * **Aba Investigação Individual:** Exibe estritamente as 6 últimas residências individuais.
  * **Aba Residência Coletiva:** Exibe estritamente as últimas residências coletivas (até 6 registros).
  * **Abertura da Gaveta da Residência:** O clique em qualquer imagem/card da galeria lateral aciona diretamente `openResidenceDrawer`, ocultando o grid de layout e abrindo a gaveta da respectiva residência em `#residencia-drawer-pane` com suporte integral a sub-abas, navegação em teia, imagens zoom e botão fechar.
* **Sobreposição Correta da Nova Gaveta em Programação:**
  * Correção do comportamento documentado no print: eliminada a replicação do cabeçalho do evento (`.event-header.is-expanded`) acima da gaveta navegada internamente (in-drawer navigation).
  * A nova gaveta (ex: perfil de artista como Caio Borges ou outro agente cultural) abre diretamente sobrepondo e substituindo a gaveta atual em 100dvh, operando de maneira idêntica às seções de Arquivo e Residência.
  * Botão de fechar (X) retrocede na pilha para a gaveta do evento ou fecha o bloco com realinhamento pelo topo via `scrollToDrawerTop`.
* **Sincronização de Entry Point:** Atualização do `<title>` em `index.html` para `FONTE [06/10 - 05h19]`.

## [06/10 - 03h56] — ANCORAGEM NA LINHA 2/3, GAP DE 1.5 COLUNA & MONO-BLOCO DE NAVEGAÇÃO COM LIMITES RETOS
* **Alinhamento na Linha 2/3 (3ª Coluna):**
  * O trilho horizontal agora inicia com `padding-left: calc(100vw * 2 / 12)`, posicionando a margem esquerda da 1ª imagem rigorosamente sobre a linha divisória da coluna 2/3 (`2/12 * window.innerWidth`).
  * A ancoragem programática dos botões `❮` e `❯` (`goToSlideInstant` e `goToSlideSmooth`) foi recalibrada com `col2 = (2 / 12) * window.innerWidth`, alinhando a margem esquerda de cada imagem acessada milimetricamente à linha 2/3.
* **Calibragem do Ritmo Espacial (Gap de 1.5 Coluna):** Espaçamento horizontal entre as imagens reduzido de 2.5 colunas para 1.5 coluna (`gap: calc(100vw * 1.5 / 12)`).
* **Mono-Bloco de Navegação Unido (<, contador, >):**
  * Eliminação de gaps (`gap: 0`) entre o botão `❮`, o contador e o botão `❯`, fundindo os três elementos em um bloco monolítico de 160px.
  * Apenas os cantos externos possuem raio de 4px (`border-top-left/right-radius: 4px` no topo de `❮` e `border-bottom-left/right-radius: 4px` na base de `❯`).
  * As fronteiras entre as setas e o contador são linhas simples e retas de 1px (`border-width: 1px`), sem sobreposições ou cantos arredondados internos.
* **Recalibragem Matemática dos Botões ✕ e ⓘ:**
  * O botão `✕` foi ajustado para `top: calc(25% - 17px); transform: translateY(-50%)`, preservando a equidistância perfeita entre a base do menu (46px) e o novo topo do mono-bloco de navegação (`calc(50% - 80px)`).
  * O botão `ⓘ` foi ajustado para `top: calc(75% + 40px); transform: translateY(-50%)`, no ponto médio exato entre a nova base do mono-bloco (`calc(50% + 80px)`) e a base da tela (100%).
* **Sincronização de Entry Point:** Atualização do `<title>` em `index.html` para `FONTE [06/10 - 03h56]`.

## [06/10 - 03h32] — HOMOGENEIZAÇÃO CROMÁTICA COM O MENU CABEÇALHO, BARRA DIAGONAL ╱ & CALIBRAGEM VERTICAL DO BOTÃO ✕
* **Equalização Cromática com o Botão Menu Fechado:**
  * Os botões `✕`, `❮`, `❯` e `ⓘ` adotam rigorosamente o mesmo fundo e cor do menu compacto fechado: `background-color: rgba(147, 234, 236, 0.7)` e texto `var(--bg-black)`.
  * Estados de hover uniformizados com `background-color: var(--btn-hover-bg)` e desfoque `backdrop-filter: blur(var(--btn-hover-blur))`.
  * Preservação da tipografia em `var(--fs-body)` com peso 300.
* **Barra Diagonal Fina no Contador (╱) & Calibragem de Respiro:** Substituição da barra convencional `/` pelo caractere de desenho diagonal `╱` (`U+2571`), com aproximação de 6px nos números superior e inferior via `padding: 14px 0` no contêiner flex, mantendo a centralização vertical absoluta da barra no centro da tela.
* **Centralização Vertical Precisa do Botão ✕:**
  * O botão `✕` foi recalibrado para o ponto médio exato entre a base do botão menu do cabeçalho (46px) e o topo do botão `❮` (calc(50% - 88px)), resultando na coordenada matemática `top: calc(25% - 21px); transform: translateY(-50%)`.
  * O botão `ⓘ` mantém sua ancoragem simétrica validada em `top: calc(75% + 44px); transform: translateY(-50%)`.
* **Sincronização de Entry Point:** Atualização do `<title>` em `index.html` para `FONTE [06/10 - 03h32]`.

## [06/10 - 03h11] — ALINHAMENTO PROPORCIONAL TRIPARTIDO & REORGANIZAÇÃO VERTICAL DOS CONTROLES ZOOM
* **Largura Canônica Uniforme (32px):** Todos os botões e caixas do modo zoom passam a adotar estritamente a largura de 32px do menu compacto (`var(--h-menu, 32px)`), ancorados à esquerda em `left: 20px` (`var(--menu-compact-left)`).
* **Navegação Tripartida com Barra no Centro Exato:**
  * Bloco central de navegação composto por botão superior `<` (32px), caixa do contador (96px, altura de 3 botões) e botão inferior `>` (32px), com espaçamento de 8px (`var(--menu-gap)`).
  * O contador é composto por 3 linhas: número da imagem atual (`02`), barra separadora (`/`) e total de imagens (`38`).
  * A altura total simétrica de 176px posiciona a barra `/` rigorosamente no centro vertical da tela (`top: 50%`).
* **Equidistância Geométrica do Botão ✕ e Botão ⓘ:**
  * O botão `✕` (fechar) está posicionado exatamente no ponto médio entre o topo da tela (0) e o topo do botão `<` (`calc(25% - 44px)`).
  * O botão `ⓘ` (info) está posicionado exatamente no ponto médio entre a base do botão `>` e a base da tela (`calc(75% + 44px)`).
* **Tipografia Uniforme em `fs-body` com Peso 300:** Todos os glifos (`✕`, `<`, `02`, `/`, `38`, `>`, `ⓘ`) padronizados estritamente com `font-size: var(--fs-body)`, `font-weight: 300` e `line-height: 1`.
* **Sincronização de Entry Point:** Atualização do `<title>` em `index.html` para `FONTE [06/10 - 03h11]`.

## [06/10 - 02h13] — SINCRONIZAÇÃO DE LOG & ATUALIZAÇÃO DO ENTRY POINT
* **Consolidação do Histórico no Diário:** Documentação detalhada e cronológica de todos os ciclos de engenharia realizados em 05/10 e 06/10, cobrindo sanitização, estruturação da nova Galeria Zoom modular, calibragem de z-index, motor de busca e refinamento geométrico.
* **Atualização do Entry Point:** Sincronização do `<title>` do documento em `index.html` para `FONTE [06/10 - 02h13]`, mantendo alinhamento estrito com os marcos de versão.

## [06/10 - 02h12] — REMODELAGEM DOS BOTÕES (48px × 32px), CONTADOR COM ABA BIPARTIDA & PAINEL UNIFICADO DE INFO/BUSCA
* **Geometria Proporcional (48px × 32px):** Redefinição dimensional de todos os botões do modo zoom para 3/4 da largura anterior (48px = 1.5x da largura de 32px do menu cabeçalho compacto) e altura canônica de 32px (`var(--h-menu, 32px)`). Calibragem tipográfica estrita aderente à escala de 5 tamanhos em tokens (`--fs-body` e `--fs-nav`).
* **Contador com Aba Superior Bipartida:** A primeira linha do bloco de contagem adota `border-radius: var(--folder-tab-radius, 16px 16px 0 0)` e é dividida rigorosamente ao meio em dois botões simétricos de 24px: `<` para retroceder e `>` para avançar. A linha inferior (`.zoom-ctrl-counter-box`) exibe a contagem formatada (`01 / 27`) com cantos inferiores arredondados em 4px (`border-bottom-left-radius: 4px; border-bottom-right-radius: 4px;`).
* **Painel Central Unificado de Info e Busca (ⓘ):** Condensação da funcionalidade de busca no botão de informações `ⓘ`. O clique aciona o popover lateral adjacente (`left: 76px`, centralizado verticalmente) contendo:
  * **Legendas:** Botão toggle binário ON/OFF que sincroniza com a abertura/fechamento das legendas de todas as imagens que possuem conteúdo no JSON;
  * **Busca:** Campo de entrada textual livre com botão de limpeza;
  * **Tags Comuns:** Autoria com contadores, legendas com duas ou mais ocorrências idênticas e obras à venda, com exclusão estrita e normalizada de tags com texto idêntico ao título do evento ou pessoa.
* **Sincronia Total de Interação:** O clique no botão `ⓘ` ativa o popover e comuta o estado das legendas globais. O clique individual em qualquer fotografia alterna a visibilidade da respectiva legenda e sincroniza em tempo real o indicador ON/OFF do toggle no popover.

## [06/10 - 02h03] — PROPORÇÕES QUADRADAS 64px × 64px (Y2 À Y5) & PALETA DE CONTROLE ESCURA
* **Módulos Quadrados de 64px:** Redimensionamento de todas as áreas de controle do modo zoom (`✕`, voltar `❮`, contador numérico, avançar `❯`, info `ⓘ` e busca `⌕`) para quadrados de `64px × 64px` (`width: 64px; height: 64px;`), equivalentes ao dobro da largura do botão de menu compacto (`32px × 2`).
* **Ancoragem Geométrica nas Guias Y2 e Y5:** Alinhamento à esquerda na coordenada da guia `Y|2` (`x: 20px`), estendendo-se com precisão milimétrica até a coordenada da guia `Y|5` (`20px + 64px = 84px`).
* **Nova Paleta Cromática e Hover de Alto Contraste:** Botões redefinidos com fundo estrutural `rgba(0, 36, 36, 0.8)` e tipografia `var(--bg-white, #ffffff)`. Hover calibrado com transição para `var(--accent-cyan)` com texto `var(--bg-black)`.
* **Área Quadrada do Contador Numérico:** A caixa dos números contadores (`.zoom-ctrl-counter-box`) tornou-se um quadrado de `64px × 64px` com fundo `rgba(255, 255, 255, 0.8)` e tipografia centralizada em `var(--fs-body)`.
* **Deslocamento do Popover de Busca:** Realinhamento lateral do popover (`.zoom-search-popover`) para `left: calc(20px + 64px + 8px)` (`92px`), acompanhando a nova largura de 64px dos controles.

## [06/10 - 01h05] — RITMO ASSIMÉTRICO DO TRILHO (1 / 2.5 / 3 COLUNAS), GAPS 4x (32px), TAG IN-BASE & DANÇA DE Z-INDEX DO LOGO FONTE
* **Ritmo Espacial de Colunas no Trilho:** O trilho horizontal da galeria zoom foi configurado com margem esquerda inicial de exatamente 1 coluna (`padding-left: calc(100vw * 1 / 12)`), gap de 2,5 colunas entre as imagens (`gap: calc(100vw * 2.5 / 12)`) e respiro final de 3 colunas após a última imagem (`padding-right: calc(100vw * 3 / 12)`).
* **Solução da Dança de Z-Index do Logotipo FONTE:** O fundo translúcido e com blur da galeria zoom foi transferido para um pseudo-elemento `::before` operando em `z-index: 280`, posicionado atrás do cabeçalho/logo (`z-index: 300`) — assegurando que o logotipo preto FONTE permaneça sempre nítido e visível. As imagens da galeria zoom operam em `z-index: 350`, sobrepondo o logotipo do FONTE ao cruzarem o canto superior direito. Controles e tags sobrepõem tudo em `z-index: 600`.
* **Fixação Absoluta Não-Sticky:** Os controles laterais da galeria zoom passam a utilizar `position: absolute` ancorados no contêiner de 100dvh da galeria zoom, centralizados verticalmente na área (`top: 50%; transform: translateY(-50%)`). Eles não se fixam na viewport e rolam junto com a página quando o usuário visualiza o restante do documento.
* **Gaps de 4x (32px) entre Módulos:** Aplicação de margem de 32px (`calc(var(--menu-gap, 8px) * 4)`) após o botão `✕`, após o grupo de navegação/contador e após o botão de info `ⓘ`.
* **Chip da Tag Ativa na Base da Tela:** Criação de aba dinâmica (`.zoom-bottom-active-tag`) alinhada em `left: 20px`, no rodapé da área da galeria, exibindo o rótulo da tag selecionada com largura automática, tipografia `var(--fs-nav)` e botão `✕` para desativação instantânea do filtro.
* **Simplificação Binária ON/OFF do Botão Info:** Extinção do estado forçado `has-info` e de bloqueios `disabled`. O botão `ⓘ` opera de modo estritamente binário (revela todas as legendas quando ativado ou oculta todas quando desativado), enquanto o clique sobre imagens individuais alterna legendas específicas de forma sincronizada.

## [06/10 - 00h27] — CONTROLES CENTRALIZADOS NA VIEWPORT, LIMIAR COLUNA 2/3 & POPOVER DE BUSCA COM TAGS DINÂMICAS
* **Centralização Vertical dos Controles:** Posicionamento do trilho de botões em `top: 50%; transform: translateY(-50%)`, alinhado na margem canônica `left: 20px`.
* **Contador Numérico de 2 Dígitos:** Módulo de controle vertical com número atual (`01`, `02`) e total de imagens (`27`) formatados com 2 dígitos em `var(--fs-body)`.
* **Detecção de Imagem Ativa no Limiar da Coluna 2/3:** O número da imagem ativa no contador passa a comutar estritamente no instante em que a margem esquerda do próximo slide toca a linha divisória da coluna 2/3 (`(2 / 12) * window.innerWidth`).
* **Tratamento de Metadados Puros no JSON:** Extirpação da replicação do título do evento/pessoa em legendas vazias. Imagens sem metadados declarados não projetam caixas de legenda.
* **Motor de Busca e Popover Lateral de Tags (⌕):** Criação do botão de busca com lupa que abre popover lateral adjacente aos controles, integrando campo de busca por texto livre e geração automática de tags:
  * Autoria única ou com contagem (`Nome (8)`);
  * Legendas com 2 ou mais ocorrências idênticas (`Vista geral (20)`);
  * Obras disponíveis à venda (`À venda (12)`).
* **Filtragem Não-Destrutiva em Tempo Real:** A seleção de tags ou busca textual oculta os slides não correspondentes via CSS (`.is-filtered-out`), recalcula o contador dinamicamente e reposiciona o trilho na primeira imagem correspondente.

## [05/10 - 18h18] — ALINHAMENTO NO EIXO X DO MODO G, CONTADOR EM 3 LINHAS E SINCRONIA TOTAL DO BOTÃO ⓘ
* **Alinhamento na Base do Cabeçalho:** Posicionamento do topo do botão `✕` na linha base inferior do cabeçalho de 60px (`top: var(--header-height, 60px)`), alinhado verticalmente com o eixo X do modo Geral.
* **Contador Tipográfico em 3 Linhas:** Estruturação vertical sem caixilho de botão com linha 1 (número atual), linha 2 (barra `/`) e linha 3 (total de imagens) em `var(--fs-body)`.
* **Sincronização de Estado nas Legendas:** Harmonização entre aberturas manuais nas imagens e o botão `ⓘ`.
* **Ajustes de Margem e Gap:** Margens de 1 coluna nas extremidades e gap de 1 coluna entre imagens.
* **Fundo Translúcido Ciano:** Fundo padrão dos botões em `rgba(0, 255, 255, 0.7)` com inversão no hover do botão ativo.

## [05/10 - 17h30] — CONTROLES EM ABAS VERTICAIS NA BASE, BUFFER DE CARREGAMENTO PROATIVO & REMOÇÃO DO MODO GRID
* **Botões como Abas Verticais:** Experimentação de controles partindo da margem esquerda (`left: 0`) com largura de 52px, sem borda esquerda e com cantos arredondados no topo.
* **Buffer Ativo de Pré-Carregamento (Vizinhos Proativos):** Implementação de carregamento eager em raio de 2 posições ao redor do índice ativo (`[idx-2, ..., idx+2]`), utilizando miniatura em cache como fundo imediato para erradicar telas brancas durante o download dos WebP de 2560px.
* **Remoção do Modo Grid (▦):** Exclusão do botão de grade, trilho matricial, atalhos e classes associadas.
* **Estabilização do Campo de Legendas:** Otimização da caixa de informações (`.zoom-info-overlay`) com acoplamento rígido à largura natural da imagem via aceleração por GPU (`transform: translateZ(0)` e `contain: layout`).

## [05/10 - 16h20] — CONSTRUÇÃO DA NOVA GALERIA ZOOM UNIFICADA EM 100dvh & SCROLL HORIZONTAL
* **Criação do Módulo Especialista `src/js/zoom-gallery.js` e `src/css/zoom-gallery.css`:** Arquitetura limpa e desacoplada responsável pela experiência de visualização ampliada universal em todos os contextos da SPA (Programação, Arquivo, Residência e Ateliês).
* **Estrutura de 100dvh e Rolagem Horizontal:** Imagens ocupando 100dvh com proporções preservadas, dispostas horizontalmente sem barras de rolagem e sem scroll-snap em desktop.
* **Corte Seco e Ancoragem Instantânea:** Ao clicar em qualquer imagem da galeria lateral, a visualização transita diretamente para a imagem selecionada em corte seco alinhada ao viewport.
* **Consumo de Ativos de Alta Resolução:** Seleção automática das versões de 2560px (`zoom`) declaradas no dataset JSON.
* **Integração Unificada:** Substituição de chamadas dispersas por `openZoomGallery()` em `program.js`, `arq.js`, `residencia.js`, `atelies.js` e `app.js`.

## [05/10 - 16h00] — SANITIZAÇÃO COMPLETA DA ARQUITETURA LEGADA DE ZOOM
* **Eliminação da Antiga Galeria Zoom Fragmentada:** Remoção integral da barra superior antiga com título de exposição, setas genéricas, contadores e lógicas de renderização depreciadas em `zoom-viewer.js` (`renderZoomDrawerHtml`).
* **Limpeza de Estado e Listeners:** Extirpação de variáveis `zoomIndex`, `is-zoom-mode`, `is-zoom-header` e seletores obsoletos nos módulos de Programação, Arquivo, Residência e Ateliês.
* **Preservação de Cursores e Efeitos:** Manutenção dos estados de hover e ponteiro de clique nas miniaturas das gavetas laterais sem disparo de rotas quebradas, preparando o terreno para a implementação da galeria unificada.

## [03/10 - 11h31] — TRANSIÇÃO DEFINITIVA PARA FONTESTATE & DATASET CANÔNICO
* **Eliminação Total de Mocks e Fetches Independentes:** Toda a SPA passa a consumir exclusivamente a árvore de dados unificada através do módulo `src/js/state.js` (`FonteState`), que carrega `./site-teste.json` (ou `/site.json`). Foram extirpados todos os mocks e buscas fragmentadas em `program.js`, `residencia.js`, `atelies.js` e `arq.js`.
* **Navegação Cruzada em Teia (In-Drawer Continuous Navigation):** Fichas técnicas, curadorias e autorias renderizam agentes culturais com perfis interativos (`[data-pessoa-slug]`). O clique abre imediatamente a gaveta do agente cultural dentro do mesmo contexto de rolagem, permitindo transitar entre exposições e perfis com botão de retorno à mostra.
* **Unificação de Galerias e Tratamento Anti-CLS:** Padronização do array de mídias `galeria` com URLs WebP (1400px para thumbs e 2560px para zoom) com `aspect-ratio` nativo e fundo neutro `#888888`, erradicando saltos visuais de Cumulative Layout Shift. Inclusão do botão comercial `$` no modo Zoom quando `disponivel === true`.
* **Incorporação das Seções Institucionais (INFO & APOIE):** Criação do módulo `src/js/info.js` e inclusão da seção `#sec-info` no grid de 12 colunas, contemplando Linha do Tempo histórica com fotos documentais, Equipe Atual e Colaborações Anteriores com biografias, Visitação & Contatos e o programa de amigues Apoie com chaves PIX e botões de chamada.

## [03/10 - 10h28]
* **Flexibilidade e Governança do Modo G:** Os botões de popover das guias fixas Y e X agora operam com um botão-título integrado (`👁 GUIA Y (FIXA)` / `👁 GUIA X (FIXA)`), com botões de controle em lote (Ocultar/Exibir e Excluir) incidentes sobre as demais guias do eixo correspondente. A tipografia de todos os textos do popover foi calibrada para coincidir com a data da gaveta fechada (`var(--fs-meta)`, peso 400).
* **Marcador Discreto das Guias Fixas Ocultadas:** Guias fixas quando ocultadas deixam de projetar linhas ao longo da tela, mantendo apenas marcadores discretos pontilhados na borda para reativação, que somem por completo no modo sigilo.
* **Exportação e Importação de Guias via JSON:** Adicionadas as funções de Salvar e Carregar JSON diretamente pelo popover das guias fixas, compilando as coordenadas precisas de todas as guias visíveis da viewport.
* **Alinhamento Absoluto do GRID Y e X sobre as Colunas Canônicas:** A geração de 12 divisões no GRID Y passa a ler diretamente a coordenada de borda do CSS Grid das colunas (`1|2`, `2|3`, etc.), eliminando desvios acumulados de scrollbar e alinhando com perfeição matemática em ambos os eixos.

## [03/10 - 10h22] — CHECKPOINT v11: Layout Semi-Mestre
* **Consolidação do Layout Geral:** Fixação do grid mestre de 12 colunas, gavetas unificadas com altura de 100dvh e alinhamento geométrico milimétrico entre abas, linhas estruturais e áreas de conteúdo em todas as 4 seções.
* **Lógica-Mestra das Transparências e Estados Visuais:** Estabelecimento da regra universal onde fundos brancos opacos representam telas finais (ex: programas, ficha técnica), enquanto fundos translúcidos indicam telas intermediárias com abertura subsequente. A fusão contígua de aba e gaveta (sem linha de base) consolida visualmente o elemento ativo.
* **Diretriz de Escurecimento com Fundo Preto (v12):** Catalogação do próximo ciclo de refinamento para o hover na sub-aba X, substituindo o recálculo de opacidade do canvas por um escurecimento sobreposto (`bg-black` com opacidade 0.6) via camadas de composição GPU (sem repaint de layout).
* **Registro de Validação:** Criação do diretório `/prints` para arquivo dos registros fotográficos e diagramas de alinhamento visual de interface.

## [03/10 - 09h46]
* **Harmonização das Duas Linhas de Thumbs em Ateliês:** Implementação de `grid-template-rows: repeat(2, 1fr)` em `.atelies-gallery-grid`, garantindo que os thumbs da linha 1 e da linha 2 tenham rigorosamente a mesma altura e ocupem áreas equivalentes dentro da caixa delimitadora entre `X|3` e `X|4`.
* **Restauração da Abertura da Gaveta de Artistas:** Resolução da sobreposição da gaveta em Ateliês através da ocultação forçada com `.is-hidden` e `display: none !important` no grid de thumbs, permitindo que `#atelies-drawer-pane` abra perfeitamente no mesmo espaço da tela, como antes.

## [03/10 - 09h30]
* **Altura Padrão da Gaveta em Ateliês (100dvh):** A área de thumbs de Ateliês (`.atelies-container` e `.atelies-gallery-grid`) agora compartilha rigorosamente da mesma altura padrão de tela (`100dvh`) que a gaveta de perfil de artista. A transição entre o grid fechado e a gaveta aberta ocorre no mesmo volume espacial, sem saltos de altura na página.
* **Altura Responsiva dos Thumbs e Distâncias Simétricas:** Os thumbs em Ateliês deixaram de ter aspect ratio rígido e passaram a ter altura responsiva contínua (`flex: 1 1 auto`). A altura de todos os thumbs cresce proporcionalmente para ocupar a área disponível, garantindo que a distância da base das abas de seção ao topo dos thumbs seja exatamente idêntica à distância da base dos nomes à base da seção (48px simétricos).

## [03/10 - 09h10]
* **Abertura da Gaveta no Lugar dos Thumbs em Residência:** Abertura da gaveta de perfil de artista residente no mesmo espaço físico do grid de thumbs através da ocultação de `#residencia-layout-container` com `is-drawer-open`, replicando a arquitetura de Ateliês.
* **Redução do Gap e Aspect Ratio 4:3 nos Thumbs:** O espaçamento entre os cartões de artistas em Ateliês e Residência foi reduzido pela metade (`gap: 12px`). As imagens agora possuem proporção matemática uniforme de 4:3 com CSS Grid sequencial por linhas (1 a 5 na linha 1, 6 a 10 na linha 2).
* **Unificação Tipográfica dos Nomes em Ateliês:** Os nomes de artistas em Ateliês adotaram o mesmo estilo visual de Residência (`var(--fs-body)`, peso 500, line-height 1.35 e kerning de -0.01em), exibindo apenas os nomes sem data.
* **Fundo Branco na Área de Imagens em Programação:** A coluna de galeria lateral da gaveta aberta de Programação foi redefinida para fundo branco sólido (`var(--bg-white)`), eliminando o vazamento do canvas em repouso e integrando-se dinamicamente à transparência com opacidade 0.7 ao pairar sobre a aba X.

## [03/10 - 07h54]
* **Grid de 5 Artistas por Linha em Ateliês:** A galeria de thumbs de Ateliês foi reconfigurada para 5 colunas por linha (`column-count: 5`), mantendo o espaçamento regular e a integridade da escala visual das fotografias.
* **Equalização de Residência > Artistas Residentes:** A exibição da aba Artistas Residentes foi padronizada com o mesmo grid de 5 colunas por linha em largura total. A galeria lateral à direita é ocultada e a grade de artistas ocupa 100% da largura da tela, idêntico a Ateliês > Atuais.
* **Alinhamento do Scroll ao Topo da Gaveta em Arquivo:** Ao abrir qualquer gaveta em Arquivo, a viewport agora rola com precisão para ancorar a linha superior da gaveta aberta (`.universal-drawer`), e não mais a linha da planilha clicada.

## [03/10 - 07h30]
* **Realinhamento da Área de Imagem e Restauração da Linha Superior:** A área de mídia em Programação foi realinhada com a coluna de texto através do contêiner contínuo `programacao-subtabs-wrapper`. A linha horizontal superior sobre a galeria de imagens foi restabelecida através das 12 colunas, preservando o botão X exatamente na fronteira da 8ª coluna.
* **Equalização do Alinhamento da Base das Sub-Abas:** Eliminou-se o desnível inferior que deixava as sub-abas mais baixas que o botão X zerando o `margin-bottom` da grade `drawer-subtabs-rail` e calibrando o remate contíguo da aba ativa. A base de todas as abas agora encosta na linha divisória com o mesmo rigor visual do botão X.
* **Simplificação e Padronização do Hover das Sub-Abas:** Todas as sub-abas inativas agora adotam o mesmo comportamento do botão X no mouseover: fundo `var(--bg-black)` e fonte `var(--btn-hover-bg)`, sem alteração de escala, padding ou posição.
* **Diferenciação Estrita das Áreas de Efeito:** O hover nas sub-abas editoriais afeta exclusivamente a área textual com opacidade 0.7, mantendo a galeria lateral intacta. O hover no botão X segue incidindo sobre a totalidade da gaveta aberta (texto e imagem) com opacidade 0.7, revelando o grafismo do canvas.

## [03/10 - 05h26]
* **Eliminação Definitiva do Tilt nas Sub-Abas:** Fixação dimensional rigorosa de 38px de altura, padding e margin-bottom constantes em todos os estados das sub-abas. Nenhuma propriedade geométrica é alterada no hover, erradicando qualquer deslocamento ou inclinação.
* **Padronização Universal da Opacidade 0.7:** As transições de hover foram calibradas estritamente para o valor de opacidade 0.7. No hover de sub-aba inativa, o fundo adota branco com opacidade 0.7 e a área de texto correspondente recebe opacidade 0.7, enquanto todas as outras sub-abas recebem opacidade 0.7 no fundo e no texto.
* **Transparência Contígua em Programação e Remoção da Barra Sólida:** A barra sólida/cyan sob o título em Programação foi eliminada com fundo transparente na barra de sub-abas. Os containers da gaveta aberta foram definidos como transparentes, permitindo que o hover no botão X revele o grafismo do canvas sob toda a área de texto e imagem com opacidade 0.7 idêntica ao padrão universal.
* **Criação do Diário de Iterações:** Instituição oficial do arquivo `log.md` para documentar cronologicamente cada avanço por data e horário.
