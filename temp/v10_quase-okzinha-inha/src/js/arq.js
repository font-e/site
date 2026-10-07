// ==========================================================================
// MÓDULO SPA: ARQUIVO (Acervo Histórico Integral & Catálogo de Pessoas)
// Conectado exclusivamente ao FonteState (eliminação definitiva de mocks)
// ==========================================================================

import { FonteState } from './state.js';
import { openZoomGallery, closeZoomGallery } from './zoom-gallery.js';
import {
  renderDrawerSubtabsHtml,
  renderSobreTabHtml,
  renderFichaTecnicaTabHtml,
  renderTextosTabHtml,
  renderVideosTabHtml,
  renderParticipacoesTabHtml,
  renderPessoaDrawerHtml,
  renderEventoDrawerHtml,
  formatPeriodo,
  formatPlainPeople,
  formatRelationalPeople,
  scrollToDrawerTop
} from './zoom-viewer.js';

const state = {
  data: { EVENTOS: [], PESSOAS: [], TEXTOS: [] },
  viewMode: 'EVENTOS', // 'EVENTOS' | 'PESSOAS' | 'TEXTOS'
  activeId: null,
  inDrawerNav: null, // Sub-navegação contínua dentro da gaveta ativa
  inDrawerStack: [],
  drawerTab: 'sobre',
  galleryIndex: 0,
  currentPage: 1,
  itemsPerPage: 20
};

export async function initArqModule() {
  injectScopedStyles();
  
  try {
    await FonteState.init();
    loadArquivoData();
  } catch (e) {
    console.error('[Arquivo] Falha ao obter dados do FonteState:', e);
  }

  renderFacets();
  renderTable();
  attachGlobalEvents();
}

function loadArquivoData() {
  const eventos = FonteState.getArquivo();
  state.data.EVENTOS = [...eventos].sort((a, b) => (b.ano || 0) - (a.ano || 0));

  // Catálogo canônico de pessoas fornecido pelo Kirby
  const pessoas = FonteState.getPessoasArray();
  state.data.PESSOAS = pessoas;

  // Catálogo consolidado de ensaios e textos críticos
  const textsList = [];
  eventos.forEach(evt => {
    if (Array.isArray(evt.textos)) {
      evt.textos.forEach((txt, idx) => {
        textsList.push({
          id: `${evt.id}-txt-${idx}`,
          eventoId: evt.id,
          eventoTitle: evt.titulo || evt.title,
          ano: evt.ano,
          ...txt
        });
      });
    }
  });
  state.data.TEXTOS = textsList;
}

function injectScopedStyles() {
  if (document.getElementById('arq-scoped-styles')) return;
  const style = document.createElement('style');
  style.id = 'arq-scoped-styles';
  style.textContent = `
    .arq-header-row { display: grid; grid-template-columns: repeat(12, 1fr); border-bottom: var(--border-width, 1px) solid var(--border-color); background: var(--bg-white, #ffffff); font-size: var(--fs-meta); font-weight: 600; text-transform: uppercase; min-height: 44px; height: 44px; }
    .arq-table-row { display: grid; grid-template-columns: repeat(12, 1fr); min-height: 52px; border-bottom: var(--border-width, 1px) solid var(--border-color); cursor: pointer; transition: background-color 0.15s ease, color 0.15s ease; font-size: var(--fs-meta); background-color: rgba(255, 255, 255, 0.7); color: var(--bg-black); }
    .arq-group-row { background: transparent; }
    .arq-th, .arq-td { display: flex; align-items: center; padding: 14px 16px; border-right: var(--border-width, 1px) solid var(--border-color); box-sizing: border-box; line-height: 1.45; word-break: break-word; }
    .arq-th:last-child, .arq-td:last-child { border-right: none; }
    
    @media (hover: hover) and (pointer: fine) { 
      .arq-table-row:hover { 
        background-color: rgba(175, 255, 250, 0.7) !important; 
      } 
    }
    .arq-group-row.is-open { background: transparent; }
    .arq-group-row.is-open .arq-table-row { background-color: rgba(175, 255, 250, 0.7) !important; border-bottom: var(--border-width, 1px) solid var(--border-color); }
    
    .col-title { grid-column: 1 / 5; padding-left: var(--content-indent-left, 60px); padding-right: 16px; font-weight: 500; letter-spacing: -0.01em; }
    .col-artists { grid-column: 5 / 9; padding-left: 16px; padding-right: 16px; font-weight: 400; color: var(--bg-black); }
    .col-category { grid-column: 9 / 12; padding-left: 16px; padding-right: 16px; font-weight: 400; }
    .col-year { grid-column: 12 / 13; padding-left: 16px; padding-right: 24px; font-weight: 500; justify-content: flex-end; }
    
    .arq-group-row.is-open .universal-drawer { border-top: none; border-bottom: var(--border-width, 1px) solid var(--border-color) !important; margin: 0 !important; }

    /* Paginação da Planilha em Grupos de 20 */
    .table-pagination-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 20px 12px var(--content-indent-left, 60px);
      border-top: var(--border-width, 1px) solid var(--border-color);
      border-bottom: var(--border-width, 1px) solid var(--border-color);
      font-size: var(--fs-meta);
      font-weight: 500;
      box-sizing: border-box;
      background-color: var(--bg-white, #ffffff);
    }
    .pagination-info {
      color: var(--bg-black);
      font-weight: 500;
      letter-spacing: -0.01em;
    }
    .pagination-box {
      display: flex;
      gap: 4px;
      align-items: center;
      flex-wrap: wrap;
    }
    .pagination-btn {
      height: 30px;
      min-width: 30px;
      padding: 0 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: var(--fs-meta);
      font-family: inherit;
      border: var(--border-width, 1px) solid var(--border-color, #000);
      background: transparent;
      color: var(--bg-black);
      cursor: pointer;
      transition: background-color 0.15s ease;
      box-sizing: border-box;
    }
    .pagination-btn.is-active {
      background-color: rgba(175, 255, 250, 0.7);
      font-weight: 700;
    }
    @media (hover: hover) and (pointer: fine) {
      .pagination-btn:hover:not(:disabled) {
        background-color: rgba(175, 255, 250, 0.7);
      }
    }
    .pagination-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }
    
    @media (max-width: 899px) {
      .table-pagination-row {
        flex-direction: column;
        gap: 12px;
        align-items: flex-start;
        padding-left: 16px;
        padding-right: 16px;
      }
      .arq-header-row { display: none; }
      .arq-table-row { display: flex; flex-direction: column; padding: 16px 0; gap: 8px; }
      .arq-th, .arq-td { border-right: none; padding: 0 16px; }
      .col-title { font-size: var(--fs-name); padding-left: 16px; margin-bottom: 8px; }
    }
  `;
  document.head.appendChild(style);
}

function renderFacets() {
  const container = document.getElementById('archive-facets-container');
  if (!container) return;
  const modes = ['EVENTOS', 'PESSOAS', 'TEXTOS'];
  
  container.innerHTML = `
    <div class="archive-facet-bar" style="display:flex; gap:8px;">
      ${modes.map(m => `
        <button type="button" class="filter-pill ${state.viewMode === m ? 'is-active' : ''}" data-mode="${m}">${m}</button>
      `).join('')}
    </div>
  `;
}

function renderTable() {
  const head = document.getElementById('table-header-container');
  const body = document.getElementById('table-body-container');
  if (!head || !body) return;

  const dataset = state.data[state.viewMode] || [];
  const totalPages = Math.max(1, Math.ceil(dataset.length / state.itemsPerPage));
  if (state.currentPage > totalPages) {
    state.currentPage = 1;
  }
  const start = (state.currentPage - 1) * state.itemsPerPage;
  const pageItems = dataset.slice(start, start + state.itemsPerPage);

  if (state.viewMode === 'EVENTOS') {
    head.innerHTML = `
      <div class="arq-header-row">
        <div class="arq-th col-title">Título</div>
        <div class="arq-th col-artists">Artistas</div>
        <div class="arq-th col-category">Categoria</div>
        <div class="arq-th col-year">Ano</div>
      </div>
    `;
    
    body.innerHTML = pageItems.map(evt => {
      const isOpen = state.activeId === evt.id;
      // Nomes em texto puro na tabela (sem links, eliminando quebras desnecessárias)
      const artDisplay = formatPlainPeople(evt.artistas || evt.ministrantes, '—');
      const catDisplay = evt.tipo || evt.categoria || '—';
      const anoDisplay = evt.ano || '—';

      const drawerItem = (isOpen && state.inDrawerNav) ? state.inDrawerNav.item : evt;
      const drawerType = (isOpen && state.inDrawerNav) ? state.inDrawerNav.type : 'evento';

      return `
        <div class="arq-group-row ${isOpen ? 'is-open' : ''}" data-id="${evt.id}">
          <div class="arq-table-row">
            <div class="arq-td col-title">${evt.titulo || evt.title}</div>
            <div class="arq-td col-artists">${artDisplay}</div>
            <div class="arq-td col-category">${catDisplay}</div>
            <div class="arq-td col-year">${anoDisplay}</div>
          </div>
          ${isOpen ? createDrawerHtml(drawerItem, drawerType) : ''}
        </div>
      `;
    }).join('');
  } 
  else if (state.viewMode === 'PESSOAS') {
    head.innerHTML = `
      <div class="arq-header-row">
        <div class="arq-th col-title">Agente Cultural</div>
        <div class="arq-th col-artists">Total de Participações</div>
        <div class="arq-th col-category" style="grid-column: 9/13;">Atuação Principal</div>
      </div>
    `;
    body.innerHTML = pageItems.map(p => {
      const isOpen = state.activeId === p.slug;
      const totalPart = Array.isArray(p.participacoes) ? p.participacoes.length : 0;
      const atuacao = p.atuacao || 'Artista';

      const drawerItem = (isOpen && state.inDrawerNav) ? state.inDrawerNav.item : p;
      const drawerType = (isOpen && state.inDrawerNav) ? state.inDrawerNav.type : 'pessoa';

      return `
        <div class="arq-group-row ${isOpen ? 'is-open' : ''}" data-id="${p.slug}">
          <div class="arq-table-row">
            <div class="arq-td col-title">${p.nome}</div>
            <div class="arq-td col-artists">${totalPart} ações catalogadas</div>
            <div class="arq-td col-category" style="grid-column: 9/13;">${atuacao}</div>
          </div>
          ${isOpen ? createDrawerHtml(drawerItem, drawerType) : ''}
        </div>
      `;
    }).join('');
  }
  else if (state.viewMode === 'TEXTOS') {
    head.innerHTML = `
      <div class="arq-header-row">
        <div class="arq-th col-title">Título do Texto</div>
        <div class="arq-th col-artists">Autoria</div>
        <div class="arq-th col-category">Mostra / Evento</div>
        <div class="arq-th col-year">Ano</div>
      </div>
    `;
    body.innerHTML = pageItems.map(txt => {
      const isOpen = state.activeId === txt.id;
      const autoriaDisplay = formatRelationalPeople(txt.autoria, '—');

      return `
        <div class="arq-group-row ${isOpen ? 'is-open' : ''}" data-id="${txt.id}">
          <div class="arq-table-row">
            <div class="arq-td col-title">${txt.titulo}</div>
            <div class="arq-td col-artists">${autoriaDisplay}</div>
            <div class="arq-td col-category">${txt.eventoTitle}</div>
            <div class="arq-td col-year">${txt.ano || '—'}</div>
          </div>
          ${isOpen ? createDrawerHtml(txt, 'texto') : ''}
        </div>
      `;
    }).join('');
  }

  renderPagination(totalPages, dataset.length);
}

function renderPagination(totalPages, totalItems) {
  const container = document.getElementById('table-footer-container');
  if (!container) return;

  if (totalItems === 0 || totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let pagesHtml = '';
  for (let i = 1; i <= totalPages; i++) {
    pagesHtml += `
      <button type="button" 
              class="pagination-btn ${i === state.currentPage ? 'is-active' : ''}" 
              data-page="${i}">${i}</button>
    `;
  }

  container.innerHTML = `
    <div class="table-pagination-row">
      <div class="pagination-info">${totalItems} itens no acervo (Página ${state.currentPage} de ${totalPages} • Grupos de 20)</div>
      <div class="pagination-box">
        <button type="button" class="pagination-btn" data-page="${state.currentPage - 1}" ${state.currentPage === 1 ? 'disabled' : ''}>‹ Anterior</button>
        ${pagesHtml}
        <button type="button" class="pagination-btn" data-page="${state.currentPage + 1}" ${state.currentPage === totalPages ? 'disabled' : ''}>Próxima ›</button>
      </div>
    </div>
  `;
}

function createDrawerHtml(item, type) {
  if (type === 'pessoa') {
    return renderPessoaDrawerHtml({
      pessoa: item,
      activeTab: state.drawerTab || 'sobre'
    });
  }

  if (type === 'evento') {
    return renderEventoDrawerHtml({
      evento: item,
      activeTab: state.drawerTab || 'sobre'
    });
  }

  // Tipo Texto
  const leftContentHtml = `
    <div class="drawer-editorial-header">
      <h2 class="event-title">
        <span class="event-title-text">${item.titulo}</span>
      </h2>
    </div>
    <div class="drawer-tab-pane-container">
      <div class="drawer-tab-content">
        <div class="editorial-val prose">${item.texto}</div>
      </div>
    </div>
  `;

  return `
    <div class="universal-drawer">
      <div class="drawer-left-column">
        ${leftContentHtml}
      </div>
      <div class="drawer-media-pane">
        <div style="color:#888; text-align:center; padding:48px 24px; font-size:var(--fs-meta);">Texto crítico do acervo</div>
      </div>
    </div>
  `;
}

function updateOpenRowDrawerOnly() {
  if (!state.activeId) return;
  const row = document.querySelector(`.arq-group-row[data-id="${state.activeId}"]`);
  if (!row) {
    renderTable();
    return;
  }

  const rootItem = state.data[state.viewMode]?.find(x => (x.id === state.activeId || x.slug === state.activeId));
  const drawerItem = state.inDrawerNav ? state.inDrawerNav.item : rootItem;
  const drawerType = state.inDrawerNav ? state.inDrawerNav.type : (state.viewMode === 'EVENTOS' ? 'evento' : state.viewMode === 'PESSOAS' ? 'pessoa' : 'texto');

  // Remove gaveta anterior
  row.querySelectorAll('.universal-drawer').forEach(el => el.remove());

  // Insere gaveta atualizada
  const drawerHtml = createDrawerHtml(drawerItem, drawerType);
  row.insertAdjacentHTML('beforeend', drawerHtml);
}

function attachGlobalEvents() {
  const facetsContainer = document.getElementById('archive-facets-container');
  if (facetsContainer) {
    facetsContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-pill');
      if (btn && btn.dataset.mode) {
        state.viewMode = btn.dataset.mode;
        state.currentPage = 1;
        state.activeId = null;
        state.inDrawerNav = null;
        state.inDrawerStack = [];
        renderFacets();
        renderTable();
      }
    });
  }

  const footerContainer = document.getElementById('table-footer-container');
  if (footerContainer) {
    footerContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.pagination-btn');
      if (btn && btn.dataset.page && !btn.disabled) {
        const page = parseInt(btn.dataset.page, 10);
        if (!isNaN(page) && page >= 1) {
          state.currentPage = page;
          state.activeId = null;
          state.inDrawerNav = null;
          state.inDrawerStack = [];
          renderTable();
          const tableHead = document.getElementById('table-header-container');
          if (tableHead) {
            scrollToDrawerTop(tableHead);
          }
        }
      }
    });
  }

  const tableBody = document.getElementById('table-body-container');
  if (tableBody) {
    tableBody.addEventListener('click', (e) => {
      // 1. Clique em link relacional de pessoa dentro da gaveta (In-drawer Continuous Navigation)
      const personLink = e.target.closest('.person-cross-link[data-pessoa-slug]');
      if (personLink && personLink.dataset.pessoaSlug) {
        e.preventDefault();
        e.stopPropagation();
        const slug = personLink.dataset.pessoaSlug;
        const pessoa = FonteState.getPessoa(slug);
        if (pessoa) {
          if (!state.inDrawerStack) state.inDrawerStack = [];
          const rootItem = state.data[state.viewMode]?.find(x => (x.id === state.activeId || x.slug === state.activeId));
          const currentNav = state.inDrawerNav || {
            type: state.viewMode === 'EVENTOS' ? 'evento' : 'pessoa',
            item: rootItem
          };
          state.inDrawerStack.push(currentNav);
          state.inDrawerNav = {
            type: 'pessoa',
            item: pessoa
          };
          state.drawerTab = 'sobre';
          updateOpenRowDrawerOnly();
        }
        return;
      }

      // 2. Clique em link relacional de evento a partir da ficha da pessoa (In-drawer)
      const eventoLink = e.target.closest('.person-cross-link[data-evento-id]');
      if (eventoLink && eventoLink.dataset.eventoId) {
        e.preventDefault();
        e.stopPropagation();
        const evId = eventoLink.dataset.eventoId;
        const ev = FonteState.getEvento(evId);
        if (ev) {
          if (!state.inDrawerStack) state.inDrawerStack = [];
          const rootItem = state.data[state.viewMode]?.find(x => (x.id === state.activeId || x.slug === state.activeId));
          const currentNav = state.inDrawerNav || {
            type: state.viewMode === 'EVENTOS' ? 'evento' : 'pessoa',
            item: rootItem
          };
          state.inDrawerStack.push(currentNav);
          state.inDrawerNav = {
            type: 'evento',
            item: ev
          };
          state.drawerTab = 'sobre';
          updateOpenRowDrawerOnly();
        }
        return;
      }

      // 3. Clique em imagem da galeria lateral -> Abre Galeria Zoom
      const galleryItem = e.target.closest('.drawer-gallery-item');
      if (galleryItem) {
        e.stopPropagation();
        const idx = parseInt(galleryItem.dataset.idx || '0', 10);
        const rootItem = state.data[state.viewMode]?.find(x => (x.id === state.activeId || x.slug === state.activeId));
        const currentItem = state.inDrawerNav ? state.inDrawerNav.item : rootItem;
        const groupRow = document.querySelector(`.arq-group-row[data-id="${state.activeId}"]`);
        if (groupRow && currentItem) {
          openZoomGallery({
            container: groupRow,
            item: currentItem,
            initialIndex: idx,
            title: currentItem.titulo || currentItem.title || currentItem.nome || ''
          });
        }
        return;
      }

      // 4. Fechar gaveta (ou voltar na pilha in-drawer via sub-aba X)
      const closeDrawer = e.target.closest('[data-action="close-drawer"]');
      if (closeDrawer) {
        e.stopPropagation();
        closeZoomGallery();
        if (state.inDrawerStack && state.inDrawerStack.length > 0) {
          state.inDrawerNav = state.inDrawerStack.pop();
          state.drawerTab = 'sobre';
          updateOpenRowDrawerOnly();
          return;
        }
        if (state.inDrawerNav) {
          state.inDrawerNav = null;
          state.drawerTab = 'sobre';
          updateOpenRowDrawerOnly();
          return;
        }
        state.activeId = null;
        state.inDrawerNav = null;
        state.inDrawerStack = [];
        renderTable();
        return;
      }

      // 5. Sub-abas da gaveta (apenas troca o conteúdo, sem rolar a página)
      const subtabBtn = e.target.closest('.drawer-subtab-btn');
      if (subtabBtn && subtabBtn.dataset.tab) {
        e.stopPropagation();
        state.drawerTab = subtabBtn.dataset.tab;
        updateOpenRowDrawerOnly();
        return;
      }

      // 6. Clique na linha da tabela para abrir / fechar
      const row = e.target.closest('.arq-table-row');
      if (row) {
        const groupRow = row.closest('.arq-group-row');
        const id = groupRow.dataset.id;
        state.activeId = (state.activeId === id) ? null : id;
        state.inDrawerNav = null;
        state.inDrawerStack = [];
        state.drawerTab = 'sobre';
        renderTable();

        if (state.activeId) {
          requestAnimationFrame(() => {
            const opened = document.querySelector(`.arq-group-row[data-id="${id}"]`);
            if (opened) scrollToDrawerTop(opened);
          });
        }
      }
    });
  }
}
