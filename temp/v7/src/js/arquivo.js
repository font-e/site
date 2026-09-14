/**
 * ARQUIVO HISTÓRICO FONTE — MÓDULO SPA EDITORIAL DE ALTA FIDELIDADE
 * Caminho: src/js/arquivo.js
 * Tripolaridade do Acervo: [ EVENTOS ] [ PESSOAS ] [ TEXTOS ]
 * Filtros Contextuais, Busca Semântica Normalizada (NFD), Split-View e Popovers Ancorados
 */

// ==========================================================================
// ESTADO GLOBAL DO MÓDULO
// ==========================================================================

let archiveDataset = [];
let personsDataset = [];
let textsDataset = [];

let currentViewMode = 'EVENTOS'; // 'EVENTOS' | 'PESSOAS' | 'TEXTOS'

let activeFilters = {
  textQuery: '',
  artistQuery: '',
  category: null, // Contextual à visualização ativa
  yearStart: null,
  yearEnd: null
};

let activeDataTab = 'ano'; // 'ano' | 'periodo' (no dropdown de DATA)
let openDropdown = null; // 'category' | 'data' | null
let searchChips = [];

let currentSort = { column: 'inicio', direction: 'desc' };
let currentPage = 1;
const ITEMS_PER_PAGE = 24;

// ==========================================================================
// PONTO DE ENTRADA & INICIALIZAÇÃO
// ==========================================================================

export async function initArchiveModule() {
  const container = document.getElementById('table-body-container');
  if (!container) return;

  try {
    const fetchEvents = async () => {
      let res = await fetch('./EVENTOS_CONSOLIDADO.json');
      if (!res.ok) res = await fetch('/EVENTOS_CONSOLIDADO.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    };

    const fetchPersons = async () => {
      try {
        let res = await fetch('./PESSOAS_CONSOLIDADO.json');
        if (!res.ok) res = await fetch('/PESSOAS_CONSOLIDADO.json');
        if (res.ok) return await res.json();
      } catch (e) {
        console.warn('[Arquivo FONTE] PESSOAS_CONSOLIDADO.json não disponível:', e);
      }
      return [];
    };

    const [rawEvents, rawPersons] = await Promise.all([fetchEvents(), fetchPersons()]);
    
    // 1. Normalização de Eventos
    archiveDataset = normalizeArchiveData(rawEvents);
    
    // 2. Normalização Cruzada de Pessoas (PESSOAS_CONSOLIDADO + presenças TAGEADAS em EVENTOS)
    personsDataset = buildConsolidatedPersonsDataset(rawPersons, archiveDataset);

    // 3. Normalização de Catálogo Geral de Textos (array textos de cada evento)
    textsDataset = buildTextsDataset(archiveDataset);

    // Inicialização da interface
    renderFacetPillsBar();
    renderTableHeader();
    applyFiltersAndRender();
    
    handleInitialDeepLinking();
    initGlobalKeyboardListeners();
    bindSearchInputEvents();
    bindGlobalClickToCloseDropdowns();
  } catch (err) {
    console.error('[Arquivo FONTE] Falha ao carregar dados:', err);
    container.innerHTML = `<div class="empty-state-row">Erro ao sincronizar o acervo com o servidor.</div>`;
  }
}

// ==========================================================================
// NORMALIZAÇÃO DE DADOS & TOLERÂNCIA A DIACRÍTICOS (NFD)
// ==========================================================================

/**
 * Normalização Unicode NFD estrita: insensível a acentos, cedilhas e maiúsculas
 */
export function normalizeText(str) {
  if (!str) return '';
  return str.toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Parser para blocos de créditos e ministrantes no padrão Kirby YAML
 */
function parseCreditsYaml(yamlStr) {
  if (!yamlStr || typeof yamlStr !== 'string') return [];
  const cleanStr = yamlStr.trim();
  const rawBlocks = cleanStr.replace(/^-\s*\n?/, '').split(/\n\s*-\s*\n|\n-\s+/).filter(b => b.trim().length > 0);
  const result = [];

  rawBlocks.forEach(block => {
    const funcaoMatch = block.match(/funcao:\s*([^\n]+)/i);
    const nomesMatch = block.match(/nomes:\s*([^\n]+)/i);
    if (funcaoMatch && nomesMatch) {
      const funcao = funcaoMatch[1].trim();
      const nomesRaw = nomesMatch[1].trim();
      const nomes = nomesRaw.split(/[,;]|\be\b|\n/).map(s => s.trim()).filter(Boolean);
      result.push({ funcao, nomes });
    }
  });

  return result;
}

/**
 * Normalização do dataset de Eventos
 */
function normalizeArchiveData(data) {
  if (!Array.isArray(data)) return [];

  return data.map(item => {
    const rawYear = item.inicio ? parseInt(item.inicio.substring(0, 4), 10) : null;
    
    // Artistas
    let artistasArr = [];
    if (Array.isArray(item.artistas)) {
      artistasArr = item.artistas.map(a => a.trim()).filter(Boolean);
    } else if (typeof item.artistas === 'string' && item.artistas.trim()) {
      artistasArr = item.artistas.split(/,|\n/).map(s => s.trim()).filter(Boolean);
    }

    // Curadoria
    let curadoriaArr = [];
    if (Array.isArray(item.curadoria)) {
      curadoriaArr = item.curadoria.map(c => c.trim()).filter(Boolean);
    } else if (typeof item.curadoria === 'string' && item.curadoria.trim()) {
      curadoriaArr = item.curadoria.split(/,|\n/).map(s => s.trim()).filter(Boolean);
    }
    const curadoriaStr = curadoriaArr.join(', ');

    // Textos críticos (YAML ou Array)
    let textosNorm = [];
    if (Array.isArray(item.textos)) {
      textosNorm = item.textos;
    } else if (typeof item.textos === 'string' && item.textos.trim().length > 0) {
      textosNorm = parseKirbyYamlStructure(item.textos);
    }

    // Blocos estruturados de créditos e ministrantes
    const creditosList = parseCreditsYaml(item.creditos);
    const ministrantesList = parseCreditsYaml(item.ministrantes);

    // Corpus de busca em texto puro normalizado
    const rawContent = [
      item.title || '',
      artistasArr.join(' '),
      curadoriaStr,
      stripHtml(item.resumo || ''),
      stripHtml(item.creditos || ''),
      textosNorm.map(t => `${t.titulo} ${t.autoria} ${stripHtml(t.texto)}`).join(' ')
    ].join(' ');

    return {
      id: item.id || item._slug,
      slug: item._slug || item.id,
      title: item.title ? item.title.trim() : 'Sem título',
      categoria: item.categoria ? item.categoria.trim() : 'Exposição coletiva',
      tipoRegistro: item._tipo_registro || 'evento',
      artistas: artistasArr,
      curadoria: curadoriaStr,
      inicio: item.inicio || '',
      fim: item.fim || '',
      ano: rawYear,
      resumo: item.resumo || '',
      textos: textosNorm,
      creditos: item.creditos || '',
      creditosList,
      ministrantesList,
      visitacao: item.visitacao || '',
      images: Array.isArray(item.images) ? item.images : [],
      expandedImages: Array.isArray(item.expanded_images) ? item.expanded_images : [],
      searchCorpus: normalizeText(rawContent)
    };
  });
}

/**
 * Parser para estruturas YAML do Kirby (Textos e Ensaios)
 */
function parseKirbyYamlStructure(yamlStr) {
  if (!yamlStr || typeof yamlStr !== 'string') return [];
  
  const cleanStr = yamlStr.trim();
  const rawBlocks = cleanStr.replace(/^-\s*\n?/, '').split(/\n\s*-\s*\n|\n-\s+/).filter(b => b.trim().length > 0);

  return rawBlocks.map(block => {
    const getField = (fieldName) => {
      const regex = new RegExp(
        `(?:^|\\n)\\s*${fieldName}:\\s*([\\s\\S]*?)(?=(?:\\n\\s*(?:categoria|autoria|titulo|texto|veiculo|url|exibir_no_site|arquivos_referencia):)|$)`,
        'i'
      );
      const match = block.match(regex);
      if (!match) return '';

      let val = match[1].trim();
      if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
        val = val.slice(1, -1);
      } else if (val.startsWith('>')) {
        val = val.replace(/^>\s*/, '').trim();
      }
      val = val.replace(/\\'/g, "'").replace(/\\"/g, '"');
      return val.trim();
    };

    return {
      categoria: getField('categoria') || 'Texto crítico',
      autoria: getField('autoria') || '',
      titulo: getField('titulo') || '',
      texto: getField('texto') || ''
    };
  }).filter(t => t.texto || t.titulo);
}

/**
 * Cruzamento rigoroso de Agentes Culturais (Modo PESSOAS)
 * REGRA ESTRITA: Apenas presenças formalmente TAGEADAS (artista, curadoria, autoria de texto ou créditos adicionais)
 * são contabilizadas para ações e atribuição de funções desempenhadas.
 */
function buildConsolidatedPersonsDataset(rawPersons, eventsList) {
  const personMap = new Map();

  // 1. Ingestão de pessoas formalmente cadastradas em PESSOAS_CONSOLIDADO.json
  if (Array.isArray(rawPersons)) {
    rawPersons.forEach(p => {
      const name = (p.title || '').trim();
      if (!name) return;
      const normKey = normalizeText(name);

      let parsedLinks = [];
      if (Array.isArray(p.links)) {
        parsedLinks = p.links;
      } else if (typeof p.links === 'string' && p.links.trim()) {
        const linkBlocks = p.links.split(/\n-\s+|\n-\n/).filter(Boolean);
        linkBlocks.forEach(blk => {
          const rotuloMatch = blk.match(/rotulo:\s*(.+)/i);
          const urlMatch = blk.match(/url:\s*(.+)/i);
          if (rotuloMatch && urlMatch) {
            parsedLinks.push({
              rotulo: rotuloMatch[1].trim(),
              url: urlMatch[1].trim()
            });
          }
        });
      }

      const initialFunctions = new Set();
      if (p.membro_atelie) {
        initialFunctions.add('Membro de ateliê');
      }

      personMap.set(normKey, {
        id: p._slug || p.uuid || normKey,
        slug: p._slug || normKey,
        title: name,
        nascimento: p.nascimento || '',
        falecimento: p.falecimento || '',
        cidade: p.cidade || '',
        pais: p.pais || '',
        bio: p.bio || '',
        membro_atelie: Boolean(p.membro_atelie),
        links: parsedLinks,
        hasProfile: Boolean(p.bio || p.cidade || p.pais || parsedLinks.length > 0),
        participacoes: [],
        funcoes: initialFunctions
      });
    });
  }

  // Localiza ou instancia um agente cultural no índice
  const getOrCreatePerson = (rawName) => {
    const cleanName = rawName.trim();
    if (!cleanName) return null;
    const normKey = normalizeText(cleanName);
    if (!personMap.has(normKey)) {
      personMap.set(normKey, {
        id: normKey,
        slug: normKey,
        title: cleanName,
        nascimento: '',
        falecimento: '',
        cidade: '',
        pais: '',
        bio: '',
        membro_atelie: false,
        links: [],
        hasProfile: false,
        participacoes: [],
        funcoes: new Set()
      });
    }
    return personMap.get(normKey);
  };

  // Registra uma atuação tageada em um evento específico
  const recordParticipation = (personObj, event, roleName) => {
    if (!personObj) return;
    personObj.funcoes.add(roleName);

    const existing = personObj.participacoes.find(p => p.id === event.id);
    if (existing) {
      if (!existing.roles.includes(roleName)) {
        existing.roles.push(roleName);
        existing.roleLabel = existing.roles.join(', ');
      }
    } else {
      personObj.participacoes.push({
        id: event.id,
        title: event.title,
        ano: event.ano,
        categoria: event.categoria,
        roles: [roleName],
        roleLabel: roleName
      });
    }
  };

  // 2. Mapeamento contra presenças TAGEADAS em EVENTOS_CONSOLIDADO.json
  eventsList.forEach(event => {
    // 2.1 Artistas
    event.artistas.forEach(a => {
      const p = getOrCreatePerson(a);
      if (p) recordParticipation(p, event, 'Artista participante');
    });

    // 2.2 Curadoria
    if (event.curadoria) {
      const curadores = event.curadoria.split(/,\s*/).map(c => c.trim()).filter(Boolean);
      curadores.forEach(c => {
        const p = getOrCreatePerson(c);
        if (p) recordParticipation(p, event, 'Curadoria');
      });
    }

    // 2.3 Autoria de Texto Crítico
    if (event.textos && Array.isArray(event.textos)) {
      event.textos.forEach(t => {
        if (t.autoria) {
          const authors = t.autoria.split(/[,;]|\be\b/).map(s => s.trim()).filter(Boolean);
          authors.forEach(authName => {
            const p = getOrCreatePerson(authName);
            if (p) recordParticipation(p, event, 'Autoria de texto');
          });
        }
      });
    }

    // 2.4 Créditos Adicionais e Ministrantes (Produção, Organização, Coordenação, etc.)
    const combinedCredits = [...(event.creditosList || []), ...(event.ministrantesList || [])];
    combinedCredits.forEach(({ funcao, nomes }) => {
      nomes.forEach(nome => {
        const p = getOrCreatePerson(nome);
        if (p) recordParticipation(p, event, funcao);
      });
    });
  });

  // Converte Map para Array e adiciona propriedades computadas
  const personsList = Array.from(personMap.values()).map(p => {
    const funcoesArray = Array.from(p.funcoes);
    const totalAcoes = p.participacoes.length;

    return {
      ...p,
      funcoesArray,
      totalAcoes,
      searchCorpus: normalizeText(`${p.title} ${p.cidade} ${p.pais} ${funcoesArray.join(' ')} ${stripHtml(p.bio)}`)
    };
  });

  // Ordena prioritariamente por quem tem mais ações formais e por ordem alfabética
  return personsList.sort((a, b) => {
    if (b.totalAcoes !== a.totalAcoes) return b.totalAcoes - a.totalAcoes;
    return a.title.localeCompare(b.title, 'pt-BR');
  });
}

/**
 * Mapeamento e construção do catálogo de Textos Críticos (Modo TEXTOS)
 */
function buildTextsDataset(eventsList) {
  const texts = [];

  eventsList.forEach(event => {
    if (event.textos && Array.isArray(event.textos)) {
      event.textos.forEach((t, idx) => {
        const textTitle = t.titulo ? t.titulo.trim() : event.title;
        const author = t.autoria ? t.autoria.trim() : 'Autoria não informada';
        const cat = t.categoria ? t.categoria.trim() : 'Texto crítico';

        texts.push({
          id: `${event.id}__txt__${idx}`,
          indexInEvent: idx,
          titulo: textTitle,
          autoria: author,
          categoria: cat,
          texto: t.texto || '',
          eventId: event.id,
          eventTitle: event.title,
          eventAno: event.ano,
          eventCategoria: event.categoria,
          searchCorpus: normalizeText(`${textTitle} ${author} ${cat} ${event.title} ${stripHtml(t.texto || '')}`)
        });
      });
    }
  });

  return texts.sort((a, b) => {
    const anoA = a.eventAno || 0;
    const anoB = b.eventAno || 0;
    return anoB - anoA;
  });
}

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==========================================================================
// 1. TRIPOLARIDADE DO ACERVO: MUDANÇA DE MODO DE VISUALIZAÇÃO
// ==========================================================================

window.setViewMode = function(mode) {
  if (currentViewMode === mode) return;
  currentViewMode = mode;
  currentPage = 1;
  openDropdown = null;

  // Limpa filtro de categoria pois o catálogo de opções muda com a perspectiva
  activeFilters.category = null;

  renderFacetPillsBar();
  renderTableHeader();
  applyFiltersAndRender();
};

// ==========================================================================
// 2. FILTRAGEM DINÂMICA CONTEXTUAL: CATEGORIA E DATA
// ==========================================================================

/**
 * Retorna as categorias pertinentes ao modo de visualização ativo
 */
function getCategoriesForCurrentMode() {
  if (currentViewMode === 'EVENTOS') {
    const set = new Set();
    archiveDataset.forEach(e => {
      if (e.categoria) set.add(e.categoria);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  } else if (currentViewMode === 'PESSOAS') {
    // Coleta todas as funções reais desempenhadas no acervo
    const set = new Set();
    personsDataset.forEach(p => {
      p.funcoesArray.forEach(f => set.add(f));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  } else if (currentViewMode === 'TEXTOS') {
    const set = new Set();
    textsDataset.forEach(t => {
      if (t.categoria) set.add(t.categoria);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }
  return [];
}

/**
 * Renderiza a Barra Unificada de Visualização e Filtros Contextuais
 */
function renderFacetPillsBar() {
  const container = document.getElementById('archive-facets-container');
  if (!container) return;

  const currentYear = new Date().getFullYear();
  const availableCategories = getCategoriesForCurrentMode();

  // Rótulo do Seletor de Categoria
  let categoryLabel = 'CATEGORIA';
  if (activeFilters.category) {
    categoryLabel = `${escapeHtml(activeFilters.category)}`;
  }

  // Rótulo do Seletor de Data
  let dateLabel = 'DATA';
  const isSingleYear = activeFilters.yearStart && activeFilters.yearStart === activeFilters.yearEnd;
  const isPeriod = activeFilters.yearStart && activeFilters.yearEnd && activeFilters.yearStart !== activeFilters.yearEnd;
  if (isSingleYear) {
    dateLabel = `ANO: ${activeFilters.yearStart}`;
  } else if (isPeriod) {
    dateLabel = `${activeFilters.yearStart}–${activeFilters.yearEnd}`;
  } else if (activeFilters.yearStart) {
    dateLabel = `A PARTIR DE ${activeFilters.yearStart}`;
  }

  const yearsList = [];
  for (let y = currentYear; y >= 2013; y--) {
    yearsList.push(y);
  }

  container.innerHTML = `
    <div class="archive-facet-bar">
      <!-- 1. TRIPOLARIDADE DO ACERVO -->
      <div class="facet-group view-selector-group">
        <span class="facet-label">VISUALIZAR:</span>
        <div class="view-mode-buttons">
          <button type="button" class="filter-pill ${currentViewMode === 'EVENTOS' ? 'is-active' : ''}" 
                  onclick="window.setViewMode('EVENTOS')">EVENTOS</button>
          <button type="button" class="filter-pill ${currentViewMode === 'PESSOAS' ? 'is-active' : ''}" 
                  onclick="window.setViewMode('PESSOAS')">PESSOAS</button>
          <button type="button" class="filter-pill ${currentViewMode === 'TEXTOS' ? 'is-active' : ''}" 
                  onclick="window.setViewMode('TEXTOS')">TEXTOS</button>
        </div>
      </div>

      <!-- 2. FILTRAGEM CONTEXTUAL: CATEGORIA E DATA -->
      <div class="facet-group filter-dropdowns-group">
        <!-- Dropdown CATEGORIA -->
        <div class="filter-dropdown-wrap" id="cat-dropdown-wrap">
          <button type="button" class="filter-pill dropdown-trigger ${activeFilters.category ? 'is-active' : ''}" 
                  onclick="window.toggleFilterDropdown('category', event)" aria-expanded="${openDropdown === 'category'}">
            <span>${categoryLabel}</span>
            <span class="dropdown-arrow">▾</span>
          </button>
          <div class="filter-dropdown-menu ${openDropdown === 'category' ? 'is-open' : ''}" onclick="event.stopPropagation()">
            <div class="dropdown-options-list">
              <button type="button" class="dropdown-option ${!activeFilters.category ? 'is-selected' : ''}" 
                      onclick="window.selectCategoryFilter(null)">
                Todas as ${currentViewMode === 'PESSOAS' ? 'funções' : 'categorias'}
              </button>
              ${availableCategories.map(cat => `
                <button type="button" class="dropdown-option ${activeFilters.category === cat ? 'is-selected' : ''}" 
                        onclick="window.selectCategoryFilter('${escapeHtml(cat)}')">
                  ${escapeHtml(cat)}
                </button>
              `).join('')}
            </div>
            ${activeFilters.category ? `
              <div class="dropdown-footer">
                <button type="button" class="dropdown-clear-btn" onclick="window.selectCategoryFilter(null)">✕ Limpar categoria</button>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Dropdown DATA -->
        <div class="filter-dropdown-wrap" id="data-dropdown-wrap">
          <button type="button" class="filter-pill dropdown-trigger ${(activeFilters.yearStart || activeFilters.yearEnd) ? 'is-active' : ''}" 
                  onclick="window.toggleFilterDropdown('data', event)" aria-expanded="${openDropdown === 'data'}">
            <span>${dateLabel}</span>
            <span class="dropdown-arrow">▾</span>
          </button>
          <div class="filter-dropdown-menu date-dropdown-menu ${openDropdown === 'data' ? 'is-open' : ''}" onclick="event.stopPropagation()">
            <div class="date-tab-header">
              <button type="button" class="date-tab-btn ${activeDataTab === 'ano' ? 'is-active' : ''}" 
                      onclick="window.setDataTab('ano')">Ano Único</button>
              <button type="button" class="date-tab-btn ${activeDataTab === 'periodo' ? 'is-active' : ''}" 
                      onclick="window.setDataTab('periodo')">Período</button>
            </div>

            ${activeDataTab === 'ano' ? `
              <div class="date-years-grid">
                ${yearsList.map(y => `
                  <button type="button" class="year-pick-btn ${isSingleYear && activeFilters.yearStart === y ? 'is-selected' : ''}" 
                          onclick="window.setSingleYear(${y})">${y}</button>
                `).join('')}
              </div>
            ` : `
              <div class="date-period-form">
                <div class="period-input-row">
                  <div class="period-field">
                    <label for="period-input-start">De:</label>
                    <input type="number" id="period-input-start" min="2013" max="${currentYear}" 
                           value="${activeFilters.yearStart || 2013}" placeholder="2013" />
                  </div>
                  <div class="period-field">
                    <label for="period-input-end">Até:</label>
                    <input type="number" id="period-input-end" min="2013" max="${currentYear}" 
                           value="${activeFilters.yearEnd || currentYear}" placeholder="${currentYear}" />
                  </div>
                </div>
                <button type="button" class="filter-pill is-active period-apply-btn" onclick="window.applyPeriodFilter()">
                  Aplicar Período
                </button>
              </div>
            `}

            ${(activeFilters.yearStart || activeFilters.yearEnd) ? `
              <div class="dropdown-footer">
                <button type="button" class="dropdown-clear-btn" onclick="window.clearDateFilter()">✕ Limpar filtro de data</button>
              </div>
            ` : ''}
          </div>
        </div>
      </div>

      <!-- 3. CAMPO DE BUSCA DIRETO E INTEGRADO -->
      <div class="archive-search-box">
        <input type="text" id="archive-search-input" placeholder="Buscar no acervo..." 
               value="${activeFilters.textQuery ? escapeHtml(activeFilters.textQuery) : ''}" 
               onkeydown="if(event.key === 'Enter') window.executeSearch()" />
        <button type="button" onclick="window.executeSearch()" class="search-btn" aria-label="Buscar">›</button>
      </div>
    </div>
  `;
}

window.toggleFilterDropdown = function(type, event) {
  if (event) event.stopPropagation();
  openDropdown = (openDropdown === type) ? null : type;
  renderFacetPillsBar();
};

window.setDataTab = function(tab) {
  activeDataTab = tab;
  renderFacetPillsBar();
};

window.selectCategoryFilter = function(category) {
  activeFilters.category = category;
  openDropdown = null;
  currentPage = 1;
  renderFacetPillsBar();
  applyFiltersAndRender();
};

window.setSingleYear = function(year) {
  activeFilters.yearStart = year;
  activeFilters.yearEnd = year;
  openDropdown = null;
  currentPage = 1;
  renderFacetPillsBar();
  applyFiltersAndRender();
};

window.applyPeriodFilter = function() {
  const startEl = document.getElementById('period-input-start');
  const endEl = document.getElementById('period-input-end');
  const start = startEl ? parseInt(startEl.value, 10) : null;
  const end = endEl ? parseInt(endEl.value, 10) : null;

  activeFilters.yearStart = isNaN(start) ? null : start;
  activeFilters.yearEnd = isNaN(end) ? null : end;
  openDropdown = null;
  currentPage = 1;
  renderFacetPillsBar();
  applyFiltersAndRender();
};

window.clearDateFilter = function() {
  activeFilters.yearStart = null;
  activeFilters.yearEnd = null;
  openDropdown = null;
  currentPage = 1;
  renderFacetPillsBar();
  applyFiltersAndRender();
};

function bindGlobalClickToCloseDropdowns() {
  document.addEventListener('click', (e) => {
    if (openDropdown && !e.target.closest('.filter-dropdown-wrap')) {
      openDropdown = null;
      renderFacetPillsBar();
    }
  });
}

// ==========================================================================
// CABEÇALHO DA TABELA CONFORME O MODO DE VISUALIZAÇÃO
// ==========================================================================

function renderTableHeader() {
  const container = document.getElementById('table-header-container');
  if (!container) return;

  if (currentViewMode === 'EVENTOS') {
    // 4 + 5 + 2 + 1 = 12 colunas
    container.innerHTML = `
      <div class="header-row grid-12">
        <div class="th-cell th-title" onclick="window.sortTable('title')">TÍTULO</div>
        <div class="th-cell th-artists">ARTISTAS</div>
        <div class="th-cell th-category" onclick="window.sortTable('categoria')">CATEGORIA</div>
        <div class="th-cell th-year" onclick="window.sortTable('ano')">ANO</div>
      </div>
    `;
  } else if (currentViewMode === 'PESSOAS') {
    // 3 + 2 + 7 = 12 colunas (Nome, Total de Ações, Funções Desempenhadas)
    container.innerHTML = `
      <div class="header-row grid-12">
        <div class="th-cell th-person-name" onclick="window.sortTable('title')">NOME</div>
        <div class="th-cell th-person-actions" onclick="window.sortTable('totalAcoes')">TOTAL DE AÇÕES</div>
        <div class="th-cell th-person-roles">FUNÇÕES DESEMPENHADAS</div>
      </div>
    `;
  } else if (currentViewMode === 'TEXTOS') {
    // 4 + 2 + 2 + 4 = 12 colunas (conforme diretriz 7)
    container.innerHTML = `
      <div class="header-row grid-12">
        <div class="th-cell th-text-title" onclick="window.sortTable('titulo')">TÍTULO DO TEXTO</div>
        <div class="th-cell th-text-author" onclick="window.sortTable('autoria')">AUTORIA</div>
        <div class="th-cell th-text-category" onclick="window.sortTable('categoria')">CATEGORIA</div>
        <div class="th-cell th-text-event" onclick="window.sortTable('eventTitle')">EVENTO DE ORIGEM</div>
      </div>
    `;
  }
}

// ==========================================================================
// MOTOR DE FILTRAGEM & APLICAÇÃO
// ==========================================================================

let filteredDataset = [];

function applyFiltersAndRender() {
  const normQuery = normalizeText(activeFilters.textQuery);
  const normArtist = normalizeText(activeFilters.artistQuery);
  const normCategory = activeFilters.category ? normalizeText(activeFilters.category) : null;

  if (currentViewMode === 'EVENTOS') {
    filteredDataset = archiveDataset.filter(item => {
      // 1. Filtro de Texto / Busca Semântica
      if (normQuery && !item.searchCorpus.includes(normQuery)) {
        return false;
      }

      // 2. Filtro de Artista Selecionado
      if (normArtist) {
        const matchesArtist = item.artistas.some(a => normalizeText(a) === normArtist || normalizeText(a).includes(normArtist));
        if (!matchesArtist) return false;
      }

      // 3. Filtro Contextual de Categoria
      if (normCategory && normalizeText(item.categoria) !== normCategory) {
        return false;
      }

      // 4. Filtro de Data (Ano único ou Período)
      if (activeFilters.yearStart && item.ano) {
        if (item.ano < activeFilters.yearStart) return false;
      }
      if (activeFilters.yearEnd && item.ano) {
        if (item.ano > activeFilters.yearEnd) return false;
      }

      return true;
    });
  } else if (currentViewMode === 'PESSOAS') {
    filteredDataset = personsDataset.filter(p => {
      // 1. Filtro de Busca Textual (permite busca sem acento por 'osi', 'elcio', etc.)
      if (normQuery && !p.searchCorpus.includes(normQuery)) {
        return false;
      }

      // 2. Filtro de Função Institucional
      if (normCategory) {
        const hasRole = p.funcoesArray.some(f => normalizeText(f) === normCategory);
        if (!hasRole) return false;
      }

      // 3. Filtro de Data (pela presença em eventos dentro do período)
      if (activeFilters.yearStart || activeFilters.yearEnd) {
        const hasEventInPeriod = p.participacoes.some(part => {
          if (!part.ano) return false;
          if (activeFilters.yearStart && part.ano < activeFilters.yearStart) return false;
          if (activeFilters.yearEnd && part.ano > activeFilters.yearEnd) return false;
          return true;
        });
        if (!hasEventInPeriod) return false;
      }

      return true;
    });
  } else if (currentViewMode === 'TEXTOS') {
    filteredDataset = textsDataset.filter(txt => {
      // 1. Filtro de Texto
      if (normQuery && !txt.searchCorpus.includes(normQuery)) {
        return false;
      }

      // 2. Filtro de Categoria do Ensaio
      if (normCategory && normalizeText(txt.categoria) !== normCategory) {
        return false;
      }

      // 3. Filtro de Data do Evento de Origem
      if (activeFilters.yearStart && txt.eventAno) {
        if (txt.eventAno < activeFilters.yearStart) return false;
      }
      if (activeFilters.yearEnd && txt.eventAno) {
        if (txt.eventAno > activeFilters.yearEnd) return false;
      }

      return true;
    });
  }

  // Ordenação
  applySort();

  renderSearchChips();
  renderTableRows();
  renderPagination();
}

function applySort() {
  const col = currentSort.column;
  const dir = currentSort.direction === 'asc' ? 1 : -1;

  filteredDataset.sort((a, b) => {
    let valA = a[col];
    let valB = b[col];

    if (valA === undefined || valA === null) return 1;
    if (valB === undefined || valB === null) return -1;

    if (typeof valA === 'string') {
      return valA.localeCompare(valB, 'pt-BR') * dir;
    }
    if (valA < valB) return -1 * dir;
    if (valA > valB) return 1 * dir;
    return 0;
  });
}

window.sortTable = function(columnKey) {
  if (currentSort.column === columnKey) {
    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
  } else {
    currentSort.column = columnKey;
    currentSort.direction = 'asc';
  }
  applyFiltersAndRender();
};

// ==========================================================================
// RENDERIZAÇÃO DAS LINHAS DA TABELA (EVENTOS / PESSOAS / TEXTOS)
// Diretriz 6: Sem links diretos na listagem principal. As linhas apenas abrem as gavetas.
// ==========================================================================

function renderTableRows() {
  const container = document.getElementById('table-body-container');
  if (!container) return;
  container.innerHTML = '';

  if (filteredDataset.length === 0) {
    container.innerHTML = `
      <div class="empty-state-row">
        Nenhum registro encontrado para os critérios selecionados.
      </div>
    `;
    return;
  }

  // ========================================================================
  // A. MODO EVENTOS COM BUSCA ATIVA: DIVISÃO EM PARTICIPAÇÕES E MENÇÕES
  // ========================================================================
  if (currentViewMode === 'EVENTOS' && activeFilters.textQuery) {
    const qNorm = normalizeText(activeFilters.textQuery);

    const participacoes = [];
    const mencoes = [];

    filteredDataset.forEach(item => {
      const isArtista = item.artistas.some(a => normalizeText(a) === qNorm || normalizeText(a).includes(qNorm));
      const isCurador = normalizeText(item.curadoria).includes(qNorm);
      const inCreditos = normalizeText(item.creditos).includes(qNorm);
      const isTitleMatch = normalizeText(item.title).includes(qNorm);

      let foundMentionSnippet = '';
      if (item.textos && item.textos.length) {
        for (const t of item.textos) {
          const tNorm = normalizeText(t.texto || '');
          const aNorm = normalizeText(t.autoria || '');
          if (aNorm.includes(qNorm)) {
            foundMentionSnippet = `[${t.categoria || 'Texto crítico'} • Autoria: ${t.autoria} em "${item.title}"]`;
            break;
          } else if (tNorm.includes(qNorm)) {
            foundMentionSnippet = `[${t.categoria || 'Texto crítico'} de ${t.autoria || 'Autor'} em "${item.title}"]`;
            break;
          }
        }
      }
      if (!foundMentionSnippet && item.resumo && normalizeText(item.resumo).includes(qNorm)) {
        foundMentionSnippet = `[Resumo curatorial de "${item.title}"]`;
      }

      let roleLabel = '';
      if (isArtista && isCurador) roleLabel = 'Como Artista & Curador';
      else if (isArtista) roleLabel = 'Como Artista';
      else if (isCurador) roleLabel = 'Como Curador';
      else if (inCreditos) roleLabel = 'Ficha Técnica';

      if (roleLabel || isTitleMatch) {
        participacoes.push({ item, roleLabel: roleLabel || 'Exposição' });
      } else if (foundMentionSnippet) {
        mencoes.push({ item, snippetLabel: foundMentionSnippet });
      } else {
        participacoes.push({ item, roleLabel: 'Exposição' });
      }
    });

    const renderEventCanonicalRow = (item, extraTag = '') => {
      const row = document.createElement('div');
      row.className = 'expo-group-row';
      row.id = `row-${item.id}`;

      // Diretriz 6: Texto tipográfico puro, sem links ou botões na lista fechada
      const artistsText = item.artistas.length ? item.artistas.join(', ') : '—';

      row.innerHTML = `
        <div class="expo-item-clickable grid-12" onclick="window.toggleDrawer('${item.id}')">
          <div class="cell cell-title">
            <strong>${escapeHtml(item.title)}</strong>
            ${extraTag ? `<span class="role-subtag">${escapeHtml(extraTag)}</span>` : ''}
          </div>
          <div class="cell cell-artists">${escapeHtml(artistsText)}</div>
          <div class="cell cell-category">${escapeHtml(item.categoria)}</div>
          <div class="cell cell-year">${item.ano || '—'}</div>
        </div>
        <div class="archive-drawer-slot" id="drawer-slot-${item.id}"></div>
      `;
      return row;
    };

    if (participacoes.length > 0) {
      const pHeader = document.createElement('div');
      pHeader.className = 'search-group-header grid-12';
      pHeader.innerHTML = `
        <div class="group-header-content">
          <span class="group-pill">PARTICIPAÇÕES (${participacoes.length})</span>
          <span class="group-subtitle">Atuações registradas na ficha técnica</span>
        </div>
      `;
      container.appendChild(pHeader);
      participacoes.forEach(({ item, roleLabel }) => {
        container.appendChild(renderEventCanonicalRow(item, roleLabel !== 'Exposição' ? roleLabel : ''));
      });
    }

    if (mencoes.length > 0) {
      const mHeader = document.createElement('div');
      mHeader.className = 'search-group-header grid-12';
      mHeader.innerHTML = `
        <div class="group-header-content">
          <span class="group-pill">MENÇÕES (${mencoes.length})</span>
          <span class="group-subtitle">Citações no corpo de ensaios críticos e resumos curatoriais</span>
        </div>
      `;
      container.appendChild(mHeader);
      mencoes.forEach(({ item, snippetLabel }) => {
        container.appendChild(renderEventCanonicalRow(item, snippetLabel));
      });
    }

    return;
  }

  // ========================================================================
  // B. MODO PADRÃO EVENTOS (PAGINADO)
  // ========================================================================
  if (currentViewMode === 'EVENTOS') {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const pageItems = filteredDataset.slice(start, start + ITEMS_PER_PAGE);

    pageItems.forEach(item => {
      const groupRow = document.createElement('div');
      groupRow.className = 'expo-group-row';
      groupRow.id = `row-${item.id}`;

      // Diretriz 6: Texto tipográfico limpo, sem gatilhos na linha
      const artistsText = item.artistas.length ? item.artistas.join(', ') : '—';

      groupRow.innerHTML = `
        <div class="expo-item-clickable grid-12" onclick="window.toggleDrawer('${item.id}')">
          <div class="cell cell-title">
            <strong>${escapeHtml(item.title)}</strong>
          </div>
          <div class="cell cell-artists">${escapeHtml(artistsText)}</div>
          <div class="cell cell-category">${escapeHtml(item.categoria)}</div>
          <div class="cell cell-year">${item.ano || '—'}</div>
        </div>
        <div class="archive-drawer-slot" id="drawer-slot-${item.id}"></div>
      `;

      container.appendChild(groupRow);
    });
    return;
  }

  // ========================================================================
  // C. MODO PESSOAS (ÍNDICE DE AGENTES CULTURAIS)
  // Diretrizes 1 e 2: Sem etiqueta 'ateliê fonte' na lista e sem coluna 'último ano'
  // ========================================================================
  if (currentViewMode === 'PESSOAS') {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const pageItems = filteredDataset.slice(start, start + ITEMS_PER_PAGE);

    pageItems.forEach(person => {
      const groupRow = document.createElement('div');
      groupRow.className = 'expo-group-row person-row';
      groupRow.id = `person-row-${person.slug}`;

      const funcoesStr = person.funcoesArray.length ? person.funcoesArray.join(' • ') : 'Agente Cultural';

      // 3 colunas para NOME, 2 colunas para TOTAL DE AÇÕES, 7 colunas para FUNÇÕES
      groupRow.innerHTML = `
        <div class="expo-item-clickable grid-12" onclick="window.togglePersonDrawer('${person.slug}')">
          <div class="cell cell-person-name">
            <strong>${escapeHtml(person.title)}</strong>
          </div>
          <div class="cell cell-person-actions">${person.totalAcoes} ${person.totalAcoes === 1 ? 'ação' : 'ações'}</div>
          <div class="cell cell-person-roles">${escapeHtml(funcoesStr)}</div>
        </div>
        <div class="archive-drawer-slot" id="drawer-slot-person-${person.slug}"></div>
      `;

      container.appendChild(groupRow);
    });
    return;
  }

  // ========================================================================
  // D. MODO TEXTOS (CATÁLOGO GERAL DE FORTUNA CRÍTICA E ENSAIOS)
  // Diretriz 7: Título (4 colunas) | Autoria (2 colunas) | Categoria (2 colunas) | Evento (4 colunas)
  // ========================================================================
  if (currentViewMode === 'TEXTOS') {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const pageItems = filteredDataset.slice(start, start + ITEMS_PER_PAGE);

    pageItems.forEach(textItem => {
      const groupRow = document.createElement('div');
      groupRow.className = 'expo-group-row text-row';
      groupRow.id = `text-row-${textItem.id}`;

      groupRow.innerHTML = `
        <div class="expo-item-clickable grid-12" onclick="window.toggleTextDrawer('${textItem.id}')">
          <div class="cell cell-text-title">
            <strong>${escapeHtml(textItem.titulo)}</strong>
          </div>
          <div class="cell cell-text-author">${escapeHtml(textItem.autoria)}</div>
          <div class="cell cell-text-category">${escapeHtml(textItem.categoria)}</div>
          <div class="cell cell-text-event">${escapeHtml(textItem.eventTitle)} (${textItem.eventAno || '—'})</div>
        </div>
        <div class="archive-drawer-slot" id="drawer-slot-text-${textItem.id}"></div>
      `;

      container.appendChild(groupRow);
    });
  }
}

// ==========================================================================
// PAGINAÇÃO & TAGS DE BUSCA
// ==========================================================================

function renderPagination() {
  const container = document.getElementById('table-footer-container');
  if (!container) return;

  if (currentViewMode === 'EVENTOS' && activeFilters.textQuery) {
    container.innerHTML = '';
    return;
  }

  const totalPages = Math.max(1, Math.ceil(filteredDataset.length / ITEMS_PER_PAGE));

  container.innerHTML = `
    <div class="table-pagination-row">
      <div class="pagination-box">
        <button type="button" class="pagination-btn ${currentPage <= 1 ? 'disabled' : ''}" 
                onclick="window.changePage(-1)" aria-label="Página anterior">&#8249;</button>
        <span class="pagination-info">${currentPage}/${totalPages}</span>
        <button type="button" class="pagination-btn ${currentPage >= totalPages ? 'disabled' : ''}" 
                onclick="window.changePage(1)" aria-label="Próxima página">&#8250;</button>
      </div>
    </div>
  `;
}

function renderSearchChips() {
  const container = document.getElementById('search-tags-container');
  if (!container) return;

  if (searchChips.length === 0) {
    container.innerHTML = '';
    return;
  }

  const count = filteredDataset.length;
  const countText = `${count} ${count === 1 ? 'resultado' : 'resultados'} para:`;

  container.innerHTML = searchChips.map(chip => {
    return `
      <span class="search-results-count-label">${countText}</span>
      <div class="search-chip">
        <span>${escapeHtml(chip.label)}</span>
        <button type="button" class="search-chip-close" onclick="window.removeSearchChip('${chip.id}')" aria-label="Remover filtro">&times;</button>
      </div>
    `;
  }).join('');
}

// ==========================================================================
// 3. POPOVER ANCORADO & REGRA DA ASSIMETRIA POSITIVA (SEÇÃO 3.2)
// Diretriz 5: Z-Index máximo e posicionamento dinâmico inteligente
// ==========================================================================

function findPersonByName(nameQuery) {
  if (!nameQuery || !personsDataset.length) return null;
  const qNorm = normalizeText(nameQuery);
  return personsDataset.find(p => {
    const titleNorm = normalizeText(p.title);
    const slugNorm = normalizeText(p.slug);
    return titleNorm === qNorm || slugNorm === qNorm;
  }) || null;
}

function getArtistParticipationCount(nameQuery) {
  const qNorm = normalizeText(nameQuery);
  return archiveDataset.filter(item => {
    const isArt = item.artistas.some(a => normalizeText(a) === qNorm);
    const isCur = item.curadoria && item.curadoria.split(/,\s*/).some(c => normalizeText(c) === qNorm);
    return isArt || isCur;
  }).length;
}

function renderArtistPopoverHtml(artistName, inText = false) {
  const escName = escapeHtml(artistName);
  const person = findPersonByName(artistName);
  const participationsCount = person ? person.totalAcoes : getArtistParticipationCount(artistName);
  const hasProfile = Boolean(person && person.hasProfile);

  // Cenário 3: Artista sem perfil e participante de evento único
  if (!hasProfile && participationsCount <= 1) {
    return `<span class="artist-plain-text">${escName}</span>`;
  }

  const inTextClass = inText ? ' in-text' : '';

  // Cenário 1: Pessoa com perfil completo cadastrado
  if (hasProfile && person) {
    const locArr = [person.cidade, person.pais].filter(Boolean);
    const locStr = locArr.join(', ');
    const bioSnippet = person.bio 
      ? stripHtml(person.bio).slice(0, 110) + '...'
      : (locStr || 'Agente Cultural participante');

    return `
      <span class="artist-name-wrapper${inTextClass}">
        <button type="button" class="artist-clickable-tag" onclick="window.toggleArtistPopover(event, this)" aria-label="Opções para ${escName}">
          <span class="tag-name">${escName}</span>
        </button>
        <div class="artist-popover" onclick="event.stopPropagation()">
          <div class="popover-header">
            <span class="popover-title-text">${escName}</span>
            <button type="button" class="popover-close-btn" onclick="window.closeAllPopovers(event)" aria-label="Fechar">✕</button>
          </div>
          <div class="popover-summary-bio">${escapeHtml(bioSnippet)}</div>
          <div class="popover-count-meta">${participationsCount} ${participationsCount === 1 ? 'ação' : 'ações'} no acervo FONTE</div>
          <div class="popover-actions">
            <button type="button" class="popover-action" onclick="window.goToPersonProfile('${person.slug}')">
              <span>Ver Perfil</span>
              <span>↗</span>
            </button>
            <button type="button" class="popover-action" onclick="window.filterByArtist(event, '${escName}')">
              <span>Buscar no Arquivo</span>
              <span>›</span>
            </button>
          </div>
        </div>
      </span>
    `;
  }

  // Cenário 2: Pessoa sem perfil cadastrado, mas com múltiplas participações
  return `
    <span class="artist-name-wrapper${inTextClass}">
      <button type="button" class="artist-clickable-tag" onclick="window.toggleArtistPopover(event, this)" aria-label="Opções para ${escName}">
        <span class="tag-name">${escName}</span>
      </button>
      <div class="artist-popover" onclick="event.stopPropagation()">
        <div class="popover-header">
          <span class="popover-title-text">${escName}</span>
          <button type="button" class="popover-close-btn" onclick="window.closeAllPopovers(event)" aria-label="Fechar">✕</button>
        </div>
        <div class="popover-count-meta" style="margin-top: 4px;">${participationsCount} ações no acervo FONTE</div>
        <div class="popover-actions">
          <button type="button" class="popover-action" onclick="window.filterByArtist(event, '${escName}')">
            <span>Buscar no Arquivo (${participationsCount})</span>
            <span>›</span>
          </button>
        </div>
      </div>
    </span>
  `;
}

/**
 * Ancoragem semântica nos corpos de ensaios e gavetas
 */
function linkifyPersonsInElement(container) {
  if (!container || !personsDataset || !personsDataset.length) return;

  const validPersons = personsDataset
    .map(p => p.title.trim())
    .filter(name => name.length >= 4)
    .sort((a, b) => b.length - a.length);

  if (!validPersons.length) return;

  const escaped = validPersons.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(?<![\\wÀ-ÿ])(${escaped.join('|')})(?![\\wÀ-ÿ])`, 'gi');

  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName.toUpperCase();
        if (tag === 'BUTTON' || tag === 'A' || tag === 'SCRIPT' || tag === 'STYLE' || tag === 'MARK') {
          return NodeFilter.FILTER_REJECT;
        }
        if (parent.closest('.artist-name-wrapper') || parent.closest('.artist-clickable-tag') || parent.closest('.artist-popover')) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const nodesToReplace = [];
  let currentNode;
  while ((currentNode = walker.nextNode())) {
    if (regex.test(currentNode.nodeValue)) {
      nodesToReplace.push(currentNode);
    }
    regex.lastIndex = 0;
  }

  nodesToReplace.forEach(textNode => {
    const text = textNode.nodeValue;
    regex.lastIndex = 0;
    
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const matchIndex = match.index;
      const matchedText = match[0];

      if (matchIndex > lastIndex) {
        fragment.appendChild(document.createTextNode(text.substring(lastIndex, matchIndex)));
      }

      const tempSpan = document.createElement('span');
      tempSpan.innerHTML = renderArtistPopoverHtml(matchedText, true);
      while (tempSpan.firstChild) {
        fragment.appendChild(tempSpan.firstChild);
      }

      lastIndex = matchIndex + matchedText.length;
    }

    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
    }

    if (textNode.parentNode) {
      textNode.parentNode.replaceChild(fragment, textNode);
    }
  });
}

// ==========================================================================
// GAVETA DE EVENTOS (MODO EVENTOS — SPLIT-VIEW & ZOOM)
// ==========================================================================

window.toggleDrawer = function(id, defaultTab = 'sobre') {
  const slot = document.getElementById(`drawer-slot-${id}`);
  const parentRow = document.getElementById(`row-${id}`);
  if (!slot || !parentRow) return;

  const isOpen = parentRow.classList.contains('is-open');

  document.querySelectorAll('.expo-group-row.is-open').forEach(el => {
    el.classList.remove('is-open');
    const s = el.querySelector('.archive-drawer-slot');
    if (s) s.innerHTML = '';
  });

  if (isOpen) {
    history.replaceState(null, '', window.location.pathname + '#sec-arquivo');
    return;
  }

  const item = archiveDataset.find(e => e.id === id);
  if (!item) return;

  parentRow.classList.add('is-open');
  history.pushState(null, '', `#sec-arquivo?id=${item.id}&tab=${defaultTab}`);

  const hasTextos = Boolean(item.textos && item.textos.length);
  const hasCreditos = Boolean(item.creditos || item.curadoria);

  const imagesSource = (item.expandedImages && item.expandedImages.length > 0) 
    ? item.expandedImages 
    : item.images;

  const lateralImagesHtml = imagesSource.map((imgObj, idx) => {
    const url = typeof imgObj === 'string' ? imgObj : (imgObj.url || '');
    if (!url) return '';
    return `
      <div class="drawer-img-wrap" onclick="window.openExpandedGallery('${item.id}', ${idx})">
        <img src="${url}" alt="${escapeHtml(item.title)}" loading="lazy" />
      </div>
    `;
  }).join('');

  slot.innerHTML = `
    <div class="detail-drawer">
      <div class="drawer-header-section">
        <h3 class="drawer-title">${escapeHtml(item.title)}</h3>
        ${item.ano ? `<div class="drawer-periodo-tag">${item.ano}</div>` : ''}
      </div>

      <div class="drawer-grid-expo">
        <div class="drawer-info-content">
          <div class="drawer-action-pills">
            <button type="button" class="filter-pill ${defaultTab === 'sobre' ? 'is-active' : ''}" 
                    id="tab-btn-sobre-${item.id}" onclick="window.switchDrawerTab('${item.id}', 'sobre')">Sobre</button>
            
            ${hasTextos ? `
              <button type="button" class="filter-pill ${defaultTab === 'textos' ? 'is-active' : ''}" 
                      id="tab-btn-textos-${item.id}" onclick="window.switchDrawerTab('${item.id}', 'textos')">Ensaios Críticos (${item.textos.length})</button>
            ` : ''}

            ${hasCreditos ? `
              <button type="button" class="filter-pill ${defaultTab === 'creditos' ? 'is-active' : ''}" 
                      id="tab-btn-creditos-${item.id}" onclick="window.switchDrawerTab('${item.id}', 'creditos')">Ficha Técnica</button>
            ` : ''}

            <button type="button" class="filter-pill copy-link-btn" onclick="window.copySemanticLink('${item.id}')">
              <span>🔗 Copiar Link</span>
            </button>

            <button type="button" class="filter-pill drawer-close-btn" onclick="window.toggleDrawer('${item.id}')" aria-label="Fechar gaveta">✕</button>
          </div>

          <div class="drawer-reading-body" id="drawer-reading-content-${item.id}"></div>
        </div>

        <div class="drawer-gallery-lateral hide-scrollbar">
          ${lateralImagesHtml || '<div class="drawer-empty-gallery">Sem documentação fotográfica.</div>'}
        </div>
      </div>

      <div class="drawer-expanded-overlay" id="zoom-overlay-${item.id}" onclick="window.closeExpandedGallery('${item.id}')">
        <div class="drawer-expanded-track hide-scrollbar" id="zoom-track-${item.id}" onclick="event.stopPropagation()"></div>
      </div>
    </div>
  `;

  window.switchDrawerTab(item.id, defaultTab);

  const performScroll = () => {
    const siteHeader = document.getElementById('logo-controller');
    const headerHeight = siteHeader ? siteHeader.getBoundingClientRect().height : 56;
    const drawerHeader = slot.querySelector('.drawer-header-section') || slot;
    const drawerTop = drawerHeader.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({
      top: Math.max(0, drawerTop - headerHeight),
      behavior: 'smooth'
    });
  };

  requestAnimationFrame(performScroll);
  setTimeout(performScroll, 60);
};

window.switchDrawerTab = function(id, tab) {
  const item = archiveDataset.find(e => e.id === id);
  const readingCol = document.getElementById(`drawer-reading-content-${id}`);
  if (!item || !readingCol) return;

  document.querySelectorAll(`#drawer-slot-${id} .drawer-action-pills .filter-pill`).forEach(p => {
    if (!p.classList.contains('copy-link-btn') && !p.classList.contains('drawer-close-btn')) {
      p.classList.remove('is-active');
    }
  });
  const activePill = document.getElementById(`tab-btn-${tab}-${id}`);
  if (activePill) activePill.classList.add('is-active');

  history.replaceState(null, '', `#sec-arquivo?id=${item.id}&tab=${tab}`);

  if (tab === 'sobre') {
    readingCol.innerHTML = `
      <div class="drawer-desc">
        ${item.resumo || '<p>Sem sinopse cadastrada.</p>'}
      </div>
      ${item.visitacao ? `<div class="drawer-visitacao"><strong>Visitação:</strong> ${escapeHtml(item.visitacao)}</div>` : ''}
    `;
  } else if (tab === 'textos') {
    if (item.textos.length === 1) {
      const t = item.textos[0];
      readingCol.innerHTML = `
        <article class="essay-item full-text-view">
          <span class="essay-category">${escapeHtml(t.categoria)}</span>
          <h4 class="essay-title">${escapeHtml(t.titulo || item.title)}</h4>
          <div class="essay-author">Por <strong>${escapeHtml(t.autoria || 'Autoria não informada')}</strong></div>
          <div class="essay-body">${t.texto}</div>
        </article>
      `;
    } else {
      readingCol.innerHTML = `
        <div class="text-index-list">
          ${item.textos.map((t, idx) => `
            <div class="text-index-item" onclick="window.showSingleText('${item.id}', ${idx})" role="button" tabindex="0">
              <span class="essay-category">${escapeHtml(t.categoria)}</span>
              <h4 class="essay-title">${escapeHtml(t.titulo || item.title)}</h4>
              <div class="essay-author">Por <strong>${escapeHtml(t.autoria || 'Autoria não informada')}</strong></div>
            </div>
          `).join('')}
        </div>
      `;
    }
  } else if (tab === 'creditos') {
    const curadoriaHtml = item.curadoria 
      ? item.curadoria.split(/,\s*/).map(c => renderArtistPopoverHtml(c.trim())).join(', ') 
      : '';
    const artistasHtml = item.artistas.length 
      ? item.artistas.map(a => renderArtistPopoverHtml(a)).join(', ') 
      : '';

    readingCol.innerHTML = `
      <div class="drawer-meta">
        ${curadoriaHtml ? `<div><strong>Curadoria:</strong> ${curadoriaHtml}</div>` : ''}
        ${artistasHtml ? `<div><strong>Artistas Participantes:</strong> ${artistasHtml}</div>` : ''}
        ${item.creditos ? `<div class="drawer-creditos-texto">${escapeHtml(item.creditos)}</div>` : ''}
      </div>
    `;
  }

  // Ancoragem semântica nos textos internos da gaveta
  linkifyPersonsInElement(readingCol);
};

window.showSingleText = function(id, index) {
  const item = archiveDataset.find(e => e.id === id);
  const readingCol = document.getElementById(`drawer-reading-content-${id}`);
  if (!item || !readingCol || !item.textos[index]) return;

  const t = item.textos[index];
  readingCol.innerHTML = `
    <div class="back-to-list-wrap">
      <button type="button" class="back-to-list-btn" onclick="window.switchDrawerTab('${id}', 'textos')">
        ← Voltar à lista de textos
      </button>
    </div>
    <article class="essay-item full-text-view">
      <span class="essay-category">${escapeHtml(t.categoria)}</span>
      <h4 class="essay-title">${escapeHtml(t.titulo || item.title)}</h4>
      <div class="essay-author">Por <strong>${escapeHtml(t.autoria || 'Autoria não informada')}</strong></div>
      <div class="essay-body">${t.texto}</div>
    </article>
  `;

  linkifyPersonsInElement(readingCol);
};

// ==========================================================================
// GAVETA DE PESSOAS (MODO PESSOAS — SPLIT-VIEW BIOGRAFIA & CRONOLOGIA)
// ==========================================================================

window.togglePersonDrawer = function(slug) {
  const slot = document.getElementById(`drawer-slot-person-${slug}`);
  const parentRow = document.getElementById(`person-row-${slug}`);
  if (!slot || !parentRow) return;

  const isOpen = parentRow.classList.contains('is-open');

  document.querySelectorAll('.expo-group-row.is-open').forEach(el => {
    el.classList.remove('is-open');
    const s = el.querySelector('.archive-drawer-slot');
    if (s) s.innerHTML = '';
  });

  if (isOpen) return;

  const person = personsDataset.find(p => p.slug === slug);
  if (!person) return;

  parentRow.classList.add('is-open');

  const locArr = [person.cidade, person.pais].filter(Boolean);
  const locStr = locArr.join(', ');
  let datesStr = '';
  if (person.nascimento) datesStr = `n. ${person.nascimento}`;
  if (person.falecimento) datesStr += ` - m. ${person.falecimento}`;

  const participacoesHtml = person.participacoes.length ? `
    <div class="person-drawer-section">
      <h5 class="person-section-sub">Atuações no FONTE (${person.participacoes.length})</h5>
      <ul class="person-timeline-list">
        ${person.participacoes.map(p => `
          <li class="person-timeline-item" onclick="window.openEventFromAnywhere('${p.id}')">
            <span class="timeline-year">${p.ano || '—'}</span>
            <div class="timeline-info">
              <strong class="timeline-title">${escapeHtml(p.title)}</strong>
              <span class="timeline-role">${escapeHtml(p.roleLabel)} • ${escapeHtml(p.categoria)}</span>
            </div>
            <span class="timeline-arrow">›</span>
          </li>
        `).join('')}
      </ul>
    </div>
  ` : '';

  const linksHtml = (person.links && person.links.length) ? `
    <div class="person-links-wrap">
      ${person.links.map(l => `
        <a href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer" class="person-link-tag">
          ${escapeHtml(l.rotulo || l.label || 'Link')} ↗
        </a>
      `).join('')}
    </div>
  ` : '';

  slot.innerHTML = `
    <div class="detail-drawer person-detail-drawer">
      <div class="drawer-header-section">
        <div>
          <h3 class="drawer-title">${escapeHtml(person.title)}</h3>
          <div class="person-meta-row">
            ${locStr ? `<span>${escapeHtml(locStr)}</span>` : ''}
            ${datesStr ? `<span>• ${escapeHtml(datesStr)}</span>` : ''}
            ${person.membro_atelie ? `<span>• Membro Ateliê FONTE</span>` : ''}
          </div>
        </div>
        <button type="button" class="filter-pill drawer-close-btn" onclick="window.togglePersonDrawer('${slug}')" aria-label="Fechar">✕</button>
      </div>

      <div class="drawer-grid-expo">
        <!-- Coluna Esquerda: Minibio e Dados -->
        <div class="drawer-info-content">
          <div class="person-bio-container">
            <h4 class="person-col-heading">Trajetória & Dados</h4>
            <div class="person-bio-text">
              ${person.bio || '<p class="empty-msg">Sem biografia textual cadastrada no acervo.</p>'}
            </div>
            ${linksHtml}
          </div>
        </div>

        <!-- Coluna Direita: Relação Cronológica de Ações -->
        <div class="drawer-gallery-lateral hide-scrollbar person-actions-col">
          <h4 class="person-col-heading">Histórico de Ações (${person.totalAcoes})</h4>
          ${participacoesHtml}
          ${!person.participacoes.length ? '<p class="empty-msg">Nenhuma ação formal registrada.</p>' : ''}
        </div>
      </div>
    </div>
  `;

  const siteHeader = document.getElementById('logo-controller');
  const headerHeight = siteHeader ? siteHeader.getBoundingClientRect().height : 56;
  const drawerTop = slot.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({ top: Math.max(0, drawerTop - headerHeight), behavior: 'smooth' });
};

// ==========================================================================
// GAVETA DE TEXTOS (MODO TEXTOS — FORMATO EDITORIAL NA ÍNTEGRA)
// ==========================================================================

window.toggleTextDrawer = function(textId) {
  const slot = document.getElementById(`drawer-slot-text-${textId}`);
  const parentRow = document.getElementById(`text-row-${textId}`);
  if (!slot || !parentRow) return;

  const isOpen = parentRow.classList.contains('is-open');

  document.querySelectorAll('.expo-group-row.is-open').forEach(el => {
    el.classList.remove('is-open');
    const s = el.querySelector('.archive-drawer-slot');
    if (s) s.innerHTML = '';
  });

  if (isOpen) return;

  const textItem = textsDataset.find(t => t.id === textId);
  if (!textItem) return;

  parentRow.classList.add('is-open');

  slot.innerHTML = `
    <div class="detail-drawer text-detail-drawer">
      <div class="drawer-header-section">
        <div>
          <span class="essay-category">${escapeHtml(textItem.categoria)}</span>
          <h3 class="drawer-title">${escapeHtml(textItem.titulo)}</h3>
          <div class="essay-author">Por <strong>${escapeHtml(textItem.autoria)}</strong></div>
        </div>
        <div class="text-drawer-actions">
          <button type="button" class="filter-pill is-active" onclick="window.openEventFromAnywhere('${textItem.eventId}', 'textos')">
            Ver Evento no Acervo ↗
          </button>
          <button type="button" class="filter-pill drawer-close-btn" onclick="window.toggleTextDrawer('${textId}')" aria-label="Fechar">✕</button>
        </div>
      </div>

      <div class="text-origin-banner">
        <span>Vinculado à mostra:</span>
        <strong>${escapeHtml(textItem.eventTitle)}</strong> (${textItem.eventAno || '—'}) • ${escapeHtml(textItem.eventCategoria)}
      </div>

      <div class="essay-body full-essay-layout" id="text-full-body-${textItem.id}">
        ${textItem.texto}
      </div>
    </div>
  `;

  const bodyEl = document.getElementById(`text-full-body-${textItem.id}`);
  if (bodyEl) linkifyPersonsInElement(bodyEl);

  const siteHeader = document.getElementById('logo-controller');
  const headerHeight = siteHeader ? siteHeader.getBoundingClientRect().height : 56;
  const drawerTop = slot.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({ top: Math.max(0, drawerTop - headerHeight), behavior: 'smooth' });
};

// ==========================================================================
// AÇÕES DE TRANSIÇÃO ENTRE MODOS DE VISUALIZAÇÃO
// ==========================================================================

window.goToPersonProfile = function(slug) {
  window.closeAllPopovers();
  window.setViewMode('PESSOAS');

  setTimeout(() => {
    window.togglePersonDrawer(slug);
  }, 150);
};

window.openEventFromAnywhere = function(eventId, defaultTab = 'sobre') {
  window.closeAllPopovers();
  window.setViewMode('EVENTOS');

  const isVisible = filteredDataset.some(e => e.id === eventId);
  if (!isVisible) {
    activeFilters.textQuery = '';
    activeFilters.artistQuery = '';
    activeFilters.category = null;
    activeFilters.yearStart = null;
    activeFilters.yearEnd = null;
    searchChips = [];
    applyFiltersAndRender();
  }

  setTimeout(() => {
    window.toggleDrawer(eventId, defaultTab);
  }, 150);
};

// ==========================================================================
// POPOVER FLUTUANTE DE ARTISTAS & CONTROLE DE FECHAMENTO
// Diretriz 5: Posicionamento dinâmico e z-index máximo
// ==========================================================================

window.toggleArtistPopover = function(event, el) {
  if (event) event.stopPropagation();
  const wrapper = el.closest('.artist-name-wrapper');
  if (!wrapper) return;
  const popover = wrapper.querySelector('.artist-popover');
  if (!popover) return;
  const isOpen = popover.classList.contains('is-open');

  window.closeAllPopovers();

  if (!isOpen) {
    // Se o elemento estiver próximo ao topo do viewport/cabeçalho, posiciona para baixo
    const rect = el.getBoundingClientRect();
    if (rect.top < 240) {
      popover.classList.add('popover-down');
    } else {
      popover.classList.remove('popover-down');
    }

    popover.classList.add('is-open');
    wrapper.classList.add('is-open');
  }
};

window.closeAllPopovers = function(event) {
  if (event) event.stopPropagation();
  document.querySelectorAll('.artist-popover.is-open').forEach(p => {
    p.classList.remove('is-open');
    p.classList.remove('popover-down');
  });
  document.querySelectorAll('.artist-name-wrapper.is-open').forEach(w => w.classList.remove('is-open'));
};

window.filterByArtist = function(event, artistName) {
  if (event) event.stopPropagation();
  window.closeAllPopovers();

  if (currentViewMode !== 'EVENTOS') {
    currentViewMode = 'EVENTOS';
    renderTableHeader();
  }

  activeFilters.artistQuery = artistName;
  searchChips = searchChips.filter(c => c.type !== 'artist');
  searchChips.push({
    id: `chip-artist-${Date.now()}`,
    type: 'artist',
    label: `ARTISTA: ${artistName}`,
    val: artistName
  });

  renderFacetPillsBar();
  applyFiltersAndRender();
};

// ==========================================================================
// MODAL ZOOM / LIGHTBOX DE IMAGENS
// ==========================================================================

window.openExpandedGallery = function(id, initialIndex = 0) {
  const item = archiveDataset.find(e => e.id === id);
  const overlay = document.getElementById(`zoom-overlay-${id}`);
  const track = document.getElementById(`zoom-track-${id}`);
  if (!item || !overlay || !track) return;

  const siteHeader = document.getElementById('logo-controller');
  const headerHeight = siteHeader ? siteHeader.getBoundingClientRect().height : 56;
  document.documentElement.style.setProperty('--site-header-height', `${headerHeight}px`);

  const imagesList = (item.expandedImages && item.expandedImages.length > 0) 
    ? item.expandedImages 
    : item.images.map(url => ({
        url,
        legenda: item.title,
        autoria: '',
        url_venda: '',
        disponivel: false
      }));

  track.innerHTML = imagesList.map((img, idx) => {
    const url = typeof img === 'string' ? img : (img.url || '');
    const legenda = (typeof img === 'object' && img.legenda) ? img.legenda : item.title;
    const autoria = (typeof img === 'object' && img.autoria) ? img.autoria : '';
    const disponivel = (typeof img === 'object' && img.disponivel);
    const urlVenda = (typeof img === 'object' && img.url_venda) 
      ? img.url_venda 
      : 'https://www.artworkarchive.com/profile/fonte/artists';

    return `
      <div class="drawer-expanded-item" id="zoom-item-${id}-${idx}">
        <div class="drawer-expanded-img-wrap">
          <img src="${url}" alt="${escapeHtml(legenda)}" 
               onload="window.syncCaptionWidth(this)" 
               onclick="window.closeExpandedGallery('${id}')" />
        </div>
        <div class="drawer-expanded-caption-row" onclick="event.stopPropagation()">
          <div class="drawer-expanded-caption">
            <div class="drawer-caption-text">
              <strong>${escapeHtml(legenda)}</strong>${autoria ? ` • ${escapeHtml(autoria)}` : ''}
            </div>
          </div>
          ${disponivel ? `
            <a href="${urlVenda}" target="_blank" rel="noopener noreferrer" 
               class="drawer-btn-disponivel" title="Consultar no Artwork Archive" aria-label="Disponível no Artwork Archive">$</a>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  overlay.style.display = 'block';
  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
  });

  setTimeout(() => {
    const targetItem = document.getElementById(`zoom-item-${id}-${initialIndex}`);
    if (targetItem) track.scrollLeft = targetItem.offsetLeft - 20;
  }, 100);
};

window.syncCaptionWidth = function(imgEl) {
  if (!imgEl) return;
  const parentItem = imgEl.closest('.drawer-expanded-item');
  if (!parentItem) return;

  const w = imgEl.getBoundingClientRect().width || imgEl.clientWidth;
  if (w > 0) {
    const wrap = parentItem.querySelector('.drawer-expanded-img-wrap');
    const captionRow = parentItem.querySelector('.drawer-expanded-caption-row');
    if (wrap) wrap.style.width = `${w}px`;
    if (captionRow) captionRow.style.width = `${w}px`;
  }
};

window.closeExpandedGallery = function(id) {
  const overlay = document.getElementById(`zoom-overlay-${id}`);
  if (overlay) {
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.style.display = 'none';
    }, 250);
  }
};

// ==========================================================================
// PAGINAÇÃO & EVENTOS DE BUSCA
// ==========================================================================

window.changePage = function(delta) {
  const totalPages = Math.max(1, Math.ceil(filteredDataset.length / ITEMS_PER_PAGE));
  const target = currentPage + delta;
  if (target >= 1 && target <= totalPages) {
    currentPage = target;
    renderTableRows();
    renderPagination();

    const tableEl = document.querySelector('.table-container');
    if (tableEl) {
      const topPos = tableEl.getBoundingClientRect().top + window.scrollY - 56;
      window.scrollTo({ top: topPos, behavior: 'smooth' });
    }
  }
};

window.executeSearch = function() {
  const input = document.getElementById('archive-search-input');
  if (!input) return;
  const q = input.value.trim();

  if (!q) {
    if (activeFilters.textQuery) {
      activeFilters.textQuery = '';
      searchChips = searchChips.filter(c => c.type !== 'text');
      applyFiltersAndRender();
    }
    return;
  }

  activeFilters.textQuery = q;
  searchChips = searchChips.filter(c => c.type !== 'text');
  searchChips.push({
    id: `chip-text-${Date.now()}`,
    type: 'text',
    label: q,
    val: q
  });

  input.value = '';
  currentPage = 1;
  applyFiltersAndRender();
};

window.removeSearchChip = function(chipId) {
  const chip = searchChips.find(c => c.id === chipId);
  if (!chip) return;

  if (chip.type === 'artist') activeFilters.artistQuery = '';
  if (chip.type === 'text') activeFilters.textQuery = '';

  searchChips = searchChips.filter(c => c.id !== chipId);
  applyFiltersAndRender();
};

window.copySemanticLink = function(id) {
  const url = `${window.location.origin}${window.location.pathname}#sec-arquivo?id=${id}`;
  navigator.clipboard.writeText(url).then(() => {
    const btnSpan = document.querySelector(`#drawer-slot-${id} .copy-link-btn span`);
    if (btnSpan) {
      btnSpan.textContent = '✓ Copiado!';
      setTimeout(() => { btnSpan.textContent = '🔗 Copiar Link'; }, 2000);
    }
  });
};

function bindSearchInputEvents() {
  const input = document.getElementById('archive-search-input');
  if (!input) return;
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') window.executeSearch();
  });
}

function handleInitialDeepLinking() {
  const hash = window.location.hash;
  if (!hash.includes('?id=')) return;

  const queryString = hash.split('?')[1];
  const params = new URLSearchParams(queryString);
  const targetId = params.get('id');
  const targetTab = params.get('tab') || 'sobre';

  if (targetId) {
    setTimeout(() => {
      window.toggleDrawer(targetId, targetTab);
    }, 450);
  }
}

function initGlobalKeyboardListeners() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      window.closeAllPopovers();
      openDropdown = null;
      renderFacetPillsBar();
      document.querySelectorAll('.drawer-expanded-overlay').forEach(o => {
        o.style.display = 'none';
      });
    }
  });

  document.addEventListener('click', () => {
    window.closeAllPopovers();
  });
  
  window.addEventListener('popstate', () => {
    if (!window.location.hash.includes('?id=')) {
      document.querySelectorAll('.expo-group-row.is-open').forEach(el => {
        el.classList.remove('is-open');
        const s = el.querySelector('.archive-drawer-slot');
        if (s) s.innerHTML = '';
      });
    }
  });
}
