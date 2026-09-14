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
  const toggleBtn = document.getElementById('menu-toggle-btn');
  const navContainer = document.getElementById('header-nav-left');
  const toggleIcon = document.getElementById('menu-toggle-icon');
  const navItems = document.getElementById('header-nav-items');

  if (!toggleBtn || !navContainer) return;

  let autoCloseTimer = null;

  const clearAutoClose = () => {
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer);
      autoCloseTimer = null;
    }
  };

  const startAutoClose = () => {
    clearAutoClose();
    if (navContainer.classList.contains('is-open')) {
      autoCloseTimer = setTimeout(() => {
        toggleMenu(false);
      }, 8000);
    }
  };

  const toggleMenu = (open) => {
    const shouldOpen = typeof open === 'boolean' ? open : !navContainer.classList.contains('is-open');
    if (shouldOpen) {
      navContainer.classList.add('is-open');
      toggleBtn.setAttribute('aria-expanded', 'true');
      if (toggleIcon) toggleIcon.textContent = '⨯';
      if (navItems) navItems.setAttribute('aria-hidden', 'false');
      if (!navContainer.matches(':hover')) {
        startAutoClose();
      }
    } else {
      clearAutoClose();
      navContainer.classList.remove('is-open');
      toggleBtn.setAttribute('aria-expanded', 'false');
      if (toggleIcon) toggleIcon.textContent = '≡';
      if (navItems) navItems.setAttribute('aria-hidden', 'true');
    }
  };

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  // Temporizador de 8s quando o cursor não está sobre o menu
  navContainer.addEventListener('mouseleave', () => {
    if (navContainer.classList.contains('is-open')) {
      startAutoClose();
    }
  });

  navContainer.addEventListener('mouseenter', () => {
    clearAutoClose();
  });

  // Fechar ao pressionar Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navContainer.classList.contains('is-open')) {
      toggleMenu(false);
    }
  });

  // Fechar ao clicar fora
  document.addEventListener('click', (e) => {
    if (!navContainer.contains(e.target) && navContainer.classList.contains('is-open')) {
      toggleMenu(false);
    }
  });

  // Smooth scroll para links internos (#) e atualização de abas
  const navLinks = document.querySelectorAll('.header-nav-items a[href^="#"], .logo-hero-wrap a[href^="#"]');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href === '#' || href === '#top') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        toggleMenu(false);
        return;
      }
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const header = document.getElementById('logo-controller');
        const offset = header ? header.offsetHeight + 10 : 60;
        const topPos = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: topPos, behavior: 'smooth' });
        toggleMenu(false);
      }
    });
  });

  // Atualiza botão ativo conforme a rolagem da página
  window.addEventListener('scroll', () => {
    const secProg = document.getElementById('sec-programacao');
    const secArq = document.getElementById('sec-arquivo');
    const btnProg = document.getElementById('nav-btn-programacao');
    const btnArq = document.getElementById('nav-btn-arquivo');

    if (!secProg || !secArq || !btnProg || !btnArq) return;

    const scrollPos = window.scrollY + 120;
    const arqTop = secArq.offsetTop;

    if (scrollPos >= arqTop) {
      btnArq.classList.add('is-active');
      btnProg.classList.remove('is-active');
    } else {
      btnProg.classList.add('is-active');
      btnArq.classList.remove('is-active');
    }
  }, { passive: true });
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
      allConsolidatedEvents = eventosData;
    }
    if (pessoasData) {
      allConsolidatedPersons = pessoasData;
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
 * Sequência de animação solicitada:
 * 1. Fade out de opacidade de TODO o conteúdo da linha (headerEl) enquanto a área da gaveta se expande (0.4s).
 * 2. Depois, o scroll posiciona a gaveta aberta na posição final e ocorre o fade in do conteúdo da gaveta aberta (0.45s).
 */
/**
 * Abre a gaveta universal no item especificado
 * Item 6: Ao navegar entre gavetas (pelas setas ou cliques), ocorre um movimento conjunto:
 * a gaveta do próximo ou anterior evento se abre fechando a gaveta anteriormente aberta,
 * seguido do scroll para alinhar o topo da linha/breadcrumb à base do cabeçalho da página.
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

  // Adiciona a classe is-open para atualizar estado da linha
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

  // Renderiza a estrutura interna da gaveta com os 3 botões < x >
  renderCurrentDrawerView();

  if (typeof gsap !== 'undefined') {
    // Estado inicial: gaveta com altura 0 e overflow hidden
    gsap.set(drawerEl, { height: 0, minHeight: 0, overflow: 'hidden' });
    const targetHeight = `calc(100vh - var(--header-height, 56px) - 60px)`;

    const tl = gsap.timeline({
      onComplete: () => {
        if (prevDrawerEl && prevDrawerEl.parentNode) {
          prevDrawerEl.remove();
        }
        gsap.set(drawerEl, { clearProps: 'height,minHeight,overflow' });
        activeDrawerTimeline = null;

        // Executa o scroll alinhando o topo do evento/breadcrumb na base do cabeçalho
        scrollToHeaderBase(itemEl);

        if (typeof ScrollTrigger !== 'undefined') {
          ScrollTrigger.refresh();
        }
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
    scrollToHeaderBase(itemEl);
    if (typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.refresh();
    }
  }
}

/**
 * Fecha a gaveta universal ativa com animação simples de deslizamento
 * mantendo a linha do evento intacta na tela
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

/**
 * Rola a janela de modo que o topo do breadcrumb / gaveta (ou do elemento do evento) 
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

function getProgramEventsList() {
  return Array.from(document.querySelectorAll('.events-list .event-item'));
}

/**
 * Renderiza os 3 botões fixos < x > da gaveta
 * - Modo lista (historyIndex === 0): navega entre eventos da página
 * - Modo relações (historyIndex > 0): navega no histórico de relações
 *   - Botão > fica com classe is-hover-bg quando atinge o fim das relações
 */
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
    prevDisabled = false; // Sempre pode voltar a um passo anterior
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

/**
 * Renderiza o conteúdo da gaveta baseado no passo atual do histórico (historyIndex)
 */
function renderCurrentDrawerView() {
  if (!activeDrawerState) return;

  const { itemEl, history, historyIndex = 0 } = activeDrawerState;
  const drawer = itemEl.querySelector('.event-universal-drawer');
  if (!drawer) return;

  const currentStep = history[historyIndex] || history[history.length - 1];
  const isZoom = currentStep.type === 'zoom_gallery';

  // Breadcrumbs com suporte a popover e destaque do passo ativo (Item 4 & 5)
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

  // Se estiver na galeria zoom, calcula larguras das legendas e posiciona corte seco no slide clicado
  if (isZoom) {
    applyZoomSlideOffset(drawer, currentStep.data.initialIndex || 0);
    syncZoomCaptionsWidth(drawer);
  }

  attachViewInteractions(drawer);
}

/**
 * Item 2: Sincroniza a largura da legenda estritamente com a largura real renderizada da imagem
 */
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

/**
 * Posiciona com corte seco no slide indicado da galeria horizontal
 */
function applyZoomSlideOffset(drawer, targetIndex) {
  requestAnimationFrame(() => {
    const track = drawer.querySelector('.drawer-zoom-horizontal-track');
    const slide = drawer.querySelector(`#zoom-slide-${targetIndex}`);
    if (track && slide) {
      track.scrollLeft = slide.offsetLeft - 24;
    }
  });
}

/**
 * Breadcrumbs com suporte a navegação por clique e popover nas reticências
 */
function renderBreadcrumbsHtml(history, activeIndex = 0) {
  const steps = [
    { label: 'PROGRAMAÇÃO', historyIndex: -1 }
  ];

  history.forEach((step, idx) => {
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
  const currentStepIdx = activeIndex + 1;

  const displayIndices = new Set();
  displayIndices.add(0);
  displayIndices.add(currentStepIdx);
  if (currentStepIdx > 0) displayIndices.add(currentStepIdx - 1);
  if (currentStepIdx < total - 1) displayIndices.add(currentStepIdx + 1);
  displayIndices.add(total - 1);
  if (total > 2) displayIndices.add(total - 2);

  let displaySteps = [];
  for (let i = 0; i < total; i++) {
    if (displayIndices.has(i)) {
      displaySteps.push({
        ...steps[i],
        isEllipsis: false,
        isCurrent: i === currentStepIdx,
        isFuture: i > currentStepIdx
      });
    } else {
      if (displaySteps.length > 0 && !displaySteps[displaySteps.length - 1].isEllipsis) {
        displaySteps.push({
          label: '...',
          isEllipsis: true,
          isCurrent: false,
          isFuture: i > currentStepIdx,
          historyIndex: steps[i].historyIndex,
          tooltip: steps[i].label
        });
      }
    }
  }

  return displaySteps.map((s, idx) => {
    const sep = idx > 0 ? `<span class="breadcrumb-sep">&gt;</span>` : '';
    let itemHtml = '';
    const classes = ['breadcrumb-step'];
    if (s.isCurrent) classes.push('is-current');
    if (s.isFuture) classes.push('is-future');

    if (s.isEllipsis) {
      itemHtml = `
        <span class="breadcrumb-ellipsis-wrapper">
          <span class="${classes.join(' ')} breadcrumb-ellipsis-text" 
                onclick="window._drawerNavStep(${s.historyIndex})">...</span>
          <span class="breadcrumb-ellipsis-popover">${escapeHtml(s.tooltip || 'Passo anterior')}</span>
        </span>
      `;
    } else {
      const clickAttr = s.isCurrent ? '' : `onclick="window._drawerNavStep(${s.historyIndex})"`;
      itemHtml = `<span class="${classes.join(' ')}" ${clickAttr}>${escapeHtml(s.label)}</span>`;
    }
    return `${sep}${itemHtml}`;
  }).join(' ');
}

/**
 * Renderiza a estrutura da tela de Evento
 * Item 7: Elimina botões de artistas e curadoria universais das abas
 */
function renderEventBodyHtml(evt, activeTab = 'sobre', selectedTextIndex = null) {
  const tabs = [
    { key: 'sobre', label: 'Sobre' },
    { key: 'textos', label: 'Textos' },
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
  } else {
    tabContentHtml = `
      <div class="section-sobre-wrap">
        <div class="sobre-block">
          <div class="sobre-block-content"><p>Conteúdo em fase de digitalização no acervo.</p></div>
        </div>
      </div>
    `;
  }

  // Galeria lateral sem badges de quantidade
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

/**
 * Itens 1, 2 e 3: Modo Zoom na área total da gaveta
 * - Sem bordas nas imagens
 * - Topo toca na borda inferior do breadcrumb
 * - Espaço entre imagens de 24px
 * - Legenda alinhada à esquerda da imagem
 * - Clicar sobre qualquer imagem sai do modo zoom
 */
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

/**
 * Renderiza a tela de Perfil do Artista dentro da gaveta
 */
function renderPersonBodyHtml(person) {
  const locArr = [person.cidade, person.pais].filter(Boolean);
  const locStr = locArr.join(', ');
  let datesStr = '';
  if (person.nascimento) datesStr = `n. ${person.nascimento}`;
  if (person.falecimento) datesStr += ` - m. ${person.falecimento}`;

  const participacoes = getPersonParticipations(person.title);

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

  const fotoUrl = person.foto_principal || 'https://font-e.github.io/site/temp/expo-1.jpg';

  return {
    contentHtml: `
      <div class="person-drawer-profile">
        <div class="person-profile-header">
          <h3 class="person-profile-title">${escapeHtml(person.title)}</h3>
          <div class="person-profile-meta">
            ${locStr ? `<span>${escapeHtml(locStr)}</span>` : ''}
            ${datesStr ? `<span>• ${escapeHtml(datesStr)}</span>` : ''}
            ${person.membro_atelie ? `<span>• Membro Ateliê FONTE</span>` : ''}
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
    mediaHtml: `
      <div class="drawer-person-media">
        <img src="${fotoUrl}" alt="${escapeHtml(person.title)}" loading="lazy">
      </div>
    `
  };
}

/**
 * Renderiza um nome de artista com popover interativo
 */
function renderArtistTagWithPopover(artistName) {
  const trimmed = artistName.trim();
  const person = findPersonByName(trimmed);

  if (!person) {
    return `<span class="artist-plain-text">${escapeHtml(trimmed)}</span>`;
  }

  const escName = escapeHtml(trimmed);
  const bioSnippet = person.bio ? stripHtml(person.bio).slice(0, 110) + '...' : 'Perfil do acervo institucional FONTE.';
  const totalAcoes = getPersonParticipations(person.title).length;

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
        <div class="popover-summary-bio">${escapeHtml(bioSnippet)}</div>
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

// ==========================================================================
// MÉTODOS GLOBAIS DE CONTROLE DA GAVETA UNIVERSAL
// ==========================================================================

window._drawerClose = function(e) {
  if (e) e.stopPropagation();
  closeActiveDrawer();
};

/**
 * Item 3: Fecha APENAS a galeria zoom e retorna à exibição do evento
 */
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

/**
 * Abre a galeria com zoom na área total da gaveta
 */
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

/**
 * Botão ‹ (Voltar):
 * - Se estiver navegando em relações (historyIndex > 0): recua um passo no histórico de relações.
 * - Ao recuar até o nível raiz (historyIndex === 0): volta a operar sobre a lista de eventos.
 * - Se estiver no nível raiz (historyIndex === 0): navega para o evento anterior na lista de programação.
 */
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

/**
 * Botão › (Avançar):
 * - Se estiver navegando em relações (historyIndex > 0): avança no histórico de relações até o limite.
 *   Ao atingir o fim da cadeia, navega para o próximo evento na lista.
 * - Se estiver no nível raiz (historyIndex === 0): navega para o próximo evento na lista de programação.
 */
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

/**
 * Navegação por clique nos breadcrumbs:
 * - Clicar em PROGRAMAÇÃO (stepIndex === -1) fecha a gaveta.
 * - Clicar em qualquer outro passo posiciona o historyIndex naquele nó.
 * - Se retornar a stepIndex === 0, os botões ‹ e › voltam a operar sobre a lista de eventos.
 */
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

window._closePopovers = function(e) {
  if (e) e.stopPropagation();
  closeAllPopovers();
};

// ==========================================================================
// HELPERS DE BUSCA E FORMATAÇÃO DE DADOS
// ==========================================================================

function findConsolidatedEvent(title) {
  if (!title || !allConsolidatedEvents.length) return null;
  const q = normalizeText(title);
  return allConsolidatedEvents.find(e => normalizeText(e.title) === q || q.includes(normalizeText(e.title)) || normalizeText(e.title).includes(q));
}

function findPersonByName(name) {
  if (!name || !allConsolidatedPersons.length) return null;
  const q = normalizeText(name);
  return allConsolidatedPersons.find(p => normalizeText(p.title) === q);
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

function getEventTextosParsed(evt) {
  let rawTextos = evt.textos;
  if (!rawTextos) {
    const consolidated = findConsolidatedEvent(evt.rawTitle || evt.title);
    if (consolidated && consolidated.textos) {
      rawTextos = consolidated.textos;
    }
  }

  if (Array.isArray(rawTextos)) {
    return rawTextos.map(t => ({
      categoria: t.categoria || 'Texto crítico',
      titulo: t.titulo || t.title || 'Sobre tantos corpos',
      autoria: t.autoria || t.autor || 'Ana Roman',
      texto: t.texto || t.content || ''
    }));
  }

  if (typeof rawTextos === 'string' && rawTextos.trim().length > 0) {
    return parseKirbyYamlStructure(rawTextos);
  }

  const titleNorm = normalizeText(evt.rawTitle || evt.title || '');
  if (titleNorm.includes('montagem')) {
    return [{
      categoria: 'Texto crítico',
      titulo: 'Montagem',
      autoria: 'Chico Soll',
      texto: '<p>A exposição individual <em>Montagem</em>, de Marcelo Amorim, reúne trabalhos baseados em imagens vernaculares para questionar o olhar voyeurístico e as construções da memória coletiva.</p><p>Ao intervir sobre fotografias e arquivos históricos por meio de operações de colagem, pintura e reconfiguração visual, Amorim tensiona o estatuto da representação e a autoridade do documento visual, descortinando narrativas de afeto, identidade e poder que atravessam as pedagogias da imagem no mundo contemporâneo.</p>'
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

    return {
      categoria: getField('categoria') || 'Texto crítico',
      autoria: getField('autoria') || '',
      titulo: getField('titulo') || '',
      texto: getField('texto') || ''
    };
  }).filter(t => t.texto || t.titulo);
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

function getPersonParticipations(personName) {
  if (!personName || !allConsolidatedEvents.length) return [];
  const q = normalizeText(personName);
  const participacoes = [];

  allConsolidatedEvents.forEach(evt => {
    let role = null;
    if (Array.isArray(evt.artistas) && evt.artistas.some(a => normalizeText(a) === q)) {
      role = 'Artista';
    } else if (Array.isArray(evt.curadoria) && evt.curadoria.some(c => normalizeText(c) === q)) {
      role = 'Curadoria';
    }

    if (role) {
      let ano = '';
      if (evt.inicio) {
        ano = evt.inicio.split('-')[0];
      }
      participacoes.push({
        id: evt.id || evt.uuid || evt.title,
        title: evt.title,
        ano: ano,
        categoria: evt.categoria || 'Evento',
        roleLabel: role
      });
    }
  });

  return participacoes;
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

function stripHtml(html) {
  if (!html) return '';
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

function formatParagraphs(text) {
  if (!text) return '';
  if (text.includes('<p>')) return text;
  return text
    .split(/\n\n+/)
    .map(p => `<p>${p.trim()}</p>`)
    .join('');
}
