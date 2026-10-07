// ==========================================================================
// MÓDULO SPA: RESIDÊNCIA (ARQUITETURA EM 12 COLUNAS & GAVETA DE ARTISTAS)
// Conectado exclusivamente ao FonteState (eliminação definitiva de mocks)
// ==========================================================================

import { FonteState } from './state.js';
import { openZoomGallery, closeZoomGallery } from './zoom-gallery.js';
import {
  renderDrawerSubtabsHtml,
  renderParticipacoesTabHtml,
  renderPessoaDrawerHtml,
  renderEventoDrawerHtml,
  formatPlainPeople,
  scrollToDrawerTop
} from './zoom-viewer.js';

const state = {
  data: null,
  activeModality: 'programas',
  activeResidentArtistId: null,
  profileTab: 'sobre',
  inDrawerNav: null,
  inDrawerStack: []
};

export async function initResidencia(sectionEl) {
  try {
    await FonteState.init();
    state.data = FonteState.getResidencia();
  } catch (e) {
    console.error('[Residencia] Falha ao obter dados do FonteState:', e);
    state.data = {};
  }

  renderLayout(sectionEl);
  attachEvents(sectionEl);

  window._selectResidenciaModality = (mod) => {
    const targetMod = (mod === 'inscricoes') ? 'programas' : mod;
    closeResidentArtistProfile(sectionEl, false);
    state.activeModality = targetMod;
    renderTabs(sectionEl);
    renderContent(sectionEl);
    renderGallery(sectionEl);
    document.querySelectorAll('#subnav-residencia .header-subnav-btn').forEach(b => {
      const bMod = b.dataset.residenciaMod;
      const isMatch = (bMod === targetMod) || (targetMod === 'programas' && bMod === 'inscricoes');
      b.classList.toggle('is-active', isMatch);
    });
  };
}

function renderLayout(sectionEl) {
  renderTabs(sectionEl);
  renderContent(sectionEl);
  renderGallery(sectionEl);
}

function renderTabs(sectionEl) {
  const container = sectionEl.querySelector('#residencia-modality-btns');
  if (!container) return;

  const tabs = [
    { id: 'programas', label: 'PROGRAMAS' },
    { id: 'individual', label: 'INVESTIGAÇÃO INDIVIDUAL' },
    { id: 'coletiva', label: 'RESIDÊNCIA COLETIVA' },
    { id: 'artistas-residentes', label: 'ARTISTAS RESIDENTES' }
  ];

  const html = tabs.map(tab => {
    const isActive = state.activeModality === tab.id;
    return `
      <button type="button" 
              class="filter-pill ${isActive ? 'is-active' : ''}" 
              data-mod="${tab.id}">
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

function renderContent(sectionEl) {
  const container = sectionEl.querySelector('#residencia-main-content-col');
  const layoutContainer = sectionEl.querySelector('#residencia-layout-container');
  const galleryPane = sectionEl.querySelector('#residencia-gallery');
  if (!container) return;

  if (state.activeModality === 'artistas-residentes') {
    container.classList.add('is-artistas-residentes');
    if (layoutContainer) layoutContainer.classList.add('is-artistas-residentes');
    if (galleryPane) galleryPane.style.display = 'none';

    const artists = FonteState.getArtistasResidentes();

    if (artists.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>Nenhum artista residente catalogado no acervo.</p>
        </div>
      `;
      return;
    }

    // Grid com 5 thumbs por linha ocupando toda a largura da tela (proporção 3:4 com anti-CLS)
    const gridHtml = artists.map(artist => `
      <div class="residencia-photo-card" data-id="${artist.id}" role="button" tabindex="0">
        <div class="residencia-photo-wrapper">
          <img src="${artist.imagem}" 
               alt="${artist.nome}" 
               loading="lazy">
        </div>
        <div class="residencia-photo-meta">
          <span class="residencia-photo-name">${artist.nome}</span>
          <span class="residencia-photo-year">${artist.ano}</span>
        </div>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="residencia-artists-grid" id="residencia-artists-grid" style="animation: fadeIn 0.25s ease;">
        ${gridHtml}
      </div>
    `;
  } else {
    container.classList.remove('is-artistas-residentes');
    if (layoutContainer) layoutContainer.classList.remove('is-artistas-residentes');
    if (galleryPane) galleryPane.style.display = 'block';

    const resData = state.data || {};

    if (state.activeModality === 'programas' || state.activeModality === 'inscricoes') {
      const cand = resData.inscricoes || {};
      const subtitulo = resData.introducao || "Pesquisa autodirigida e suporte curatorial em um ambiente intelectualmente estimulante gerido por artistas.";
      const corpoTexto = cand.texto || '';

      container.innerHTML = `
        <div style="animation: fadeIn 0.25s ease;">
          <div class="residencia-intro-lead">
            ${subtitulo}
          </div>

          <div style="display: flex; flex-direction: column; gap: 32px;">
            <div class="residencia-body-text prose">
              ${corpoTexto}
            </div>

            ${Array.isArray(cand.botoes) && cand.botoes.length > 0 ? `
              <div class="residencia-cta-row" style="margin-top: 12px;">
                ${cand.botoes.map(btn => `
                  <a href="${btn.url}" target="_blank" rel="noopener noreferrer" class="header-nav-btn is-active" style="text-decoration:none; padding: 0 20px;">
                    ${btn.rotulo || 'INSCREVA-SE'}
                  </a>
                `).join('')}
              </div>
            ` : ''}
          </div>
        </div>
      `;
    } else {
      // Modalidade 'individual' ou 'coletiva'
      const key = (state.activeModality === 'individual') ? 'investigacao-individual' : 'residencia-coletiva';
      const mod = resData.modalidades ? resData.modalidades[key] : null;

      if (!mod) {
        container.innerHTML = `<div class="empty-state"><p>Modalidade em fase de atualização.</p></div>`;
        return;
      }

      container.innerHTML = `
        <div style="animation: fadeIn 0.25s ease;">
          <h3 class="residencia-content-subtitle">${mod.titulo}</h3>
          ${mod.duracao ? `<div style="font-size: var(--fs-meta); font-weight: 600; text-transform: uppercase; margin-bottom: 16px; opacity: 0.85;">Duração: ${mod.duracao}</div>` : ''}
          <div class="residencia-body-text prose">${mod.descricao || ''}</div>
        </div>
      `;
    }
  }
}

function getUltimasResidenciasIndividuais(count = 6) {
  const resData = state.data || {};
  const fromCards = resData.modalidades?.['investigacao-individual']?.cards_arquivo || [];
  if (fromCards.length >= count) {
    return fromCards.slice(0, count);
  }
  const arquivo = FonteState.getArquivo();
  const indArquivo = arquivo.filter(e => {
    const cat = (e.tipo || e.categoria || '').toLowerCase();
    return cat.includes('individual') && cat.includes('resid');
  }).sort((a, b) => (b.ano || 0) - (a.ano || 0));

  const ids = new Set(fromCards.map(c => c.id));
  const merged = [...fromCards];
  for (const item of indArquivo) {
    if (!ids.has(item.id)) {
      ids.add(item.id);
      merged.push({
        id: item.id,
        titulo: item.titulo || item.title,
        artistas: formatPlainPeople(item.artistas),
        ano: String(item.ano || ''),
        subtitulo_card: `INVESTIGAÇÃO INDIVIDUAL / ${item.ano || ''}`,
        imagem: item.galeria?.[0]?.thumb || item.imagem_capa || ''
      });
      if (merged.length >= count) break;
    }
  }
  return merged.slice(0, count);
}

function getUltimasResidenciasColetivas(count = 6) {
  const resData = state.data || {};
  const fromCards = resData.modalidades?.['residencia-coletiva']?.cards_arquivo || [];
  if (fromCards.length >= count) {
    return fromCards.slice(0, count);
  }
  const arquivo = FonteState.getArquivo();
  const colArquivo = arquivo.filter(e => {
    const cat = (e.tipo || e.categoria || '').toLowerCase();
    return cat.includes('coletiva') && cat.includes('resid');
  }).sort((a, b) => (b.ano || 0) - (a.ano || 0));

  const ids = new Set(fromCards.map(c => c.id));
  const merged = [...fromCards];
  for (const item of colArquivo) {
    if (!ids.has(item.id)) {
      ids.add(item.id);
      merged.push({
        id: item.id,
        titulo: item.titulo || item.title,
        artistas: formatPlainPeople(item.artistas),
        ano: String(item.ano || ''),
        subtitulo_card: `RESIDÊNCIA COLETIVA / ${item.ano || ''}`,
        imagem: item.galeria?.[0]?.thumb || item.imagem_capa || ''
      });
      if (merged.length >= count) break;
    }
  }
  return merged.slice(0, count);
}

function renderGallery(sectionEl) {
  const container = sectionEl.querySelector('#residencia-gallery');
  if (!container || !state.data) return;

  if (state.activeModality === 'artistas-residentes') {
    container.style.display = 'none';
    return;
  }
  container.style.display = 'block';

  let cards = [];
  if (state.activeModality === 'programas' || state.activeModality === 'inscricoes') {
    cards = [
      ...getUltimasResidenciasIndividuais(3),
      ...getUltimasResidenciasColetivas(3)
    ];
  } else if (state.activeModality === 'individual') {
    cards = getUltimasResidenciasIndividuais(6);
  } else if (state.activeModality === 'coletiva') {
    cards = getUltimasResidenciasColetivas(6);
  }

  if (cards.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div class="residencia-gallery-track">
      ${cards.map(res => `
        <div class="residencia-media-card" data-id="${res.id}" role="button" tabindex="0">
          <div class="residencia-card-image-wrap">
            <img src="${res.imagem}" alt="${res.titulo || res.artistas}" loading="lazy">
          </div>
          <div class="residencia-card-meta">
            <div class="residencia-card-name">${res.titulo || res.artistas}</div>
            <div class="residencia-card-sub">${res.subtitulo_card || `${res.ano}`}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function attachEvents(sectionEl) {
  const rail = sectionEl.querySelector('#residencia-modality-btns');
  if (rail) {
    rail.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-pill');
      if (btn && btn.dataset.mod) {
        if (window._selectResidenciaModality) {
          window._selectResidenciaModality(btn.dataset.mod);
        } else {
          closeResidentArtistProfile(sectionEl, false);
          state.activeModality = btn.dataset.mod;
          renderTabs(sectionEl);
          renderContent(sectionEl);
          renderGallery(sectionEl);
        }
      }
    });
  }

  const mainCol = sectionEl.querySelector('#residencia-main-content-col');
  if (mainCol) {
    mainCol.addEventListener('click', (e) => {
      const card = e.target.closest('.residencia-photo-card');
      if (card && card.dataset.id) {
        state.profileTab = 'sobre';
        openResidenceDrawer(card.dataset.id, sectionEl);
      }
    });
  }

  const gallery = sectionEl.querySelector('#residencia-gallery');
  if (gallery) {
    gallery.addEventListener('click', (e) => {
      const card = e.target.closest('.residencia-media-card');
      if (card && card.dataset.id) {
        state.profileTab = 'sobre';
        openResidenceDrawer(card.dataset.id, sectionEl);
      }
    });
  }
}

function openResidenceDrawer(id, sectionEl, doScroll = true) {
  state.activeResidentArtistId = id;
  const layoutContainer = sectionEl.querySelector('#residencia-layout-container');
  const drawerPane = sectionEl.querySelector('#residencia-drawer-pane');
  if (!drawerPane) return;

  // Encontra item alvo: pode ser evento, pessoa ou card sintético
  let targetItem = null;
  let targetType = 'evento';

  if (state.inDrawerNav) {
    targetItem = state.inDrawerNav.item;
    targetType = state.inDrawerNav.type;
  } else {
    // 1. Tenta evento no FonteState
    const ev = FonteState.getEvento(id);
    if (ev) {
      targetItem = ev;
      targetType = 'evento';
    } else {
      // 2. Tenta pessoa no FonteState
      const p = FonteState.getPessoa(id);
      if (p) {
        targetItem = p;
        targetType = 'pessoa';
      } else {
        // 3. Tenta artista residente
        const artists = FonteState.getArtistasResidentes();
        const art = artists.find(a => a.id === id || a.slug === id || a.nome.toLowerCase() === id.toLowerCase());
        if (art) {
          targetItem = art;
          targetType = 'pessoa';
        } else {
          // 4. Busca nos cards de modalidades
          const allCards = [
            ...(state.data?.modalidades?.['investigacao-individual']?.cards_arquivo || []),
            ...(state.data?.modalidades?.['residencia-coletiva']?.cards_arquivo || [])
          ];
          const card = allCards.find(c => c.id === id);
          if (card) {
            targetItem = {
              id: card.id,
              titulo: card.titulo || card.artistas,
              title: card.titulo || card.artistas,
              tipo: card.subtitulo_card?.split('/')?.[0]?.trim() || 'Residência',
              ano: card.ano,
              resumo: `<p>${card.titulo || card.artistas} — Residência FONTE (${card.ano}).</p>`,
              artistas: card.artistas ? [{ nome: card.artistas, slug: card.id, has_perfil: false }] : [],
              galeria: card.imagem ? [{ thumb: card.imagem, zoom: card.imagem, ratio: 1.498, legenda: card.titulo || card.artistas }] : []
            };
            targetType = 'evento';
          }
        }
      }
    }
  }

  if (!targetItem) return;

  renderTabs(sectionEl);

  let drawerContentHtml = '';
  if (targetType === 'evento') {
    drawerContentHtml = renderEventoDrawerHtml({
      evento: targetItem,
      activeTab: (state.inDrawerNav?.tab) || state.profileTab || 'sobre'
    });
  } else {
    drawerContentHtml = renderPessoaDrawerHtml({
      pessoa: targetItem,
      activeTab: (state.inDrawerNav?.tab) || state.profileTab || 'sobre',
      isResidencia: true
    });
  }

  drawerPane.innerHTML = drawerContentHtml;

  if (layoutContainer) {
    layoutContainer.classList.add('is-drawer-open');
    layoutContainer.style.setProperty('display', 'none', 'important');
  }
  drawerPane.style.display = 'block';
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
      openResidenceDrawer(id, sectionEl, false);
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
        openResidenceDrawer(id, sectionEl, false);
        return;
      }
      if (state.inDrawerNav) {
        state.inDrawerNav = null;
        openResidenceDrawer(id, sectionEl, false);
        return;
      }
      closeResidentArtistProfile(sectionEl, false);
    });
  }

  // Clique em evento relacional
  drawerPane.querySelectorAll('.person-cross-link[data-evento-id]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const evId = link.dataset.eventoId;
      const ev = FonteState.getEvento(evId);
      if (ev) {
        if (!state.inDrawerStack) state.inDrawerStack = [];
        state.inDrawerStack.push(state.inDrawerNav || {
          type: targetType,
          item: targetItem,
          tab: state.profileTab
        });
        state.inDrawerNav = {
          type: 'evento',
          item: ev,
          tab: 'sobre'
        };
        openResidenceDrawer(id, sectionEl, false);
      }
    });
  });

  // Clique em pessoa relacional
  drawerPane.querySelectorAll('.person-cross-link[data-pessoa-slug]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const slug = link.dataset.pessoaSlug;
      const pessoa = FonteState.getPessoa(slug);
      if (pessoa) {
        if (!state.inDrawerStack) state.inDrawerStack = [];
        state.inDrawerStack.push(state.inDrawerNav || {
          type: targetType,
          item: targetItem,
          tab: state.profileTab
        });
        state.inDrawerNav = {
          type: 'pessoa',
          item: pessoa,
          tab: 'sobre'
        };
        openResidenceDrawer(id, sectionEl, false);
      }
    });
  });

  // Clique em imagem da galeria lateral -> Abre Galeria Zoom
  drawerPane.querySelectorAll('.drawer-gallery-item').forEach(itemEl => {
    itemEl.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(itemEl.dataset.idx || '0', 10);
      const activeItem = state.inDrawerNav?.item || targetItem;
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

function openResidentArtistProfile(id, sectionEl, doScroll = true) {
  openResidenceDrawer(id, sectionEl, doScroll);
}

function closeResidentArtistProfile(sectionEl, doScroll = false) {
  closeZoomGallery();
  state.activeResidentArtistId = null;
  state.inDrawerNav = null;
  state.inDrawerStack = [];
  const layoutContainer = sectionEl.querySelector('#residencia-layout-container');
  const drawerPane = sectionEl.querySelector('#residencia-drawer-pane');

  if (drawerPane) {
    drawerPane.style.display = 'none';
    drawerPane.classList.remove('is-open');
    drawerPane.innerHTML = '';
  }

  if (layoutContainer) {
    layoutContainer.classList.remove('is-drawer-open');
    layoutContainer.style.removeProperty('display');
  }

  renderTabs(sectionEl);

  if (doScroll) {
    requestAnimationFrame(() => {
      scrollToDrawerTop(sectionEl);
    });
  }
}
