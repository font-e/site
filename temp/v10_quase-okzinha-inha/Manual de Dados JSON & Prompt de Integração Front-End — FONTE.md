# **Manual de Dados JSON & Prompt de Integração Front-End — Residência FONTE**

# **PARTE 1: PROMPT EXECUTIVO PARA O GOOGLE AI STUDIO**

*(Copie e cole o bloco abaixo integralmente no Google AI Studio)*ATENÇÃO: MUDANÇA ARQUITETURAL DE DADOS (TRANSIÇÃO DEFINITIVA DE MOCKS PARA ESTADO ÚNICO).

O backend Kirby CMS da Residência FONTE agora entrega uma árvore relacional unificada e higienizada através de um único arquivo de dados: \`site-teste.json\` (que em produção será \`/site.json\`). 

Adicionamos ao projeto o arquivo central \`src/js/state.js\`, que executa o carregamento inicial desse JSON, armazena o objeto na memória global (\`window.\_\_FONTE\_DATA\_\_\`) e expõe a API reativa \`window.FonteState\`.

Sua missão agora é adaptar os scripts do front-end (\`program.js\`, \`residencia.js\`, \`atelies.js\`, \`arq.js\` e os componentes de gavetas) para consumir exclusivamente os dados reais fornecidos pelo \`FonteState\`, eliminando completamente os arrays de fallback/mock e conectando as novas informações institucionais e relacionais cadastradas no CMS.

\#\#\# DIRETRIZES OBRIGATÓRIAS DE IMPLEMENTAÇÃO:

1\. ELIMINAÇÃO DE FETCHES INDEPENDENTES E MOCKS:

   \- Em \`program.js\`, remova a chamada para \`./programacao.json\` e o fallback \`getMockEvents()\`. Inicialize a seção com \`await FonteState.init()\` e consuma \`FonteState.getProgramacao()\`.

   \- Em \`residencia.js\`, remova as buscas fragmentadas e o array \`MOCK\_DATA\`. Consuma \`FonteState.getResidencia()\`. Na aba de Artistas Residentes, liste as pessoas cadastradas que possuem residência catalogada em \`FonteState.getArtistasResidentes()\`.

   \- Em \`atelies.js\`, remova o \`MOCK\_DATA\`. Consuma \`FonteState.getAtelies()\` e separe os membros atuais e anteriores utilizando os dados reais de \`FonteState.getMembrosAtelie('atuais')\` e \`FonteState.getMembrosAtelie('anteriores')\`.

   \- Em \`arq.js\`, remova o fetch para \`./EVENTOS\_CONSOLIDADO.json\`. Consuma \`FonteState.getArquivo()\` para eventos e \`FonteState.getPessoas()\` para o catálogo de agentes culturais.

2\. NAVEGAÇÃO CRUZADA EM TEIA (IN-DRAWER CONTINUOUS NAVIGATION):

   \- Os campos \`artistas\`, \`curadoria\` e \`autoria\` em cada evento agora entregam listas de objetos estruturados: \`{ nome: string, slug: string|null, has\_perfil: boolean }\`.

   \- Ao renderizar nomes com \`has\_perfil: true\`, transforme-os em links/botões interativos com \`data-pessoa-slug="\${slug}"\`.

   \- Ao clicar no nome de uma pessoa dentro da gaveta de uma mostra, a interface deve invocar \`FonteState.getPessoa(slug)\` e abrir a gaveta daquele agente cultural ali mesmo, exibindo sua minibio, seus links e a lista cronológica pré-calculada de participações (\`pessoa.participacoes\`), permitindo que o visitante navegue entre exposições e perfis sem perder o contexto de rolagem do site.

3\. UNIFICAÇÃO DE GALERIAS E TRATAMENTO ANTI-CLS:

   \- Cada evento e perfil possui agora o array unificado \`galeria: \[...\]\`. Cada item traz:

     \* \`thumb\`: URL WebP 1400px para listagens e miniaturas da gaveta.

     \* \`zoom\`: URL WebP 2560px para o modo ampliado (Lightbox horizontal de 80vh).

     \* \`width\`, \`height\`, \`ratio\`: Dimensões físicas e proporção calculada.

     \* \`legenda\`, \`autoria\`, \`fotografia\`, \`url\_venda\`, \`disponivel\`.

   \- No CSS e nos templates das imagens, utilize a propriedade \`aspect-ratio: \${item.ratio}\` com cor de fundo neutra \`\#888888\` para eliminar completamente saltos de tela (Cumulative Layout Shift \- CLS) durante o carregamento das mídias.

   \- O botão comercial (\$) no modo zoom de 80vh deve ser exibido quando \`disponivel \=== true\`, apontando para \`url\_venda\` ou o link geral do Artwork Archive em \`meta.artwork\_archive\`.

4\. INCORPORAÇÃO DAS NOVAS SEÇÕES INSTITUCIONAIS (INFO & APOIE):

   \- Conecte a seção \`INFO\` com os dados reais de \`FonteState.getInfo()\`:

     \* Contatos e visitação: \`email\_contato\`, \`email\_imprensa\`, \`endereco\_completo\`, \`como\_chegar\`, \`horarios\`, \`acessibilidade\`.

     \* Histórico e Linha do Tempo: Renderize \`historico\_intro\` e itere sobre \`historico\_topicos\`, exibindo ano/data, título, texto e a galeria de fotos documentais do tópico.

     \* Equipe: Renderize a \`equipe\_atual\` e as \`colaboracoes\_anteriores\`, exibindo foto, nome, cargo (\`funcao\`), período ativo e biografia.

     \* Apoie / Amigues: Renderize \`apoie\_manifesto\` e monte os cards das \`modalidades\_apoio\` com título, subtítulo, texto descritivo e botões de chamada (\`botoes\`).

Execute a integração com código limpo, sem alterar a identidade visual estabelecida, assegurando que todas as sub-abas dinâmicas (SOBRE, FICHA TÉCNICA, TEXTOS, VÍDEOS) reajam à presença real desses nós no objeto.

---

# **PARTE 2: MANUAL DA ARQUITETURA DE DADOS & DICIONÁRIO DE CAMPOS**

O arquivo `site-teste.json` (ou `/site.json`) constitui o contrato canônico de dados gerado pelo Kirby CMS para alimentar a Single Page Application da Residência FONTE.

## **1\. Visão Geral da Raiz do JSON**

A raiz do payload é composta por 7 chaves de primeiro nível:

* **meta:** Metadados institucionais, SEO e links de plataformas externas.  
* **info:** Dados da sede física, horário de funcionamento, linha do tempo histórica, equipe e programa de apoio.  
* **residencia:** Apresentação dos programas de residência, critérios de candidatura e modalidades detalhadas.  
* **atelies:** Informações sobre os ateliês de trabalho, visitação e membros residentes.  
* **programacao:** Eventos e cursos classificados temporalmente em `presente`, `inscricoes_abertas` e `proxima`.  
* **arquivo:** Tabela consolidada com todas as mostras e ações históricas desde 2013\.  
* **pessoas:** Dicionário completo de todos os artistas, curadores e colaboradores cadastrados no acervo, indexados pelo seu `slug`.

---

## **2\. Dicionário Detalhado por Seção**

### **2.1. Nó `meta`**

| Campo | Tipo | Descrição |
| :---- | :---- | :---- |
| `titulo` | String | Nome oficial da instituição ("Residência FONTE"). |
| `descricao` | String | Resumo institucional para meta-tags de compartilhamento. |
| `instagram` | String | URL oficial da página no Instagram. |
| `artwork_archive` | String | URL do perfil institucional no Artwork Archive para aquisição de obras. |
| `gerado_em` | String | Timestamp ISO 8601 da compilação dos dados. |

### **2.2. Nó `info`**

Este nó foi totalmente expandido a partir dos novos blueprints do Kirby CMS e substitui os dados anteriormente fixados no HTML:

* **Contatos & Sede:**  
  * `email_contato` (string): E-mail principal de atendimento institucional.  
  * `email_imprensa` (string): Canal de comunicação para jornalistas e assessoria.  
  * `endereco_completo` (string): Endereço físico formatado com quebras de linha.  
  * `como_chegar` (string): Orientações de transporte público e proximidade com estações de metrô.  
  * `horarios` (string HTML): Dias e horários de funcionamento do espaço para o público.  
  * `acessibilidade` (string): Informações sobre acesso para pessoas com deficiência e mobilidade reduzida.  
* **Histórico & Linha do Tempo:**  
  * `historico_intro` (string HTML): Texto introdutório sobre a fundação do espaço independente.  
  * `historico_topicos` (array de objetos): Marcos cronológicos da história da FONTE.  
    * `data` (string): Ano ou data do acontecimento histórico.  
    * `titulo` (string): Título do marco histórico.  
    * `texto` (string HTML): Descrição detalhada do momento.  
    * `fotos` (array de objetos): Fotos documentais associadas ao marco (`thumb`, `zoom`, `width`, `height`, `ratio`, `legenda`).  
* **Equipe & Colaboradores:**  
  * `equipe_atual` / `colaboracoes_anteriores` (arrays de objetos):  
    * `slug` (string): Identificador único da pessoa.  
    * `nome` (string): Nome do integrante.  
    * `funcao` (string): Cargo de atuação (ex: "Gestão", "Curadoria").  
    * `periodo` (string): Intervalo de atividade (ex: "2013–presente").  
    * `bio` (string HTML): Biografia focada na atuação profissional.  
    * `foto_url` (string): Retrato em WebP de alta qualidade.  
    * `foto_width`, `foto_height`, `foto_ratio` (números): Geometria da foto para prevenção de CLS.  
    * `dados.funcoes` (array): Detalhamento histórico de funções ocupadas.  
* **Apoie / Amigues:**  
  * `apoie_manifesto` (string HTML): Manifesto conceitual sobre a importância da rede de apoio independente.  
  * `modalidades_apoio` (array de objetos): Categorias de mecenato e apoio (ex: "SEJA AMIGUE").  
    * `titulo` (string): Nome do plano ou chamada.  
    * `slug` (string): Identificador da modalidade.  
    * `subtitulo` (string): Descrição complementar.  
    * `corpo_texto` (string HTML): Regulamento, benefícios e instruções de doação.  
    * `dados_bancarios_pix` (string): Chave PIX ou dados bancários institucionais.  
    * `botoes` (array): Ações de redirecionamento para plataformas de pagamento (`rotulo`, `url`).  
    * `galeria` (array): Imagens promocionais vinculadas à campanha de apoio.

### **2.3. Nó `residencia`**

* `introducao` (string): Apresentação conceitual do programa de residências.  
* `inscricoes`:  
  * `texto` (string HTML): Diretrizes completas do dossiê de candidatura em PDF.  
  * `botoes` (array): Botões de chamada para ação (`rotulo`, `tipo`, `url`, `ativo`).  
* `modalidades`: Dicionário contendo as modalidades ativas (`investigacao-individual` e `residencia-coletiva`):  
  * `slug` (string): Identificador da modalidade.  
  * `titulo` (string): Nome do programa.  
  * `duracao` (string): Período de estadia (ex: "1 a 3 meses", "Imersão de 30 dias").  
  * `descricao` (string HTML): Descrição dos benefícios, ateliês e suporte curatorial.  
  * `cards_arquivo` (array de objetos): Seleção visual dos artistas históricos que passaram pela modalidade (`id`, `titulo`, `artistas`, `ano`, `subtitulo_card`, `imagem`).

### **2.4. Nó `atelies`**

* `has_intro` (boolean): Flag indicando se há texto introdutório.  
* `texto_introdutorio` (string HTML): Descrição da dinâmica de trabalho dos ateliês compartilhados.  
* `informacoes_visita` (string HTML): Regras e agendamento para visitas do público aos ateliês.  
* `acoes` (array): Ações especiais (ex: chamadas para vagas de ateliê com botões e links).  
* `membros` (array de objetos): Lista de artistas residentes fixos (`slug`, `nome`, `desde`, `foto`, `cidade`, `pais`, `bio_preview`).

### **2.5. Nós `programacao` e `arquivo` (Eventos)**

A `programacao` organiza os eventos em 3 coleções cronológicas: `presente` (em cartaz), inscricoes\_abertas (chamadas ativas) e proxima (futuros). O nó arquivo contém o acervo histórico integral ordenado de forma decrescente pela data de início.

Estrutura canônica de cada objeto de Evento:

* **Identificação Básica:**  
  * `id` (string): Slug kebab-case do evento (ex: `olho-d-agua-1-de-longe-de-perto`).  
  * `ano` (número): Ano de início da ação.  
  * `titulo` (string): Título principal.  
  * `subtitulo` (string): Subtítulo do evento.  
  * `tipo` (string): Categoria formatada (ex: "Exposição coletiva", "Curso", "Residência individual", "Ateliê aberto").  
  * `subcategorias` (array de strings): Tags secundárias de taxonomia.  
  * `inicio` e `fim` (strings YYYY-MM-DD): Datas de abertura e encerramento.  
* **Relações & Pessoas:**  
  * `artistas` (array de objetos): Artistas vinculados no formato relacional `{ nome, slug, has_perfil }`. Se `has_perfil` for verdadeiro, o front-end pode consultar a biografia diretamente em `pessoas[slug]`.  
  * `curadoria` (array de objetos): Curadores vinculados com a mesma estrutura relacional de artistas.  
* **Conteúdo Expandido:**  
  * `visitacao` (string): Horários e dias específicos de visitação da mostra.  
  * `resumo` (string HTML): Texto de apresentação / release da mostra.  
  * `textos` (array de objetos): Ensaios curatoriais e textos críticos completos.  
    * `categoria` (string): "Texto crítico", "Ensaio", "Entrevista", etc.  
    * `autoria` (array de objetos): Autores vinculados `{ nome, slug, has_perfil }`.  
    * `titulo` (string): Título do ensaio.  
    * `veiculo` e `url` (strings): Dados de publicação original externa.  
    * `texto` (string HTML): Íntegra semântica do texto.  
    * `anexos` (array): Arquivos adicionais para download (`nome`, `url`, `ext`, `size`).  
  * `creditos` (array de objetos): Equipe técnica e parceiros institucionais.  
    * `funcao` (string): Cargo (ex: "Produção", "Realização").  
    * `nomes` (array de objetos): Pessoas vinculadas `{ nome, slug, has_perfil }`.  
    * `instituicao`, `logo_url`, `url`, `tratamento_logo`, `texto`.  
  * `videos` (array de objetos): Registros audiovisuais catalogados (`titulo`, `url`, `capa_url`, `artistas`, `sinopse`, `ficha_tecnica`).  
  * `premiacoes` (array de objetos): Premiações e itinerâncias (`categoria`, `titulo`, `detalhes`, `url`).  
* **Galeria de Mídia:**  
  * `galeria` (array de objetos): Galeria fotográfica unificada de alta performance.  
    * `thumb`: URL WebP 1400px calibrada a 82% de qualidade para navegação ágil.  
    * `zoom`: URL WebP 2560px calibrada a 85% de qualidade para o Lightbox ampliado.  
    * `width` e `height`: Dimensões físicas em pixels.  
    * `ratio`: Proporção matemática exata (`width / height`).  
    * `legenda`, `autoria`, `fotografia`: Créditos e registro fotográfico.  
    * `url_venda` e `disponivel`: Indicador e link para compra no Artwork Archive.  
* **Propriedades Exclusivas de Convocatórias / Cursos:**  
  * `inicio_inscricoes`, `fim_inscricoes`, `permanente`, `esta_aberta`, `gratuito`, `investimento`, `url_inscricao`, `ministrantes` (array de objetos com função e nomes relacionais), `ativo_arquivo`.

### **2.6. Nó `pessoas` (Catálogo Relacional)**

Dicionário chaveado pelo `slug` de cada agente cultural cadastrado em `content/pessoas/`:

| Campo | Tipo | Descrição |
| :---- | :---- | :---- |
| `slug` | String | Identificador único da pessoa. |
| `nome` | String | Nome público ou artístico. |
| `atuacao` | String | Atuação principal (ex: "Artista", "Curador", "Sociólogo"). |
| `nascimento` / `falecimento` | Número / null | Anos biográficos. |
| `cidade` / `pais` | String / null | Origem geográfica. |
| `bio` | String HTML | Biografia completa e statement artístico. |
| `bio_preview` | String | Extrato limpo sem tags para pré-visualizações. |
| `avatar` | Objeto | Foto principal de retrato (`thumb`, `zoom`, `width`, `height`, `ratio`). |
| `atelie` | Objeto | Dados históricos de vínculo com o ateliê físico (`ativo`, `periodos`). |
| `equipe` | Objeto | Dados históricos de atuação na gestão institucional (`ativo`, `funcoes`). |
| `links` | Array | Links externos (`rotulo`, `url`). |
| `participacoes` | Array | Lista relacional pré-calculada em 7 pontos de contato no acervo (`id`, `titulo`, `ano`, `categoria`, `papel`). |

---

# **PARTE 3: RECOMENDAÇÕES DE PERFORMANCE & ENGENHARIA DE FRONT-END**

1. **Prevenção Definitiva de CLS (Cumulative Layout Shift):**  
   Ao carregar imagens, defina explicitamente no CSS inline ou na tag HTML:  
   `style="aspect-ratio: ${img.ratio}; background-color: #888888;"`.  
   Isso reserva imediatamente o espaço visual exato da imagem antes que os bytes sejam descarregados pelo navegador, eliminando qualquer solavanco de layout durante a rolagem.  
2. **Ativação Condicional das Sub-Abas na Gaveta:**  
   O componente universal da gaveta deve renderizar abas com base na presença estrita de conteúdo:  
   * Aba **SOBRE**: Renderizada sempre com o `item.resumo` ou `item.bio`.  
   * Aba **FICHA TÉCNICA**: Renderizada em eventos quando houver `artistas`, `curadoria`, `visitacao` ou `creditos`.  
   * Aba **TEXTOS**: Renderizada somente se `item.textos && item.textos.length > 0`.  
   * Aba **VÍDEOS**: Renderizada somente se `item.videos && item.videos.length > 0`.  
   * Aba **ATUAÇÕES**: Renderizada na gaveta de perfil de pessoa se `item.participacoes && item.participacoes.length > 0`.  
3. **Consumo de Memória e Transparência de Rede:**  
   Com o `state.js` em operação, todas as buscas na tabela do Arquivo e filtros de exibição executam operações síncronas nativas de JavaScript (`Array.prototype.filter`, `Array.prototype.find`) sobre o estado em memória RAM. Nenhuma ação do usuário gerará novas requisições de rede, garantindo uma resposta de 0 milissegundos para todas as interações.

