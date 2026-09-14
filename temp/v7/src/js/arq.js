/**
 * ARQ.JS - Módulo de Arquivo Integrado com Gaveta Universal e Navegação Completa
 * Residência Artística FONTE
 * 
 * Regras estritas:
 * - Mesma moldura de título que programação
 * - Mesmo molde para abrir gavetas no arquivo e navegar por ela
 * - Todos os caminhos presentes em arquivo têm o mesmo sistema de navegação dentro da gaveta, com breadcrumbs acima (iniciando em ARQUIVO)
 * - Navegação cruzada completa: Evento -> Artista -> Perfil -> Ações -> Evento -> Galeria Zoom
 */

// Datasets em memória
let archiveDataset = [];
let personsDataset = [];
let textsDataset = [];
let filteredDataset = [];

// Estado da visualização
let currentViewMode = 'EVENTOS'; // 'EVENTOS' | 'PESSOAS' | 'TEXTOS'
let activeFilters = {
  category: null,
  dateYear: null,
  datePeriod: null,
  textQuery: ''
};
let currentSort = { column: 'inicio', direction: 'desc' };
let currentPage = 1;
const ITEMS_PER_PAGE = 24;

// Estado da gaveta universal ativa no Arquivo
let activeDrawerState = null;
let activeDrawerTimeline = null;
let activePopover = null;

/**
 * Ponto de entrada do módulo de Arquivo
 */
export async function initArqModule() {
  const container = document.getElementById('table-body-container');
  if (!container) return;

  try {
    const fetchEvents = async () => {
      const urls = ['./EVENTOS_CONSOLIDADO.json', '/EVENTOS_CONSOLIDADO.json', './public/EVENTOS_CONSOLIDADO.json', '/public/EVENTOS_CONSOLIDADO.json'];
      for (const u of urls) {
        try {
          const res = await fetch(u);
          if (res.ok) return await res.json();
        } catch (_) {}
      }
      throw new Error('EVENTOS_CONSOLIDADO.json não encontrado');
    };

    const fetchPersons = async () => {
      const urls = ['./PESSOAS_CONSOLIDADO.json', '/PESSOAS_CONSOLIDADO.json', './public/PESSOAS_CONSOLIDADO.json', '/public/PESSOAS_CONSOLIDADO.json'];
      for (const u of urls) {
        try {
          const res = await fetch(u);
          if (res.ok) return await res.json();
        } catch (_) {}
      }
      console.warn('[Arq] PESSOAS_CONSOLIDADO.json não disponível');
      return [];
    };

    const [rawEvents, rawPersons] = await Promise.all([fetchEvents(), fetchPersons()]);

    archiveDataset = normalizeArchiveData(rawEvents);
    personsDataset = buildConsolidatedPersonsDataset(rawPersons, archiveDataset);
    textsDataset = buildTextsDataset(archiveDataset);

    renderFacetPillsBar();
    renderTableHeader();
    applyFiltersAndRender();

    bindSearchInputEvents();
    bindGlobalClickToCloseDropdowns();
  } catch (err) {
    console.error('[Arq] Falha ao carregar dados:', err);
    container.innerHTML = `<div class="empty-state-row">Erro ao sincronizar o acervo com o servidor.</div>`;
  }
}

// ==========================================================================
// NORMALIZAÇÃO DE DADOS
// ==========================================================================

function normalizeText(str) {
  if (!str) return '';
  return str.toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

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

function parseTextosField(textos, fallbackTitle = '') {
  if (Array.isArray(textos) && textos.length > 0) {
    return textos
      .filter(t => t && (typeof t === 'string' || t.exibir_no_site !== false))
      .map((t, idx) => {
        if (typeof t === 'string') {
          return {
            id: `texto-${idx}`,
            titulo: fallbackTitle || 'Texto Crítico',
            autoria: '',
            categoria: 'Texto Crítico',
            texto: t
          };
        }
        return {
          id: t.id || `texto-${idx}`,
          titulo: t.titulo || t.title || fallbackTitle || 'Texto Crítico',
          autoria: t.autoria || t.autor || '',
          categoria: t.categoria || 'Texto Crítico',
          texto: t.texto || t.content || ''
        };
      });
  }

  if (typeof textos === 'string' && textos.trim().length > 0) {
    const str = textos.trim();
    if (str.startsWith('[')) {
      try {
        const parsed = JSON.parse(str);
        return parseTextosField(parsed, fallbackTitle);
      } catch (_) {}
    }

    const blocks = str.replace(/^-\s*\n?/, '').split(/\n\s*-\s*\n|\n-\s+/).filter(b => b.trim().length > 0);
    const result = [];
    blocks.forEach((block, idx) => {
      const catMatch = block.match(/categoria:\s*([^\n]+)/i);
      const autMatch = block.match(/autoria:\s*([^\n]+)/i);
      const titMatch = block.match(/titulo:\s*([^\n]+)/i);
      const txtMatch = block.match(/texto:\s*([\s\S]+)/i);
      const exMatch = block.match(/exibir_no_site:\s*([^\n]+)/i);

      if (exMatch) {
        const exVal = exMatch[1].trim().toLowerCase();
        if (exVal === 'false' || exVal === '0' || exVal === 'no') {
          return;
        }
      }

      let textoVal = txtMatch ? txtMatch[1].trim() : '';
      if ((textoVal.startsWith("'") && textoVal.endsWith("'")) || (textoVal.startsWith('"') && textoVal.endsWith('"'))) {
        textoVal = textoVal.slice(1, -1);
      }

      result.push({
        id: `texto-yaml-${idx}`,
        categoria: catMatch ? catMatch[1].trim() : 'Texto crítico',
        autoria: autMatch ? autMatch[1].trim() : '',
        titulo: titMatch ? titMatch[1].trim() : (fallbackTitle || 'Texto crítico'),
        texto: textoVal || block
      });
    });

    if (result.length > 0) return result;

    return [{
      id: `texto-str-0`,
      categoria: 'Texto crítico',
      autoria: '',
      titulo: fallbackTitle || 'Texto crítico',
      texto: str
    }];
  }

  return [];
}

function normalizeArchiveData(data) {
  if (!Array.isArray(data)) return [];

  return data.map(item => {
    const rawYear = item.inicio ? parseInt(item.inicio.substring(0, 4), 10) : null;
    
    let artistasArr = [];
    if (Array.isArray(item.artistas)) {
      artistasArr = item.artistas.map(a => a.trim()).filter(Boolean);
    } else if (typeof item.artistas === 'string' && item.artistas.trim()) {
      artistasArr = item.artistas.split(/,|\n/).map(s => s.trim()).filter(Boolean);
    }

    let curadoriaArr = [];
    if (Array.isArray(item.curadoria)) {
      curadoriaArr = item.curadoria.map(c => c.trim()).filter(Boolean);
    } else if (typeof item.curadoria === 'string' && item.curadoria.trim()) {
      curadoriaArr = item.curadoria.split(/,|\n/).map(s => s.trim()).filter(Boolean);
    }

    const creditosParsed = parseCreditsYaml(item.creditos);

    let fotosArr = [];
    if (Array.isArray(item.expanded_images) && item.expanded_images.length > 0) {
      fotosArr = item.expanded_images.map(img => ({
        url: img.url,
        legenda: img.legenda || item.title || '',
        autoria: img.autoria || ''
      }));
    } else if (Array.isArray(item.images) && item.images.length > 0) {
      fotosArr = item.images.map(url => ({
        url,
        legenda: item.title || '',
        autoria: ''
      }));
    } else if (Array.isArray(item.fotos) && item.fotos.length > 0) {
      fotosArr = item.fotos.map(f => typeof f === 'string' ? { url: f, legenda: item.title } : f);
    }

    let textosArr = parseTextosField(item.textos, item.title);
    if (!textosArr.length && item.texto_critico) {
      textosArr = parseTextosField(item.texto_critico, item.title);
    }

    const idOrTitle = (item.id || item._slug || item.title || '').toLowerCase();
    let videosArr = Array.isArray(item.videos) ? item.videos : [];
    if (!videosArr.length && (idOrTitle.includes('1month') || idOrTitle.includes('monroy'))) {
      videosArr = [
        {
          titulo: 'Artista troca tudo',
          url: 'https://www.youtube.com/watch?v=DYZK3glxpfI',
          legenda: 'Negociação de obras por análise crítica do trabalho'
        },
        {
          titulo: 'Quer que eu faça o quê?',
          url: 'https://www.youtube.com/live/5OIQ87-oUWo',
          legenda: 'Live inaugural // #1MONTHROY'
        },
        {
          titulo: 'Strike a Pose #2',
          url: 'https://www.youtube.com/watch?v=YZll0t40H6o',
          legenda: 'Escultura // #1MONTHROY'
        },
        {
          titulo: 'Mea Culpa #3',
          url: 'https://www.youtube.com/watch?v=uRUiEfa9MaU',
          legenda: 'Confessionário de reality show ao vivo After Troca Tudo'
        },
        {
          titulo: 'Dançando por um sueño #8 - Dance Hall2 com Champion Boy',
          url: 'https://www.youtube.com/watch?v=WPeVE7hmqGI',
          legenda: 'Aulas de dança e performance latino-americana'
        },
        {
          titulo: 'Respirartsy #22 - Ines Norton',
          url: 'https://www.youtube.com/watch?v=3Vj5omm61fQ',
          legenda: 'Práticas de yoga com projeção de arte contemporânea'
        },
        {
          titulo: 'Performatic Art Attack #2 - 15 Brazucolocho looks com Celina Portella',
          url: 'https://www.youtube.com/watch?v=TCAd-lrdXX8',
          legenda: 'After Merce ou 20 looks com Celina Portella'
        },
        {
          titulo: 'Live #70 - SPECIAL Vale a pena ver de novo',
          url: 'https://www.youtube.com/watch?v=hzyRhcnc_m0',
          legenda: 'Transmissão especial de encerramento do projeto'
        }
      ];
    }

    const premiacoesArr = Array.isArray(item.premiacoes) ? item.premiacoes : (Array.isArray(item.premios) ? item.premios : []);

    return {
      id: item.id || item._slug || `evt-${Math.random()}`,
      slug: item._slug || item.id,
      title: item.title || 'Sem título',
      ano: rawYear,
      inicio: item.inicio || '',
      fim: item.fim || '',
      categoria: item.categoria || 'Geral',
      artistas: artistasArr,
      curadoria: curadoriaArr,
      creditos: creditosParsed,
      resumo: item.resumo || item.sinopse || item.sobre || item.content || item.desc || item.descricao || '',
      visitacao: item.visitacao || item.horario || '',
      mapa_exposicao: item.mapa_exposicao || '',
      eventos_relacionados: item.eventos_relacionados || '',
      fotos: fotosArr,
      videos: videosArr,
      premiacoes: premiacoesArr,
      textos: textosArr
    };
  });
}

function buildConsolidatedPersonsDataset(rawPersons, eventsList) {
  const personsMap = new Map();

  if (Array.isArray(rawPersons)) {
    rawPersons.forEach(p => {
      const slug = p._slug || p.id || normalizeText(p.title).replace(/\s+/g, '-');
      const fotoUrl = p.foto_perfil 
        || p.foto_principal 
        || (Array.isArray(p.galeria) && p.galeria[0] ? (p.galeria[0].thumb || p.galeria[0].url) : null)
        || (Array.isArray(p.fotos) && p.fotos[0] ? (typeof p.fotos[0] === 'string' ? p.fotos[0] : (p.fotos[0].thumb || p.fotos[0].url)) : null);

      personsMap.set(slug, {
        slug,
        id: p.id || slug,
        title: p.title || 'Sem Nome',
        funcoes: p.funcao || 'Agente Cultural',
        bio: p.bio || p.biografia || '',
        cidade: p.cidade || '',
        pais: p.pais || '',
        nascimento: p.ano_nascimento || p.nascimento || '',
        falecimento: p.ano_falecimento || p.falecimento || '',
        membro_atelie: Boolean(p.membro_atelie),
        is_membro_atual: Boolean(p.is_membro_atual),
        is_membro_anterior: Boolean(p.is_membro_anterior),
        atelie_inicio: p.atelie_inicio || '',
        atelie_fim: p.atelie_fim || '',
        membro_equipe: Boolean(p.membro_equipe),
        is_equipe_atual: Boolean(p.is_equipe_atual),
        is_equipe_anterior: Boolean(p.is_equipe_anterior),
        equipe_inicio: p.equipe_inicio || '',
        equipe_fim: p.equipe_fim || '',
        status_vinculo: p.status_vinculo || '',
        foto_perfil: p.foto_perfil || null,
        foto_principal: fotoUrl,
        links: Array.isArray(p.links) ? p.links : [],
        participacoes: []
      });
    });
  }

  // Vincula participações a partir do acervo de eventos
  eventsList.forEach(evt => {
    evt.artistas.forEach(artistName => {
      const slug = normalizeText(artistName).replace(/\s+/g, '-');
      if (!personsMap.has(slug)) {
        personsMap.set(slug, {
          slug,
          title: artistName,
          funcoes: 'Artista',
          bio: '',
          cidade: '',
          pais: '',
          nascimento: '',
          falecimento: '',
          membro_atelie: false,
          foto_principal: null,
          links: [],
          participacoes: []
        });
      }
      const p = personsMap.get(slug);
      p.participacoes.push({
        id: evt.id,
        title: evt.title,
        ano: evt.ano,
        categoria: evt.categoria,
        roleLabel: 'Artista'
      });
    });

    evt.curadoria.forEach(curatorName => {
      const slug = normalizeText(curatorName).replace(/\s+/g, '-');
      if (!personsMap.has(slug)) {
        personsMap.set(slug, {
          slug,
          title: curatorName,
          funcoes: 'Curadoria',
          bio: '',
          cidade: '',
          pais: '',
          nascimento: '',
          falecimento: '',
          membro_atelie: false,
          foto_principal: null,
          links: [],
          participacoes: []
        });
      }
      const p = personsMap.get(slug);
      if (!p.participacoes.some(part => part.id === evt.id && part.roleLabel === 'Curadoria')) {
        p.participacoes.push({
          id: evt.id,
          title: evt.title,
          ano: evt.ano,
          categoria: evt.categoria,
          roleLabel: 'Curadoria'
        });
      }
    });
  });

  return Array.from(personsMap.values()).map(p => {
    p.participacoes.sort((a, b) => (b.ano || 0) - (a.ano || 0));
    const funcoesArray = Array.from(new Set(
      (p.funcoes || '').split(/[,;•|]/).map(s => s.trim()).filter(Boolean)
    ));
    return {
      ...p,
      funcoesArray,
      totalAcoes: p.participacoes.length
    };
  });
}

function buildTextsDataset(eventsList) {
  const texts = [];
  eventsList.forEach(evt => {
    if (Array.isArray(evt.textos) && evt.textos.length > 0) {
      evt.textos.forEach((t, idx) => {
        texts.push({
          id: t.id || `${evt.id}-txt-${idx}`,
          titulo: t.titulo || `Texto #${idx + 1}`,
          autoria: t.autoria || 'Autoria não informada',
          categoria: t.categoria || 'Ensaio Crítico',
          texto: t.texto || '',
          eventId: evt.id,
          eventTitle: evt.title,
          eventAno: evt.ano,
          eventCategoria: evt.categoria,
          eventData: evt
        });
      });
    }
  });
  return texts;
}

// ==========================================================================
// RENDERIZAÇÃO DA BARRA DE FACETAS & FILTROS
// ==========================================================================

function renderFacetPillsBar() {
  const container = document.getElementById('archive-facets-container');
  if (!container) return;

  container.innerHTML = `
    <div class="archive-facet-bar">
      <div class="facet-group">
        <div class="view-selector-group">
          <div class="view-mode-buttons">
            <button type="button" class="filter-pill ${currentViewMode === 'EVENTOS' ? 'is-active' : ''}" 
                    onclick="window._arqSetViewMode('EVENTOS')">Eventos</button>
            <button type="button" class="filter-pill ${currentViewMode === 'PESSOAS' ? 'is-active' : ''}" 
                    onclick="window._arqSetViewMode('PESSOAS')">Pessoas</button>
            <button type="button" class="filter-pill ${currentViewMode === 'TEXTOS' ? 'is-active' : ''}" 
                    onclick="window._arqSetViewMode('TEXTOS')">Textos</button>
          </div>
        </div>

        <div class="filter-dropdowns-group">
          <!-- Dropdown CATEGORIA -->
          <div class="filter-dropdown-wrap" id="wrap-dropdown-categoria">
            <button type="button" class="filter-pill dropdown-trigger" onclick="window._arqToggleDropdown('categoria')">
              <span id="label-dropdown-categoria">Categoria</span>
              <span class="dropdown-arrow">▾</span>
            </button>
            <div class="filter-dropdown-menu" id="menu-dropdown-categoria">
              <div class="dropdown-options-list" id="options-dropdown-categoria"></div>
              <div class="dropdown-footer">
                <button type="button" class="dropdown-clear-btn" onclick="window._arqClearCategoryFilter()">Limpar</button>
              </div>
            </div>
          </div>

          <!-- Dropdown DATA -->
          <div class="filter-dropdown-wrap" id="wrap-dropdown-data">
            <button type="button" class="filter-pill dropdown-trigger" onclick="window._arqToggleDropdown('data')">
              <span id="label-dropdown-data">Data</span>
              <span class="dropdown-arrow">▾</span>
            </button>
            <div class="filter-dropdown-menu date-dropdown-menu" id="menu-dropdown-data">
              <div class="date-tab-header">
                <button type="button" class="date-tab-btn is-active" id="btn-date-single" onclick="window._arqSwitchDateTab('single')">Ano Único</button>
                <button type="button" class="date-tab-btn" id="btn-date-period" onclick="window._arqSwitchDateTab('period')">Período</button>
              </div>
              <div id="date-tab-single-content">
                <div class="date-years-grid" id="years-grid-container"></div>
              </div>
              <div id="date-tab-period-content" style="display: none;">
                <div class="date-period-form">
                  <div class="period-input-row">
                    <div class="period-field">
                      <label for="arq-period-start">De:</label>
                      <input type="number" id="arq-period-start" min="2010" max="2030" placeholder="2013">
                    </div>
                    <div class="period-field">
                      <label for="arq-period-end">Até:</label>
                      <input type="number" id="arq-period-end" min="2010" max="2030" placeholder="2025">
                    </div>
                  </div>
                  <button type="button" class="filter-pill is-active period-apply-btn" onclick="window._arqApplyPeriodFilter()">Aplicar</button>
                </div>
              </div>
              <div class="dropdown-footer">
                <button type="button" class="dropdown-clear-btn" onclick="window._arqClearDateFilter()">Limpar</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="archive-search-box">
        <input type="text" id="arq-search-input" placeholder="Buscar no arquivo..." aria-label="Buscar no acervo">
        <button type="button" class="search-btn" onclick="window._arqTriggerSearch()" aria-label="Pesquisar">⌕</button>
      </div>
    </div>
  `;

  populateCategoryDropdown();
  populateYearsGrid();
}

function populateCategoryDropdown() {
  const container = document.getElementById('options-dropdown-categoria');
  if (!container) return;

  let categories = [];
  if (currentViewMode === 'EVENTOS') {
    categories = Array.from(new Set(archiveDataset.map(e => e.categoria).filter(Boolean))).sort();
  } else if (currentViewMode === 'PESSOAS') {
    const set = new Set();
    personsDataset.forEach(p => p.funcoesArray.forEach(f => set.add(f)));
    categories = Array.from(set).sort();
  } else if (currentViewMode === 'TEXTOS') {
    categories = Array.from(new Set(textsDataset.map(t => t.categoria).filter(Boolean))).sort();
  }

  container.innerHTML = categories.map(cat => `
    <button type="button" class="dropdown-option ${activeFilters.category === cat ? 'is-selected' : ''}" 
            onclick="window._arqSelectCategory('${escapeAttr(cat)}')">
      ${escapeHtml(cat)}
    </button>
  `).join('');
}

function populateYearsGrid() {
  const container = document.getElementById('years-grid-container');
  if (!container) return;

  const yearsSet = new Set();
  archiveDataset.forEach(e => {
    if (e.ano) yearsSet.add(e.ano);
  });
  const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);

  container.innerHTML = sortedYears.map(yr => `
    <button type="button" class="year-pick-btn ${activeFilters.dateYear === yr ? 'is-selected' : ''}" 
            onclick="window._arqSelectYear(${yr})">
      ${yr}
    </button>
  `).join('');
}

function bindGlobalClickToCloseDropdowns() {
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.filter-dropdown-wrap')) {
      document.querySelectorAll('.filter-dropdown-menu.is-open').forEach(m => m.classList.remove('is-open'));
    }
    if (!e.target.closest('.artist-name-wrapper') && !e.target.closest('.artist-popover')) {
      closeAllPopovers();
    }
  });
}

function bindSearchInputEvents() {
  const input = document.getElementById('arq-search-input');
  if (!input) return;

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      window._arqTriggerSearch();
    }
  });
}

// ==========================================================================
// CABEÇALHOS DA TABELA (GRID 12 SUÍÇO)
// ==========================================================================

function renderTableHeader() {
  const container = document.getElementById('table-header-container');
  if (!container) return;

  if (currentViewMode === 'EVENTOS') {
    container.innerHTML = `
      <div class="header-row">
        <div class="th-cell th-title" onclick="window._arqSortBy('title')">Título</div>
        <div class="th-cell th-artists" onclick="window._arqSortBy('artistas')">Artistas</div>
        <div class="th-cell th-category" onclick="window._arqSortBy('categoria')">Categoria</div>
        <div class="th-cell th-year" onclick="window._arqSortBy('inicio')">Ano</div>
      </div>
    `;
  } else if (currentViewMode === 'PESSOAS') {
    container.innerHTML = `
      <div class="header-row">
        <div class="th-cell th-person-name" onclick="window._arqSortBy('title')">Nome</div>
        <div class="th-cell th-person-actions" onclick="window._arqSortBy('totalAcoes')">Ações no FONTE</div>
        <div class="th-cell th-person-roles" onclick="window._arqSortBy('funcoes')">Funções & Trajetória</div>
      </div>
    `;
  } else if (currentViewMode === 'TEXTOS') {
    container.innerHTML = `
      <div class="header-row">
        <div class="th-cell th-text-title" onclick="window._arqSortBy('titulo')">Título do Texto</div>
        <div class="th-cell th-text-author" onclick="window._arqSortBy('autoria')">Autoria</div>
        <div class="th-cell th-text-category" onclick="window._arqSortBy('categoria')">Categoria</div>
        <div class="th-cell th-text-event" onclick="window._arqSortBy('eventTitle')">Evento Vinculado</div>
      </div>
    `;
  }
}

// ==========================================================================
// FILTRAGEM & RENDERIZAÇÃO DE LINHAS
// ==========================================================================

function applyFiltersAndRender() {
  closeActiveDrawer(true);

  let dataset = [];
  if (currentViewMode === 'EVENTOS') dataset = [...archiveDataset];
  else if (currentViewMode === 'PESSOAS') dataset = [...personsDataset];
  else if (currentViewMode === 'TEXTOS') dataset = [...textsDataset];

  // Filtro Categoria
  if (activeFilters.category) {
    if (currentViewMode === 'EVENTOS' || currentViewMode === 'TEXTOS') {
      dataset = dataset.filter(item => item.categoria === activeFilters.category);
    } else if (currentViewMode === 'PESSOAS') {
      dataset = dataset.filter(item => item.funcoesArray.includes(activeFilters.category));
    }
  }

  // Filtro Data (Ano Único)
  if (activeFilters.dateYear) {
    if (currentViewMode === 'EVENTOS') {
      dataset = dataset.filter(e => e.ano === activeFilters.dateYear);
    } else if (currentViewMode === 'PESSOAS') {
      dataset = dataset.filter(p => p.participacoes.some(part => part.ano === activeFilters.dateYear));
    } else if (currentViewMode === 'TEXTOS') {
      dataset = dataset.filter(t => t.eventAno === activeFilters.dateYear);
    }
  }

  // Filtro Data (Período)
  if (activeFilters.datePeriod) {
    const { start, end } = activeFilters.datePeriod;
    if (currentViewMode === 'EVENTOS') {
      dataset = dataset.filter(e => e.ano >= start && e.ano <= end);
    } else if (currentViewMode === 'PESSOAS') {
      dataset = dataset.filter(p => p.participacoes.some(part => part.ano >= start && part.ano <= end));
    } else if (currentViewMode === 'TEXTOS') {
      dataset = dataset.filter(t => t.eventAno >= start && t.eventAno <= end);
    }
  }

  // Filtro Texto Livre
  if (activeFilters.textQuery) {
    const q = normalizeText(activeFilters.textQuery);
    dataset = dataset.filter(item => {
      const fullStr = normalizeText(JSON.stringify(item));
      return fullStr.includes(q);
    });
  }

  // Ordenação
  dataset.sort((a, b) => {
    let valA = a[currentSort.column] || '';
    let valB = b[currentSort.column] || '';
    if (typeof valA === 'string') valA = normalizeText(valA);
    if (typeof valB === 'string') valB = normalizeText(valB);

    if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
    if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
    return 0;
  });

  filteredDataset = dataset;
  currentPage = 1;

  renderSearchTags();
  renderTableBody();
  renderPagination();
}

function renderSearchTags() {
  const container = document.getElementById('search-tags-container');
  if (!container) return;

  const chips = [];
  if (activeFilters.category) {
    chips.push({
      label: `CATEGORIA: ${activeFilters.category}`,
      onRemove: 'window._arqClearCategoryFilter()'
    });
  }
  if (activeFilters.dateYear) {
    chips.push({
      label: `ANO: ${activeFilters.dateYear}`,
      onRemove: 'window._arqClearDateFilter()'
    });
  }
  if (activeFilters.datePeriod) {
    chips.push({
      label: `PERÍODO: ${activeFilters.datePeriod.start} — ${activeFilters.datePeriod.end}`,
      onRemove: 'window._arqClearDateFilter()'
    });
  }
  if (activeFilters.textQuery) {
    chips.push({
      label: `BUSCA: "${activeFilters.textQuery}"`,
      onRemove: 'window._arqClearSearchFilter()'
    });
  }

  if (chips.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <span class="search-results-count-label">${filteredDataset.length} resultados encontrados:</span>
    ${chips.map(c => `
      <span class="search-chip">
        ${escapeHtml(c.label)}
        <button type="button" class="search-chip-close" onclick="${c.onRemove}">✕</button>
      </span>
    `).join('')}
  `;
}

function renderTableBody() {
  const container = document.getElementById('table-body-container');
  if (!container) return;

  container.innerHTML = '';

  if (filteredDataset.length === 0) {
    container.innerHTML = `<div class="empty-state-row">Nenhum registro encontrado para os filtros selecionados.</div>`;
    return;
  }

  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageItems = filteredDataset.slice(start, start + ITEMS_PER_PAGE);

  pageItems.forEach(item => {
    const rowEl = document.createElement('div');
    rowEl.className = 'expo-group-row';
    rowEl.id = `arq-row-${item.id}`;
    rowEl._itemData = item;

    if (currentViewMode === 'EVENTOS') {
      const artistsStr = item.artistas.length ? item.artistas.join(', ') : '—';
      rowEl.innerHTML = `
        <div class="expo-item-clickable grid-12" onclick="window._arqOpenRowDrawer(event, '${item.id}')">
          <div class="cell cell-title">${escapeHtml(item.title)}</div>
          <div class="cell cell-artists">${escapeHtml(artistsStr)}</div>
          <div class="cell cell-category">${escapeHtml(item.categoria)}</div>
          <div class="cell cell-year">${item.ano || '—'}</div>
        </div>
      `;
    } else if (currentViewMode === 'PESSOAS') {
      const funcoesStr = item.funcoesArray.length ? item.funcoesArray.join(' • ') : 'Agente Cultural';
      rowEl.innerHTML = `
        <div class="expo-item-clickable grid-12" onclick="window._arqOpenRowDrawer(event, '${item.slug}')">
          <div class="cell cell-person-name">${escapeHtml(item.title)}</div>
          <div class="cell cell-person-actions">${item.totalAcoes} ${item.totalAcoes === 1 ? 'ação' : 'ações'}</div>
          <div class="cell cell-person-roles">${escapeHtml(funcoesStr)}</div>
        </div>
      `;
    } else if (currentViewMode === 'TEXTOS') {
      rowEl.innerHTML = `
        <div class="expo-item-clickable grid-12" onclick="window._arqOpenRowDrawer(event, '${item.id}')">
          <div class="cell cell-text-title">${escapeHtml(item.titulo)}</div>
          <div class="cell cell-text-author">${escapeHtml(item.autoria)}</div>
          <div class="cell cell-text-category">${escapeHtml(item.categoria)}</div>
          <div class="cell cell-text-event">${escapeHtml(item.eventTitle)} (${item.eventAno || '—'})</div>
        </div>
      `;
    }

    container.appendChild(rowEl);
  });
}

function renderPagination() {
  const container = document.getElementById('table-footer-container');
  if (!container) return;

  const totalPages = Math.max(1, Math.ceil(filteredDataset.length / ITEMS_PER_PAGE));
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let pagesHtml = '';
  for (let i = 1; i <= totalPages; i++) {
    pagesHtml += `
      <button type="button" class="pagination-btn ${i === currentPage ? 'is-active' : ''}" 
              onclick="window._arqGoToPage(${i})">${i}</button>
    `;
  }

  container.innerHTML = `
    <div class="table-pagination-row">
      <div class="pagination-info">${filteredDataset.length} itens no acervo</div>
      <div class="pagination-box">
        <button type="button" class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} 
                onclick="window._arqGoToPage(${currentPage - 1})">‹ Anterior</button>
        ${pagesHtml}
        <button type="button" class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} 
                onclick="window._arqGoToPage(${currentPage + 1})">Próxima ›</button>
      </div>
    </div>
  `;
}

// ==========================================================================
// GAVETA UNIVERSAL DE ARQUIVO: ABERTURA, ANIMAÇÃO E NAVEGAÇÃO
// ==========================================================================

/**
 * Abre a gaveta universal no item da tabela de Arquivo.
 * Item 6: Movimento conjunto ao navegar entre eventos pelas setas ou cliques:
 * a próxima ou anterior gaveta se abre fechando a gaveta anterior, seguido do scroll suave.
 */
function openUniversalDrawerOnRow(rowEl) {
  if (activeDrawerState && activeDrawerState.itemEl === rowEl) return;

  // Fecha qualquer gaveta aberta na seção de programação para exclusão mútua
  if (window._drawerClose) {
    window._drawerClose(null);
  }

  const prevDrawerState = activeDrawerState;
  let prevDrawerEl = null;
  let prevItemEl = null;

  if (prevDrawerState) {
    if (activeDrawerTimeline) {
      activeDrawerTimeline.kill();
      activeDrawerTimeline = null;
    }
    prevItemEl = prevDrawerState.itemEl;
    prevDrawerEl = prevItemEl ? prevItemEl.querySelector('.archive-universal-drawer') : null;
    if (prevItemEl) prevItemEl.classList.remove('is-open');
    closeAllPopovers();
  }

  const itemData = rowEl._itemData;
  if (!itemData) return;

  const clickableEl = rowEl.querySelector('.expo-item-clickable');
  const closedHeight = clickableEl ? clickableEl.offsetHeight : 48;
  rowEl._closedHeight = closedHeight;

  rowEl.classList.add('is-open');

  let initialStep = null;
  if (currentViewMode === 'EVENTOS') {
    initialStep = {
      type: 'event',
      title: itemData.title,
      data: itemData,
      tab: 'sobre',
      selectedTextIndex: null
    };
  } else if (currentViewMode === 'PESSOAS') {
    initialStep = {
      type: 'person',
      title: itemData.title,
      data: itemData
    };
  } else if (currentViewMode === 'TEXTOS') {
    initialStep = {
      type: 'text',
      title: itemData.titulo,
      data: itemData
    };
  }

  activeDrawerState = {
    itemEl: rowEl,
    initialItem: itemData,
    history: [initialStep],
    historyIndex: 0
  };

  const drawerEl = document.createElement('div');
  drawerEl.className = 'archive-universal-drawer';
  drawerEl.id = `arq-drawer-${rowEl.id}`;
  rowEl.appendChild(drawerEl);

  renderCurrentDrawerView();

  if (typeof gsap !== 'undefined') {
    gsap.set(drawerEl, { height: 0, minHeight: 0, overflow: 'hidden' });
    const targetHeight = `calc(100vh - var(--header-height, 56px) - 60px)`;

    const tl = gsap.timeline({
      onComplete: () => {
        if (prevDrawerEl && prevDrawerEl.parentNode) {
          prevDrawerEl.remove();
        }
        gsap.set(drawerEl, { clearProps: 'height,minHeight,overflow' });
        activeDrawerTimeline = null;

        // Rola a página alinhando a base do cabeçalho com o topo do breadcrumb/evento
        scrollToHeaderBase(rowEl);

        if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
      }
    });
    activeDrawerTimeline = tl;

    // Se havia gaveta anterior aberta, fecha-a simultaneamente (movimento conjunto)
    if (prevDrawerEl) {
      gsap.set(prevDrawerEl, { overflow: 'hidden' });
      tl.to(prevDrawerEl, {
        height: 0,
        minHeight: 0,
        maxHeight: 0,
        duration: 0.45,
        ease: 'expo.inOut'
      }, 0);
    }

    // Abre a nova gaveta no mesmo tempo conjunto
    tl.to(drawerEl, {
      height: targetHeight,
      minHeight: targetHeight,
      duration: 0.45,
      ease: 'expo.inOut'
    }, 0);

  } else {
    if (prevDrawerEl && prevDrawerEl.parentNode) prevDrawerEl.remove();
    scrollToHeaderBase(rowEl);
    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
  }
}

/**
 * Fecha a gaveta ativa no Arquivo com animação de deslizamento simples,
 * mantendo a linha da tabela visível e intacta
 */
function closeActiveDrawer(immediate = false) {
  if (!activeDrawerState) return;

  if (activeDrawerTimeline) {
    activeDrawerTimeline.kill();
    activeDrawerTimeline = null;
  }

  const { itemEl } = activeDrawerState;
  const drawer = itemEl.querySelector('.archive-universal-drawer');

  const cleanup = () => {
    if (drawer && drawer.parentNode) drawer.remove();
    itemEl.classList.remove('is-open');
    activeDrawerState = null;
    activeDrawerTimeline = null;
    closeAllPopovers();
    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
  };

  if (immediate || !drawer || typeof gsap === 'undefined') {
    cleanup();
    return;
  }

  gsap.set(drawer, { overflow: 'hidden' });

  const tl = gsap.timeline({ onComplete: cleanup });
  activeDrawerTimeline = tl;

  tl.to(drawer, {
    height: 0,
    minHeight: 0,
    maxHeight: 0,
    duration: 0.3,
    ease: 'power2.inOut'
  }, 0);
}

/**
 * Rola a janela de modo que o topo do breadcrumb / gaveta (ou da linha da tabela)
 * coincida exatamente com a base do cabeçalho da página (Item 7)
 */
function scrollToHeaderBase(targetEl) {
  const performScroll = () => {
    const siteHeader = document.getElementById('logo-controller');
    const headerHeight = siteHeader ? siteHeader.getBoundingClientRect().height : 56;
    // Se o elemento possui a linha superior de breadcrumb, referencia-a diretamente
    const breadcrumbTopLine = targetEl.querySelector ? targetEl.querySelector('.drawer-top-line') : null;
    const refEl = breadcrumbTopLine || targetEl;
    const targetTop = refEl.getBoundingClientRect().top + window.scrollY;

    window.scrollTo({
      top: Math.max(0, targetTop - headerHeight),
      behavior: 'smooth'
    });
  };
  requestAnimationFrame(performScroll);
  setTimeout(performScroll, 60);
}

function getArchiveRowsList() {
  return Array.from(document.querySelectorAll('#table-body-container .expo-group-row'));
}

/**
 * Renderiza os 3 botões fixos < x > da gaveta de Arquivo
 * - Modo lista (historyIndex === 0): navega entre as linhas da tabela de Arquivo
 * - Modo relações (historyIndex > 0): navega no histórico de relações
 *   - Botão > ganha a classe is-hover-bg ao chegar ao fim das relações
 */
function renderDrawerControlsHtml() {
  if (!activeDrawerState) return '';

  const { itemEl, history, historyIndex = 0 } = activeDrawerState;
  const isAtRoot = historyIndex === 0;

  let prevDisabled = false;
  let nextDisabled = false;
  let nextIsHoverBg = false;

  if (isAtRoot) {
    const rows = getArchiveRowsList();
    const currentIdx = rows.indexOf(itemEl);
    prevDisabled = currentIdx <= 0;
    nextDisabled = currentIdx >= rows.length - 1;
    nextIsHoverBg = false;
  } else {
    prevDisabled = false;
    if (historyIndex < history.length - 1) {
      nextDisabled = false;
      nextIsHoverBg = false;
    } else {
      nextDisabled = true;
      nextIsHoverBg = true;
    }
  }

  return `
    <div class="drawer-ctrl-box">
      <button type="button" 
              class="drawer-btn-icon drawer-btn-prev ${prevDisabled ? 'is-disabled' : ''}" 
              onclick="window._arqDrawerNavPrev(event)" 
              aria-label="Voltar" 
              title="Voltar" 
              ${prevDisabled ? 'disabled' : ''}>‹</button>
      <button type="button" 
              class="drawer-btn-icon drawer-btn-close" 
              onclick="window._arqDrawerClose(event)" 
              aria-label="Fechar gaveta" 
              title="Fechar">✕</button>
      <button type="button" 
              class="drawer-btn-icon drawer-btn-next ${nextIsHoverBg ? 'is-hover-bg' : ''} ${nextDisabled && !nextIsHoverBg ? 'is-disabled' : ''}" 
              onclick="window._arqDrawerNavNext(event)" 
              aria-label="Avançar" 
              title="Avançar" 
              ${nextDisabled && !nextIsHoverBg ? 'disabled' : ''}>›</button>
    </div>
  `;
}

/**
 * Renderiza o estado atual da gaveta baseado no passo atual do histórico (historyIndex)
 */
function renderCurrentDrawerView() {
  if (!activeDrawerState) return;

  const { itemEl, history, historyIndex = 0 } = activeDrawerState;
  const drawer = itemEl.querySelector('.archive-universal-drawer');
  if (!drawer) return;

  const currentStep = history[historyIndex] || history[history.length - 1];
  const isZoom = currentStep.type === 'zoom_gallery';

  const breadcrumbHtml = renderBreadcrumbsHtml(history, historyIndex);
  const controlsHtml = renderDrawerControlsHtml();

  if (isZoom) {
    drawer.innerHTML = `
      <div class="drawer-zoom-wrapper">
        <div class="drawer-top-line" onclick="window._arqDrawerTopLineClick(event)">
          <div class="drawer-breadcrumb-col" onclick="event.stopPropagation()">
            <div class="breadcrumb-trail">${breadcrumbHtml}</div>
          </div>
          <div class="drawer-control-col">
            ${controlsHtml}
          </div>
        </div>
        ${renderZoomGalleryBodyHtml(currentStep.data)}
      </div>
    `;
    applyZoomSlideOffset(drawer, currentStep.data.initialIndex || 0);
    syncZoomCaptionsWidth(drawer);
  } else {
    let parts = { contentHtml: '', mediaHtml: '' };
    if (currentStep.type === 'event') {
      parts = renderEventBodyHtml(currentStep.data, currentStep.tab || 'sobre', currentStep.selectedTextIndex);
    } else if (currentStep.type === 'person') {
      parts = renderPersonBodyHtml(currentStep.data);
    } else if (currentStep.type === 'text') {
      parts = renderTextBodyHtml(currentStep.data);
    }

    drawer.innerHTML = `
      <div class="drawer-top-line" onclick="window._arqDrawerTopLineClick(event)">
        <div class="drawer-breadcrumb-col" onclick="event.stopPropagation()">
          <div class="breadcrumb-trail">${breadcrumbHtml}</div>
        </div>
        <div class="drawer-control-col">
          ${controlsHtml}
        </div>
      </div>
      <div class="drawer-media-pane">
        ${parts.mediaHtml}
      </div>
      <div class="drawer-left-column">
        <div class="drawer-content-pane">
          ${parts.contentHtml}
        </div>
      </div>
    `;
    attachViewInteractions(drawer);
  }
}

/**
 * Breadcrumbs com lógica estilo Google Drive (Arquivo):
 * - Apenas o caminho ativo (até activeIndex) é exibido. Passos futuros não aparecem ao voltar.
 * - Quando há mais de 2 páginas no caminho ativo, os anteriores são colapsados em "..." com menu dropdown.
 * - Exibe apenas os últimos 2 passos do caminho ativo na barra.
 */
function renderBreadcrumbsHtml(history, activeIndex = 0) {
  const activeHistory = history.slice(0, activeIndex + 1);

  const steps = [
    { label: 'ARQUIVO', historyIndex: -1 }
  ];

  activeHistory.forEach((step, idx) => {
    let label = step.title;
    if (step.type === 'person') {
      label = `Perfil: ${step.title}`;
    } else if (step.type === 'zoom_gallery') {
      label = `Galeria: ${step.title}`;
    } else if (step.type === 'text') {
      label = `Texto: ${step.title}`;
    }
    steps.push({
      label,
      historyIndex: idx
    });
  });

  const total = steps.length;

  if (total <= 2) {
    return steps.map((s, idx) => {
      const sep = idx > 0 ? `<span class="breadcrumb-sep">&gt;</span>` : '';
      const isCurrent = idx === total - 1;
      const classes = ['breadcrumb-step'];
      if (isCurrent) classes.push('is-current');

      const clickAttr = isCurrent ? '' : `onclick="window._arqDrawerNavStep(event, ${s.historyIndex})"`;
      const itemHtml = `<span class="${classes.join(' ')}" ${clickAttr}>${escapeHtml(s.label)}</span>`;
      return `${sep}${itemHtml}`;
    }).join(' ');
  }

  const hiddenSteps = steps.slice(0, total - 2);
  const lastTwoSteps = steps.slice(total - 2);

  const dropdownMenuHtml = `
    <span class="breadcrumb-ellipsis-dropdown-wrapper">
      <button class="breadcrumb-step breadcrumb-ellipsis-btn" 
              onclick="window._toggleBreadcrumbDropdown(event)" 
              title="Ver caminho anterior" 
              aria-expanded="false">...</button>
      <div class="breadcrumb-dropdown-menu" onclick="event.stopPropagation()">
        ${hiddenSteps.map(s => {
          const icon = s.historyIndex === -1 ? '🏠' : '📁';
          return `
            <div class="breadcrumb-dropdown-item" 
                 onclick="window._arqDrawerNavStep(event, ${s.historyIndex}); window._closeBreadcrumbDropdowns();">
              <span class="breadcrumb-dropdown-icon">${icon}</span>
              <span class="breadcrumb-dropdown-text">${escapeHtml(s.label)}</span>
            </div>
          `;
        }).join('')}
      </div>
    </span>
  `;

  const lastTwoHtml = lastTwoSteps.map((s, idx) => {
    const isCurrent = idx === 1;
    const classes = ['breadcrumb-step'];
    if (isCurrent) classes.push('is-current');

    const clickAttr = isCurrent ? '' : `onclick="window._arqDrawerNavStep(event, ${s.historyIndex})"`;
    const itemHtml = `<span class="${classes.join(' ')}" ${clickAttr}>${escapeHtml(s.label)}</span>`;
    return `<span class="breadcrumb-sep">&gt;</span>${itemHtml}`;
  }).join(' ');

  return `${dropdownMenuHtml}${lastTwoHtml}`;
}

// ==========================================================================
// RENDERIZAÇÃO DO CORPO DE CADA TIPO DE VISUALIZAÇÃO NO DRAWER
// ==========================================================================

function stripHtml(html) {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

function getEmbedUrl(url) {
  if (!url) return '';
  const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }
  const vimeoMatch = url.match(/(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+))/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }
  return '';
}

function getEventVideosParsed(evt) {
  let rawVideos = evt.videos;
  const idOrTitle = (evt.id || evt.slug || evt.title || '').toLowerCase();
  if ((!rawVideos || !rawVideos.length) && (idOrTitle.includes('1month') || idOrTitle.includes('monroy'))) {
    rawVideos = [
      {
        titulo: 'Artista troca tudo',
        url: 'https://www.youtube.com/watch?v=DYZK3glxpfI',
        legenda: 'Negociação de obras por análise crítica do trabalho'
      },
      {
        titulo: 'Quer que eu faça o quê?',
        url: 'https://www.youtube.com/live/5OIQ87-oUWo',
        legenda: 'Live inaugural // #1MONTHROY'
      },
      {
        titulo: 'Strike a Pose #2',
        url: 'https://www.youtube.com/watch?v=YZll0t40H6o',
        legenda: 'Escultura // #1MONTHROY'
      },
      {
        titulo: 'Mea Culpa #3',
        url: 'https://www.youtube.com/watch?v=uRUiEfa9MaU',
        legenda: 'Confessionário de reality show ao vivo After Troca Tudo'
      },
      {
        titulo: 'Dançando por um sueño #8 - Dance Hall2 com Champion Boy',
        url: 'https://www.youtube.com/watch?v=WPeVE7hmqGI',
        legenda: 'Aulas de dança e performance latino-americana'
      },
      {
        titulo: 'Respirartsy #22 - Ines Norton',
        url: 'https://www.youtube.com/watch?v=3Vj5omm61fQ',
        legenda: 'Práticas de yoga com projeção de arte contemporânea'
      },
      {
        titulo: 'Performatic Art Attack #2 - 15 Brazucolocho looks com Celina Portella',
        url: 'https://www.youtube.com/watch?v=TCAd-lrdXX8',
        legenda: 'After Merce ou 20 looks com Celina Portella'
      },
      {
        titulo: 'Live #70 - SPECIAL Vale a pena ver de novo',
        url: 'https://www.youtube.com/watch?v=hzyRhcnc_m0',
        legenda: 'Transmissão especial de encerramento do projeto'
      }
    ];
  }

  if (Array.isArray(rawVideos)) {
    return rawVideos.map(v => {
      if (typeof v === 'string') {
        return { titulo: '', url: v, legenda: '' };
      }
      return {
        titulo: v.titulo || v.title || '',
        url: v.url || v.link || v.src || '',
        legenda: v.legenda || v.descricao || v.description || ''
      };
    }).filter(v => v.url || v.titulo);
  }

  return [];
}

function getEventPremiacoes(evt) {
  const raw = evt.premiacoes || evt.premios;
  if (Array.isArray(raw)) {
    return raw.filter(Boolean).map(p => {
      if (typeof p === 'string') {
        return { titulo: p, categoria: 'Prêmio', detalhes: '', url: '' };
      }
      return {
        titulo: p.titulo || p.title || p.nome || 'Prêmio',
        categoria: p.categoria || 'Prêmio',
        detalhes: p.detalhes || p.detalhe || p.descricao || '',
        url: p.url || p.link || ''
      };
    });
  }
  return [];
}

function getPersonPhotoUrl(person) {
  if (!person) return null;
  if (person.foto_perfil) return person.foto_perfil;
  if (person.foto_principal) return person.foto_principal;
  if (Array.isArray(person.galeria) && person.galeria.length > 0) {
    return person.galeria[0].thumb || person.galeria[0].url;
  }
  if (Array.isArray(person.fotos) && person.fotos.length > 0) {
    return typeof person.fotos[0] === 'string' ? person.fotos[0] : (person.fotos[0].thumb || person.fotos[0].url);
  }
  return null;
}

function getPersonGalleryImages(person) {
  if (!person) return [];
  const list = [];
  const seenUrls = new Set();

  const addImage = (url, legenda) => {
    if (!url || typeof url !== 'string') return;
    const cleanUrl = url.trim();
    if (!cleanUrl || seenUrls.has(cleanUrl)) return;
    seenUrls.add(cleanUrl);
    list.push({
      url: cleanUrl,
      legenda: legenda || person.title || 'Foto de perfil'
    });
  };

  if (person.foto_perfil) {
    addImage(person.foto_perfil, person.title);
  }
  if (person.foto_principal) {
    addImage(person.foto_principal, person.title);
  }

  if (Array.isArray(person.galeria)) {
    person.galeria.forEach(item => {
      if (!item) return;
      if (typeof item === 'string') {
        addImage(item, person.title);
      } else {
        const u = item.url || item.thumb;
        addImage(u, item.legenda || person.title);
      }
    });
  }

  if (Array.isArray(person.fotos)) {
    person.fotos.forEach(item => {
      if (!item) return;
      if (typeof item === 'string') {
        addImage(item, person.title);
      } else {
        const u = item.url || item.thumb;
        addImage(u, item.legenda || person.title);
      }
    });
  }

  return list;
}

function getPersonParticipations(personName) {
  if (!personName) return [];
  const q = normalizeText(personName);
  const qSlug = q.replace(/\s+/g, '-');

  if (Array.isArray(personsDataset)) {
    const matched = personsDataset.find(p => 
      normalizeText(p.title) === q || p.slug === q || p.slug === qSlug
    );
    if (matched && Array.isArray(matched.participacoes) && matched.participacoes.length > 0) {
      return matched.participacoes;
    }
  }

  if (!Array.isArray(archiveDataset)) return [];
  const participacoes = [];
  const seenIds = new Set();

  archiveDataset.forEach(evt => {
    let role = null;
    const artistsList = Array.isArray(evt.artistas) ? evt.artistas : (typeof evt.artistas === 'string' ? evt.artistas.split(/,|\n/).map(s => s.trim()).filter(Boolean) : []);
    const curadoriaList = Array.isArray(evt.curadoria) ? evt.curadoria : (typeof evt.curadoria === 'string' ? evt.curadoria.split(/,|\n/).map(s => s.trim()).filter(Boolean) : []);

    if (artistsList.some(a => normalizeText(a) === q || normalizeText(a).replace(/\s+/g, '-') === qSlug)) {
      role = 'Artista';
    } else if (curadoriaList.some(c => normalizeText(c) === q || normalizeText(c).replace(/\s+/g, '-') === qSlug)) {
      role = 'Curadoria';
    }

    if (role) {
      const evtId = evt.id || evt.slug || evt.title;
      if (!seenIds.has(evtId)) {
        seenIds.add(evtId);
        let ano = evt.ano || '';
        if (!ano && evt.inicio) {
          ano = evt.inicio.split('-')[0];
        }
        participacoes.push({
          id: evtId,
          title: evt.title,
          ano: ano,
          categoria: evt.categoria || 'Evento',
          roleLabel: role
        });
      }
    }
  });

  participacoes.sort((a, b) => (parseInt(b.ano, 10) || 0) - (parseInt(a.ano, 10) || 0));
  return participacoes;
}

function getPersonInitials(name) {
  if (!name) return 'PF';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function renderPersonStatusBadges(person) {
  if (!person) return '';
  const badges = [];

  if (person.is_membro_atual || (person.membro_atelie && !person.is_membro_anterior)) {
    const ano = person.atelie_inicio ? person.atelie_inicio.substring(0, 4) : '';
    badges.push(`<span class="person-badge badge-membro" title="Membro atual do Ateliê FONTE">🟢 MEMBRO ATELIÊ ${ano ? `(DESDE ${ano})` : ''}</span>`);
  } else if (person.is_membro_anterior) {
    const ini = person.atelie_inicio ? person.atelie_inicio.substring(0, 4) : '';
    const fim = person.atelie_fim ? person.atelie_fim.substring(0, 4) : '';
    const period = ini || fim ? ` (${ini || '—'}–${fim || '—'})` : '';
    badges.push(`<span class="person-badge badge-ex-membro" title="Ex-membro do Ateliê FONTE">⚫ EX-MEMBRO ATELIÊ${period}</span>`);
  }

  if (person.is_equipe_atual || (person.membro_equipe && !person.is_equipe_anterior)) {
    const ano = person.equipe_inicio ? person.equipe_inicio.substring(0, 4) : '';
    badges.push(`<span class="person-badge badge-equipe" title="Membro da equipe FONTE">🔵 EQUIPE FONTE ${ano ? `(DESDE ${ano})` : ''}</span>`);
  } else if (person.is_equipe_anterior) {
    badges.push(`<span class="person-badge badge-ex-equipe" title="Ex-membro da equipe FONTE">⚪ EX-EQUIPE FONTE</span>`);
  }

  if (badges.length === 0 && person.status_vinculo && person.status_vinculo.trim()) {
    badges.push(`<span class="person-badge badge-vinculo-custom">${escapeHtml(person.status_vinculo)}</span>`);
  }

  return badges.join(' ');
}

function renderArtistTagWithPopover(artistName) {
  const trimmed = artistName.trim();
  const person = findPersonByName(trimmed);

  if (!person) {
    return `<span class="artist-plain-text">${escapeHtml(trimmed)}</span>`;
  }

  const escName = escapeHtml(trimmed);
  const totalAcoes = (person.participacoes && person.participacoes.length) 
    ? person.participacoes.length 
    : (getPersonParticipations(person.title).length || person.totalAcoes || 0);

  return `
    <span class="artist-name-wrapper">
      <button type="button" class="artist-clickable-tag" data-artist="${escapeAttr(person.title)}">
        ${escName}
      </button>
      <div class="artist-popover" onclick="event.stopPropagation()">
        <div class="popover-header">
          <span class="popover-title-text">${escName}</span>
          <button type="button" class="popover-close-btn" onclick="window._arqClosePopovers(event)" aria-label="Fechar">✕</button>
        </div>
        <div class="popover-count-meta">${totalAcoes} ${totalAcoes === 1 ? 'ação' : 'ações'} no acervo FONTE</div>
        <div class="popover-actions">
          <button type="button" class="popover-action" onclick="window._arqGoToPersonProfile('${escapeAttr(person.title)}')">
            <span>Ver Perfil</span>
            <span>↗</span>
          </button>
        </div>
      </div>
    </span>
  `;
}

function attachViewInteractions(drawer) {
  drawer.querySelectorAll('.artist-clickable-tag').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const wrapper = btn.closest('.artist-name-wrapper');
      const popover = wrapper ? wrapper.querySelector('.artist-popover') : null;
      if (!popover) return;

      const isOpen = popover.classList.contains('is-open');
      closeAllPopovers();

      if (!isOpen) {
        if (wrapper) wrapper.classList.add('is-open');
        popover.classList.add('is-open');
        const rect = popover.getBoundingClientRect();
        if (rect.top < 70) {
          popover.classList.add('popover-down');
        } else {
          popover.classList.remove('popover-down');
        }

        if (rect.right > window.innerWidth - 16) {
          popover.style.left = 'auto';
          popover.style.right = '0';
        } else {
          popover.style.left = '0';
          popover.style.right = 'auto';
        }
      }
    });
  });
}

/**
 * 1. Visualização de EVENTO
 */
function renderEventBodyHtml(evt, activeTab = 'sobre', selectedTextIndex = null) {
  const videosList = getEventVideosParsed(evt);
  const hasVideos = videosList.length > 0;
  const premiacoes = getEventPremiacoes(evt);

  const tabs = [
    { key: 'sobre', label: 'Sobre' },
    { key: 'textos', label: 'Textos' },
    ...(hasVideos ? [{ key: 'videos', label: 'Vídeos' }] : []),
    { key: 'mapa_exposicao', label: 'Mapa de exposição' },
    { key: 'eventos_relacionados', label: 'Eventos relacionados' }
  ];

  let currentTab = activeTab;
  if (currentTab === 'artistas' || currentTab === 'curadoria') currentTab = 'sobre';
  if (currentTab === 'texto_critico') currentTab = 'textos';
  if (currentTab === 'videos' && !hasVideos) currentTab = 'sobre';

  const pillsHtml = tabs.map(t => `
    <button type="button" class="drawer-tab-pill ${t.key === currentTab ? 'is-active' : ''}" 
            data-tab="${t.key}" onclick="window._arqDrawerSwitchTab('${t.key}')">
      ${t.label}
    </button>
  `).join('');

  let tabContentHtml = '';

  if (currentTab === 'sobre') {
    const artistas = evt.artistas || [];
    const curadoria = evt.curadoria || [];
    const resumo = evt.resumo || evt.content || evt.sobre || '';

    const artistasHtml = artistas.length 
      ? artistas.map(a => renderArtistTagWithPopover(a)).join(', ')
      : '<em>Não informado</em>';

    const curadoriaHtml = curadoria.length
      ? curadoria.map(c => renderArtistTagWithPopover(c)).join(', ')
      : '<em>Não informada</em>';

    tabContentHtml = `
      <div class="section-sobre-wrap">
        <div class="sobre-block">
          <span class="sobre-block-label">Artistas</span>
          <div class="sobre-block-content">${artistasHtml}</div>
        </div>
        <div class="sobre-block">
          <span class="sobre-block-label">Curadoria</span>
          <div class="sobre-block-content">${curadoriaHtml}</div>
        </div>
        ${evt.visitacao ? `
          <div class="sobre-block">
            <span class="sobre-block-label">Visitação</span>
            <div class="sobre-block-content">${escapeHtml(evt.visitacao)}</div>
          </div>
        ` : ''}
        ${premiacoes.length > 0 ? `
          <div class="sobre-block">
            <span class="sobre-block-label">Prêmios</span>
            <div class="sobre-block-content">
              <div class="premiacoes-list">
                ${premiacoes.map(p => `
                  <div class="premio-item">
                    <div class="premio-title-row">
                      ${p.categoria ? `<span class="premio-categoria-tag">${escapeHtml(p.categoria)}:</span>` : ''}
                      ${p.url ? `<a href="${escapeAttr(p.url)}" target="_blank" rel="noopener noreferrer" class="premio-link">${escapeHtml(p.titulo)} ↗</a>` : `<strong class="premio-titulo">${escapeHtml(p.titulo)}</strong>`}
                    </div>
                    ${p.detalhes ? `<div class="premio-detalhes">${formatParagraphs(p.detalhes)}</div>` : ''}
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        ` : ''}
        <div class="sobre-block">
          <span class="sobre-block-label">Resumo</span>
          <div class="sobre-block-content">${resumo ? formatParagraphs(resumo) : '<p>Sem sinopse cadastrada.</p>'}</div>
        </div>
      </div>
    `;
  } else if (currentTab === 'textos') {
    const textos = evt.textos || [];
    if (textos.length === 0) {
      tabContentHtml = `
        <div class="section-sobre-wrap">
          <div class="sobre-block">
            <div class="sobre-block-content"><p>Sem ensaio crítico disponível.</p></div>
          </div>
        </div>
      `;
    } else if (textos.length > 1 && selectedTextIndex === null) {
      tabContentHtml = `
        <div class="textos-view-container">
          <div class="texto-list-header">Textos disponíveis (${textos.length})</div>
          ${textos.map((t, idx) => `
            <div class="texto-preview-card" onclick="window._arqDrawerSelectText(${idx})">
              <div class="texto-meta-header">
                <span class="texto-header-categoria">${escapeHtml(t.categoria || 'Texto crítico')}</span>
                <h4 class="texto-header-titulo">${escapeHtml(t.titulo || evt.title)}</h4>
                ${t.autoria ? `<span class="texto-header-autoria">${escapeHtml(t.autoria)}</span>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      const activeTextIdx = selectedTextIndex !== null ? selectedTextIndex : 0;
      const t = textos[activeTextIdx] || textos[0];
      const backBtnHtml = textos.length > 1 ? `
        <button type="button" class="texto-back-to-list-btn" onclick="window._arqDrawerSelectText(null)">
          <span>‹</span> <span>Todos os textos (${textos.length})</span>
        </button>
      ` : '';

      tabContentHtml = `
        <div class="texto-article-item">
          ${backBtnHtml}
          <div class="texto-meta-header">
            <span class="texto-header-categoria">${escapeHtml(t.categoria || 'Texto crítico')}</span>
            <h4 class="texto-header-titulo">${escapeHtml(t.titulo || evt.title)}</h4>
            ${t.autoria ? `<span class="texto-header-autoria">${escapeHtml(t.autoria)}</span>` : ''}
          </div>
          <div class="texto-empty-divider"></div>
          <div class="texto-body-content">
            ${formatParagraphs(t.texto || '')}
          </div>
        </div>
      `;
    }
  } else if (currentTab === 'videos') {
    if (videosList.length === 0) {
      tabContentHtml = `
        <div class="section-sobre-wrap">
          <div class="sobre-block">
            <div class="sobre-block-content"><p>Sem registros em vídeo cadastrados.</p></div>
          </div>
        </div>
      `;
    } else {
      tabContentHtml = `
        <div class="section-sobre-wrap section-videos-wrap">
          <div class="sobre-block">
            <span class="sobre-block-label">Vídeos (${videosList.length})</span>
            <div class="sobre-block-content">
              <div class="videos-embed-list">
                ${videosList.map((v, idx) => {
                  const embedUrl = getEmbedUrl(v.url);
                  return `
                    <div class="video-embed-item">
                      ${v.titulo ? `<h4 class="video-item-title">${escapeHtml(v.titulo)}</h4>` : ''}
                      ${embedUrl ? `
                        <div class="video-iframe-responsive">
                          <iframe src="${embedUrl}" title="${escapeAttr(v.titulo || `Vídeo ${idx + 1}`)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen loading="lazy"></iframe>
                        </div>
                      ` : `
                        <div class="video-link-fallback">
                          <a href="${escapeAttr(v.url)}" target="_blank" rel="noopener noreferrer" class="video-external-link">Assistir no YouTube ↗</a>
                        </div>
                      `}
                      ${v.legenda ? `
                        <div class="video-item-footer">
                          <p class="video-item-caption">${escapeHtml(v.legenda)}</p>
                        </div>
                      ` : ''}
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>
        </div>
      `;
    }
  } else if (currentTab === 'mapa_exposicao') {
    tabContentHtml = `
      <div class="section-sobre-wrap">
        <div class="sobre-block">
          <span class="sobre-block-label">Mapa de exposição</span>
          <div class="sobre-block-content">
            ${evt.mapa_exposicao ? formatParagraphs(evt.mapa_exposicao) : '<p>Mapa da montagem disponível sob consulta no ateliê.</p>'}
          </div>
        </div>
      </div>
    `;
  } else if (currentTab === 'eventos_relacionados') {
    tabContentHtml = `
      <div class="section-sobre-wrap">
        <div class="sobre-block">
          <span class="sobre-block-label">Eventos relacionados</span>
          <div class="sobre-block-content">
            ${evt.eventos_relacionados ? formatParagraphs(evt.eventos_relacionados) : '<p>Sem desdobramentos ou eventos correlatos associados.</p>'}
          </div>
        </div>
      </div>
    `;
  }

  const contentHtml = `
    <div class="drawer-subsections-toolbar">
      ${pillsHtml}
    </div>
    <div class="drawer-dynamic-view">
      ${tabContentHtml}
    </div>
  `;

  // Lateral Gallery
  const images = evt.fotos || [];
  let mediaHtml = '';
  if (images.length > 0) {
    mediaHtml = `
      <div class="drawer-gallery-track">
        ${images.map((img, idx) => `
          <div class="drawer-gallery-item" onclick="window._arqDrawerOpenZoomGallery(event, '${escapeAttr(evt.title)}', ${idx})" role="button" tabindex="0" title="Ver foto em tela cheia">
            <img src="${img.url}" alt="${escapeAttr(img.legenda || evt.title)}" loading="lazy">
          </div>
        `).join('')}
      </div>
    `;
  } else {
    mediaHtml = `
      <div class="drawer-empty-media">
        <span>Sem registro imagético cadastrado</span>
      </div>
    `;
  }

  return { contentHtml, mediaHtml };
}

/**
 * 2. Visualização de PESSOA
 */
function renderPersonBodyHtml(person) {
  const locArr = [person.cidade, person.pais].filter(Boolean);
  const locStr = locArr.join(', ');
  let datesStr = '';
  if (person.nascimento) datesStr = `n. ${person.nascimento}`;
  if (person.falecimento) datesStr += ` - m. ${person.falecimento}`;

  const participacoes = (person.participacoes && person.participacoes.length)
    ? person.participacoes
    : getPersonParticipations(person.title);

  const participacoesHtml = participacoes.length ? `
    <ul class="person-timeline-list">
      ${participacoes.map(p => `
        <li class="person-timeline-item" onclick="window._arqOpenEventFromTimeline('${escapeAttr(p.id || p.title)}')">
          <span class="timeline-year">${p.ano || '—'}</span>
          <div class="timeline-info">
            <strong class="timeline-title">${escapeHtml(p.title)}</strong>
            <span class="timeline-role">${escapeHtml(p.roleLabel || '')} • ${escapeHtml(p.categoria || '')}</span>
          </div>
          <span class="timeline-arrow">›</span>
        </li>
      `).join('')}
    </ul>
  ` : '<p class="empty-msg">Nenhuma ação formal registrada.</p>';

  const personImages = getPersonGalleryImages(person);
  const statusBadgesHtml = renderPersonStatusBadges(person);

  let mediaHtml = '';
  if (personImages.length > 0) {
    mediaHtml = `
      <div class="drawer-gallery-track">
        ${personImages.map((img, idx) => `
          <div class="drawer-gallery-item" onclick="window._arqDrawerOpenPersonZoomGallery(event, '${escapeAttr(person.title)}', ${idx})" role="button" tabindex="0" title="Ver foto em tela cheia">
            <img src="${img.url}" alt="${escapeAttr(img.legenda || person.title)}" loading="lazy">
          </div>
        `).join('')}
      </div>
    `;
  } else {
    mediaHtml = `
      <div class="drawer-empty-media">
        <span>Sem registro imagético cadastrado</span>
      </div>
    `;
  }

  return {
    contentHtml: `
      <div class="person-drawer-profile">
        <div class="person-profile-header">
          <div class="person-title-row">
            <h3 class="person-profile-title">${escapeHtml(person.title)}</h3>
            ${statusBadgesHtml ? `<div class="person-badges-wrap">${statusBadgesHtml}</div>` : ''}
          </div>
          <div class="person-profile-meta">
            ${locStr ? `<span>${escapeHtml(locStr)}</span>` : ''}
            ${datesStr ? `<span>• ${escapeHtml(datesStr)}</span>` : ''}
          </div>
        </div>

        <div class="person-profile-grid">
          <div class="person-bio-box">
            <h4>Biografia</h4>
            <div class="bio-text">
              ${person.bio ? formatParagraphs(person.bio) : '<p>Sem biografia cadastrada.</p>'}
            </div>
          </div>

          <div class="person-actions-box">
            <h4>Atuações no FONTE (${participacoes.length})</h4>
            ${participacoesHtml}
          </div>
        </div>
      </div>
    `,
    mediaHtml
  };
}

/**
 * 3. Visualização de TEXTO
 */
function renderTextBodyHtml(textItem) {
  const contentHtml = `
    <div class="drawer-dynamic-view">
      <div class="texto-article-item" style="padding: 24px 28px;">
        <button type="button" class="texto-back-to-list-btn" onclick="window._arqOpenEventFromText('${textItem.eventId}')">
          <span>‹</span> <span>Voltar à mostra: ${escapeHtml(textItem.eventTitle)} (${textItem.eventAno || '—'})</span>
        </button>
        <div class="texto-meta-header">
          <span class="texto-header-categoria">${escapeHtml(textItem.categoria)}</span>
          <h4 class="texto-header-titulo">${escapeHtml(textItem.titulo)}</h4>
          <span class="texto-header-autoria">Por ${escapeHtml(textItem.autoria || 'Autoria não informada')}</span>
        </div>
        <div class="texto-empty-divider"></div>
        <div class="texto-body-content">
          ${formatParagraphs(textItem.texto)}
        </div>
      </div>
    </div>
  `;

  const linkedEvt = textItem.eventData || findEventById(textItem.eventId);
  const images = linkedEvt && linkedEvt.fotos ? linkedEvt.fotos : [];

  let mediaHtml = '';
  if (images.length > 0) {
    mediaHtml = `
      <div class="drawer-gallery-track">
        ${images.map((img, idx) => `
          <div class="drawer-gallery-item" onclick="window._arqDrawerOpenZoomGallery(event, '${escapeAttr(linkedEvt.title)}', ${idx})" role="button" tabindex="0" title="Ver foto">
            <img src="${img.url}" alt="${escapeAttr(img.legenda || linkedEvt.title)}" loading="lazy">
          </div>
        `).join('')}
      </div>
    `;
  } else {
    mediaHtml = `
      <div class="drawer-empty-media">
        <span>Documentação textual da mostra</span>
      </div>
    `;
  }

  return { contentHtml, mediaHtml };
}

/**
 * 4. Galeria em Tela Cheia / Zoom
 */
function renderZoomGalleryBodyHtml(zoomData) {
  const { images, title } = zoomData;

  const slidesHtml = images.map((img, idx) => `
    <div class="drawer-zoom-slide-item" id="arq-zoom-slide-${idx}">
      <div class="drawer-zoom-img-container" onclick="window._arqDrawerCloseZoomOnly(event)" title="Clique para fechar o zoom">
        <img src="${img.url}" alt="${escapeAttr(img.legenda || title)}" loading="lazy">
      </div>
      <div class="drawer-zoom-caption-box">
        <span class="zoom-caption-text">${escapeHtml(img.legenda || title)}</span>
        ${img.autoria ? `<span class="zoom-caption-author">${escapeHtml(img.autoria)}</span>` : ''}
      </div>
    </div>
  `).join('');

  return `
    <div class="drawer-zoom-horizontal-track">
      ${slidesHtml}
    </div>
  `;
}

function syncZoomCaptionsWidth(drawer) {
  requestAnimationFrame(() => {
    const slides = drawer.querySelectorAll('.drawer-zoom-slide-item');
    slides.forEach(slide => {
      const img = slide.querySelector('.drawer-zoom-img-container img');
      const captionBox = slide.querySelector('.drawer-zoom-caption-box');
      if (img && captionBox) {
        const updateWidth = () => {
          const renderedWidth = img.offsetWidth || img.getBoundingClientRect().width;
          if (renderedWidth > 50) {
            captionBox.style.width = `${renderedWidth}px`;
            captionBox.style.maxWidth = `${renderedWidth}px`;
          }
        };
        if (img.complete) updateWidth();
        else img.addEventListener('load', updateWidth, { once: true });
      }
    });
  });
}

function applyZoomSlideOffset(drawer, targetIndex) {
  requestAnimationFrame(() => {
    const track = drawer.querySelector('.drawer-zoom-horizontal-track');
    const slide = drawer.querySelector(`#arq-zoom-slide-${targetIndex}`);
    if (track && slide) {
      track.scrollLeft = slide.offsetLeft - 24;
    }
  });
}

// ==========================================================================
// HELPERS DE BUSCA E NAVEGAÇÃO
// ==========================================================================

function findPersonByName(name) {
  const q = normalizeText(name);
  return personsDataset.find(p => normalizeText(p.title) === q || p.slug === q);
}

function findEventById(id) {
  return archiveDataset.find(e => e.id === id || e.slug === id);
}

function findEventByTitle(title) {
  const q = normalizeText(title);
  return archiveDataset.find(e => normalizeText(e.title) === q);
}

function closeAllPopovers() {
  document.querySelectorAll('.artist-popover.is-open').forEach(p => {
    p.classList.remove('is-open');
    p.classList.remove('popover-down');
    p.style.left = '';
    p.style.right = '';
  });
  document.querySelectorAll('.artist-name-wrapper.is-open').forEach(w => w.classList.remove('is-open'));
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(str) {
  if (!str) return '';
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatParagraphs(text) {
  if (!text) return '';
  if (text.includes('<p>')) return text;
  return text.split(/\n\n+/).map(p => `<p>${p.trim()}</p>`).join('');
}

// ==========================================================================
// MÉTODOS GLOBAIS WINDOW PARA CONTROLE DO ARQUIVO
// ==========================================================================

window._arqSetViewMode = function(mode) {
  currentViewMode = mode;
  activeFilters.category = null;
  renderFacetPillsBar();
  renderTableHeader();
  applyFiltersAndRender();
};

window._arqToggleDropdown = function(type) {
  const menu = document.getElementById(`menu-dropdown-${type}`);
  if (!menu) return;
  const isOpen = menu.classList.contains('is-open');
  document.querySelectorAll('.filter-dropdown-menu.is-open').forEach(m => m.classList.remove('is-open'));
  if (!isOpen) menu.classList.add('is-open');
};

window._arqSelectCategory = function(cat) {
  activeFilters.category = cat;
  document.querySelectorAll('.filter-dropdown-menu.is-open').forEach(m => m.classList.remove('is-open'));
  applyFiltersAndRender();
};

window._arqClearCategoryFilter = function() {
  activeFilters.category = null;
  document.querySelectorAll('.filter-dropdown-menu.is-open').forEach(m => m.classList.remove('is-open'));
  applyFiltersAndRender();
};

window._arqSwitchDateTab = function(tab) {
  const btnSingle = document.getElementById('btn-date-single');
  const btnPeriod = document.getElementById('btn-date-period');
  const contentSingle = document.getElementById('date-tab-single-content');
  const contentPeriod = document.getElementById('date-tab-period-content');

  if (tab === 'single') {
    btnSingle.classList.add('is-active');
    btnPeriod.classList.remove('is-active');
    contentSingle.style.display = 'block';
    contentPeriod.style.display = 'none';
  } else {
    btnPeriod.classList.add('is-active');
    btnSingle.classList.remove('is-active');
    contentPeriod.style.display = 'block';
    contentSingle.style.display = 'none';
  }
};

window._arqSelectYear = function(year) {
  activeFilters.dateYear = year;
  activeFilters.datePeriod = null;
  document.querySelectorAll('.filter-dropdown-menu.is-open').forEach(m => m.classList.remove('is-open'));
  applyFiltersAndRender();
};

window._arqApplyPeriodFilter = function() {
  const startInput = document.getElementById('arq-period-start');
  const endInput = document.getElementById('arq-period-end');
  const start = parseInt(startInput.value, 10);
  const end = parseInt(endInput.value, 10);

  if (!isNaN(start) && !isNaN(end) && start <= end) {
    activeFilters.datePeriod = { start, end };
    activeFilters.dateYear = null;
    document.querySelectorAll('.filter-dropdown-menu.is-open').forEach(m => m.classList.remove('is-open'));
    applyFiltersAndRender();
  }
};

window._arqClearDateFilter = function() {
  activeFilters.dateYear = null;
  activeFilters.datePeriod = null;
  document.querySelectorAll('.filter-dropdown-menu.is-open').forEach(m => m.classList.remove('is-open'));
  applyFiltersAndRender();
};

window._arqTriggerSearch = function() {
  const input = document.getElementById('arq-search-input');
  if (!input) return;
  activeFilters.textQuery = input.value.trim();
  applyFiltersAndRender();
};

window._arqClearSearchFilter = function() {
  const input = document.getElementById('arq-search-input');
  if (input) input.value = '';
  activeFilters.textQuery = '';
  applyFiltersAndRender();
};

window._arqSortBy = function(column) {
  if (currentSort.column === column) {
    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
  } else {
    currentSort.column = column;
    currentSort.direction = 'asc';
  }
  applyFiltersAndRender();
};

window._arqGoToPage = function(page) {
  currentPage = page;
  closeActiveDrawer(true);
  renderTableBody();
  renderPagination();

  const sec = document.getElementById('sec-arquivo');
  if (sec) {
    const siteHeader = document.getElementById('logo-controller');
    const headerHeight = siteHeader ? siteHeader.getBoundingClientRect().height : 56;
    window.scrollTo({
      top: Math.max(0, sec.getBoundingClientRect().top + window.scrollY - headerHeight),
      behavior: 'smooth'
    });
  }
};

window._arqOpenRowDrawer = function(e, id) {
  if (e && e.stopPropagation) e.stopPropagation();
  if (typeof e === 'string' || typeof e === 'number') {
    id = e;
    e = null;
  }
  const rowEl = document.getElementById(`arq-row-${id}`);
  if (!rowEl) return;
  // Item 2: ao clicar no cabeçalho/linha de um evento já aberto fora da gaveta, fecha a gaveta
  if (activeDrawerState && activeDrawerState.itemEl === rowEl) {
    closeActiveDrawer();
    return;
  }
  openUniversalDrawerOnRow(rowEl);
};

window._arqDrawerClose = function(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  closeActiveDrawer();
};

window._arqDrawerCloseZoomOnly = function(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  if (!activeDrawerState) return;

  const currentStep = activeDrawerState.history[activeDrawerState.history.length - 1];
  if (currentStep && currentStep.type === 'zoom_gallery') {
    activeDrawerState.history.pop();
    renderCurrentDrawerView();
  } else {
    closeActiveDrawer();
  }
};

window._arqDrawerTopLineClick = function(e) {
  if (e && e.stopPropagation) e.stopPropagation();
};

window._arqDrawerSwitchTab = function(e, tab) {
  if (e && e.stopPropagation) e.stopPropagation();
  if (typeof e === 'string') {
    tab = e;
    e = null;
  }
  if (!activeDrawerState) return;
  const currentStep = activeDrawerState.history[activeDrawerState.historyIndex || (activeDrawerState.history.length - 1)];
  if (currentStep && currentStep.type === 'event') {
    currentStep.tab = tab;
    currentStep.selectedTextIndex = null;
    renderCurrentDrawerView();
  }
};

window._arqDrawerSelectText = function(e, textIndex) {
  if (e && e.stopPropagation) e.stopPropagation();
  if (typeof e === 'number') {
    textIndex = e;
    e = null;
  }
  if (!activeDrawerState) return;
  const currentStep = activeDrawerState.history[activeDrawerState.historyIndex || (activeDrawerState.history.length - 1)];
  if (currentStep && currentStep.type === 'event') {
    currentStep.selectedTextIndex = textIndex;
    renderCurrentDrawerView();
  }
};

window._arqToggleArtistPopover = function(e, slug) {
  if (e) e.stopPropagation();
  const popover = document.getElementById(`arq-popover-${slug}`);
  const wrapper = document.getElementById(`arq-art-${slug}`) || document.getElementById(`arq-cur-${slug}`);
  if (!popover || !wrapper) return;

  const isOpen = popover.classList.contains('is-open');
  closeAllPopovers();

  if (!isOpen) {
    popover.classList.add('is-open');
    wrapper.classList.add('is-open');
  }
};

window._arqClosePopovers = function(e) {
  if (e) e.stopPropagation();
  closeAllPopovers();
};

document.addEventListener('click', (e) => {
  if (!e.target.closest('.artist-name-wrapper')) {
    closeAllPopovers();
  }
});

function pushArchiveDrawerStep(step) {
  if (!activeDrawerState) return;
  activeDrawerState.history = activeDrawerState.history.slice(0, activeDrawerState.historyIndex + 1);
  activeDrawerState.history.push(step);
  activeDrawerState.historyIndex = activeDrawerState.history.length - 1;
  renderCurrentDrawerView();
}

window._arqGoToPersonProfile = function(e, personName) {
  if (e && e.stopPropagation) e.stopPropagation();
  if (typeof e === 'string') {
    personName = e;
    e = null;
  }
  closeAllPopovers();
  if (!activeDrawerState) return;

  const person = findPersonByName(personName);
  if (!person) return;

  pushArchiveDrawerStep({
    type: 'person',
    title: person.title,
    data: person
  });
};

window._arqOpenEventFromTimeline = function(e, eventId) {
  if (e && e.stopPropagation) e.stopPropagation();
  if (typeof e === 'string') {
    eventId = e;
    e = null;
  }
  closeAllPopovers();
  if (!activeDrawerState) return;

  const evt = findEventById(eventId) || findEventByTitle(eventId) || { title: eventId };
  pushArchiveDrawerStep({
    type: 'event',
    title: evt.title,
    data: evt,
    tab: 'sobre',
    selectedTextIndex: null
  });
};

window._arqOpenEventFromText = function(e, eventId) {
  if (e && e.stopPropagation) e.stopPropagation();
  if (typeof e === 'string') {
    eventId = e;
    e = null;
  }
  closeAllPopovers();
  if (!activeDrawerState) return;

  const evt = findEventById(eventId) || { title: eventId };
  pushArchiveDrawerStep({
    type: 'event',
    title: evt.title,
    data: evt,
    tab: 'textos',
    selectedTextIndex: null
  });
};

window._arqDrawerOpenZoomGallery = function(e, eventTitle, initialIndex = 0) {
  if (e && e.stopPropagation) e.stopPropagation();
  if (typeof e === 'string') {
    initialIndex = typeof eventTitle === 'number' ? eventTitle : 0;
    eventTitle = e;
    e = null;
  }
  closeAllPopovers();
  if (!activeDrawerState) return;

  activeDrawerState.zoomOpenedAt = Date.now();

  const currentStep = activeDrawerState.history[activeDrawerState.historyIndex] || activeDrawerState.history[activeDrawerState.history.length - 1];
  let evt = currentStep ? currentStep.data : null;
  if (!evt || currentStep.type !== 'event') {
    evt = findEventByTitle(eventTitle) || { title: eventTitle };
  }

  const images = evt.fotos || [];
  if (!images.length) return;

  pushArchiveDrawerStep({
    type: 'zoom_gallery',
    title: `${images.length} fotos`,
    data: {
      title: evt.title || eventTitle,
      images,
      initialIndex
    }
  });
};

window._arqDrawerOpenPersonZoomGallery = function(e, personName, initialIndex = 0) {
  if (e && e.stopPropagation) e.stopPropagation();
  if (typeof e === 'string') {
    initialIndex = typeof personName === 'number' ? personName : 0;
    personName = e;
    e = null;
  }
  closeAllPopovers();
  if (!activeDrawerState) return;

  activeDrawerState.zoomOpenedAt = Date.now();

  const person = findPersonByName(personName);
  if (!person) return;

  const images = getPersonGalleryImages(person);
  if (!images.length) return;

  pushArchiveDrawerStep({
    type: 'zoom_gallery',
    title: `${images.length} ${images.length === 1 ? 'foto' : 'fotos'}`,
    data: {
      title: person.title || personName,
      images,
      initialIndex
    }
  });
};

/**
 * Botão ‹ no Arquivo:
 * - Se em relações (historyIndex > 0): recua um passo nas relações.
 * - Ao atingir o nível raiz (historyIndex === 0): passa a navegar sobre a lista da tabela de Arquivo.
 * - Se no nível raiz (historyIndex === 0): abre a gaveta na linha anterior da tabela.
 */
window._arqDrawerNavPrev = function(e) {
  if (e) e.stopPropagation();
  if (!activeDrawerState) return;

  if (activeDrawerState.historyIndex > 0) {
    activeDrawerState.historyIndex--;
    renderCurrentDrawerView();
  } else {
    const rows = getArchiveRowsList();
    const currentIdx = rows.indexOf(activeDrawerState.itemEl);
    if (currentIdx > 0) {
      openUniversalDrawerOnRow(rows[currentIdx - 1]);
    }
  }
};

/**
 * Botão › no Arquivo:
 * - Se em relações (historyIndex > 0): avança no histórico de relações até o limite.
 *   Ao atingir o fim da cadeia, passa para a próxima linha da tabela.
 * - Se no nível raiz (historyIndex === 0): abre a gaveta na próxima linha da tabela.
 */
window._arqDrawerNavNext = function(e) {
  if (e) e.stopPropagation();
  if (!activeDrawerState) return;

  if (activeDrawerState.historyIndex > 0) {
    if (activeDrawerState.historyIndex < activeDrawerState.history.length - 1) {
      activeDrawerState.historyIndex++;
      renderCurrentDrawerView();
    } else {
      const rows = getArchiveRowsList();
      const currentIdx = rows.indexOf(activeDrawerState.itemEl);
      if (currentIdx >= 0 && currentIdx < rows.length - 1) {
        openUniversalDrawerOnRow(rows[currentIdx + 1]);
      }
    }
  } else {
    const rows = getArchiveRowsList();
    const currentIdx = rows.indexOf(activeDrawerState.itemEl);
    if (currentIdx >= 0 && currentIdx < rows.length - 1) {
      openUniversalDrawerOnRow(rows[currentIdx + 1]);
    }
  }
};

window._arqDrawerClose = function(e) {
  if (e) e.stopPropagation();
  closeActiveDrawer();
};

window._arqDrawerCloseZoomOnly = function(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  if (!activeDrawerState) return;

  if (activeDrawerState.zoomOpenedAt && (Date.now() - activeDrawerState.zoomOpenedAt < 300)) {
    return;
  }

  const currentStep = activeDrawerState.history[activeDrawerState.historyIndex || (activeDrawerState.history.length - 1)];
  if (currentStep && currentStep.type === 'zoom_gallery') {
    if (activeDrawerState.historyIndex > 0) {
      activeDrawerState.historyIndex--;
      renderCurrentDrawerView();
    } else if (activeDrawerState.history.length > 1) {
      activeDrawerState.history.pop();
      activeDrawerState.historyIndex = activeDrawerState.history.length - 1;
      renderCurrentDrawerView();
    } else {
      closeActiveDrawer();
    }
  } else {
    closeActiveDrawer();
  }
};

window._arqDrawerNavBack = function(e) {
  if (e) e.stopPropagation();
  window._arqDrawerNavPrev(e);
};

/**
 * Navegação por clique nos breadcrumbs do Arquivo:
 * - Clicar em ARQUIVO (stepIndex === -1) fecha a gaveta.
 * - Clicar em qualquer outro passo posiciona o historyIndex naquele nó.
 * - Se retornar a stepIndex === 0, os botões ‹ e › voltam a operar sobre a lista de eventos da tabela.
 */
window._arqDrawerNavStep = function(e, stepIndex) {
  if (e && e.stopPropagation) e.stopPropagation();
  if (typeof e === 'number') {
    stepIndex = e;
    e = null;
  }
  if (!activeDrawerState) return;
  if (stepIndex === -1) {
    closeActiveDrawer();
    return;
  }
  if (stepIndex >= 0 && stepIndex < activeDrawerState.history.length) {
    activeDrawerState.historyIndex = stepIndex;
    renderCurrentDrawerView();
  }
};
