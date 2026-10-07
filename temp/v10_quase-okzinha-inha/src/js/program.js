/**
 * RESIDÊNCIA FONTE — PROGRAM.JS
 * Módulo SPA de Programação
 * Conectado exclusivamente ao FonteState (eliminação definitiva de mocks)
 * Gaveta com expansão direta da linha fechada, abas de subseções tipo fichário e divisão estrita de conteúdo
 */

import { FonteState } from './state.js';
import { openZoomGallery, closeZoomGallery } from './zoom-gallery.js';
import {
  renderDrawerSubtabsHtml,
  renderSobreTabHtml,
  renderFichaTecnicaTabHtml,
  renderTextosTabHtml,
  renderVideosTabHtml,
  renderPessoaDrawerHtml,
  renderEventoDrawerHtml,
  formatPeriodo,
  formatPlainPeople,
  formatRelationalPeople,
  scrollToDrawerTop
} from './zoom-viewer.js';

const state = {
  events: [],
  filter: 'GERAL',
  activeId: null,
  activeTab: 'sobre',
  galleryIndex: 0,
  inDrawerNav: null,
  inDrawerStack: []
};

export async function initProgram(sectionEl) {
  try {
    await FonteState.init();
    state.events = FonteState.getProgramacao();
  } catch (err) {
    console.error('[Program] Falha ao obter dados do FonteState:', err);
    state.events = [];
  }

  renderFacets();
  renderGrid();
  attachEvents(sectionEl);

  window._progSetFilter = (filterKey) => {
    state.filter = (filterKey === 'TODA') ? 'GERAL' : filterKey;
    state.activeId = null;
    renderFacets();
    renderGrid();
    document.querySelectorAll('#subnav-programacao .header-subnav-btn').forEach(b => {
      b.classList.toggle('is-active', b.dataset.progFilter === filterKey || (filterKey === 'GERAL' && b.dataset.progFilter === 'TODA'));
    });
  };

  window._progOpenEvent = (id) => {
    state.filter = 'GERAL';
    state.activeId = id;
    state.activeTab = 'sobre';
    state.galleryIndex = 0;
    state.inDrawerNav = null;
    state.inDrawerStack = [];
    renderFacets();
    renderGrid();
    requestAnimationFrame(() => {
      const openedRow = document.querySelector(`.programacao-event-item[data-id="${id}"]`);
      if (openedRow) {
        scrollToDrawerTop(openedRow);
      }
    });
  };
}

function getAvailableTabs() {
  const tabs = [
    { key: 'GERAL', label: 'GERAL', count: state.events.length },
    { 
      key: 'PRESENTE', 
      label: 'PRESENTE', 
      count: state.events.filter(e => (e.status || e.subsection || '').toUpperCase() === 'PRESENTE').length 
    },
    { 
      key: 'INSCRIÇÕES ABERTAS', 
      label: 'INSCRIÇÕES ABERTAS', 
      count: state.events.filter(e => (e.status || '').toUpperCase().includes('INSCRI') || e.esta_aberta === true).length 
    },
    { 
      key: 'PRÓXIMA', 
      label: 'PRÓXIMA', 
      count: state.events.filter(e => {
        const s = (e.status || e.subsection || '').toUpperCase();
        return s === 'PRÓXIMA' || s === 'PROXIMA';
      }).length 
    }
  ];
  return tabs.filter(t => t.count > 0);
}

function renderFacets() {
  const container = document.getElementById('programacao-facets-container');
  if (!container) return;

  const available = getAvailableTabs();
  if (!available.some(t => t.key === state.filter)) {
    state.filter = 'GERAL';
  }

  container.innerHTML = available.map(cat => {
    const isActive = state.filter === cat.key;
    return `
      <button type="button" 
              class="filter-pill ${isActive ? 'is-active' : ''}" 
              data-filter="${cat.key}">
        ${cat.label}
      </button>
    `;
  }).join('');
}

function renderGrid() {
  const container = document.getElementById('programacao-grid-container');
  if (!container) return;
  container.innerHTML = '';

  const filtered = state.events.filter(evt => {
    if (state.filter === 'GERAL' || state.filter === 'TODA') return true;
    const sub = (evt.status || evt.subsection || '').toUpperCase();
    if (state.filter === 'PRESENTE') return sub === 'PRESENTE';
    if (state.filter === 'PRÓXIMA') return sub === 'PRÓXIMA' || sub === 'PROXIMA';
    if (state.filter === 'INSCRIÇÕES ABERTAS') return sub.includes('INSCRI') || evt.esta_aberta === true;
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>Nenhuma programação catalogada para esta visualização.</p>
      </div>
    `;
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'programacao-container';

  filtered.forEach((evt, idx) => {
    const isExpanded = state.activeId === evt.id;
    const article = document.createElement('article');
    article.className = `programacao-event-item ${isExpanded ? 'is-open' : ''}`;
    article.dataset.id = evt.id;
    article.innerHTML = renderArticleHtml(evt, isExpanded, idx);
    wrapper.appendChild(article);
  });

  container.appendChild(wrapper);
}

function formatDataMeta(evt, isInscricoes) {
  if (isInscricoes) {
    // No campo da data em inscrições abertas deixar vazio por enquanto
    return '';
  }
  // Na data, devemos declarar 'até 10/10' ao invés da data completa
  if (evt.fim) {
    const parts = String(evt.fim).split('-');
    if (parts.length === 3) {
      return `até ${parts[2]}/${parts[1]}`;
    }
  }
  return formatPeriodo(evt);
}

function formatHorarioMeta(evt, isInscricoes) {
  if (isInscricoes) {
    // Para inscrições abertas, no lugar do campo de visitação vamos mostrar o período de inscrições: até DD/MM
    const dataFim = evt.fim_inscricoes || evt.fim;
    if (dataFim) {
      const parts = String(dataFim).split('-');
      if (parts.length === 3) {
        return `até ${parts[2]}/${parts[1]}`;
      }
    }
    return 'Inscrições Abertas';
  }
  return evt.visitacao || evt.horario || '—';
}

function renderArticleHtml(evt, isExpanded, idx = 0) {
  const isInscricoes = (evt.status === 'INSCRIÇÕES ABERTAS') || evt.esta_aberta === true;
  const titleText = evt.titulo || evt.title || '';
  const subtitleText = evt.subtitulo || evt.subtitle || '';
  const categoryText = evt.tipo || evt.categoria || evt.category || 'Programação';
  const horarioText = formatHorarioMeta(evt, isInscricoes);
  const dateText = formatDataMeta(evt, isInscricoes);

  if (!isExpanded) {
    // LINHA FECHADA — nomes em texto plano puro sem botões ou links
    const artistsPlain = formatPeoplePlain(evt);

    return `
      <div class="event-header" role="button" tabindex="0" aria-expanded="false" title="Clique para expandir">
        <div class="event-meta-row">
          <div class="event-meta-tags">
            ${isInscricoes ? `<span class="event-tag-badge event-tag-inscricoes">Inscrições Abertas</span>` : `<span>${categoryText}</span>`}
          </div>
          <div class="event-meta-horario">
            <span>${horarioText}</span>
          </div>
          <div class="event-meta-date">
            <span>${dateText}</span>
          </div>
        </div>
        <h2 class="event-title">
          <span class="event-title-text">${titleText}</span>
          ${subtitleText ? `<span class="event-subtitle-text">${subtitleText}</span>` : ''}
        </h2>
        <div class="event-names">
          <span>${artistsPlain}</span>
        </div>
      </div>
    `;
  }

  // GAVETA ABERTA
  // Se estiver navegando internamente na gaveta (ex: perfil de Caio Borges ou outro agente)
  // A nova gaveta abre exatamente acima/sobrepondo a gaveta atual, sem replicar o cabeçalho do evento
  if (state.inDrawerNav) {
    let inDrawerContent = '';
    if (state.inDrawerNav.type === 'pessoa') {
      inDrawerContent = renderPessoaDrawerHtml({
        pessoa: state.inDrawerNav.item,
        activeTab: state.inDrawerNav.tab || 'sobre'
      });
    } else if (state.inDrawerNav.type === 'evento') {
      inDrawerContent = renderEventoDrawerHtml({
        evento: state.inDrawerNav.item,
        activeTab: state.inDrawerNav.tab || 'sobre'
      });
    }

    return inDrawerContent;
  }

  const rawImages = getImagesList(evt);
  const currentImgIdx = state.galleryIndex || 0;

  const artistsFormatted = formatPeopleDisplay(evt);
  const curadoriaDisplay = formatRelationalPeople(evt.curadoria, '—');
  const periodoDisplay = dateText || formatPeriodo(evt);
  const visitacaoDisplay = horarioText;
  const resumoDisplay = evt.resumo || evt.sobre || evt.content || '';
  
  const textosList = evt.texto_critico 
    ? [{ titulo: 'Texto Crítico', texto: evt.texto_critico }] 
    : (Array.isArray(evt.textos) ? evt.textos : []);
  const videosList = Array.isArray(evt.videos) ? evt.videos : [];

  const subtabs = [
    { id: 'sobre', label: 'SOBRE' },
    { id: 'ficha-tecnica', label: 'FICHA TÉCNICA' }
  ];
  if (textosList.length > 0) {
    subtabs.push({ id: 'textos', label: 'TEXTOS' });
  }
  if (videosList.length > 0) {
    subtabs.push({ id: 'videos', label: 'VÍDEOS' });
  }

  const tabsHtml = renderDrawerSubtabsHtml({
    tabs: subtabs,
    activeTab: state.activeTab || 'sobre'
  });

  let activeContentHtml = '';
  if (state.activeTab === 'ficha-tecnica') {
    activeContentHtml = renderFichaTecnicaTabHtml({
      artistas: artistsFormatted,
      curadoria: curadoriaDisplay,
      periodo: periodoDisplay,
      visitacao: visitacaoDisplay,
      horario: evt.horario,
      creditos: formatCreditos(evt.creditos)
    });
  } else if (state.activeTab === 'textos' && textosList.length > 0) {
    activeContentHtml = renderTextosTabHtml(textosList);
  } else if (state.activeTab === 'videos' && videosList.length > 0) {
    activeContentHtml = renderVideosTabHtml(videosList);
  } else {
    activeContentHtml = renderSobreTabHtml({
      resumo: resumoDisplay
    });
  }

  return `
    <div class="programacao-drawer-top-bar">
      <div class="event-header is-expanded" role="button" tabindex="0" aria-expanded="true" title="Clique para recolher">
        <div class="event-meta-row">
          <div class="event-meta-tags">
            ${isInscricoes ? `<span class="event-tag-badge event-tag-inscricoes">Inscrições Abertas</span>` : `<span>${categoryText}</span>`}
          </div>
          <div class="event-meta-horario">
            <span>${horarioText}</span>
          </div>
          <div class="event-meta-date">
            <span>${dateText}</span>
          </div>
        </div>
        <h2 class="event-title">
          <span class="event-title-text">${titleText}</span>
          ${subtitleText ? `<span class="event-subtitle-text">${subtitleText}</span>` : ''}
        </h2>
      </div>

      <div class="programacao-subtabs-wrapper">
        ${tabsHtml}
      </div>
    </div>

    <div class="programacao-expanded-body">
      <div class="programacao-expanded-content-col">
        <div class="drawer-tab-pane-container">
          ${activeContentHtml}
        </div>
      </div>

      <div class="drawer-media-pane" id="program-media-pane">
        <div class="drawer-gallery-track">
          ${rawImages.map((img, i) => {
            const ratio = img.ratio || 1.498;
            return `
              <div class="drawer-gallery-item" 
                   data-idx="${i}"
                   style="aspect-ratio: ${ratio}; background-color: #888888;">
                <img src="${img.thumb || img.url}" 
                     alt="${img.legenda || titleText}" 
                     loading="lazy"
                     style="aspect-ratio: ${ratio};">
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

function updateOpenArticleOnly(id) {
  const article = document.querySelector(`.programacao-event-item[data-id="${id}"]`);
  if (!article) {
    renderGrid();
    return;
  }
  const evt = state.events.find(e => e.id === id);
  if (!evt) return;

  article.innerHTML = renderArticleHtml(evt, true);
}

function getImagesList(evt) {
  if (Array.isArray(evt.galeria) && evt.galeria.length > 0) {
    return evt.galeria.map(g => ({
      url: g.zoom || g.thumb || g.url,
      thumb: g.thumb || g.zoom || g.url,
      zoom: g.zoom || g.thumb || g.url,
      width: g.width,
      height: g.height,
      ratio: g.ratio || (g.width && g.height ? g.width / g.height : 1.498),
      legenda: g.legenda || evt.titulo || evt.title || '',
      fotografia: g.fotografia || '',
      url_venda: g.url_venda || '',
      disponivel: g.disponivel === true
    }));
  }

  const rawImages = (Array.isArray(evt.expanded_images) && evt.expanded_images.length > 0)
    ? evt.expanded_images
    : (Array.isArray(evt.fotos) && evt.fotos.length > 0)
      ? evt.fotos
      : (Array.isArray(evt.images) && evt.images.length > 0)
        ? evt.images
        : [];

  if (rawImages.length > 0) {
    return rawImages.map(img => {
      if (typeof img === 'string') return { url: img, thumb: img, zoom: img, ratio: 1.498, legenda: evt.titulo || evt.title || '' };
      return {
        url: img.zoom || img.url || img.thumb || '',
        thumb: img.thumb || img.url || '',
        zoom: img.zoom || img.url || '',
        ratio: img.ratio || 1.498,
        legenda: img.legenda || evt.titulo || evt.title || ''
      };
    }).filter(img => img.url);
  }

  return [{
    url: 'https://firebrick-mallard-266745.hostingersite.com/media/pages/eventos/a-duracao-das-coisas/8a68ff0b92-1789686093/0056-1400x1400-q82.webp',
    thumb: 'https://firebrick-mallard-266745.hostingersite.com/media/pages/eventos/a-duracao-das-coisas/8a68ff0b92-1789686093/0056-1400x1400-q82.webp',
    zoom: 'https://firebrick-mallard-266745.hostingersite.com/media/pages/eventos/a-duracao-das-coisas/8a68ff0b92-1789686093/0056-1400x1400-q82.webp',
    ratio: 1.498,
    legenda: evt.titulo || evt.title || ''
  }];
}

function formatPeoplePlain(evt) {
  if (Array.isArray(evt.artistas) && evt.artistas.length > 0) {
    return formatPlainPeople(evt.artistas);
  }
  if (Array.isArray(evt.ministrantes) && evt.ministrantes.length > 0) {
    const list = evt.ministrantes.flatMap(m => m.nomes || []);
    return formatPlainPeople(list);
  }
  if (evt.artistas) return formatPlainPeople(evt.artistas);
  return '—';
}

function formatPeopleDisplay(evt) {
  if (Array.isArray(evt.artistas) && evt.artistas.length > 0) {
    return formatRelationalPeople(evt.artistas);
  }
  if (Array.isArray(evt.ministrantes) && evt.ministrantes.length > 0) {
    const list = evt.ministrantes.flatMap(m => m.nomes || []);
    return formatRelationalPeople(list);
  }
  if (evt.artistas) return formatRelationalPeople(evt.artistas);
  return '—';
}

function formatCreditos(creditos) {
  if (!Array.isArray(creditos)) return [];
  return creditos.map(c => {
    let nomesFormatados = '';
    if (Array.isArray(c.nomes)) {
      nomesFormatados = formatRelationalPeople(c.nomes);
    } else {
      nomesFormatados = c.nomes || c.texto || '';
    }
    return {
      funcao: c.funcao || 'CRÉDITOS',
      nomes: nomesFormatados
    };
  });
}

function attachEvents(sectionEl) {
  const facetsContainer = document.getElementById('programacao-facets-container');
  if (facetsContainer) {
    facetsContainer.addEventListener('click', (e) => {
      const pill = e.target.closest('.filter-pill');
      if (pill) {
        state.filter = pill.dataset.filter;
        state.activeId = null;
        renderFacets();
        renderGrid();
        if (window.updateTabCutout) window.updateTabCutout(sectionEl);
      }
    });
  }

  const gridContainer = document.getElementById('programacao-grid-container');
  if (gridContainer) {
    gridContainer.addEventListener('click', (e) => {
      // 1. Clique em link relacional de pessoa dentro da gaveta (In-Drawer Continuous Navigation)
      const personLink = e.target.closest('.person-cross-link[data-pessoa-slug]');
      if (personLink && personLink.dataset.pessoaSlug) {
        e.preventDefault();
        e.stopPropagation();
        const slug = personLink.dataset.pessoaSlug;
        const pessoa = FonteState.getPessoa(slug);
        if (pessoa && state.activeId) {
          const currentEvt = state.events.find(ev => ev.id === state.activeId);
          state.inDrawerStack.push(state.inDrawerNav || { type: 'evento', item: currentEvt, tab: state.activeTab });
          state.inDrawerNav = { type: 'pessoa', item: pessoa, tab: 'sobre' };
          updateOpenArticleOnly(state.activeId);
          requestAnimationFrame(() => {
            const article = document.querySelector(`.programacao-event-item[data-id="${state.activeId}"]`);
            if (article) scrollToDrawerTop(article);
          });
        }
        return;
      }

      // 2. Clique em link de evento dentro de atuações da pessoa
      const eventoLink = e.target.closest('.person-cross-link[data-evento-id]');
      if (eventoLink && eventoLink.dataset.eventoId) {
        e.preventDefault();
        e.stopPropagation();
        const evId = eventoLink.dataset.eventoId;
        const ev = FonteState.getEvento(evId);
        if (ev && state.activeId) {
          state.inDrawerStack.push(state.inDrawerNav);
          state.inDrawerNav = { type: 'evento', item: ev, tab: 'sobre' };
          updateOpenArticleOnly(state.activeId);
          requestAnimationFrame(() => {
            const article = document.querySelector(`.programacao-event-item[data-id="${state.activeId}"]`);
            if (article) scrollToDrawerTop(article);
          });
        }
        return;
      }

      // 3. Clique na imagem da galeria lateral -> Abre Galeria Zoom
      const galleryItem = e.target.closest('.drawer-gallery-item');
      if (galleryItem) {
        e.stopPropagation();
        const idx = parseInt(galleryItem.dataset.idx || '0', 10);
        const activeEvt = state.inDrawerNav?.item || state.events.find(ev => ev.id === state.activeId);
        const article = document.querySelector(`.programacao-event-item[data-id="${state.activeId}"]`);
        if (article && activeEvt) {
          openZoomGallery({
            container: article,
            item: activeEvt,
            initialIndex: idx,
            title: activeEvt.titulo || activeEvt.title || activeEvt.nome || ''
          });
        }
        return;
      }

      // 4. Fechar gaveta pelo botão X no trilho de sub-abas (retrocede pilha ou fecha)
      const closeDrawerBtn = e.target.closest('[data-action="close-drawer"]');
      if (closeDrawerBtn) {
        e.stopPropagation();
        closeZoomGallery();
        if (state.inDrawerStack && state.inDrawerStack.length > 0) {
          state.inDrawerNav = state.inDrawerStack.pop();
          updateOpenArticleOnly(state.activeId);
          requestAnimationFrame(() => {
            const article = document.querySelector(`.programacao-event-item[data-id="${state.activeId}"]`);
            if (article) scrollToDrawerTop(article);
          });
          return;
        }
        if (state.inDrawerNav) {
          state.inDrawerNav = null;
          updateOpenArticleOnly(state.activeId);
          requestAnimationFrame(() => {
            const article = document.querySelector(`.programacao-event-item[data-id="${state.activeId}"]`);
            if (article) scrollToDrawerTop(article);
          });
          return;
        }
        state.activeId = null;
        state.inDrawerNav = null;
        state.inDrawerStack = [];
        renderGrid();
        return;
      }

      // 5. Troca de Sub-Aba dentro da gaveta aberta (NUNCA altera scroll)
      const subtabBtn = e.target.closest('.drawer-subtab-btn');
      if (subtabBtn && subtabBtn.dataset.tab) {
        e.stopPropagation();
        if (state.inDrawerNav) {
          state.inDrawerNav.tab = subtabBtn.dataset.tab;
        } else {
          state.activeTab = subtabBtn.dataset.tab;
        }
        updateOpenArticleOnly(state.activeId);
        return;
      }

      // 6. Clique no cabeçalho do evento para abrir/fechar a gaveta
      const header = e.target.closest('.event-header');
      if (header) {
        const row = header.closest('.programacao-event-item');
        const id = row.dataset.id;
        
        if (state.activeId === id) {
          closeZoomGallery();
          state.activeId = null;
          state.inDrawerNav = null;
          state.inDrawerStack = [];
          renderGrid();
        } else {
          state.activeId = id;
          state.activeTab = 'sobre';
          state.galleryIndex = 0;
          state.inDrawerNav = null;
          state.inDrawerStack = [];
          renderGrid();

          requestAnimationFrame(() => {
            const openedRow = document.querySelector(`.programacao-event-item[data-id="${id}"]`);
            if (openedRow) {
              scrollToDrawerTop(openedRow);
            }
          });
        }
      }
    });
  }
}
