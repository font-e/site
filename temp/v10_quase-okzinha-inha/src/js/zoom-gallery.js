/**
 * RESIDÊNCIA FONTE — ZOOM-GALLERY.JS
 * Módulo Especialista da Nova Galeria Zoom Unificada
 * - Rolagem Horizontal 100dvh: 1 coluna inicial, gap 2.5 colunas, 3 colunas finais
 * - Controles Centralizados na Área da Galeria (48px de largura x 32px de altura)
 * - Módulo do Contador: Linha 1 dividida (< e >) com raio 16px 16px 0 0, Linha 2 contador com raio 0 0 4px 4px
 * - Painel Central Unificado de Info (ⓘ) aglutinando:
 *   a) Toggle de Legendas (ON / OFF)
 *   b) Campo de Busca Textual
 *   c) Tags Comuns (desconsiderando títulos de evento/pessoa)
 * - Tag Ativa na Base da Tela com botão ✕ para eliminação
 * - Dança de z-index do logotipo FONTE
 */

let activeZoomInstance = null;

/**
 * Remove tags HTML e espaços extras para extração limpa de texto
 */
function stripHtml(html) {
  if (!html) return '';
  return String(html).replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Formata números com dois dígitos (ex: 01, 02, 27)
 */
function formatTwoDigits(num) {
  const val = Math.max(0, parseInt(num, 10) || 0);
  return String(val).padStart(2, '0');
}

/**
 * Determina se uma imagem possui informações reais no JSON
 * (Abole replicação do título do evento/pessoa quando não houver nada)
 */
export function hasImageInfo(img) {
  if (!img) return false;
  const cleanLeg = stripHtml(img.legenda);
  const cleanAut = Array.isArray(img.autoria) ? img.autoria.join('').trim() : String(img.autoria || '').trim();
  const cleanFoto = String(img.fotografia || img.autoria_foto || '').trim();
  const cleanVenda = String(img.url_venda || '').trim();
  return Boolean(cleanLeg || cleanAut || cleanFoto || cleanVenda || img.disponivel === true);
}

/**
 * Normaliza e extrai as imagens e metadados de qualquer item (evento, exposição ou pessoa)
 */
export function getZoomImagesFromItem(item) {
  if (!item) return [];
  let rawList = [];

  if (Array.isArray(item.galeria) && item.galeria.length > 0) {
    rawList = item.galeria;
  } else if (Array.isArray(item.expanded_images) && item.expanded_images.length > 0) {
    rawList = item.expanded_images;
  } else if (Array.isArray(item.images) && item.images.length > 0) {
    rawList = item.images;
  } else if (item.avatar) {
    rawList = [item.avatar];
  } else if (item.foto || item.imagem) {
    rawList = [{ url: item.foto || item.imagem, zoom: item.foto || item.imagem, thumb: item.foto || item.imagem }];
  }

  return rawList.map((img) => {
    if (typeof img === 'string') {
      return {
        url: img,
        zoom: img,
        thumb: img,
        ratio: 1.498,
        legenda: '', // NUNCA replica título do item
        autoria: '',
        fotografia: '',
        url_venda: '',
        disponivel: false
      };
    }

    const zoomUrl = img.zoom || img.url_zoom || img.url || img.thumb || '';
    const thumbUrl = img.thumb || img.url || zoomUrl;
    const ratio = img.ratio || (img.width && img.height ? (img.width / img.height) : 1.498);

    return {
      url: zoomUrl,
      zoom: zoomUrl,
      thumb: thumbUrl,
      ratio,
      width: img.width,
      height: img.height,
      legenda: img.legenda || '', // Preserva estritamente se houver no JSON
      autoria: img.autoria || '',
      fotografia: img.fotografia || img.autoria_foto || '',
      url_venda: img.url_venda || '',
      disponivel: img.disponivel === true
    };
  });
}

/**
 * Extrai tags comuns da galeria para o painel de busca
 * a) Nomes de autoria (com contador se > 1)
 * b) Legendas com 2 ou mais ocorrências iguais
 * c) Itens à venda (com contador se > 1)
 * Condição estrita: Tags com texto igual ao título do evento/pessoa são desconsideradas!
 */
function extractGalleryTags(imgs = [], itemTitle = '') {
  const authorCounts = {};
  const legendaCounts = {};
  let vendaCount = 0;
  const cleanItemTitle = stripHtml(itemTitle).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  imgs.forEach((img) => {
    // 1. Autoria
    if (img.autoria) {
      const authors = Array.isArray(img.autoria)
        ? img.autoria
        : String(img.autoria).split(/,\s*|\s+e\s+/).map(s => s.trim()).filter(Boolean);

      authors.forEach((auth) => {
        if (auth) {
          authorCounts[auth] = (authorCounts[auth] || 0) + 1;
        }
      });
    }

    // 2. Legendas comuns
    const cleanLeg = stripHtml(img.legenda);
    if (cleanLeg && cleanLeg.length > 0) {
      legendaCounts[cleanLeg] = (legendaCounts[cleanLeg] || 0) + 1;
    }

    // 3. Venda
    if (img.url_venda || img.disponivel) {
      vendaCount++;
    }
  });

  const rawTags = [];

  // Tags de autoria
  Object.keys(authorCounts).sort().forEach((auth) => {
    const count = authorCounts[auth];
    rawTags.push({
      id: `auth:${auth}`,
      type: 'author',
      value: auth,
      label: count > 1 ? `${auth} (${count})` : auth
    });
  });

  // Tags de legendas (apenas 2 ou mais iguais)
  Object.keys(legendaCounts).forEach((leg) => {
    const count = legendaCounts[leg];
    if (count >= 2) {
      rawTags.push({
        id: `leg:${leg}`,
        type: 'legenda',
        value: leg,
        label: `${leg} (${count})`
      });
    }
  });

  // Tag de venda
  if (vendaCount > 0) {
    rawTags.push({
      id: 'venda',
      type: 'venda',
      value: true,
      label: vendaCount > 1 ? `À venda (${vendaCount})` : 'À venda'
    });
  }

  // Desconsidera tags cujo texto for igual ao título do evento/pessoa
  return rawTags.filter(tag => {
    if (!cleanItemTitle) return true;
    const cleanTagVal = stripHtml(String(tag.value || '')).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    return cleanTagVal !== cleanItemTitle;
  });
}

/**
 * Abre o modo Zoom na mesma área do contêiner da gaveta
 */
export function openZoomGallery({
  container,
  item,
  images = null,
  initialIndex = 0,
  title = '',
  onClose = null
}) {
  if (!container) return;

  if (activeZoomInstance) {
    closeZoomGallery();
  }

  const imgs = (images && images.length > 0) ? images : getZoomImagesFromItem(item);
  if (!imgs || imgs.length === 0) return;

  const totalImages = imgs.length;
  let currentIndex = Math.max(0, Math.min(initialIndex, totalImages - 1));
  let activeFilter = null; // { type: 'tag'|'search', value: string, tagId?: string, label?: string }
  let isInfoPanelOpen = false;
  let areAllLegendasVisible = false;

  const preloadedMap = new Set();
  const galleryTags = extractGalleryTags(imgs, title || item.titulo || item.title || item.nome || '');

  // Oculta conteúdo anterior dentro do contêiner
  const hiddenElements = [];
  Array.from(container.children).forEach(child => {
    if (child.style.display !== 'none') {
      hiddenElements.push({ el: child, prevDisplay: child.style.display });
      child.style.display = 'none';
    }
  });

  // Cria elemento principal da Galeria Zoom
  const galleryEl = document.createElement('div');
  galleryEl.className = 'zoom-gallery-container';
  galleryEl.id = 'active-zoom-gallery';

  // 1. Trilho Horizontal (1 col inicial, gap 2.5 col, 3 col finais)
  const horizontalTrack = document.createElement('div');
  horizontalTrack.className = 'zoom-horizontal-track';
  horizontalTrack.id = 'zoom-horizontal-track';

  horizontalTrack.innerHTML = imgs.map((img, i) => {
    const hasInfo = hasImageInfo(img);
    const autoriaStr = Array.isArray(img.autoria) ? img.autoria.join(', ') : img.autoria;
    const vendaUrl = img.url_venda || (img.disponivel ? (window.__FONTE_DATA__?.meta?.artwork_archive || 'https://www.artworkarchive.com/profile/fonte') : '');
    const isInitialOrNeighbor = Math.abs(i - currentIndex) <= 2;
    const initialThumb = img.thumb || img.url || '';

    return `
      <div class="zoom-slide-item" data-slide-idx="${i}">
        <div class="zoom-slide-img-wrap ${!hasInfo ? 'no-info-pointer' : ''}" data-img-idx="${i}" style="aspect-ratio: ${img.ratio || 1.498}; background-image: url('${initialThumb}');">
          <img src="${img.zoom || img.url}" 
               alt="${stripHtml(img.legenda) || (title || 'Obra')}"
               loading="${isInitialOrNeighbor ? 'eager' : 'lazy'}"
               decoding="async">
          ${hasInfo ? `
            <div class="zoom-info-overlay">
              <div class="zoom-info-content">
                ${img.legenda ? `<div class="zoom-info-legenda">${img.legenda}</div>` : ''}
                <div class="zoom-info-meta-row">
                  ${autoriaStr ? `<span>${autoriaStr}</span>` : ''}
                  ${img.fotografia ? `<span>Foto: ${img.fotografia}</span>` : ''}
                </div>
                ${vendaUrl ? `
                  <div class="zoom-info-venda">
                    <a href="${vendaUrl}" target="_blank" rel="noopener noreferrer" class="zoom-buy-link" title="Adquirir obra no Artwork Archive">
                      <span class="zoom-buy-icon">$</span> Adquirir obra
                    </a>
                  </div>
                ` : ''}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  galleryEl.appendChild(horizontalTrack);

  // 2. Trilho de Controles Laterais (largura do menu compacto: 32px, não sticky!)
  const controlsRail = document.createElement('div');
  controlsRail.className = 'zoom-controls-rail';
  controlsRail.id = 'zoom-controls-rail';

  const isInitialFirst = currentIndex === 0;
  const isInitialLast = currentIndex >= totalImages - 1;

  controlsRail.innerHTML = `
    <button type="button" class="zoom-ctrl-btn zoom-btn-close" data-action="close-zoom" title="Fechar modo zoom" aria-label="Fechar modo zoom">✕</button>
    <div class="zoom-nav-counter-group">
      <button type="button" class="zoom-nav-sub-btn" data-action="prev-zoom" title="${isInitialFirst ? 'Ir para a última imagem' : 'Imagem anterior'}" aria-label="${isInitialFirst ? 'Ir para a última imagem' : 'Imagem anterior'}">${isInitialFirst ? '↪' : '❮'}</button>
      <div class="zoom-ctrl-counter-box" id="zoom-counter-box" aria-live="polite">
        <span class="zoom-counter-num zoom-counter-current">${formatTwoDigits(currentIndex + 1)}</span>
        <span class="zoom-counter-slash">╱</span>
        <span class="zoom-counter-num zoom-counter-total">${formatTwoDigits(totalImages)}</span>
      </div>
      <button type="button" class="zoom-nav-sub-btn" data-action="next-zoom" title="${isInitialLast ? 'Ir para a primeira imagem' : 'Próxima imagem'}" aria-label="${isInitialLast ? 'Ir para a primeira imagem' : 'Próxima imagem'}">${isInitialLast ? '↩' : '❯'}</button>
    </div>
    <button type="button" class="zoom-ctrl-btn zoom-btn-info" data-action="toggle-info-panel" title="Painel de Informações e Busca (ⓘ)" aria-label="Painel de Informações e Busca">ⓘ</button>
  `;

  galleryEl.appendChild(controlsRail);

  // 3. Painel Central Unificado de Info (Legendas Toggle, Busca e Tags)
  const infoPopover = document.createElement('div');
  infoPopover.className = 'zoom-info-popover';
  infoPopover.id = 'zoom-info-popover';

  infoPopover.innerHTML = `
    <div class="zoom-popover-legendas-row">
      <span class="zoom-popover-legendas-label">Legendas:</span>
      <button type="button" class="zoom-popover-legendas-toggle-btn" id="zoom-popover-legendas-toggle-btn">OFF</button>
    </div>
    <div class="zoom-search-input-wrap">
      <input type="text" class="zoom-search-input" id="zoom-search-input" placeholder="Buscar na galeria..." autocomplete="off">
      <button type="button" class="zoom-search-clear" id="zoom-search-clear" title="Limpar busca">✕</button>
    </div>
    ${galleryTags.length > 0 ? `
      <div class="zoom-search-tags-container">
        ${galleryTags.map((tag, idx) => `
          <button type="button" class="zoom-search-tag-btn" data-tag-id="${tag.id}">
            ${tag.label}
          </button>
          ${idx < galleryTags.length - 1 ? '<span class="zoom-tag-separator">/</span>' : ''}
        `).join('')}
      </div>
    ` : ''}
    <div class="zoom-search-status-bar" id="zoom-search-status-bar" style="display: none;">
      <span id="zoom-search-status-text"></span>
      <button type="button" class="zoom-search-reset-btn" id="zoom-search-reset-btn">Limpar filtro</button>
    </div>
  `;

  galleryEl.appendChild(infoPopover);

  // 4. Tag Ativa na Base da Tela alinhada aos botões (print 1)
  const bottomActiveTag = document.createElement('div');
  bottomActiveTag.className = 'zoom-bottom-active-tag';
  bottomActiveTag.id = 'zoom-bottom-active-tag';
  galleryEl.appendChild(bottomActiveTag);

  container.appendChild(galleryEl);

  // Elementos do DOM
  const btnPrev = controlsRail.querySelector('[data-action="prev-zoom"]');
  const btnNext = controlsRail.querySelector('[data-action="next-zoom"]');
  const counterCurrent = controlsRail.querySelector('.zoom-counter-current');
  const counterTotal = controlsRail.querySelector('.zoom-counter-total');
  const btnInfoPanel = controlsRail.querySelector('[data-action="toggle-info-panel"]');

  const legendasToggleBtn = infoPopover.querySelector('#zoom-popover-legendas-toggle-btn');
  const searchInput = infoPopover.querySelector('#zoom-search-input');
  const searchClear = infoPopover.querySelector('#zoom-search-clear');
  const searchStatusBar = infoPopover.querySelector('#zoom-search-status-bar');
  const searchStatusText = infoPopover.querySelector('#zoom-search-status-text');
  const searchResetBtn = infoPopover.querySelector('#zoom-search-reset-btn');

  /**
   * Retorna os slides visíveis no momento (respeitando qualquer filtro)
   */
  function getVisibleSlides() {
    return Array.from(horizontalTrack.querySelectorAll('.zoom-slide-item:not(.is-filtered-out)'));
  }

  /**
   * Sincroniza o estado do toggle de legendas
   */
  function syncLegendasToggleState() {
    const slidesWithInfo = Array.from(horizontalTrack.querySelectorAll('.zoom-slide-img-wrap')).filter(wrap => wrap.querySelector('.zoom-info-overlay'));
    if (slidesWithInfo.length === 0) {
      areAllLegendasVisible = false;
      if (legendasToggleBtn) {
        legendasToggleBtn.classList.remove('is-active');
        legendasToggleBtn.textContent = 'OFF';
      }
      return;
    }

    areAllLegendasVisible = slidesWithInfo.every(wrap => wrap.classList.contains('is-info-open'));
    if (legendasToggleBtn) {
      legendasToggleBtn.classList.toggle('is-active', areAllLegendasVisible);
      legendasToggleBtn.textContent = areAllLegendasVisible ? 'ON' : 'OFF';
    }
  }

  /**
   * Liga ou desliga todas as legendas das imagens que possuem info
   */
  function setAllLegendas(visible) {
    areAllLegendasVisible = visible;
    const slidesWithInfo = horizontalTrack.querySelectorAll('.zoom-slide-img-wrap');
    slidesWithInfo.forEach(wrap => {
      if (wrap.querySelector('.zoom-info-overlay')) {
        wrap.classList.toggle('is-info-open', visible);
      }
    });

    if (legendasToggleBtn) {
      legendasToggleBtn.classList.toggle('is-active', visible);
      legendasToggleBtn.textContent = visible ? 'ON' : 'OFF';
    }
  }

  /**
   * Calcula o índice ativo baseado no critério rigoroso da coluna 2/3
   */
  function calculateActiveIndexByColumnThreshold() {
    const visibleSlides = getVisibleSlides();
    if (visibleSlides.length === 0) return 0;

    const thresholdX = (2 / 12) * window.innerWidth;
    let activeIdxInVisible = 0;

    for (let i = 0; i < visibleSlides.length; i++) {
      const rect = visibleSlides[i].getBoundingClientRect();
      if (rect.left <= thresholdX + 2) {
        activeIdxInVisible = i;
      } else {
        break;
      }
    }

    return activeIdxInVisible;
  }

  /**
   * Atualiza os controles e contadores nas 3 linhas
   */
  function updateControls() {
    const visibleSlides = getVisibleSlides();
    const visibleTotal = visibleSlides.length;

    if (counterCurrent) {
      counterCurrent.textContent = formatTwoDigits(currentIndex + 1);
    }
    if (counterTotal) {
      counterTotal.textContent = formatTwoDigits(visibleTotal);
    }
    if (btnPrev) {
      btnPrev.disabled = false;
      if (currentIndex === 0) {
        btnPrev.textContent = '↪';
        btnPrev.title = 'Ir para a última imagem';
        btnPrev.setAttribute('aria-label', 'Ir para a última imagem');
      } else {
        btnPrev.textContent = '❮';
        btnPrev.title = 'Imagem anterior';
        btnPrev.setAttribute('aria-label', 'Imagem anterior');
      }
    }
    if (btnNext) {
      btnNext.disabled = false;
      if (currentIndex >= visibleTotal - 1) {
        btnNext.textContent = '↩';
        btnNext.title = 'Ir para a primeira imagem';
        btnNext.setAttribute('aria-label', 'Ir para a primeira imagem');
      } else {
        btnNext.textContent = '❯';
        btnNext.title = 'Próxima imagem';
        btnNext.setAttribute('aria-label', 'Próxima imagem');
      }
    }
  }

  /**
   * Alinha a margem esquerda do slide ativo com precisão
   */
  function goToSlideInstant(idx) {
    const visibleSlides = getVisibleSlides();
    if (visibleSlides.length === 0) return;

    currentIndex = Math.max(0, Math.min(idx, visibleSlides.length - 1));
    const targetSlide = visibleSlides[currentIndex];
    if (!targetSlide) return;

    const col2 = (2 / 12) * window.innerWidth;

    if (currentIndex === 0) {
      horizontalTrack.scrollLeft = 0;
    } else {
      horizontalTrack.scrollLeft = Math.max(0, targetSlide.offsetLeft - col2);
    }

    updateControls();
    ensureSurroundingPreloaded(currentIndex, 2);
  }

  function goToSlideSmooth(idx) {
    const visibleSlides = getVisibleSlides();
    if (visibleSlides.length === 0) return;

    currentIndex = Math.max(0, Math.min(idx, visibleSlides.length - 1));
    const targetSlide = visibleSlides[currentIndex];
    if (!targetSlide) return;

    const col2 = (2 / 12) * window.innerWidth;

    if (currentIndex === 0) {
      horizontalTrack.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      horizontalTrack.scrollTo({ left: Math.max(0, targetSlide.offsetLeft - col2), behavior: 'smooth' });
    }

    updateControls();
    ensureSurroundingPreloaded(currentIndex, 2);
  }

  /**
   * Pré-carrega imagens vizinhas
   */
  function ensureSurroundingPreloaded(centerIdx, radius = 2) {
    const visibleSlides = getVisibleSlides();
    const start = Math.max(0, centerIdx - radius);
    const end = Math.min(visibleSlides.length - 1, centerIdx + radius);

    for (let i = start; i <= end; i++) {
      const slide = visibleSlides[i];
      if (!slide) continue;
      const originalIdx = parseInt(slide.dataset.slideIdx, 10);
      const imgData = imgs[originalIdx];
      if (!imgData) continue;

      const targetSrc = imgData.zoom || imgData.url;
      if (targetSrc && !preloadedMap.has(targetSrc)) {
        preloadedMap.add(targetSrc);
        const preloadImg = new Image();
        preloadImg.src = targetSrc;
      }

      const slideImg = slide.querySelector('img');
      if (slideImg && slideImg.loading !== 'eager') {
        slideImg.loading = 'eager';
      }
    }
  }

  // Pré-carrega o raio inicial
  ensureSurroundingPreloaded(currentIndex, 2);

  // Inicialização no DOM
  requestAnimationFrame(() => {
    const rect = container.getBoundingClientRect();
    const targetScrollY = Math.max(0, rect.top + window.scrollY);
    window.scrollTo({ top: targetScrollY, behavior: 'instant' });

    goToSlideInstant(currentIndex);
  });

  // Atualização em tempo real durante rolagem horizontal
  let scrollTicking = false;
  function handleTrackScroll() {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => {
      const newActiveIdx = calculateActiveIndexByColumnThreshold();
      if (newActiveIdx !== currentIndex) {
        currentIndex = newActiveIdx;
        updateControls();
        ensureSurroundingPreloaded(currentIndex, 2);
      }
      scrollTicking = false;
    });
  }

  horizontalTrack.addEventListener('scroll', handleTrackScroll, { passive: true });

  /**
   * Atualiza a tag ativa na base da tela (Print 1)
   */
  function updateBottomActiveTag() {
    if (activeFilter && activeFilter.type === 'tag' && activeFilter.label) {
      bottomActiveTag.innerHTML = `
        <span>${activeFilter.label}</span>
        <button type="button" class="zoom-active-tag-close" title="Remover filtro">✕</button>
      `;
      bottomActiveTag.classList.add('is-visible');
    } else {
      bottomActiveTag.classList.remove('is-visible');
      bottomActiveTag.innerHTML = '';
    }
  }

  /**
   * Aplica filtro na galeria (por tag ou por texto digitado)
   */
  function applyGalleryFilter(filter) {
    activeFilter = filter;
    const slides = horizontalTrack.querySelectorAll('.zoom-slide-item');
    let matchingCount = 0;

    slides.forEach((slide) => {
      const originalIdx = parseInt(slide.dataset.slideIdx, 10);
      const img = imgs[originalIdx];
      let matches = true;

      if (filter) {
        if (filter.type === 'tag') {
          const tag = galleryTags.find(t => t.id === filter.tagId);
          if (tag) {
            filter.label = tag.label;
            if (tag.type === 'author') {
              const authors = Array.isArray(img.autoria)
                ? img.autoria
                : String(img.autoria || '').split(/,\s*|\s+e\s+/).map(s => s.trim());
              matches = authors.includes(tag.value);
            } else if (tag.type === 'legenda') {
              matches = stripHtml(img.legenda).toLowerCase() === String(tag.value).toLowerCase();
            } else if (tag.type === 'venda') {
              matches = Boolean(img.url_venda || img.disponivel);
            }
          }
        } else if (filter.type === 'search') {
          const query = filter.value.toLowerCase().trim();
          const legText = stripHtml(img.legenda).toLowerCase();
          const autText = String(Array.isArray(img.autoria) ? img.autoria.join(' ') : (img.autoria || '')).toLowerCase();
          const fotText = String(img.fotografia || '').toLowerCase();
          matches = legText.includes(query) || autText.includes(query) || fotText.includes(query);
        }
      }

      if (matches) {
        slide.classList.remove('is-filtered-out');
        matchingCount++;
      } else {
        slide.classList.add('is-filtered-out');
      }
    });

    // Atualiza botões de tags no popover
    const tagBtns = infoPopover.querySelectorAll('.zoom-search-tag-btn');
    tagBtns.forEach((btn) => {
      const isSelected = activeFilter && activeFilter.type === 'tag' && btn.dataset.tagId === activeFilter.tagId;
      btn.classList.toggle('is-active', !!isSelected);
    });

    // Atualiza barra de status dentro do popover
    if (activeFilter) {
      searchStatusBar.style.display = 'flex';
      searchStatusText.textContent = `${matchingCount} de ${totalImages} imagens`;
    } else {
      searchStatusBar.style.display = 'none';
      searchStatusText.textContent = '';
      if (searchInput) searchInput.value = '';
    }

    // Atualiza a tag exibida na base da tela (print 1)
    updateBottomActiveTag();

    // Vai para a primeira imagem filtrada
    goToSlideInstant(0);
  }

  function clearGalleryFilter() {
    applyGalleryFilter(null);
  }

  // Evento na tag da base da tela (clique nela remove o filtro)
  bottomActiveTag.addEventListener('click', (e) => {
    e.stopPropagation();
    clearGalleryFilter();
  });

  // Eventos nos controles principais
  controlsRail.addEventListener('click', (e) => {
    e.stopPropagation();

    // 1. Fechar Zoom
    const closeBtn = e.target.closest('[data-action="close-zoom"]');
    if (closeBtn) {
      closeZoomGallery();
      return;
    }

    // 2. Imagem Anterior
    const prevBtn = e.target.closest('[data-action="prev-zoom"]');
    if (prevBtn) {
      const visibleSlides = getVisibleSlides();
      if (currentIndex === 0) {
        goToSlideSmooth(visibleSlides.length - 1);
      } else {
        goToSlideSmooth(currentIndex - 1);
      }
      return;
    }

    // 3. Próxima Imagem
    const nextBtn = e.target.closest('[data-action="next-zoom"]');
    if (nextBtn) {
      const visibleSlides = getVisibleSlides();
      if (currentIndex >= visibleSlides.length - 1) {
        goToSlideSmooth(0);
      } else {
        goToSlideSmooth(currentIndex + 1);
      }
      return;
    }

    // 4. Alternar Painel Central Unificado de Info (ⓘ)
    const infoPanelBtn = e.target.closest('[data-action="toggle-info-panel"]');
    if (infoPanelBtn) {
      isInfoPanelOpen = !isInfoPanelOpen;
      infoPopover.classList.toggle('is-open', isInfoPanelOpen);
      btnInfoPanel.classList.toggle('is-active', isInfoPanelOpen);
      setAllLegendas(isInfoPanelOpen);
      if (isInfoPanelOpen && searchInput) {
        setTimeout(() => searchInput.focus(), 50);
      }
      return;
    }
  });

  // Eventos do Painel Central Unificado de Info
  infoPopover.addEventListener('click', (e) => {
    e.stopPropagation();

    // Toggle de Legendas
    if (e.target.closest('#zoom-popover-legendas-toggle-btn')) {
      setAllLegendas(!areAllLegendasVisible);
      return;
    }

    // Clique em Tag
    const tagBtn = e.target.closest('.zoom-search-tag-btn');
    if (tagBtn) {
      const tagId = tagBtn.dataset.tagId;
      if (activeFilter && activeFilter.type === 'tag' && activeFilter.tagId === tagId) {
        clearGalleryFilter();
      } else {
        applyGalleryFilter({ type: 'tag', tagId });
      }
      return;
    }

    // Limpar texto de busca
    if (e.target.closest('#zoom-search-clear')) {
      if (searchInput) searchInput.value = '';
      if (activeFilter && activeFilter.type === 'search') {
        clearGalleryFilter();
      }
      return;
    }

    // Resetar filtro
    if (e.target.closest('#zoom-search-reset-btn')) {
      clearGalleryFilter();
      return;
    }
  });

  // Digitação no input de busca
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      if (query.length > 0) {
        applyGalleryFilter({ type: 'search', value: query });
      } else {
        clearGalleryFilter();
      }
    });
  }

  // Clique sobre a imagem: alterna informação daquela imagem (se tiver info no JSON)
  horizontalTrack.addEventListener('click', (e) => {
    if (e.target.closest('.zoom-buy-link') || e.target.closest('.zoom-info-overlay a')) {
      return;
    }

    const imgWrap = e.target.closest('.zoom-slide-img-wrap');
    if (imgWrap && imgWrap.querySelector('.zoom-info-overlay')) {
      e.stopPropagation();
      imgWrap.classList.toggle('is-info-open');
      syncLegendasToggleState();
    }
  });

  // Teclado
  function handleKeyDown(e) {
    if (document.activeElement === searchInput && e.key !== 'Escape') {
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      if (isInfoPanelOpen) {
        isInfoPanelOpen = false;
        infoPopover.classList.remove('is-open');
        btnInfoPanel.classList.remove('is-active');
      } else {
        closeZoomGallery();
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const visibleSlides = getVisibleSlides();
      if (currentIndex === 0) {
        goToSlideSmooth(visibleSlides.length - 1);
      } else {
        goToSlideSmooth(currentIndex - 1);
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const visibleSlides = getVisibleSlides();
      if (currentIndex >= visibleSlides.length - 1) {
        goToSlideSmooth(0);
      } else {
        goToSlideSmooth(currentIndex + 1);
      }
    } else if (e.key === 'i' || e.key === 'I') {
      if (btnInfoPanel) {
        e.preventDefault();
        btnInfoPanel.click();
      }
    }
  }

  window.addEventListener('keydown', handleKeyDown);

  // Fecha popover ao clicar fora
  function handleDocumentClick(e) {
    if (isInfoPanelOpen && !infoPopover.contains(e.target) && !controlsRail.contains(e.target)) {
      isInfoPanelOpen = false;
      infoPopover.classList.remove('is-open');
      btnInfoPanel.classList.remove('is-active');
    }
  }

  document.addEventListener('click', handleDocumentClick);

  activeZoomInstance = {
    container,
    galleryEl,
    controlsRail,
    infoPopover,
    bottomActiveTag,
    hiddenElements,
    handleKeyDown,
    handleDocumentClick,
    onClose
  };
}

/**
 * Fecha a galeria zoom ativa e restaura a visualização anterior
 */
export function closeZoomGallery() {
  if (!activeZoomInstance) return;

  const { galleryEl, hiddenElements, handleKeyDown, handleDocumentClick, onClose } = activeZoomInstance;

  window.removeEventListener('keydown', handleKeyDown);
  document.removeEventListener('click', handleDocumentClick);

  if (galleryEl && galleryEl.parentNode) {
    galleryEl.parentNode.removeChild(galleryEl);
  }

  // Restaura elementos anteriores
  if (Array.isArray(hiddenElements)) {
    hiddenElements.forEach(({ el, prevDisplay }) => {
      el.style.display = prevDisplay || '';
    });
  }

  activeZoomInstance = null;

  if (typeof onClose === 'function') {
    onClose();
  }
}

/**
 * Verifica se a galeria zoom está atualmente aberta
 */
export function isZoomGalleryOpen() {
  return !!activeZoomInstance;
}
