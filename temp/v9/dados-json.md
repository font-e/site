# Arquitetura de Dados, Fontes e Contrato JSON — FONTE

> Documento técnico de mapeamento do consumo de dados da SPA, diagnóstico de fallbacks/mocks e diretrizes para geração do novo JSON geral sanitizado.

---

## 1. Diagnóstico Geral: Onde o Site Puxa Dados Hoje e O Que é Fictício

Atualmente, o site opera em uma transição entre **arquivos JSON estáticos segmentados** e **estruturas de fallback (mock) embutidas nos scripts Vanilla JS**.

| Seção / Módulo | Script Responsável | Arquivo(s) Buscado(s) via `fetch()` | O que acontece na prática hoje? | Estado dos Dados |
| :--- | :--- | :--- | :--- | :--- |
| **Programação** | `src/js/program.js` | `./programacao.json` | Espera um `Array` de eventos no formato antigo. Se receber objeto (como no `site.json`), aciona `getMockEvents()`. | **Parcialmente Mockado** (cai no mock se a raiz for objeto com chaves `presente`, etc.) |
| **Residência** | `src/js/residencia.js` | `./residencia.json`<br>`./EVENTOS_CONSOLIDADO.json`<br>`./PESSOAS_CONSOLIDADO.json` | Tenta ler esses arquivos; se ausentes ou incompatíveis, utiliza o `MOCK_DATA` interno com 10 artistas residentes e textos fixos. | **Híbrido / Fallback Fictício Ativo** |
| **Ateliês** | `src/js/atelies.js` | `./atelies.json` | Se não encontrar `./atelies.json`, carrega um array interno `MOCK_DATA` com 9 artistas fixos (Marcelo Amorim, Ósi, Luah Souza, etc.). | **Fallback Fictício Ativo** |
| **Arquivo** | `src/js/arq.js` | `./EVENTOS_CONSOLIDADO.json` | Lê o JSON consolidado real da raiz e gera dinamicamente em memória as tabelas de **Eventos**, **Pessoas** (agentes culturais extraídos das fichas técnicas) e **Textos**. | **Dados Reais Sanitizados** |
| **Metadados Globais** | `index.html` / `geral.js` | Hardcoded no HTML | Redes sociais (Instagram, Artwork Archive) e e-mails de candidatura estão gravados diretamente no DOM e nos scripts. | **Hardcoded no Front** |

---

## 2. Raio-X Detalhado por Seção do Site

### 2.1. Programação (`src/js/program.js`)
* **Abas Superiores de Filtro:** `TODA`, `PRESENTE`, `PRÓXIMA`, `INSCRIÇÕES ABERTAS`, `PASSADAS`.
* **Como os dados são filtrados hoje:**
  - O script faz `flattenEvents()` e busca o campo `subsection` ou `status` (`PRESENTE`, `PROXIMA`, `INSCRICOES`, `PASSADAS`).
  - No `site.json` recente, esses eventos vêm divididos em objetos de chaves: `"programacao": { "presente": [...], "inscricoes_abertas": [...], "proxima": [...] }`.
* **A Linha Fechada exibe:**
  - Categoria / Badge de "Inscrições Abertas"
  - Horário / Dias de visitação (`horario`)
  - Período / Data (`date` ou calculado via `inicio` e `fim`)
  - Título (`title` / `titulo`) e Subtítulo (`subtitle` / `subtitulo`)
* **A Gaveta Aberta (Estrutura de 12 Colunas):**
  - **Colunas 1 a 8 (Texto):** Cabeçalho editorial + trilho de **Sub-abas** + painel de conteúdo.
  - **Colunas 9 a 12 (Imagem):** Galeria vertical de fotografias (`fotos`, `images` ou `expanded_images`).

---

### 2.2. Residência (`src/js/residencia.js`)
* **Abas de Seção:**
  1. `PROGRAMAS`: Exibe o texto de introdução institucional, dossiê de candidatura e botão de inscrição.
  2. `INVESTIGAÇÃO INDIVIDUAL`: Descrição do programa, destaques em bullet-points e galeria de registros fotográficos.
  3. `RESIDÊNCIA COLETIVA`: Descrição do programa de imersão coletiva (ex: programa LAVA!), destaques e galeria.
  4. `ARTISTAS RESIDENTES`: Grid de 5 colunas por linha (proporção 4:3, gap de 12px) ocupando 100% da largura. Cada cartão exibe imagem, nome do artista residente e ano da residência.
* **A Gaveta Aberta do Artista Residente:**
  - Ao clicar em um thumb, o grid é ocultado e abre a gaveta exatamente no mesmo espaço (`universal-drawer`).
  - Colunas 1 a 8: Nome do artista + sub-abas editoriais + texto.
  - Colunas 9 a 12: Galeria vertical de fotos do artista e de suas pesquisas no ateliê.

---

### 2.3. Ateliês (`src/js/atelies.js`)
* **Abas de Seção:**
  1. `ATUAIS`: Artistas que ocupam ateliê no FONTE no momento presente.
  2. `ANTERIORES`: Artistas que já passaram pelos ateliês.
* **Área de Conteúdo Fechada:**
  - Grid de 5 colunas por 2 linhas regulares, altura total padrão de 100dvh, com thumbs e nomes abaixo (sem data, mesmo estilo tipográfico de residência).
* **A Gaveta Aberta de Artista de Ateliê:**
  - Substitui o grid de thumbs no mesmo espaço físico.
  - Colunas 1 a 8: Nome do artista + sub-abas + conteúdo textual + links externos (Instagram, Portfólio, Website).
  - Colunas 9 a 12: Galeria de imagens dos trabalhos e vistas de ateliê.

---

### 2.4. Arquivo (`src/js/arq.js`)
* **Abas de Visualização:**
  1. `EVENTOS`: Tabela completa com colunas Título, Artistas, Categoria e Ano.
  2. `PESSOAS`: Tabela com Nome do Agente Cultural, Total de Ações no FONTE e Categorias de atuação.
  3. `TEXTOS`: Ensaios críticos e textos de curadoria catalogados.
* **A Gaveta Aberta em Arquivo:**
  - **Se for Evento:** Abre a gaveta unificada (`universal-drawer`) com galeria à direita e sub-abas `SOBRE`, `FICHA TÉCNICA`, `TEXTOS` e `VÍDEOS`.
  - **Se for Pessoa:** Abre a gaveta com a sub-aba `ATUAÇÕES`, listando cronologicamente todos os eventos em que a pessoa participou no FONTE (como artista, curador ou ministrante).

---

## 3. O Que Determina Quais Sub-Abas Aparecem em Cada Gaveta Aberta?

As gavetas do FONTE utilizam o componente universal `renderDrawerSubtabsHtml()` (`src/js/zoom-viewer.js`). A determinação das sub-abas é dinâmica e depende estritamente da **presença de campos preenchidos** no item selecionado:

### Regras em Programação e Arquivo (Eventos):
1. **`SOBRE` (Sempre Presente):**
   - Ativada por padrão como primeira aba.
   - Consome: `item.resumo`, `item.sobre` ou `item.content`.
   - Se vazio, exibe placeholder discreto ("Informações adicionais em breve.").
2. **`FICHA TÉCNICA` (Sempre Presente em Eventos):**
   - Consome:
     - `artistas` / `artistas_lista` / `ministrantes`
     - `curadoria`
     - `periodo` (calculado via datas `inicio` e `fim`)
     - `visitacao` / `horario`
     - `creditos` (array de objetos `{ funcao: "Produção", nomes: ["..."] }`)
3. **`TEXTOS` (Condicional — só aparece se houver dados):**
   - Ativada se existir `item.textos` (array com pelo menos 1 item) **ou** `item.texto_critico`.
   - Estrutura esperada de cada texto: `{ titulo: "...", autoria: "...", texto: "..." }`.
4. **`VÍDEOS` (Condicional — só aparece se houver dados):**
   - Ativada se existir `item.videos` (array com pelo menos 1 item).
   - Suporta links do YouTube, Vimeo ou arquivos diretos `.mp4`/`.webm`.
   - Estrutura esperada: `{ url: "...", titulo: "...", legenda: "..." }`.

### Regras em Ateliês (Artistas):
1. **`SOBRE`:** Biografia ou resumo do artista (`artist.sobre` / `artist.bio`) + links (`links.instagram`, `links.portfolio`, `links.website`).
2. **`PESQUISA`:** Descrição poética da pesquisa visual (`artist.pesquisa`).
3. **`OBRAS` (Condicional):** Só aparece se houver o campo `artist.obras` ou um array de trabalhos catalogados.

### Regras em Residência (Artistas Residentes):
1. **`SOBRE`:** Biografia / resumo + links.
2. **`PESQUISA`:** Resumo poético da pesquisa desenvolvida no período de residência + programa e ano.
3. **`TEXTOS` (Condicional):** Textos críticos publicados sobre a residência do artista.

---

## 4. Gambiarras, Discrepâncias e Limitações Atuais

Para que o novo JSON funcione perfeitamente, é vital corrigir as seguintes fricções existentes no código hoje:

1. **Incompatibilidade de Raiz em `programacao.json`:**
   - O `program.js` espera um `Array` na raiz do JSON (`[{ id, title, subsection, ... }]`).
   - O `site.json` novo organiza em objeto com chaves: `{ "programacao": { "presente": [...], "proxima": [...], "inscricoes_abertas": [...] } }`.
   - *Correção necessária:* O código front-end deve ser capaz de receber tanto o formato unificado de objeto quanto concatenar as categorias sem forçar fallback.
2. **Mapeamento de Artistas de Ateliês (`atelies.json` vs `site.json`):**
   - O front de Ateliês (`atelies.js`) consome chaves planas: `nome`, `imagem`, `sobre`, `pesquisa`, `obras`, `links`.
   - No `site.json`, os membros estão em `atelies.membros` com `slug`, `nome`, `desde`, `foto`, `bio_preview`. Faltam os campos completos de `sobre`, `pesquisa` e a distinção clara de quem é `atual` vs `anterior`.
3. **Nomes de Campos Duplicados ou Conflitantes:**
   - Títulos: ora `title`, ora `titulo`.
   - Imagens: ora `images` (array de URLs strings), ora `fotos` (array de objetos), ora `expanded_images` (objetos com `url`, `width`, `height`, `ratio`, `legenda`).
   - Artistas: ora string única separada por vírgula (`"artistas": "Caio Borges, Luis Fobos"`), ora array (`"artistas": ["Caio Borges", "Luis Fobos"]`), ora `"artistas_lista"`.

---

## 5. Diretrizes para o Gemini Preparar o Novo `site.json` Sanitizado

Aqui está a especificação que o Gemini deve seguir para que o novo JSON se integre de primeira, sem quebras no site:

### 5.1. Estrutura Canônica Recomendada do Novo JSON Geral
```json
{
  "meta": {
    "titulo": "Residência FONTE",
    "instagram": "https://instagram.com/residenciafonte",
    "artwork_archive": "https://www.artworkarchive.com/profile/fonte",
    "email_contato": "contato@font-e.org",
    "email_residencia": "residencia@font-e.org",
    "gerado_em": "2026-10-03T10:00:00-03:00"
  },
  "programacao": [
    {
      "id": "olho-d-agua-1",
      "titulo": "Olho D’água #1: de longe & de perto",
      "subtitulo": "",
      "categoria": "Exposição coletiva",
      "status": "PRESENTE",
      "inicio": "2026-09-26",
      "fim": "2026-10-10",
      "horario": "Qua a Dom, 14h–19h",
      "visitacao": "de quinta a sábado, das 14h às 19h",
      "sobre": "<p>Texto de apresentação...</p>",
      "artistas": ["Caio Borges", "Fernanda Izar", "Luis Fobos"],
      "curadoria": ["Marcelo Amorim", "Mateus Azevedo"],
      "creditos": [
        { "funcao": "Produção", "nomes": ["Jeane Gonçalves"] }
      ],
      "textos": [
        { "titulo": "Ensaio Crítico", "autoria": "Mateus Azevedo", "texto": "<p>...</p>" }
      ],
      "videos": [
        { "url": "https://youtube.com/watch?v=...", "titulo": "Registro de Abertura", "legenda": "..." }
      ],
      "imagens": [
        {
          "url": "https://.../img-1400x1400-q82.webp",
          "thumb": "https://.../img-1400x1400-q82.webp",
          "legenda": "Vista da exposição",
          "width": 1400,
          "height": 1400
        }
      ]
    }
  ],
  "residencia": {
    "institucional": {
      "subtitulo": "Pesquisa autodirigida e suporte curatorial em um ambiente intelectualmente estimulante gerido por artistas.",
      "candidatura_texto": "<p>O FONTE opera sob regime de fluxo contínuo...</p>",
      "requisitos": [
        "Portfólio em PDF com até 15 trabalhos recentes",
        "Carta de motivação (máx. 1 lauda)"
      ]
    },
    "modalidades": [
      {
        "id": "individual",
        "nome": "Investigação Individual",
        "duracao": "1 a 3 meses",
        "descricao": "<p>Programa imersivo para artistas...</p>",
        "destaques": ["Ateliê individual de trabalho", "Interlocução curatorial contínua"]
      },
      {
        "id": "coletiva",
        "nome": "Residência Coletiva",
        "duracao": "4 a 8 semanas",
        "descricao": "<p>Voltada para artistas selecionados em conjunto...</p>",
        "destaques": ["Práticas compartilhadas de ateliê", "Seminários internos"]
      }
    ],
    "artistas_residentes": [
      {
        "id": "ignacio-fanti",
        "nome": "Ignacio Fanti",
        "ano": "2024",
        "modalidade": "Investigação Individual",
        "imagem": "https://.../ignacio-1400x1400-q82.webp",
        "sobre": "<p>Biografia do artista...</p>",
        "pesquisa": "<p>Investigação escultórica sobre matéria orgânica...</p>",
        "links": { "instagram": "@ignaciofanti", "portfolio": "ignaciofanti.com" },
        "textos": [],
        "imagens": ["https://.../foto1.webp", "https://.../foto2.webp"]
      }
    ]
  },
  "atelies": {
    "artistas": [
      {
        "id": "marcelo-amorim",
        "nome": "Marcelo Amorim",
        "status": "atual",
        "desde": "2013",
        "imagem": "https://.../marcelo-1400x1400-q82.webp",
        "sobre": "<p>Marcelo Amorim desenvolve pesquisas visuais...</p>",
        "pesquisa": "<p>Investigação sobre manuais de instrução e registros escolares...</p>",
        "obras": "<p>Séries recentes Instruções de Uso e Gramática Visual...</p>",
        "links": { "instagram": "@marceloamorim_art", "portfolio": "marceloamorim.com" },
        "imagens": ["https://.../foto1.webp"]
      }
    ]
  },
  "arquivo": {
    "eventos": [ /* Mesma estrutura normalizada de eventos históricos */ ]
  }
}
```

### 5.2. Regras Rígidas para o Gemini Sanitizar os Dados:
1. **IDs Únicos e Consistentes (Kebab-Case):** Todos os itens devem ter um `id` consistente (ex: `olho-d-agua-1`, `marcelo-amorim`). O mesmo `id` de pessoa deve bater entre Ateliês, Residência e Arquivo.
2. **Listas sempre como Arrays:** Campos como `artistas`, `curadoria`, `imagens`, `textos` e `videos` devem ser **estritamente `Array`**, nunca strings soltas com vírgula ou campos nulos.
3. **HTML Sanitizado em Campos Longos:** Campos como `sobre`, `pesquisa` e `texto` devem conter HTML semântico limpo (`<p>`, `<strong>`, `<em>`), sem tags quebradas ou estilos inline pesados.
4. **Resolução de Imagens:** Sempre que possível, fornecer imagem quadrada ou 4:3 para os thumbs, e array de URLs de alta resolução para o modo Zoom.
5. **Classificação Temporal Precisa (`status`):**
   - Programação: `PRESENTE`, `PROXIMA`, `INSCRICOES`, `PASSADAS`.
   - Ateliês: `atual` ou `anterior`.

---
*Documento compilado para alinhamento entre arquitetura front-end e pipelines de higienização de dados.*
