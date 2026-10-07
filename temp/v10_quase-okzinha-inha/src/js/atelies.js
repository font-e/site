// ==========================================================================
// MÓDULO SPA: ATELIÊS (Abas ATUAIS / ANTERIORES + Grid 12 + Perfil Gaveta)
// Conectado exclusivamente ao FonteState (eliminação definitiva de mocks)
// ==========================================================================

import { FonteState } from './state.js';
import { openZoomGallery, closeZoomGallery } from './zoom-gallery.js';
import {
  renderDrawerSubtabsHtml,
  renderParticipacoesTabHtml,
  renderPessoaDrawerHtml,
  renderEventoDrawerHtml,
  scrollToDrawerTop
} from './zoom-viewer.js';

const state = {
  data: [],
  activeTab: 'atuais', // 'atuais' | 'anteriores'
  activeArtistId: null,
  profileTab: 'sobre',
  inDrawerNav: null,
  inDrawerStack: []
};

export async function initAtelies(sectionEl) {
  injectScopedStyles();
  
  try {
    await FonteState.init();
    updateAteliesData();
  } catch (e) {
    console.error('[Atelies] Falha ao obter dados do FonteState:', e);
    state.data = [];
  }

  renderTabs(sectionEl);
  renderLayout(sectionEl);
  attachEvents(sectionEl);

  window._openAtelieArtist = (id) => openArtistProfile(id, sectionEl);
  window._closeArtistDetail = () => closeArtistProfile(sectionEl);
  window._selectAteliesTab = (tab) => {
    state.activeTab = tab;
    closeArtistProfile(sectionEl, false);
    updateAteliesData();
    renderTabs(sectionEl);
    renderLayout(sectionEl);
  };
}

function updateAteliesData() {
  state.data = FonteState.getMembrosAtelie(state.activeTab);
}

function injectScopedStyles() {
  const existing = document.getElementById('atelies-scoped-styles');
  if (existing && existing.parentNode) {
    existing.parentNode.removeChild(existing);
  }
}

function renderTabs(sectionEl) {
  const container = sectionEl.querySelector('#atelies-facets-container');
  if (!container) return;

  const tabs = [
    { id: 'atuais', label: 'ATUAIS' },
    { id: 'anteriores', label: 'ANTERIORES' }
  ];

  const html = tabs.map(tab => {
    const isActive = (state.activeTab === tab.id);
    return `
      <button type="button" 
              class="filter-pill ${isActive ? 'is-active' : ''}" 
              data-tab="${tab.id}">
        ${tab.label}
      </button>
    `;
  }).join('');

  container.innerHTML = html;

  if (window.updateTabCutout) {
    requestAnimationFrame(() => {
      window.updateTabCutout(sectionEl);
    });
  }
}

function renderLayout(sectionEl) {
  const container = sectionEl.querySelector('#atelies-grid-container');
  if (!container) return;

  let mainBodyHtml = '';

  if (state.data.length === 0) {
    mainBodyHtml = `
      <div class="atelies-empty-pane" id="atelies-empty-pane">
        <p>Nenhum artista catalogado nesta categoria.</p>
      </div>
    `;
  } else {
    const photosHtml = state.data.map(artist => {
      const isAline = (artist.id === 'aline-setton' || artist.slug === 'aline-setton');
      const imgSrc = isAline 
        ? 'https://firebrick-mallard-266745.hostingersite.com/media/pages/eventos/aline-setton/3e5313c0d1-1789686086/aline_setton-1400x1400-q82.webp'
        : (artist.imagem || '');
      return `
      <div class="atelies-photo-card" data-id="${artist.id}" role="button" tabindex="0">
        <div class="atelies-photo-wrapper">
          <img src="${imgSrc}" 
               alt="${artist.nome}" 
               loading="lazy">
        </div>
        <div class="atelies-photo-meta">
          <span class="atelies-photo-name">${artist.nome}</span>
        </div>
      </div>
    `;
    }).join('');

    mainBodyHtml = `
      <div class="atelies-gallery-grid" id="atelies-gallery">
        ${photosHtml}
      </div>
    `;
  }

  container.innerHTML = `
    <div class="atelies-container">
      ${mainBodyHtml}
      <div class="atelies-drawer-pane" id="atelies-drawer-pane">
        <!-- Injetado dinamicamente ao abrir perfil de artista -->
      </div>
    </div>
  `;
}

function attachEvents(sectionEl) {
  const facets = sectionEl.querySelector('#atelies-facets-container');
  if (facets) {
    facets.addEventListener('click', (e) => {
      const pill = e.target.closest('.filter-pill');
      if (pill && pill.dataset.tab) {
        state.activeTab = pill.dataset.tab;
        closeArtistProfile(sectionEl, false);
        updateAteliesData();
        renderTabs(sectionEl);
        renderLayout(sectionEl);
      }
    });
  }

  const gridContainer = sectionEl.querySelector('#atelies-grid-container');
  if (gridContainer) {
    gridContainer.addEventListener('click', (e) => {
      const card = e.target.closest('.atelies-photo-card');
      if (card && card.dataset.id) {
        state.profileTab = 'sobre';
        openArtistProfile(card.dataset.id, sectionEl);
      }
    });
  }
}

function openArtistProfile(id, sectionEl, doScroll = true) {
  state.activeArtistId = id;
  const artist = state.data.find(a => a.id === id || a.slug === id);
  if (!artist) return;

  const pessoa = FonteState.getPessoa(artist.slug || artist.id) || artist;

  renderTabs(sectionEl);

  const gallery = sectionEl.querySelector('#atelies-gallery');
  const emptyPane = sectionEl.querySelector('#atelies-empty-pane');
  const drawerPane = sectionEl.querySelector('#atelies-drawer-pane');
  if (!drawerPane) return;

  let drawerContentHtml = '';
  if (state.inDrawerNav) {
    if (state.inDrawerNav.type === 'evento') {
      drawerContentHtml = renderEventoDrawerHtml({
        evento: state.inDrawerNav.item,
        activeTab: state.inDrawerNav.tab || 'sobre'
      });
    } else {
      drawerContentHtml = renderPessoaDrawerHtml({
        pessoa: state.inDrawerNav.item,
        activeTab: state.inDrawerNav.tab || 'sobre',
        isResidencia: false
      });
    }
  } else {
    drawerContentHtml = renderPessoaDrawerHtml({
      pessoa: pessoa,
      activeTab: state.profileTab,
      isResidencia: false
    });
  }

  drawerPane.innerHTML = drawerContentHtml;

  if (gallery) gallery.classList.add('is-hidden');
  if (emptyPane) emptyPane.classList.add('is-hidden');
  drawerPane.classList.add('is-open');

  // Sub-abas (NUNCA altera scroll)
  const subtabBtns = drawerPane.querySelectorAll('.drawer-subtab-btn[data-tab]');
  subtabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (state.inDrawerNav) {
        state.inDrawerNav.tab = btn.dataset.tab;
      } else {
        state.profileTab = btn.dataset.tab;
      }
      openArtistProfile(id, sectionEl, false);
    });
  });

  // Botão de Compartilhar dentro da gaveta
  const shareToggle = drawerPane.querySelector('[data-action="toggle-share"]');
  if (shareToggle) {
    shareToggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const cluster = shareToggle.closest('.drawer-share-cluster');
      if (cluster) cluster.classList.toggle('is-open');
    });
  }

  // Fechar gaveta ou voltar na pilha in-drawer
  const closeBtn = drawerPane.querySelector('[data-action="close-drawer"]');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (state.inDrawerStack && state.inDrawerStack.length > 0) {
        state.inDrawerNav = state.inDrawerStack.pop();
        openArtistProfile(id, sectionEl, false);
        return;
      }
      if (state.inDrawerNav) {
        state.inDrawerNav = null;
        openArtistProfile(id, sectionEl, false);
        return;
      }
      closeArtistProfile(sectionEl, false);
    });
  }

  // Clique em evento relacional (ex: em histórico de atuações)
  drawerPane.querySelectorAll('.person-cross-link[data-evento-id]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const evId = link.dataset.eventoId;
      const ev = FonteState.getEvento(evId);
      if (ev) {
        if (!state.inDrawerStack) state.inDrawerStack = [];
        state.inDrawerStack.push(state.inDrawerNav || {
          type: 'pessoa',
          item: pessoa,
          tab: state.profileTab
        });
        state.inDrawerNav = {
          type: 'evento',
          item: ev,
          tab: 'sobre'
        };
        openArtistProfile(id, sectionEl, false);
      }
    });
  });

  // Clique em pessoa relacional
  drawerPane.querySelectorAll('.person-cross-link[data-pessoa-slug]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const slug = link.dataset.pessoaSlug;
      const p = FonteState.getPessoa(slug);
      if (p) {
        if (!state.inDrawerStack) state.inDrawerStack = [];
        state.inDrawerStack.push(state.inDrawerNav || {
          type: 'pessoa',
          item: pessoa,
          tab: state.profileTab
        });
        state.inDrawerNav = {
          type: 'pessoa',
          item: p,
          tab: 'sobre'
        };
        openArtistProfile(id, sectionEl, false);
      }
    });
  });

  // Clique em imagem da galeria lateral -> Abre Galeria Zoom
  drawerPane.querySelectorAll('.drawer-gallery-item').forEach(itemEl => {
    itemEl.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(itemEl.dataset.idx || '0', 10);
      const activeItem = state.inDrawerNav?.item || pessoa;
      if (drawerPane && activeItem) {
        openZoomGallery({
          container: drawerPane,
          item: activeItem,
          initialIndex: idx,
          title: activeItem.titulo || activeItem.title || activeItem.nome || ''
        });
      }
    });
  });

  if (doScroll) {
    requestAnimationFrame(() => {
      scrollToDrawerTop(drawerPane);
    });
  }
}

function closeArtistProfile(sectionEl, doScroll = false) {
  closeZoomGallery();
  state.activeArtistId = null;
  state.inDrawerNav = null;
  state.inDrawerStack = [];
  const gallery = sectionEl.querySelector('#atelies-gallery');
  const emptyPane = sectionEl.querySelector('#atelies-empty-pane');
  const drawerPane = sectionEl.querySelector('#atelies-drawer-pane');

  if (drawerPane) {
    drawerPane.classList.remove('is-open');
    drawerPane.innerHTML = '';
  }

  if (gallery) gallery.classList.remove('is-hidden');
  if (emptyPane) emptyPane.classList.remove('is-hidden');

  renderTabs(sectionEl);

  if (doScroll) {
    requestAnimationFrame(() => {
      scrollToDrawerTop(sectionEl);
    });
  }
}
