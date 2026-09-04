/**
 * Módulo de Programação - Layout Tipográfico Editorial Suíço
 * Residência Artística FONTE
 */

// Controle de ativação do preview de imagem flutuante no mouseover (true = ativado, false = desativado)
const ENABLE_HOVER_PREVIEW = false;

export function updateHeaderHeight() {
  const header = document.getElementById('logo-controller');
  if (header) {
    const height = header.offsetHeight;
    document.documentElement.style.setProperty('--header-height', `${height}px`);
  }
}

export function loadProgramacao() {
  updateHeaderHeight();
  window.addEventListener('resize', updateHeaderHeight);

  // Tenta múltiplos caminhos para garantir carregamento tanto em dev server quanto estático
  const fetchUrl = './programacao.json';

  return fetch(fetchUrl)
    .then(response => {
      if (!response.ok) {
        // Tenta fallback na raiz ou pasta public
        return fetch('/programacao.json');
      }
      return response;
    })
    .then(response => {
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      return response.json();
    })
    .then(data => {
      renderProgramacao(data);
    })
    .catch(err => {
      console.warn('Erro ao carregar programacao.json:', err);
      renderEmptyState();
    });
}

function renderEmptyState() {
  const container = document.getElementById('programacao-grid-container');
  if (!container) return;
  container.innerHTML = `
    <div class="empty-state" style="padding: 48px 20px; font-size: var(--fs-meta); border-top: var(--border-width) solid var(--border-color); text-transform: uppercase; letter-spacing: 0.05em;">
      Nenhum evento programado no momento.
    </div>
  `;
}

function renderProgramacao(data) {
  const container = document.getElementById('programacao-grid-container');
  if (!container) return;
  container.innerHTML = '';

  // Container wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'programacao-container';
  wrapper.id = 'programacao-list-wrapper';

  // Coleta todas as seções para a barra de filtro
  const subsections = ['TODOS'];
  data.forEach(group => {
    if (group.subsection && !subsections.includes(group.subsection)) {
      subsections.push(group.subsection);
    }
  });

  // 1. Barra de Filtro Editorial
  const filterBar = document.createElement('nav');
  filterBar.className = 'programacao-filter-bar';
  filterBar.id = 'programacao-filter-bar';
  filterBar.setAttribute('aria-label', 'Filtros da Programação');

  subsections.forEach((sub, idx) => {
    const btn = document.createElement('button');
    btn.className = `filter-pill${idx === 0 ? ' is-active' : ''}`;
    btn.dataset.filter = sub;
    btn.textContent = sub;
    btn.id = `filter-btn-${idx}`;
    btn.onclick = () => filterEvents(sub);
    filterBar.appendChild(btn);
  });

  wrapper.appendChild(filterBar);

  // 2. Lista de Eventos Tipográficos
  const eventsList = document.createElement('div');
  eventsList.className = 'events-list';
  eventsList.id = 'events-list';

  data.forEach((group, groupIdx) => {
    group.events.forEach((event, eventIdx) => {
      const eventId = `event-${groupIdx}-${eventIdx}`;
      const item = document.createElement('article');
      item.className = 'event-item';
      item.id = eventId;
      item.dataset.eventId = eventId;
      item.dataset.subsection = group.subsection || '';
      item.dataset.category = event.category || '';
      item.dataset.imgUrl = event.url || '';
      item.dataset.title = event.title || '';
      item.dataset.state = 'closed';

      item.innerHTML = `
        <div class="event-header" id="header-${eventId}" role="button" tabindex="0" aria-expanded="false">
          <div class="event-meta-row">
            <div class="event-meta-tags">
              <div class="event-tags-list">
                ${group.subsection === 'INSCRIÇÕES ABERTAS' ? `<span class="event-tag-badge">inscrições abertas</span>` : ''}
                ${event.category ? `<span class="event-tag-badge">${event.category}</span>` : ''}
              </div>
            </div>
            <div class="event-meta-horario">
              ${event.horario ? `<span class="event-horario">${event.horario}</span>` : ''}
            </div>
            <div class="event-meta-date">
              <span class="event-date">${event.date || ''}</span>
            </div>
          </div>
          <h2 class="event-title" id="title-${eventId}">
            <span class="event-title-text">${event.title}</span>${event.subtitle ? ` <span class="event-subtitle-text">${event.subtitle}</span>` : ''}
          </h2>
          <div class="event-names" id="names-${eventId}">${event.desc || ''}</div>
        </div>

        <div class="event-drawer" id="drawer-${eventId}" aria-hidden="true">
          <div class="event-drawer-grid">
            <div class="event-drawer-content">
              <div class="event-drawer-toolbar">
                <div class="event-drawer-buttons">
                  <button type="button" class="event-drawer-pill is-active" data-section="sobre">Sobre</button>
                  <button type="button" class="event-drawer-pill" data-section="artistas">Artistas</button>
                  <button type="button" class="event-drawer-pill" data-section="curadoria">Curadoria</button>
                  <button type="button" class="event-drawer-pill" data-section="texto_critico">Texto crítico</button>
                  <button type="button" class="event-drawer-pill" data-section="mapa_exposicao">Mapa de exposição</button>
                  <button type="button" class="event-drawer-pill" data-section="eventos_relacionados">Eventos relacionados</button>
                </div>
                <button type="button" class="event-drawer-pill event-drawer-close-btn" aria-label="Fechar gaveta">✕</button>
              </div>
              <div class="event-drawer-text">
                <p class="event-content-body">${event.content || event.sobre || ''}</p>
              </div>
            </div>
            <div class="event-drawer-media">
              <img src="${event.url}" alt="${event.title}" loading="lazy">
            </div>
          </div>
        </div>
      `;

      eventsList.appendChild(item);
    });
  });

  wrapper.appendChild(eventsList);
  container.appendChild(wrapper);

  setupHoverImagePreview();
  attachDrawerInteractions();
}

let isScrolling = false;
let scrollTimeout = null;

/**
 * Cria ou recupera o elemento do preview flutuante
 */
function setupHoverImagePreview() {
  if (!ENABLE_HOVER_PREVIEW) return;

  let preview = document.getElementById('hover-image-preview');
  if (!preview) {
    preview = document.createElement('div');
    preview.id = 'hover-image-preview';
    preview.className = 'hover-image-preview';
    preview.setAttribute('aria-hidden', 'true');
    preview.innerHTML = '<img id="hover-image-preview-img" src="" alt="">';
    document.body.appendChild(preview);
  }

  // Oculta instantaneamente ao rolar a página
  window.addEventListener('scroll', () => {
    isScrolling = true;
    hideHoverImage(true);
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      isScrolling = false;
    }, 150);
  }, { passive: true });
}

/**
 * Exibe a imagem de preview no mouseover
 */
function showHoverImage(imgUrl, title) {
  if (!ENABLE_HOVER_PREVIEW || isScrolling) return;

  const preview = document.getElementById('hover-image-preview');
  const img = document.getElementById('hover-image-preview-img');
  if (!preview || !img || !imgUrl) return;

  img.src = imgUrl;
  img.alt = title || '';

  const logoController = document.getElementById('logo-controller');
  if (logoController) {
    const logoRect = logoController.getBoundingClientRect();
    preview.style.top = `${logoRect.bottom}px`;
  }

  if (typeof gsap !== 'undefined') {
    gsap.to(preview, {
      opacity: 1,
      autoAlpha: 1,
      duration: 0.2,
      ease: 'power2.out',
      overwrite: true
    });
  } else {
    preview.style.visibility = 'visible';
    preview.style.opacity = '1';
  }
}

/**
 * Oculta a imagem de preview no mouseleave ou scroll
 */
function hideHoverImage(instant = false) {
  if (!ENABLE_HOVER_PREVIEW) return;

  const preview = document.getElementById('hover-image-preview');
  if (!preview) return;

  if (instant) {
    if (typeof gsap !== 'undefined') gsap.killTweensOf(preview);
    preview.style.opacity = '0';
    preview.style.visibility = 'hidden';
    return;
  }

  if (typeof gsap !== 'undefined') {
    gsap.to(preview, {
      opacity: 0,
      autoAlpha: 0,
      duration: 0.15,
      ease: 'power2.in',
      overwrite: true
    });
  } else {
    preview.style.opacity = '0';
    preview.style.visibility = 'hidden';
  }
}

/**
 * Filtro determinístico por subseção
 */
function filterEvents(category) {
  const buttons = document.querySelectorAll('.filter-pill');
  buttons.forEach(btn => {
    if (btn.dataset.filter === category) {
      btn.classList.add('is-active');
    } else {
      btn.classList.remove('is-active');
    }
  });

  const items = document.querySelectorAll('.event-item');
  items.forEach(item => {
    const matches = category === 'TODOS' || item.dataset.subsection === category;
    if (matches) {
      item.style.display = '';
    } else {
      // Fecha a gaveta antes de esconder
      if (item.dataset.state === 'open') {
        closeDrawer(item, false);
      }
      item.style.display = 'none';
    }
  });

  if (typeof ScrollTrigger !== 'undefined') {
    ScrollTrigger.refresh();
  }
}

/**
 * Vincula as interações do acordeão tipográfico
 */
function attachDrawerInteractions() {
  const items = document.querySelectorAll('.event-item');

  items.forEach(item => {
    const header = item.querySelector('.event-header');
    const titleElements = item.querySelectorAll('.event-title-text, .event-subtitle-text');

    if (ENABLE_HOVER_PREVIEW) {
      titleElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
          if (item.dataset.state === 'closed') {
            showHoverImage(item.dataset.imgUrl, item.dataset.title);
          }
        });

        el.addEventListener('mousemove', () => {
          if (item.dataset.state === 'closed' && !isScrolling) {
            showHoverImage(item.dataset.imgUrl, item.dataset.title);
          }
        });

        el.addEventListener('mouseleave', () => {
          hideHoverImage();
        });
      });
    }

    item.addEventListener('click', (e) => {
      const currentState = item.dataset.state;

      if (currentState === 'closed') {
        hideHoverImage(true);
        openDrawer(item);
      } else if (currentState === 'open') {
        const closeBtn = e.target.closest('.event-drawer-close-btn');
        if (closeBtn || (header && (header.contains(e.target) || e.target === header))) {
          closeDrawer(item);
        }
      }
    });

    if (header) {
      header.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (item.dataset.state === 'closed') {
            hideHoverImage(true);
            openDrawer(item);
          } else {
            closeDrawer(item);
          }
        }
      });
    }
  });
}

/**
 * Abre a gaveta tipográfica com animação GSAP
 */
function openDrawer(item, animate = true) {
  const drawer = item.querySelector('.event-drawer');
  const header = item.querySelector('.event-header');
  if (!drawer) return;

  item.dataset.state = 'open';
  item.classList.add('is-open');
  if (header) header.setAttribute('aria-expanded', 'true');
  drawer.setAttribute('aria-hidden', 'false');

  if (typeof gsap !== 'undefined' && animate) {
    item.classList.add('is-animating');
    gsap.killTweensOf(drawer);

    drawer.style.display = 'block';
    drawer.style.overflow = 'hidden';
    drawer.style.height = 'auto';
    const targetHeight = drawer.scrollHeight;
    drawer.style.height = '0px';
    drawer.style.opacity = '0';

    gsap.to(drawer, {
      height: targetHeight,
      opacity: 1,
      duration: 0.65,
      ease: 'power3.inOut',
      onComplete: () => {
        drawer.style.height = 'auto';
        drawer.style.overflow = 'visible';
        item.classList.remove('is-animating');
        if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
      }
    });
  } else {
    drawer.style.display = 'block';
    drawer.style.height = 'auto';
    drawer.style.overflow = 'visible';
    drawer.style.opacity = '1';
    item.classList.remove('is-animating');
    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
  }
}

/**
 * Fecha a gaveta tipográfica com animação GSAP
 */
function closeDrawer(item, animate = true) {
  const drawer = item.querySelector('.event-drawer');
  const header = item.querySelector('.event-header');
  if (!drawer) return;

  item.dataset.state = 'closed';
  item.classList.remove('is-open');
  if (header) header.setAttribute('aria-expanded', 'false');
  drawer.setAttribute('aria-hidden', 'true');
  drawer.style.overflow = 'hidden';

  if (typeof gsap !== 'undefined' && animate) {
    item.classList.add('is-animating');
    gsap.killTweensOf(drawer);

    const currentHeight = drawer.scrollHeight;
    drawer.style.height = `${currentHeight}px`;

    gsap.to(drawer, {
      height: 0,
      opacity: 0,
      duration: 0.5,
      ease: 'power3.inOut',
      onComplete: () => {
        drawer.style.display = 'none';
        drawer.style.height = '0px';
        item.classList.remove('is-animating');
        if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
      }
    });
  } else {
    drawer.style.display = 'none';
    drawer.style.height = '0px';
    drawer.style.opacity = '0';
    item.classList.remove('is-animating');
    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
  }
}
