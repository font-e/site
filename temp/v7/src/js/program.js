/**
 * Módulo de Programação - Novo Visual de Gaveta Universal com Navegação e Breadcrumbs
 * Residência Artística FONTE
 * 
 * Regras estritas atualizadas:
 * 1. Na galeria zoom, as imagens NÃO têm borda, são maiores e seu topo toca na borda inferior do breadcrumb.
 * 2. Legenda sempre alinhada à esquerda da imagem; espaçamento exato entre uma imagem e outra de 24px.
 * 3. Saída da galeria zoom: ao clicar sobre uma das imagens, em algum breadcrumb anterior ou no X acima. Na galeria zoom NÃO há botão < de voltar, apenas o X, que fecha apenas a galeria retornando ao evento.
 * 4. Não há scrollbar na galeria lateral da gaveta (apenas na área de texto do evento).
 * 5. Mouseover em breadcrumb > ... > revela seu conteúdo, mouseout esconde novamente.
 * 6. Abertura da gaveta: animação suave e rápida onde uma cortina azul (#ccfffe) desce do topo do evento fechado ocupando toda a altura da gaveta enquanto posiciona no scroll; em seguida, temos um fade de opacidade revelando o conteúdo atrás desse azul.
 * 7. Eliminação universal dos botões 'artistas' e 'curadoria' das abas superiores da gaveta.
 */

// Dataset consolidado em memória
let programacaoEvents = [];
let allConsolidatedEvents = [];
let allConsolidatedPersons = [];
let currentProgramFilter = 'TODA';

// Estado da gaveta atualmente aberta
let activeDrawerState = null;
let activeDrawerTimeline = null;

export function updateHeaderHeight() {
  const header = document.getElementById('logo-controller');
  if (header) {
    const height = header.offsetHeight;
    document.documentElement.style.setProperty('--header-height', `${height}px`);
  }
}

export function initMenuToggle() {
  if (typeof window._initMenuToggle === 'function') {
    window._initMenuToggle();
  }
}

export async function loadProgram() {
  updateHeaderHeight();
  window.addEventListener('resize', updateHeaderHeight, { passive: true });
  initMenuToggle();

  // Fecha popovers ao clicar fora
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.artist-name-wrapper') && !e.target.closest('.artist-popover')) {
      closeAllPopovers();
    }
  });

  try {
    const fetchJsonResilient = async (urls) => {
      for (const url of urls) {
        try {
          const res = await fetch(url);
          if (res.ok) return await res.json();
        } catch (_) {}
      }
      return null;
    };

    const [progData, eventosData, pessoasData] = await Promise.all([
      fetchJsonResilient(['./programacao.json', '/programacao.json', './public/programacao.json', '/public/programacao.json']),
      fetchJsonResilient(['./EVENTOS_CONSOLIDADO.json', '/EVENTOS_CONSOLIDADO.json', './public/EVENTOS_CONSOLIDADO.json']),
      fetchJsonResilient(['./PESSOAS_CONSOLIDADO.json', '/PESSOAS_CONSOLIDADO.json', './public/PESSOAS_CONSOLIDADO.json'])
    ]);

    if (progData) {
      programacaoEvents = progData;
    }
    if (eventosData) {
      allConsolidatedEvents = normalizeArchiveData(eventosData);
    }
    if (pessoasData) {
      allConsolidatedPersons = buildConsolidatedPersonsDataset(pessoasData, allConsolidatedEvents);
    }

    renderProgramFacets();
    renderProgramList(programacaoEvents);
  } catch (err) {
    console.error('Erro ao inicializar program.js:', err);
    renderEmptyState();
  }
}

function renderEmptyState() {
  const container = document.getElementById('programacao-grid-container');
  if (!container) return;
  container.innerHTML = `
    <div class="empty-state" style="padding: 48px 20px; font-size: var(--fs-meta); text-transform: uppercase; letter-spacing: 0.05em; background-color: var(--bg-white);">
      Nenhum evento programado no momento.
    </div>
  `;
}

/**
 * Renderiza a barra de facetas da programação
 */
function renderProgramFacets() {
  const container = document.getElementById('programacao-facets-container');
  if (!container) return;

  container.innerHTML = `
    <div class="archive-facet-bar programacao-facet-bar">
      <div class="facet-group">
        <div class="view-selector-group">
          <div class="view-mode-buttons">
            <button type="button" class="filter-pill ${currentProgramFilter === 'TODA' ? 'is-active' : ''}" 
                    onclick="window._progSetFilter('TODA')">Toda</button>
            <button type="button" class="filter-pill ${currentProgramFilter === 'PRESENTE' ? 'is-active' : ''}" 
                    onclick="window._progSetFilter('PRESENTE')">Presente</button>
            <button type="button" class="filter-pill ${currentProgramFilter === 'INSCRIÇÕES ABERTAS' ? 'is-active' : ''}" 
                    onclick="window._progSetFilter('INSCRIÇÕES ABERTAS')">Inscrições Abertas</button>
            <button type="button" class="filter-pill ${currentProgramFilter === 'PRÓXIMA' ? 'is-active' : ''}" 
                    onclick="window._progSetFilter('PRÓXIMA')">Próxima</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

window._progSetFilter = (filter) => {
  currentProgramFilter = filter;
  renderProgramFacets();
  renderProgramList(programacaoEvents);
};

/**
 * Renderiza a lista de eventos no padrão suíço tipográfico
 */
function renderProgramList(data) {
  const container = document.getElementById('programacao-grid-container');
  if (!container) return;
  container.innerHTML = '';

  let filteredGroups = data;

  // Filtro por subseção
  if (currentProgramFilter !== 'TODA') {
    filteredGroups = data.filter(group => {
      const sub = (group.subsection || '').toUpperCase();
      return sub === currentProgramFilter;
    });
  }

  if (filteredGroups.length === 0) {
    renderEmptyState();
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'programacao-container';
  wrapper.id = 'programacao-list-wrapper';

  const eventsList = document.createElement('div');
  eventsList.className = 'events-list';
  eventsList.id = 'events-list';

  let eventCounter = 0;
  filteredGroups.forEach((group, groupIdx) => {
    group.events.forEach((evt, evtIdx) => {
      const eventId = `event-item-${groupIdx}-${evtIdx}`;
      const itemEl = document.createElement('article');
      itemEl.className = 'event-item';
      itemEl.id = eventId;
      itemEl.dataset.eventId = eventId;
      itemEl.dataset.index = eventCounter;

      // Vincula os dados estruturados de EVENTOS_CONSOLIDADO se disponível
      const consolidatedMatch = findConsolidatedEvent(evt.title);
      const mergedEvent = {
        ...evt,
        ...(consolidatedMatch || {}),
        rawTitle: evt.title,
        groupSubsection: group.subsection || ''
      };
      itemEl._eventData = mergedEvent;

      const isInscricoesGroup = Boolean(group.subsection && group.subsection.toUpperCase().includes('INSCRIÇÕES ABERTAS'));
      const isCatInscricoes = Boolean(evt.category && evt.category.toUpperCase().includes('INSCRIÇÕES ABERTAS'));

      itemEl.innerHTML = `
        <div class="event-header" id="header-${eventId}" role="button" tabindex="0" aria-expanded="false">
          <div class="event-meta-row">
            <div class="event-meta-tags">
              <div class="event-tags-list">
                ${isInscricoesGroup ? `<span class="event-tag-badge event-tag-inscricoes">inscrições abertas</span>` : ''}
                ${evt.category ? `<span class="event-tag-badge ${isCatInscricoes ? 'event-tag-inscricoes' : ''}">${evt.category}</span>` : ''}
              </div>
            </div>
            <div class="event-meta-horario">
              ${evt.horario ? `<span class="event-horario">${evt.horario}</span>` : ''}
            </div>
            <div class="event-meta-date">
              <span class="event-date">${evt.date || ''}</span>
            </div>
          </div>
          <h2 class="event-title" id="title-${eventId}">
            <span class="event-title-text">${evt.title}</span>${evt.subtitle ? ` <span class="event-subtitle-text">${evt.subtitle}</span>` : ''}
          </h2>
          <div class="event-names" id="names-${eventId}">${evt.desc || ''}</div>
        </div>
      `;

      itemEl.addEventListener('click', (e) => {
        // Se o clique veio de dentro da gaveta universal ou o elemento alvo foi destacado durante re-renderização, ignora
        const path = e.composedPath ? e.composedPath() : [];
        const clickedInsideDrawer = path.some(el => el && el.classList && el.classList.contains('event-universal-drawer')) ||
          (e.target && e.target.closest && e.target.closest('.event-universal-drawer')) ||
          (e.target && !e.target.isConnected);

        if (clickedInsideDrawer || (e.target && e.target.closest && (e.target.closest('a') || e.target.closest('button')))) {
          return;
        }
        // Se o evento já está aberto e o clique foi na linha do evento fora da gaveta, fecha a gaveta
        if (itemEl.classList.contains('is-open')) {
          closeActiveDrawer();
          return;
        }
        openUniversalDrawer(itemEl);
      });

      eventsList.appendChild(itemEl);
      eventCounter++;
    });
  });

  wrapper.appendChild(eventsList);
  container.appendChild(wrapper);
}

/**
 * Abre a gaveta universal no item especificado
 */
function openUniversalDrawer(itemEl) {
  if (window._arqDrawerClose) window._arqDrawerClose(null);
  if (activeDrawerState && activeDrawerState.itemEl === itemEl) return;

  const prevDrawerState = activeDrawerState;
  let prevDrawerEl = null;
  let prevItemEl = null;

  if (prevDrawerState) {
    if (activeDrawerTimeline) {
      activeDrawerTimeline.kill();
      activeDrawerTimeline = null;
    }
    prevItemEl = prevDrawerState.itemEl;
    prevDrawerEl = prevItemEl ? prevItemEl.querySelector('.event-universal-drawer') : null;
    if (prevItemEl) prevItemEl.classList.remove('is-open');
    closeAllPopovers();
  }

  const eventData = itemEl._eventData;
  if (!eventData) return;

  const headerEl = itemEl.querySelector('.event-header');
  const closedHeight = headerEl ? headerEl.offsetHeight : 120;
  itemEl._closedHeight = closedHeight;

  itemEl.classList.add('is-open');

  activeDrawerState = {
    itemEl,
    initialEvent: eventData,
    history: [
      {
        type: 'event',
        title: eventData.rawTitle || eventData.title,
        data: eventData,
        tab: 'sobre',
        selectedTextIndex: null
      }
    ],
    historyIndex: 0
  };

  const drawerEl = document.createElement('div');
  drawerEl.className = 'event-universal-drawer';
  drawerEl.id = `drawer-${itemEl.id}`;

  itemEl.appendChild(drawerEl);

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
        scrollToHeaderBase(itemEl);

        if (typeof ScrollTrigger !== 'undefined') {
          ScrollTrigger.refresh();
        }
      }
    });
    activeDrawerTimeline = tl;

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

    tl.to(drawerEl, {
      height: targetHeight,
      minHeight: targetHeight,
      duration: 0.45,
      ease: 'expo.inOut'
    }, 0);

  } else {
    if (prevDrawerEl && prevDrawerEl.parentNode) prevDrawerEl.remove();
    scrollToHeaderBase(itemEl);
    if (typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.refresh();
    }
  }
}

/**
 * Fecha a gaveta universal ativa com animação de deslizamento
 */
function closeActiveDrawer(immediate = false) {
  if (!activeDrawerState) return;

  if (activeDrawerTimeline) {
    activeDrawerTimeline.kill();
    activeDrawerTimeline = null;
  }

  const { itemEl } = activeDrawerState;
  const drawer = itemEl.querySelector('.event-universal-drawer');

  const cleanup = () => {
    if (drawer && drawer.parentNode) drawer.remove();
    itemEl.classList.remove('is-open');
    activeDrawerState = null;
    activeDrawerTimeline = null;
    closeAllPopovers();
    if (typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.refresh();
    }
  };

  if (immediate || !drawer || typeof gsap === 'undefined') {
    cleanup();
    return;
  }

  gsap.set(drawer, { overflow: 'hidden' });

  const tl = gsap.timeline({
    onComplete: cleanup
  });
  activeDrawerTimeline = tl;

  tl.to(drawer, {
    height: 0,
    minHeight: 0,
    maxHeight: 0,
    duration: 0.3,
    ease: 'power2.inOut'
  }, 0);
}

function scrollToHeaderBase(targetEl) {
  const performScroll = () => {
    const siteHeader = document.getElementById('logo-controller');
    const headerHeight = siteHeader ? siteHeader.getBoundingClientRect().height : 56;
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

function getProgramEventsList() {
  return Array.from(document.querySelectorAll('.events-list .event-item'));
}

function renderDrawerControlsHtml() {
  if (!activeDrawerState) return '';

  const { itemEl, history, historyIndex = 0 } = activeDrawerState;
  const isAtRoot = historyIndex === 0;

  let prevDisabled = false;
  let nextDisabled = false;
  let nextIsHoverBg = false;

  if (isAtRoot) {
    const items = getProgramEventsList();
    const currentIdx = items.indexOf(itemEl);
    prevDisabled = currentIdx <= 0;
    nextDisabled = currentIdx >= items.length - 1;
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
              onclick="window._drawerNavPrev(event)" 
              aria-label="Voltar" 
              title="Voltar" 
              ${prevDisabled ? 'disabled' : ''}>‹</button>
      <button type="button" 
              class="drawer-btn-icon drawer-btn-close" 
              onclick="window._drawerClose(event)" 
              aria-label="Fechar gaveta" 
              title="Fechar">✕</button>
      <button type="button" 
              class="drawer-btn-icon drawer-btn-next ${nextIsHoverBg ? 'is-hover-bg' : ''} ${nextDisabled && !nextIsHoverBg ? 'is-disabled' : ''}" 
              onclick="window._drawerNavNext(event)" 
              aria-label="Avançar" 
              title="Avançar" 
              ${nextDisabled && !nextIsHoverBg ? 'disabled' : ''}>›</button>
    </div>
  `;
}

function renderCurrentDrawerView() {
  if (!activeDrawerState) return;

  const { itemEl, history, historyIndex = 0 } = activeDrawerState;
  const drawer = itemEl.querySelector('.event-universal-drawer');
  if (!drawer) return;

  const currentStep = history[historyIndex] || history[history.length - 1];
  const isZoom = currentStep.type === 'zoom_gallery';

  const breadcrumbHtml = renderBreadcrumbsHtml(history, historyIndex);
  const controlsHtml = renderDrawerControlsHtml();

  if (isZoom) {
    drawer.innerHTML = `
      <div class="drawer-zoom-wrapper">
        <div class="drawer-top-line" onclick="window._drawerTopLineClick(event)">
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
  } else {
    let parts = { contentHtml: '', mediaHtml: '' };
    if (currentStep.type === 'event') {
      parts = renderEventBodyHtml(currentStep.data, currentStep.tab || 'sobre', currentStep.selectedTextIndex);
    } else if (currentStep.type === 'person') {
      parts = renderPersonBodyHtml(currentStep.data);
    }

    drawer.innerHTML = `
      <div class="drawer-top-line" onclick="window._drawerTopLineClick(event)">
        <div class="drawer-breadcrumb-col" onclick="event.stopPropagation()">
          <div class="breadcrumb-trail">${breadcrumbHtml}</div>
        </div>
        <div class="drawer-control-col">
          ${controlsHtml}
        </div>
      </div>
      <div class="drawer-left-column">
        <div class="drawer-content-pane">
          ${parts.contentHtml}
        </div>
      </div>
      <div class="drawer-media-pane">
        ${parts.mediaHtml}
      </div>
    `;
  }

  if (isZoom) {
    applyZoomSlideOffset(drawer, currentStep.data.initialIndex || 0);
    syncZoomCaptionsWidth(drawer);
  }

  attachViewInteractions(drawer);
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

        if (img.complete) {
          updateWidth();
        } else {
          img.addEventListener('load', updateWidth, { once: true });
        }
      }
    });
  });
}

function applyZoomSlideOffset(drawer, targetIndex) {
  requestAnimationFrame(() => {
    const track = drawer.querySelector('.drawer-zoom-horizontal-track');
    const slide = drawer.querySelector(`#zoom-slide-${targetIndex}`);
    if (track && slide) {
      track.scrollLeft = slide.offsetLeft - 24;
    }
  });
}

window._toggleBreadcrumbDropdown = function(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  const btn = e.currentTarget;
  const wrapper = btn.closest('.breadcrumb-ellipsis-dropdown-wrapper');
  if (!wrapper) return;
  const menu = wrapper.querySelector('.breadcrumb-dropdown-menu');
  if (!menu) return;

  const isOpen = menu.classList.contains('is-open');
  window._closeBreadcrumbDropdowns();

  if (!isOpen) {
    menu.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
  }
};

window._closeBreadcrumbDropdowns = function() {
  document.querySelectorAll('.breadcrumb-dropdown-menu.is-open').forEach(menu => {
    menu.classList.remove('is-open');
    const btn = menu.previousElementSibling;
    if (btn) btn.setAttribute('aria-expanded', 'false');
  });
};

if (!window._breadcrumbListenerAdded) {
  document.addEventListener('click', () => {
    window._closeBreadcrumbDropdowns();
  });
  window._breadcrumbListenerAdded = true;
}

function renderBreadcrumbsHtml(history, activeIndex = 0) {
  const activeHistory = history.slice(0, activeIndex + 1);

  const steps = [
    { label: 'PROGRAMAÇÃO', historyIndex: -1 }
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

      const clickAttr = isCurrent ? '' : `onclick="window._drawerNavStep(event, ${s.historyIndex})"`;
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
                 onclick="window._drawerNavStep(event, ${s.historyIndex}); window._closeBreadcrumbDropdowns();">
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

    const clickAttr = isCurrent ? '' : `onclick="window._drawerNavStep(event, ${s.historyIndex})"`;
    const itemHtml = `<span class="${classes.join(' ')}" ${clickAttr}>${escapeHtml(s.label)}</span>`;
    return `<span class="breadcrumb-sep">&gt;</span>${itemHtml}`;
  }).join(' ');

  return `${dropdownMenuHtml}${lastTwoHtml}`;
}

/**
 * Extrai informações padronizadas de reprodução externa e embed de vídeos
 */
function getEmbedInfo(url) {
  if (!url) return null;
  const cleanUrl = url.trim();

  // YouTube (Links normais, lives, shorts e encurtados youtu.be)
  const ytMatch = cleanUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    const id = ytMatch[1];
    return {
      type: 'youtube',
      id,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`,
      watchUrl: `https://www.youtube.com/watch?v=${id}`,
      thumbUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg`
    };
  }

  // Vimeo
  const vimeoMatch = cleanUrl.match(/(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+))/i);
  if (vimeoMatch && vimeoMatch[1]) {
    const id = vimeoMatch[1];
    return {
      type: 'vimeo',
      id,
      embedUrl: `https://player.vimeo.com/video/${id}?dnt=1`,
      watchUrl: `https://vimeo.com/${id}`,
      thumbUrl: `https://vumbnail.com/${id}.jpg`
    };
  }

  return {
    type: 'external',
    id: '',
    embedUrl: cleanUrl,
    watchUrl: cleanUrl,
    thumbUrl: ''
  };
}

function getEventVideosParsed(evt) {
  let rawVideos = evt.videos;
  if (!rawVideos || !rawVideos.length) {
    const consolidated = findConsolidatedEvent(evt.rawTitle || evt.title || evt.id);
    if (consolidated && consolidated.videos && consolidated.videos.length) {
      rawVideos = consolidated.videos;
    }
  }

  if (Array.isArray(rawVideos)) {
    return rawVideos.map(v => {
      if (typeof v === 'string') {
        return { titulo: '', url: v, legenda: '' };
      }
      return {
        titulo: v.titulo || v.title || '',
        url: v.url || v.link || v.src || '',
        legenda: v.legenda || v.sinopse || v.ficha_tecnica || v.descricao || v.description || '',
        thumb: v.thumb_url || ''
      };
    }).filter(v => v.url || v.titulo);
  }

  return [];
}

/**
 * Renderiza a estrutura da tela de Evento
 */
function renderEventBodyHtml(evt, activeTab = 'sobre', selectedTextIndex = null) {
  const videosList = getEventVideosParsed(evt);
  const hasVideos = videosList.length > 0;
  const premiacoes = getEventPremiacoes(evt);

  const tabs = [
    { key: 'sobre', label: 'Sobre' },
    { key: 'textos', label: 'Textos' },
    ...(hasVideos ? [{ key: 'videos', label: `Vídeos (${videosList.length})` }] : []),
    { key: 'mapa_exposicao', label: 'Mapa de exposição' },
    { key: 'eventos_relacionados', label: 'Eventos relacionados' }
  ];

  let currentTab = activeTab;
  if (currentTab === 'artistas' || currentTab === 'curadoria') {
    currentTab = 'sobre';
  }
  if (currentTab === 'texto_critico') {
    currentTab = 'textos';
  }
  if (currentTab === 'videos' && !hasVideos) {
    currentTab = 'sobre';
  }

  const pillsHtml = tabs.map(t => `
    <button type="button" class="drawer-tab-pill ${t.key === currentTab ? 'is-active' : ''}" data-tab="${t.key}" onclick="window._drawerSwitchTab('${t.key}')">
      ${t.label}
    </button>
  `).join('');

  let tabContentHtml = '';

  if (currentTab === 'sobre') {
    const artistas = getEventArtistas(evt);
    const curadoria = getEventCuradoria(evt);
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
          <div class="sobre-block-content">${resumo ? formatParagraphs(resumo) : '<p>Sem sinopse disponível.</p>'}</div>
        </div>
      </div>
    `;
  } else if (currentTab === 'textos') {
    const parsedTexts = getEventTextosParsed(evt);

    if (parsedTexts.length === 0) {
      tabContentHtml = `
        <div class="section-sobre-wrap">
          <div class="sobre-block">
            <div class="sobre-block-content"><p>Sem ensaio crítico disponível.</p></div>
          </div>
        </div>
      `;
    } else if (parsedTexts.length > 1 && selectedTextIndex === null) {
      tabContentHtml = `
        <div class="textos-view-container">
          <div class="texto-list-header">Textos disponíveis (${parsedTexts.length})</div>
          ${parsedTexts.map((t, idx) => `
            <div class="texto-preview-card" onclick="window._drawerSelectText(${idx})">
              <div class="texto-meta-header">
                <span class="texto-header-categoria">${escapeHtml(t.categoria || 'Texto crítico')}</span>
                <h4 class="texto-header-titulo">${escapeHtml(t.titulo || 'Sem título')}</h4>
                ${t.autoria ? `<span class="texto-header-autoria">${escapeHtml(t.autoria)}</span>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      const activeTextIdx = selectedTextIndex !== null ? selectedTextIndex : 0;
      const textItem = parsedTexts[activeTextIdx] || parsedTexts[0];

      const backBtnHtml = parsedTexts.length > 1 ? `
        <button type="button" class="texto-back-to-list-btn" onclick="window._drawerSelectText(null)">
          <span>‹</span> <span>Todos os textos (${parsedTexts.length})</span>
        </button>
      ` : '';

      tabContentHtml = `
        <div class="textos-view-container">
          ${backBtnHtml}
          <article class="texto-article-item">
            <div class="texto-meta-header">
              <span class="texto-header-categoria">${escapeHtml(textItem.categoria || 'Texto crítico')}</span>
              <h4 class="texto-header-titulo">${escapeHtml(textItem.titulo || 'Sem título')}</h4>
              ${textItem.autoria ? `<span class="texto-header-autoria">${escapeHtml(textItem.autoria)}</span>` : ''}
            </div>
            <div class="texto-empty-divider"></div>
            <div class="texto-body-content">
              ${formatParagraphs(textItem.texto)}
            </div>
          </article>
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
                  const media = getEmbedInfo(v.url);
                  return `
                    <div class="video-embed-item">
                      ${v.titulo ? `<h4 class="video-item-title">${escapeHtml(v.titulo)}</h4>` : ''}
                      ${media && media.embedUrl ? `
                        <div class="video-iframe-responsive">
                          <iframe src="${media.embedUrl}" 
                                  title="${escapeAttr(v.titulo || `Vídeo ${idx + 1}`)}" 
                                  frameborder="0" 
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                  referrerpolicy="strict-origin-when-cross-origin" 
                                  allowfullscreen 
                                  loading="lazy"></iframe>
                        </div>
                      ` : `
                        <div class="video-link-fallback">
                          <a href="${escapeAttr(v.url)}" target="_blank" rel="noopener noreferrer" class="video-external-link">Assistir vídeo ↗</a>
                        </div>
                      `}
                      <div class="video-item-footer">
                        ${v.legenda ? `<p class="video-item-caption">${escapeHtml(v.legenda)}</p>` : ''}
                        ${media && media.watchUrl ? `
                          <a href="${escapeAttr(media.watchUrl)}" target="_blank" rel="noopener noreferrer" class="video-direct-link" title="Abrir em nova aba caso o player externo tenha restrições de reprodução">
                            Assistir diretamente no ${media.type === 'vimeo' ? 'Vimeo' : 'YouTube'} ↗
                          </a>
                        ` : ''}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>
        </div>
      `;
    }
  } else {
    tabContentHtml = `
      <div class="section-sobre-wrap">
        <div class="sobre-block">
          <div class="sobre-block-content"><p>Conteúdo em fase de digitalização no acervo.</p></div>
        </div>
      </div>
    `;
  }

  const images = getEventImagesList(evt);
  const eventTitleEsc = escapeAttr(evt.rawTitle || evt.title || '');

  const galleryHtml = `
    <div class="drawer-gallery-track">
      ${images.map((img, idx) => `
        <div class="drawer-gallery-item" onclick="window._drawerOpenZoomGallery(event, '${eventTitleEsc}', ${idx})">
          <img src="${escapeAttr(img.url)}" alt="${escapeAttr(img.legenda || evt.title)}" loading="lazy">
        </div>
      `).join('')}
    </div>
  `;

  return {
    contentHtml: `
      <div class="drawer-subsections-toolbar">
        ${pillsHtml}
      </div>
      <div class="drawer-dynamic-view">
        ${tabContentHtml}
      </div>
    `,
    mediaHtml: galleryHtml
  };
}

function renderZoomGalleryBodyHtml(zoomData) {
  const { images, title } = zoomData;

  const slidesHtml = images.map((img, idx) => `
    <div class="drawer-zoom-slide-item" id="zoom-slide-${idx}">
      <div class="drawer-zoom-img-container" onclick="window._drawerCloseZoomOnly(event)" title="Clique para fechar o zoom">
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
        <li class="person-timeline-item" onclick="window._drawerOpenEventFromTimeline('${escapeAttr(p.title)}')">
          <span class="timeline-year">${p.ano || '—'}</span>
          <div class="timeline-info">
            <strong class="timeline-title">${escapeHtml(p.title)}</strong>
            <span class="timeline-role">${escapeHtml(p.roleLabel)} • ${escapeHtml(p.categoria)}</span>
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
          <div class="drawer-gallery-item" onclick="window._drawerOpenPersonZoomGallery(event, '${escapeAttr(person.title)}', ${idx})" role="button" tabindex="0" title="Ver foto em tela cheia">
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
          <button type="button" class="popover-close-btn" onclick="window._closePopovers(event)" aria-label="Fechar">✕</button>
        </div>
        <div class="popover-count-meta">${totalAcoes} ${totalAcoes === 1 ? 'ação' : 'ações'} no acervo FONTE</div>
        <div class="popover-actions">
          <button type="button" class="popover-action" onclick="window._drawerGoToPersonProfile('${escapeAttr(person.title)}')">
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

function closeAllPopovers() {
  document.querySelectorAll('.artist-popover.is-open').forEach(p => {
    p.classList.remove('is-open');
    p.classList.remove('popover-down');
    p.style.left = '';
    p.style.right = '';
  });
  document.querySelectorAll('.artist-name-wrapper.is-open').forEach(w => {
    w.classList.remove('is-open');
  });
}

window._closePopovers = function(e) {
  if (e) e.stopPropagation();
  closeAllPopovers();
};

window._drawerClose = function(e) {
  if (e) e.stopPropagation();
  closeActiveDrawer();
};

window._drawerCloseZoomOnly = function(e) {
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

window._drawerTopLineClick = function(e) {
  if (e && e.stopPropagation) e.stopPropagation();
};

window._drawerSwitchTab = function(e, tab) {
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

window._drawerSelectText = function(e, textIndex) {
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

function pushDrawerStep(step) {
  if (!activeDrawerState) return;
  activeDrawerState.history = activeDrawerState.history.slice(0, activeDrawerState.historyIndex + 1);
  activeDrawerState.history.push(step);
  activeDrawerState.historyIndex = activeDrawerState.history.length - 1;
  renderCurrentDrawerView();
}

window._drawerGoToPersonProfile = function(e, personName) {
  if (e && e.stopPropagation) e.stopPropagation();
  if (typeof e === 'string') {
    personName = e;
    e = null;
  }
  closeAllPopovers();
  if (!activeDrawerState) return;

  const person = findPersonByName(personName);
  if (!person) return;

  pushDrawerStep({
    type: 'person',
    title: person.title,
    data: person
  });
};

window._drawerOpenEventFromTimeline = function(e, eventTitle) {
  if (e && e.stopPropagation) e.stopPropagation();
  if (typeof e === 'string') {
    eventTitle = e;
    e = null;
  }
  closeAllPopovers();
  if (!activeDrawerState) return;

  const evt = findConsolidatedEvent(eventTitle) || { title: eventTitle, rawTitle: eventTitle };

  pushDrawerStep({
    type: 'event',
    title: evt.title || eventTitle,
    data: evt,
    tab: 'sobre',
    selectedTextIndex: null
  });
};

window._drawerOpenZoomGallery = function(e, eventTitle, initialIndex = 0) {
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
    evt = findConsolidatedEvent(eventTitle) || { title: eventTitle, rawTitle: eventTitle };
  }

  const images = getEventImagesList(evt);
  if (!images.length) return;

  pushDrawerStep({
    type: 'zoom_gallery',
    title: `${images.length} fotos`,
    data: {
      title: evt.rawTitle || evt.title || eventTitle,
      images,
      initialIndex
    }
  });
};

window._drawerOpenPersonZoomGallery = function(e, personName, initialIndex = 0) {
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

  pushDrawerStep({
    type: 'zoom_gallery',
    title: `${images.length} ${images.length === 1 ? 'foto' : 'fotos'}`,
    data: {
      title: person.title || personName,
      images,
      initialIndex
    }
  });
};

window._drawerNavPrev = function(e) {
  if (e) e.stopPropagation();
  if (!activeDrawerState) return;

  if (activeDrawerState.historyIndex > 0) {
    activeDrawerState.historyIndex--;
    renderCurrentDrawerView();
  } else {
    const items = getProgramEventsList();
    const currentIdx = items.indexOf(activeDrawerState.itemEl);
    if (currentIdx > 0) {
      openUniversalDrawer(items[currentIdx - 1]);
    }
  }
};

window._drawerNavNext = function(e) {
  if (e) e.stopPropagation();
  if (!activeDrawerState) return;

  if (activeDrawerState.historyIndex > 0) {
    if (activeDrawerState.historyIndex < activeDrawerState.history.length - 1) {
      activeDrawerState.historyIndex++;
      renderCurrentDrawerView();
    } else {
      const items = getProgramEventsList();
      const currentIdx = items.indexOf(activeDrawerState.itemEl);
      if (currentIdx >= 0 && currentIdx < items.length - 1) {
        openUniversalDrawer(items[currentIdx + 1]);
      }
    }
  } else {
    const items = getProgramEventsList();
    const currentIdx = items.indexOf(activeDrawerState.itemEl);
    if (currentIdx >= 0 && currentIdx < items.length - 1) {
      openUniversalDrawer(items[currentIdx + 1]);
    }
  }
};

window._drawerNavBack = function(e) {
  if (e) e.stopPropagation();
  window._drawerNavPrev(e);
};

window._drawerNavStep = function(e, stepIndex) {
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

window._togglePopover = function(e, btn) {
  if (e) e.stopPropagation();
};

function findConsolidatedEvent(title) {
  if (!title || !allConsolidatedEvents.length) return null;
  const q = normalizeText(title);
  return allConsolidatedEvents.find(e => normalizeText(e.title) === q || q.includes(normalizeText(e.title)) || normalizeText(e.title).includes(q));
}

function findPersonByName(name) {
  if (!name || !allConsolidatedPersons.length) return null;
  const q = normalizeText(name);
  const qSlug = q.replace(/\s+/g, '-');
  return allConsolidatedPersons.find(p => 
    normalizeText(p.title) === q || 
    p.slug === q || 
    p.slug === qSlug ||
    (p._slug && (p._slug === q || p._slug === qSlug)) ||
    (p.id && (normalizeText(p.id) === q || p.id === qSlug))
  );
}

function getEventArtistas(evt) {
  const titleNorm = normalizeText(evt.rawTitle || evt.title || '');
  if (titleNorm.includes('montagem')) {
    return ['Marcelo Amorim'];
  }
  if (titleNorm.includes('poema a dois')) {
    return ['Marcelo Amorim', 'Nino Cais'];
  }
  if (Array.isArray(evt.artistas) && evt.artistas.length) {
    return evt.artistas;
  }
  if (typeof evt.artistas === 'string' && evt.artistas.trim()) {
    return evt.artistas.split(/,\s*/);
  }
  if (evt.desc && !evt.desc.toLowerCase().startsWith('com lola')) {
    return evt.desc.split(/,\s*|\s+e\s+/).map(s => s.trim()).filter(Boolean);
  }
  return [];
}

function getEventCuradoria(evt) {
  const titleNorm = normalizeText(evt.rawTitle || evt.title || '');
  if (titleNorm.includes('montagem')) {
    return [];
  }
  if (titleNorm.includes('poema a dois')) {
    return ['Ana Roman'];
  }
  if (Array.isArray(evt.curadoria) && evt.curadoria.length) {
    return evt.curadoria;
  }
  if (typeof evt.curadoria === 'string' && evt.curadoria.trim()) {
    return evt.curadoria.split(/,\s*/);
  }
  return [];
}

function getEventPremiacoes(evt) {
  let raw = evt.premiacoes || evt.premios;
  if (!raw || !raw.length) {
    const consolidated = findConsolidatedEvent(evt.rawTitle || evt.title || evt.id);
    if (consolidated && (consolidated.premiacoes || consolidated.premios)) {
      raw = consolidated.premiacoes || consolidated.premios;
    }
  }
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

function getEventTextosParsed(evt) {
  let rawTextos = evt.textos;
  if (!rawTextos) {
    const consolidated = findConsolidatedEvent(evt.rawTitle || evt.title);
    if (consolidated && consolidated.textos) {
      rawTextos = consolidated.textos;
    }
  }

  if (Array.isArray(rawTextos)) {
    return rawTextos
      .filter(t => t && (typeof t === 'string' || t.exibir_no_site !== false && t.exibir_no_site !== 'false'))
      .map(t => ({
        categoria: t.categoria || 'Texto crítico',
        titulo: t.titulo || t.title || 'Sobre tantos corpos',
        autoria: t.autoria || t.autor || 'Ana Roman',
        texto: t.texto || t.content || ''
      }));
  }

  if (typeof rawTextos === 'string' && rawTextos.trim().length > 0) {
    const parsed = parseKirbyYamlStructure(rawTextos);
    return parsed.filter(t => t && t.exibir_no_site !== false && t.exibir_no_site !== 'false');
  }

  const titleNorm = normalizeText(evt.rawTitle || evt.title || '');
  if (titleNorm.includes('montagem')) {
    return [{
      categoria: 'Texto crítico',
      titulo: 'Montagem',
      autoria: 'Chico Soll',
      texto: '<p>A exposição individual <em>Montagem</em>, de Marcelo Amorim, reúne trabalhos baseados em imagens vernaculares para questionar o olhar voyeurístico e as construções da memória coletiva.</p>'
    }];
  }

  if (titleNorm.includes('poema a dois') && evt.content) {
    return [{
      categoria: 'Texto crítico',
      titulo: 'Sobre tantos corpos',
      autoria: 'Ana Roman',
      texto: evt.content
    }];
  }

  return [];
}

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

    const exibirStr = (getField('exibir_no_site') || '').toLowerCase();
    const exibirNoSite = exibirStr !== 'false' && exibirStr !== '0' && exibirStr !== 'no';

    return {
      categoria: getField('categoria') || 'Texto crítico',
      autoria: getField('autoria') || '',
      titulo: getField('titulo') || '',
      texto: getField('texto') || '',
      exibir_no_site: exibirNoSite
    };
  }).filter(t => (t.texto || t.titulo) && t.exibir_no_site !== false);
}

function getEventImagesList(evt) {
  let images = [];

  if (Array.isArray(evt.expanded_images) && evt.expanded_images.length) {
    images = evt.expanded_images.map(img => ({
      url: img.url,
      legenda: img.legenda || evt.title,
      autoria: img.autoria || ''
    }));
  } else if (Array.isArray(evt.images) && evt.images.length) {
    images = evt.images.map((url, idx) => ({
      url,
      legenda: evt.title,
      autoria: ''
    }));
  } else {
    const consolidated = findConsolidatedEvent(evt.rawTitle || evt.title);
    if (consolidated) {
      if (Array.isArray(consolidated.expanded_images) && consolidated.expanded_images.length) {
        images = consolidated.expanded_images.map(img => ({
          url: img.url,
          legenda: img.legenda || evt.title,
          autoria: img.autoria || ''
        }));
      } else if (Array.isArray(consolidated.images) && consolidated.images.length) {
        images = consolidated.images.map((url, idx) => ({
          url,
          legenda: evt.title,
          autoria: ''
        }));
      }
    }
  }

  if (!images.length) {
    const singleUrl = evt.url || 'https://font-e.github.io/site/temp/expo-1.jpg';
    images = [{
      url: singleUrl,
      legenda: evt.rawTitle || evt.title || '',
      autoria: ''
    }];
  }

  return images;
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

  if (person.foto_perfil) addImage(person.foto_perfil, person.title);
  if (person.foto_principal) addImage(person.foto_principal, person.title);

  if (Array.isArray(person.galeria)) {
    person.galeria.forEach(item => {
      if (!item) return;
      if (typeof item === 'string') addImage(item, person.title);
      else addImage(item.url || item.thumb, item.legenda || person.title);
    });
  }

  if (Array.isArray(person.fotos)) {
    person.fotos.forEach(item => {
      if (!item) return;
      if (typeof item === 'string') addImage(item, person.title);
      else addImage(item.url || item.thumb, item.legenda || person.title);
    });
  }

  return list;
}

function getPersonParticipations(personName) {
  if (!personName) return [];
  const q = normalizeText(personName);
  const qSlug = q.replace(/\s+/g, '-');

  if (Array.isArray(allConsolidatedPersons)) {
    const matched = allConsolidatedPersons.find(p => 
      normalizeText(p.title) === q || p.slug === q || p.slug === qSlug
    );
    if (matched && Array.isArray(matched.participacoes) && matched.participacoes.length > 0) {
      return matched.participacoes;
    }
  }

  if (!Array.isArray(allConsolidatedEvents)) return [];
  const participacoes = [];
  const seenIds = new Set();

  allConsolidatedEvents.forEach(evt => {
    let role = null;
    const artistsList = Array.isArray(evt.artistas) ? evt.artistas : [];
    const curadoriaList = Array.isArray(evt.curadoria) ? evt.curadoria : [];

    if (artistsList.some(a => normalizeText(a) === q || normalizeText(a).replace(/\s+/g, '-') === qSlug)) {
      role = 'Artista';
    } else if (curadoriaList.some(c => normalizeText(c) === q || normalizeText(c).replace(/\s+/g, '-') === qSlug)) {
      role = 'Curadoria';
    }

    if (role) {
      const evtId = evt.id || evt.slug || evt.title;
      if (!seenIds.has(evtId)) {
        seenIds.add(evtId);
        participacoes.push({
          id: evtId,
          title: evt.title,
          ano: evt.ano || '',
          categoria: evt.categoria || 'Evento',
          roleLabel: role
        });
      }
    }
  });

  participacoes.sort((a, b) => (parseInt(b.ano, 10) || 0) - (parseInt(a.ano, 10) || 0));
  return participacoes;
}

function normalizeArchiveData(data) {
  if (!Array.isArray(data)) return [];

  return data.map(item => {
    const rawYear = item.inicio ? parseInt(item.inicio.substring(0, 4), 10) : null;
    
    let artistasArr = [];
    if (Array.isArray(item.artistas_lista) && item.artistas_lista.length > 0) {
      artistasArr = item.artistas_lista;
    } else if (Array.isArray(item.artistas)) {
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
    }

    let textosArr = parseTextosField(item.textos, item.title);
    const videosArr = Array.isArray(item.videos) ? item.videos : [];
    const premiacoesArr = Array.isArray(item.premiacoes) ? item.premiacoes : [];

    return {
      ...item,
      id: item.id || item._slug || item.title,
      slug: item._slug || item.id || normalizeText(item.title).replace(/\s+/g, '-'),
      ano: rawYear,
      artistas: artistasArr,
      curadoria: curadoriaArr,
      fotos: fotosArr,
      textos: textosArr,
      videos: videosArr,
      premiacoes: premiacoesArr
    };
  });
}

function parseTextosField(textos, fallbackTitle = '') {
  if (Array.isArray(textos) && textos.length > 0) {
    return textos
      .filter(t => t && (typeof t === 'string' || t.exibir_no_site !== false && t.exibir_no_site !== 'false'))
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
  return [];
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
        participacoes: Array.isArray(p.participacoes) ? p.participacoes : []
      });
    });
  }

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

function normalizeText(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
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
  return String(str)
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatParagraphs(text) {
  if (!text) return '';
  if (text.includes('<p>')) return text;
  return text
    .split(/\n\n+/)
    .map(p => `<p>${p.trim()}</p>`)
    .join('');
}
