import { updateNavPhysics } from './nav.js';

const IMAGE_BASE_URL = 'https://font-e.github.io/site/temp/';
const ITEMS_PER_PAGE = 24;

let rawExhibitions = [];
let activeTags = [];
let sortColumn = null;
let sortDirection = 'none';
let currentPage = 1;
let isTransitioning = false;

export async function loadArchiveData() {
  try {
    const response = await fetch('arquivo.json');
    if (!response.ok) throw new Error(`Status HTTP: ${response.status}`);
    const data = await response.json();
    rawExhibitions = normalizeExhibitions(data);
    renderCompleteTable();
  } catch (err) {
    console.error('Erro ao carregar arquivo.json:', err);
    const bodyContainer = document.getElementById('table-body-container');
    if (bodyContainer) {
      bodyContainer.innerHTML = `<div class="empty-state-row">Erro ao carregar os dados do arquivo.</div>`;
    }
  }
}

function normalizeExhibitions(jsonItems) {
  return jsonItems.map(item => {
    let artistasList = [];
    const rawArtistas = item.AUDITORIA_ARTISTAS || '';
    if (rawArtistas.trim()) {
      const delimiter = rawArtistas.includes('|') ? '|' : ',';
      artistasList = rawArtistas.split(delimiter).map(n => n.trim()).filter(Boolean);
    }

    const galleryImages = [];
    ['IMAGEM_URL', 'GAL_1', 'GAL_2', 'GAL_3'].forEach(key => {
      const val = item[key];
      if (val && typeof val === 'string' && val.trim()) {
        const fileName = val.trim();
        const fullUrl = fileName.startsWith('http') ? fileName : `${IMAGE_BASE_URL}${fileName}`;
        if (!galleryImages.includes(fullUrl)) galleryImages.push(fullUrl);
      }
    });

    if (galleryImages.length === 0) {
      galleryImages.push(`${IMAGE_BASE_URL}expo-1.jpg`);
    }

    return {
      id: item.ID || '',
      ano: parseInt(item.ANO, 10) || null,
      titulo: item.TITULO ? item.TITULO.trim() : 'Sem título',
      tipo: item.TIPO ? item.TIPO.trim() : '—',
      inicio: item.INICIO ? item.INICIO.trim() : '',
      fim: item.FIM ? item.FIM.trim() : '',
      artistas: artistasList,
      curadoria: item.AUDITORIA_CURADORIA ? item.AUDITORIA_CURADORIA.trim() : '',
      autor_texto: item['AUDITORIA_AUTOR TEXTO'] ? item['AUDITORIA_AUTOR TEXTO'].trim() : '',
      visitacao: item.VISITACAO ? item.VISITACAO.trim() : '',
      resumo: item.RESUMO ? item.RESUMO.trim() : '',
      disponivel: (item.DISPONIVEL && item.DISPONIVEL.trim().toUpperCase() === 'X'),
      images: galleryImages
    };
  });
}

function getFilteredDataset() {
  let dataset = rawExhibitions.filter(item => {
    return activeTags.every(tag => {
      if (tag.type === 'tipo') return item.tipo.toLowerCase() === tag.val.toLowerCase();
      if (tag.type === 'ano') return String(item.ano) === String(tag.val);
      if (tag.type === 'text') {
        const val = tag.val.toLowerCase();
        return item.titulo.toLowerCase().includes(val) || 
               item.artistas.some(a => a.toLowerCase().includes(val)) || 
               String(item.ano).includes(val) || 
               item.tipo.toLowerCase().includes(val) || 
               item.resumo.toLowerCase().includes(val);
      }
      return true;
    });
  });

  if (sortColumn === 'titulo') {
    dataset.sort((a, b) => sortDirection === 'asc' ? a.titulo.localeCompare(b.titulo, 'pt-BR') : -a.titulo.localeCompare(b.titulo, 'pt-BR'));
  } else if (sortColumn === 'artista') {
    dataset.sort((a, b) => {
      const nameA = a.artistas?.[0] || '';
      const nameB = b.artistas?.[0] || '';
      return sortDirection === 'asc' ? nameA.localeCompare(nameB, 'pt-BR') : -nameA.localeCompare(nameB, 'pt-BR');
    });
  } else if (sortColumn === 'ano') {
    dataset.sort((a, b) => sortDirection === 'asc' ? (a.ano || 0) - (b.ano || 0) : (b.ano || 0) - (a.ano || 0));
  } else if (sortColumn === 'tipo') {
    dataset.sort((a, b) => sortDirection === 'asc' ? a.tipo.localeCompare(b.tipo, 'pt-BR') : -a.tipo.localeCompare(b.tipo, 'pt-BR'));
  } else {
    dataset.sort((a, b) => (b.ano || 0) - (a.ano || 0));
  }

  return dataset;
}

window.executeSearch = function() {
  const input = document.getElementById('archive-search-input');
  if (!input) return;
  const query = input.value.trim();
  if (!query) return;

  activeTags.push({
    id: Date.now() + Math.random(),
    type: 'text',
    val: query,
    label: `"${query}"`
  });

  input.value = '';
  currentPage = 1;
  renderSearchTags();
  renderCompleteTable();
};

window.removeTag = function(tagId) {
  activeTags = activeTags.filter(t => t.id !== tagId);
  currentPage = 1;
  renderSearchTags();
  renderCompleteTable();
};

function renderSearchTags() {
  const container = document.getElementById('search-tags-container');
  if (!container) return;
  container.innerHTML = activeTags.map(tag => `
    <div class="search-chip">
      <span>${tag.label}</span>
      <button class="search-chip-close" onclick="removeTag(${tag.id})" aria-label="Remover filtro">&times;</button>
    </div>
  `).join('');
}

function renderHeader() {
  const headerContainer = document.getElementById('table-header-container');
  if (!headerContainer) return;

  const allTipos = ['TODOS', ...new Set(rawExhibitions.map(e => e.tipo).filter(Boolean))].sort();
  const allAnos = ['TODOS', ...new Set(rawExhibitions.map(e => e.ano).filter(Boolean))].sort((a, b) => b - a);

  const getArrow = (col) => {
    if (sortColumn !== col || sortDirection === 'none') return '';
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  };

  headerContainer.innerHTML = `
    <div class="header-row">
      <div class="th-cell" onclick="handleSortClick('titulo')">
        <span>TÍTULO<span class="sort-indicator">${getArrow('titulo')}</span></span>
      </div>
      <div class="th-cell" onclick="handleSortClick('artista')">
        <span>ARTISTAS<span class="sort-indicator">${getArrow('artista')}</span></span>
      </div>
      <div class="th-cell" onclick="toggleDropdown(event, 'dropdown-ano')">
        <span>ANO ▾</span>
        <div class="filter-dropdown" id="dropdown-ano">
          ${allAnos.map(a => `<div class="filter-option ${activeTags.some(t => t.type === 'ano' && String(t.val) === String(a)) ? 'selected' : ''}" onclick="applyFilterOption(event, 'ano', '${a}')">${a}</div>`).join('')}
        </div>
      </div>
      <div class="th-cell" onclick="toggleDropdown(event, 'dropdown-tipo')">
        <span>TIPO ▾</span>
        <div class="filter-dropdown" id="dropdown-tipo">
          ${allTipos.map(t => `<div class="filter-option ${activeTags.some(t => t.type === 'tipo' && t.val === t) ? 'selected' : ''}" onclick="applyFilterOption(event, 'tipo', '${t}')">${t}</div>`).join('')}
        </div>
      </div>
    </div>
  `;
}

window.handleSortClick = function(column) {
  if (sortColumn !== column) {
    sortColumn = column;
    sortDirection = 'asc';
  } else {
    if (sortDirection === 'asc') sortDirection = 'desc';
    else if (sortDirection === 'desc') {
      sortDirection = 'none';
      sortColumn = null;
    }
  }
  currentPage = 1;
  renderCompleteTable();
};

window.toggleDropdown = function(event, dropdownId) {
  event.stopPropagation();
  const targetDropdown = document.getElementById(dropdownId);
  if (!targetDropdown) return;
  const isShowing = targetDropdown.classList.contains('show');
  
  document.querySelectorAll('.filter-dropdown').forEach(d => d.classList.remove('show'));
  if (!isShowing) targetDropdown.classList.add('show');
};

window.applyFilterOption = function(event, category, value) {
  if (event) event.stopPropagation();
  document.querySelectorAll('.filter-dropdown').forEach(d => d.classList.remove('show'));

  if (value === 'TODOS') {
    activeTags = activeTags.filter(t => t.type !== category);
  } else {
    activeTags = activeTags.filter(t => t.type !== category);
    activeTags.push({ id: Date.now() + Math.random(), type: category, val: value, label: `${category.toUpperCase()}: ${value}` });
  }
  currentPage = 1;
  renderSearchTags();
  renderCompleteTable();
};

document.addEventListener('click', () => {
  document.querySelectorAll('.filter-dropdown').forEach(d => d.classList.remove('show'));
});

function createExpoRowElement(expo) {
  const groupRow = document.createElement('div');
  groupRow.className = 'expo-group-row';
  const artistsLabel = expo.artistas && expo.artistas.length > 0 ? expo.artistas.join(', ') : '—';

  const clickable = document.createElement('div');
  clickable.className = 'expo-item-clickable';
  clickable.innerHTML = `
    <div class="cell">${expo.titulo}</div>
    <div class="cell">${artistsLabel}</div>
    <div class="cell">${expo.ano || '—'}</div>
    <div class="cell">${expo.tipo}</div>
  `;
  clickable.onclick = () => toggleDrawer(groupRow);

  const drawer = createDrawerElement(expo);
  groupRow.appendChild(clickable);
  groupRow.appendChild(drawer);
  return groupRow;
}

function createDrawerElement(expo) {
  const drawer = document.createElement('div');
  drawer.className = 'detail-drawer';

  const curadoriaText = expo.curadoria ? expo.curadoria : null;
  const periodoText = expo.inicio && expo.fim ? `${formatDate(expo.inicio)} a ${formatDate(expo.fim)}` : (expo.inicio || '—');

  const lateralImagesHtml = expo.images.map((imgUrl, idx) => `
    <div class="drawer-img-wrap" onclick="openExpandedGallery(event, this, ${idx})">
      <img src="${imgUrl}" alt="${expo.titulo}" data-index="${idx}">
    </div>
  `).join('');

  const expandedImagesHtml = expo.images.map((imgUrl, idx) => `
    <div class="drawer-expanded-item" data-index="${idx}">
      <div class="drawer-expanded-img-wrap">
        <img src="${imgUrl}" alt="${expo.titulo}" data-index="${idx}" onload="syncCaptionWidth(this)" onclick="closeExpandedGallery(event, this.closest('.drawer-expanded-overlay'))">
      </div>
      <div class="drawer-expanded-caption-row" onclick="event.stopPropagation()">
        <div class="drawer-expanded-caption">
          <div class="drawer-caption-text">${expo.titulo}</div>
        </div>
        ${expo.disponivel ? `<a href="https://www.artworkarchive.com/profile/fonte/artists" target="_blank" rel="noopener noreferrer" class="drawer-btn-disponivel" aria-label="Disponível" onclick="event.stopPropagation()">$</a>` : ''}
      </div>
    </div>
  `).join('');

  drawer.innerHTML = `
    <button class="drawer-close-btn" onclick="handleDrawerCloseClick(event, this)" aria-label="Fechar">&times;</button>
    <div class="drawer-grid-expo">
      <div class="drawer-info-content hide-scrollbar">
        <h3 class="drawer-title">${expo.titulo}</h3>
        <div class="drawer-meta">
          ${curadoriaText ? `<span><strong>Curadoria:</strong> ${curadoriaText}</span>` : ''}
          <span><strong>Período:</strong> ${periodoText}</span>
          ${expo.autor_texto ? `<span><strong>Texto crítico:</strong> ${expo.autor_texto}</span>` : ''}
          ${expo.visitacao ? `<span><strong>Visitação:</strong> ${expo.visitacao}</span>` : ''}
        </div>
        <p class="drawer-desc">${expo.resumo || 'Sem resumo disponível.'}</p>
      </div>
      <div class="drawer-gallery-lateral hide-scrollbar">
        ${lateralImagesHtml}
      </div>
    </div>
    <div class="drawer-expanded-overlay" onclick="closeExpandedGallery(event, this)">
      <div class="drawer-expanded-track hide-scrollbar" onclick="event.stopPropagation()">
        ${expandedImagesHtml}
      </div>
    </div>
  `;
  return drawer;
}

function formatDate(dateStr) {
  if (!dateStr || !dateStr.includes('-')) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
  return dateStr;
}

function renderTableFooter(totalPages) {
  const footerContainer = document.getElementById('table-footer-container');
  if (!footerContainer) return;

  footerContainer.innerHTML = `
    <div class="table-pagination-row">
      <div class="pagination-box">
        <button class="pagination-btn ${currentPage <= 1 ? 'disabled' : ''}" onclick="changePage(-1)" aria-label="Página anterior">&#8249;</button>
        <span class="pagination-info">${currentPage}/${totalPages}</span>
        <button class="pagination-btn ${currentPage >= totalPages ? 'disabled' : ''}" onclick="changePage(1)" aria-label="Próxima página">&#8250;</button>
      </div>
    </div>
  `;
}

export function renderCompleteTable() {
  renderHeader();
  const bodyContainer = document.getElementById('table-body-container');
  if (!bodyContainer) return;

  const dataset = getFilteredDataset();
  const totalPages = Math.max(1, Math.ceil(dataset.length / ITEMS_PER_PAGE));

  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  renderTableFooter(totalPages);
  bodyContainer.innerHTML = '';

  if (dataset.length === 0) {
    bodyContainer.innerHTML = `<div class="empty-state-row">Nenhum resultado encontrado para a pesquisa ou filtros selecionados.</div>`;
    return;
  }

  const pageItems = dataset.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const listWrapper = document.createElement('div');
  listWrapper.className = 'table-page-list';
  pageItems.forEach(expo => {
    listWrapper.appendChild(createExpoRowElement(expo));
  });
  bodyContainer.appendChild(listWrapper);

  setTimeout(() => {
    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
    updateNavPhysics();
  }, 100);
}

window.changePage = function(delta) {
  if (isTransitioning) return;
  const dataset = getFilteredDataset();
  const totalPages = Math.max(1, Math.ceil(dataset.length / ITEMS_PER_PAGE));
  const targetPage = currentPage + delta;

  if (targetPage < 1 || targetPage > totalPages) return;

  isTransitioning = true;
  const bodyContainer = document.getElementById('table-body-container');
  if (!bodyContainer) {
    currentPage = targetPage;
    renderCompleteTable();
    isTransitioning = false;
    return;
  }

  const currentList = bodyContainer.querySelector('.table-page-list');
  const prevHeight = bodyContainer.offsetHeight;

  currentPage = targetPage;
  renderTableFooter(totalPages);

  const newItems = dataset.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const newList = document.createElement('div');
  newList.className = 'table-page-list';
  newItems.forEach(expo => {
    newList.appendChild(createExpoRowElement(expo));
  });

  // Rolagem suave para posicionar logo abaixo do cabeçalho se o usuário tiver rolado além dele
  const tableContainer = document.querySelector('.table-container');
  if (tableContainer) {
    const rect = tableContainer.getBoundingClientRect();
    if (rect.top < 0) {
      window.scrollTo({
        top: window.scrollY + rect.top,
        behavior: 'smooth'
      });
    }
  }

  if (typeof gsap !== 'undefined' && currentList) {
    // Configura container para crop sem empurrar conteúdo acima
    bodyContainer.style.overflow = 'hidden';
    bodyContainer.style.height = `${prevHeight}px`;

    // Posicionamento absoluto do elemento que está saindo
    currentList.style.position = 'absolute';
    currentList.style.top = '0';
    currentList.style.left = '0';
    currentList.style.width = '100%';

    newList.style.position = 'relative';
    newList.style.width = '100%';
    bodyContainer.appendChild(newList);

    const newHeight = newList.offsetHeight;
    const direction = delta > 0 ? 1 : -1;

    gsap.timeline({
      onComplete: () => {
        if (currentList.parentNode) currentList.parentNode.removeChild(currentList);
        bodyContainer.style.overflow = '';
        bodyContainer.style.height = 'auto';
        isTransitioning = false;
        if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
        updateNavPhysics();
      }
    })
    .to(currentList, {
      y: direction > 0 ? -40 : 40,
      opacity: 0,
      duration: 0.28,
      ease: 'power2.in'
    }, 0)
    .fromTo(newList, {
      y: direction > 0 ? 40 : -40,
      opacity: 0
    }, {
      y: 0,
      opacity: 1,
      duration: 0.28,
      ease: 'power2.out'
    }, 0.08)
    .to(bodyContainer, {
      height: newHeight,
      duration: 0.3,
      ease: 'power2.inOut'
    }, 0);

  } else {
    bodyContainer.innerHTML = '';
    bodyContainer.appendChild(newList);
    isTransitioning = false;
    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
    updateNavPhysics();
  }
};

function toggleDrawer(groupRow) {
  const drawer = groupRow.querySelector('.detail-drawer');
  if (!drawer) return;

  const isOpen = groupRow.classList.contains('is-open');

  if (!isOpen) {
    groupRow.classList.add('is-open');
    if (typeof gsap !== 'undefined') {
      gsap.to(drawer, { height: 'auto', maxHeight: '80vh', opacity: 1, duration: 0.35, ease: 'power2.out' });
    } else {
      drawer.style.height = 'auto';
      drawer.style.opacity = 1;
    }
  } else {
    const overlay = drawer.querySelector('.drawer-expanded-overlay');
    if (overlay) overlay.style.display = 'none';

    groupRow.classList.remove('is-open');
    if (typeof gsap !== 'undefined') {
      gsap.to(drawer, { height: 0, opacity: 0, duration: 0.3, ease: 'power2.in' });
    } else {
      drawer.style.height = 0;
      drawer.style.opacity = 0;
    }
  }

  setTimeout(() => {
    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
    updateNavPhysics();
  }, 350);
}

window.handleDrawerCloseClick = function(event, btnElement) {
  event.stopPropagation();
  const drawer = btnElement.closest('.detail-drawer');
  if (!drawer) return;

  const overlay = drawer.querySelector('.drawer-expanded-overlay');
  if (overlay && overlay.style.display === 'flex') {
    closeExpandedGallery(event, overlay);
  } else {
    const parentRow = drawer.closest('.expo-group-row');
    if (parentRow) toggleDrawer(parentRow);
  }
};

window.syncCaptionWidth = function(imgEl) {
  if (!imgEl) return;
  const item = imgEl.closest('.drawer-expanded-item');
  if (!item) return;
  const caption = item.querySelector('.drawer-expanded-caption');
  const imgWrap = item.querySelector('.drawer-expanded-img-wrap');
  const w = imgEl.getBoundingClientRect().width || imgEl.clientWidth;
  if (w > 0) {
    if (imgWrap) imgWrap.style.width = `${w}px`;
    if (caption) caption.style.width = `${w}px`;
  }
};

window.openExpandedGallery = function(event, triggerElement, imageIndex) {
  event.stopPropagation();
  const drawer = triggerElement.closest('.detail-drawer');
  if (!drawer) return;

  const overlay = drawer.querySelector('.drawer-expanded-overlay');
  const track = drawer.querySelector('.drawer-expanded-track');
  if (!overlay || !track) return;

  overlay.style.display = 'flex';
  const targetImg = track.children[imageIndex];
  if (targetImg) track.scrollLeft = targetImg.offsetLeft - 60;

  // Sincroniza larguras de legendas com as imagens
  const syncAll = () => {
    track.querySelectorAll('.drawer-expanded-item').forEach(item => {
      const img = item.querySelector('img');
      const caption = item.querySelector('.drawer-expanded-caption');
      const imgWrap = item.querySelector('.drawer-expanded-img-wrap');
      if (img) {
        const w = img.getBoundingClientRect().width || img.clientWidth;
        if (w > 0) {
          if (imgWrap) imgWrap.style.width = `${w}px`;
          if (caption) caption.style.width = `${w}px`;
        }
      }
    });
  };

  syncAll();

  if (typeof gsap !== 'undefined') {
    gsap.to(drawer, { height: '80vh', duration: 0.35, ease: 'power2.out', onUpdate: syncAll });
    gsap.fromTo(overlay, { opacity: 0, scale: 0.99 }, { opacity: 1, scale: 1, duration: 0.25, ease: 'power2.out', onComplete: syncAll });
  } else {
    drawer.style.height = '80vh';
    overlay.style.opacity = 1;
    syncAll();
  }

  const drawerTop = drawer.getBoundingClientRect().top + window.scrollY;
  const headerEl = document.getElementById('table-header-container');
  const headerHeight = headerEl ? headerEl.getBoundingClientRect().height : 34;
  const targetScroll = Math.max(0, drawerTop - headerHeight);

  window.scrollTo({
    top: targetScroll,
    behavior: 'smooth'
  });
  
  setTimeout(() => {
    syncAll();
    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
    updateNavPhysics();
  }, 350);
};

window.closeExpandedGallery = function(event, overlayElement) {
  if (event) event.stopPropagation();
  if (!overlayElement) return;

  const drawer = overlayElement.closest('.detail-drawer');

  if (typeof gsap !== 'undefined') {
    gsap.to(overlayElement, {
      opacity: 0, scale: 0.99, duration: 0.2, ease: 'power2.in',
      onComplete: () => { overlayElement.style.display = 'none'; }
    });
    if (drawer) gsap.to(drawer, { height: 'auto', duration: 0.35, ease: 'power2.inOut' });
  } else {
    overlayElement.style.display = 'none';
    if (drawer) drawer.style.height = 'auto';
  }
  
  setTimeout(() => {
    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
    updateNavPhysics();
  }, 350);
};

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.drawer-expanded-overlay').forEach(overlay => {
      if (overlay.style.display === 'flex') closeExpandedGallery(null, overlay);
    });
  }
});
