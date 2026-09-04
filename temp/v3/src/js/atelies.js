/**
 * Módulo Ateliês - Residência Artística FONTE
 * Layout de 12 Colunas:
 * - Colunas 1, 2, 3: Nomes empilhados dos 9 artistas
 * - Colunas 4 a 12: Palco dinâmico (Grid 3x3 de fotos com hover interativo ou Painel de Detalhes deslizante)
 */

let ateliesData = [];
let activeArtistId = null;
let currentTab = 'sobre';
let isAnimating = false;

export function updateHeaderHeight() {
  const header = document.getElementById('logo-controller');
  if (header) {
    const height = header.offsetHeight;
    document.documentElement.style.setProperty('--header-height', `${height}px`);
  }
}

export function loadAtelies() {
  updateHeaderHeight();
  window.addEventListener('resize', updateHeaderHeight);

  return fetch('./atelies.json')
    .then(response => {
      if (!response.ok) {
        return fetch('/atelies.json');
      }
      return response;
    })
    .then(response => {
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      return response.json();
    })
    .then(data => {
      ateliesData = data;
      renderAteliesLayout(data);
    })
    .catch(err => {
      console.warn('Erro ao carregar atelies.json:', err);
      renderEmptyState();
    });
}

function renderEmptyState() {
  const container = document.getElementById('atelies-grid-container');
  if (!container) return;
  container.innerHTML = `
    <div class="empty-state" style="padding: 48px 20px; font-size: var(--fs-meta); border-top: var(--border-width) solid var(--border-color); text-transform: uppercase; letter-spacing: 0.05em;">
      Nenhum ateliê cadastrado no momento.
    </div>
  `;
}

function renderAteliesLayout(data) {
  const container = document.getElementById('atelies-grid-container');
  if (!container) return;
  container.innerHTML = '';

  const layoutWrap = document.createElement('div');
  layoutWrap.className = 'atelies-layout-container';

  const masterGrid = document.createElement('div');
  masterGrid.className = 'atelies-master-grid';

  // 1. Coluna Esquerda: 9 Nomes Empilhados (Colunas 1, 2, 3)
  const sidebar = document.createElement('aside');
  sidebar.className = 'atelies-names-sidebar';
  sidebar.id = 'atelies-names-sidebar';

  data.forEach((artista, index) => {
    const nameItem = document.createElement('div');
    nameItem.className = 'artist-name-item';
    nameItem.dataset.id = artista.id;
    nameItem.dataset.index = index.toString();
    nameItem.setAttribute('role', 'button');
    nameItem.setAttribute('tabindex', '0');
    nameItem.setAttribute('aria-label', `Ver detalhes de ${artista.nome}`);

    // Formata o nome para permitir quebra perfeita no mobile entre termos compostos
    const formattedName = artista.nome
      .split(' ')
      .map(part => `<span>${part}</span>`)
      .join(' ');

    nameItem.innerHTML = `
      <h2 class="artist-name-title">${formattedName}</h2>
    `;

    sidebar.appendChild(nameItem);
  });

  masterGrid.appendChild(sidebar);

  // 2. Área Direita: Palco Dinâmico (Colunas 4 a 12)
  const stageWrapper = document.createElement('div');
  stageWrapper.className = 'atelies-stage-wrapper';
  stageWrapper.id = 'atelies-stage-wrapper';

  // Estágio 1: Grid 3x3 de Fotos
  const photosStage = document.createElement('div');
  photosStage.className = 'atelies-photos-stage';
  photosStage.id = 'atelies-photos-stage';

  data.forEach((artista, index) => {
    const photoCell = document.createElement('div');
    photoCell.className = 'photo-cell';
    photoCell.dataset.id = artista.id;
    photoCell.dataset.index = index.toString();
    photoCell.setAttribute('role', 'button');
    photoCell.setAttribute('tabindex', '0');
    photoCell.setAttribute('aria-label', `Foto de ${artista.nome}`);

    photoCell.innerHTML = `
      <img src="${artista.imagem}" alt="${artista.nome}" loading="lazy">
    `;

    photosStage.appendChild(photoCell);
  });

  stageWrapper.appendChild(photosStage);

  // Estágio 2: Painel de Detalhe Deslizante (Gaveta Expandida nas Colunas 4-12)
  const detailStage = document.createElement('div');
  detailStage.className = 'atelies-detail-stage';
  detailStage.id = 'atelies-detail-stage';

  stageWrapper.appendChild(detailStage);

  masterGrid.appendChild(stageWrapper);
  layoutWrap.appendChild(masterGrid);
  container.appendChild(layoutWrap);

  attachInteractions(data);
}

function attachInteractions(data) {
  const nameItems = document.querySelectorAll('.artist-name-item');
  const photoCells = document.querySelectorAll('.photo-cell');
  const dataMap = new Map(data.map(item => [item.id, item]));

  // Hover Bidirecional: Nome <-> Foto
  nameItems.forEach(item => {
    const artistId = item.dataset.id;
    const targetPhoto = document.querySelector(`.photo-cell[data-id="${artistId}"]`);

    item.addEventListener('mouseenter', () => {
      if (activeArtistId === null) {
        item.classList.add('is-hovered');
        if (targetPhoto) targetPhoto.classList.add('is-highlighted');
      }
    });

    item.addEventListener('mouseleave', () => {
      item.classList.remove('is-hovered');
      if (targetPhoto) targetPhoto.classList.remove('is-highlighted');
    });

    // Clique no Nome
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      handleSelectArtist(artistId, dataMap);
    });

    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSelectArtist(artistId, dataMap);
      }
    });
  });

  photoCells.forEach(cell => {
    const artistId = cell.dataset.id;
    const targetName = document.querySelector(`.artist-name-item[data-id="${artistId}"]`);

    cell.addEventListener('mouseenter', () => {
      if (activeArtistId === null) {
        cell.classList.add('is-highlighted');
        if (targetName) targetName.classList.add('is-hovered');
      }
    });

    cell.addEventListener('mouseleave', () => {
      cell.classList.remove('is-highlighted');
      if (targetName) targetName.classList.remove('is-hovered');
    });

    // Clique na Foto
    cell.addEventListener('click', (e) => {
      e.stopPropagation();
      handleSelectArtist(artistId, dataMap);
    });

    cell.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSelectArtist(artistId, dataMap);
      }
    });
  });
}

function handleSelectArtist(artistId, dataMap) {
  if (isAnimating) return;

  // Se clicou no artista já aberto, fecha o detalhe e retorna ao grid
  if (activeArtistId === artistId) {
    closeArtistDetail();
    return;
  }

  const artistData = dataMap.get(artistId);
  if (!artistData) return;

  const previousId = activeArtistId;
  activeArtistId = artistId;
  currentTab = 'sobre';

  // Atualizar marcação na lista de nomes
  document.querySelectorAll('.artist-name-item').forEach(el => {
    if (el.dataset.id === artistId) {
      el.classList.add('is-active');
      el.classList.remove('is-hovered');
    } else {
      el.classList.remove('is-active');
    }
  });

  // Se já estava com detalhe aberto, transiciona apenas o conteúdo interno
  if (previousId !== null) {
    updateDetailContent(artistData, true);
  } else {
    // Abrir detalhe com animação GSAP de deslizamento por trás dos nomes
    openArtistDetail(artistData);
  }
}

function renderDetailDOM(artist) {
  const detailStage = document.getElementById('atelies-detail-stage');
  if (!detailStage) return;

  const linksHTML = `
    <div class="detail-links-wrap" id="detail-links-wrap">
      ${artist.links && artist.links.instagram ? `<a href="https://instagram.com/${artist.links.instagram.replace('@', '')}" target="_blank" rel="noopener noreferrer" class="detail-link-btn">${artist.links.instagram}</a>` : ''}
      ${artist.links && artist.links.portfolio ? `<a href="https://${artist.links.portfolio.replace(/^https?:\/\//, '')}" target="_blank" rel="noopener noreferrer" class="detail-link-btn">${artist.links.portfolio}</a>` : ''}
    </div>
  `;

  detailStage.innerHTML = `
    <div class="atelies-detail-inner" id="detail-inner-${artist.id}">
      <div class="detail-media-column">
        <div class="detail-image-wrap">
          <img src="${artist.imagem}" alt="${artist.nome}">
        </div>
      </div>
      <div class="detail-content-column">
        <div class="detail-toolbar">
          <div class="detail-tabs-group">
            <button type="button" class="detail-tab-btn is-active" data-tab="sobre">Sobre</button>
            <button type="button" class="detail-tab-btn" data-tab="pesquisa">Pesquisa</button>
            <button type="button" class="detail-tab-btn" data-tab="obras">Projetos</button>
            <button type="button" class="detail-tab-btn" data-tab="info">Info</button>
          </div>
          <button type="button" class="detail-close-btn" id="detail-close-action" aria-label="Fechar e voltar ao grid de fotos">
            ✕
          </button>
        </div>

        <div class="detail-body-scrollable" id="detail-body-scrollable">
          <div class="detail-body-wrap">
            <p class="detail-text-content" id="detail-text-body">${artist.sobre}</p>
            ${linksHTML}
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach tab events
  const tabBtns = detailStage.querySelectorAll('.detail-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const tab = btn.dataset.tab;
      currentTab = tab;
      tabBtns.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      updateTabBody(artist, tab);
    });
  });

  // Attach close event
  const closeBtn = detailStage.querySelector('#detail-close-action');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeArtistDetail();
    });
  }
}

function updateTabBody(artist, tab) {
  const textEl = document.getElementById('detail-text-body');
  const linksWrap = document.getElementById('detail-links-wrap');
  if (!textEl) return;

  if (tab === 'sobre') {
    textEl.textContent = artist.sobre || '';
    if (linksWrap) linksWrap.style.display = 'flex';
  } else if (tab === 'pesquisa') {
    textEl.textContent = artist.pesquisa || artist.sobre || '';
    if (linksWrap) linksWrap.style.display = 'none';
  } else if (tab === 'obras') {
    textEl.textContent = artist.obras || 'Obras e projetos desenvolvidos na residência FONTE.';
    if (linksWrap) linksWrap.style.display = 'none';
  } else if (tab === 'info') {
    textEl.textContent = `Artista Residente: ${artist.nome}\nResidência Artística FONTE 2026.`;
    if (linksWrap) linksWrap.style.display = 'flex';
  }
}

function updateDetailContent(artist, animated = true) {
  const detailStage = document.getElementById('atelies-detail-stage');
  if (!detailStage) return;

  if (typeof gsap !== 'undefined' && animated) {
    isAnimating = true;
    gsap.to(detailStage, {
      opacity: 0.4,
      duration: 0.15,
      ease: 'power2.in',
      onComplete: () => {
        renderDetailDOM(artist);
        gsap.to(detailStage, {
          opacity: 1,
          duration: 0.25,
          ease: 'power2.out',
          onComplete: () => {
            isAnimating = false;
            if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
          }
        });
      }
    });
  } else {
    renderDetailDOM(artist);
  }
}

function openArtistDetail(artist) {
  const photosStage = document.getElementById('atelies-photos-stage');
  const detailStage = document.getElementById('atelies-detail-stage');
  if (!photosStage || !detailStage) return;

  renderDetailDOM(artist);

  if (typeof gsap !== 'undefined') {
    isAnimating = true;
    gsap.killTweensOf([photosStage, detailStage]);

    // O grid de fotos desliza para a direita
    gsap.to(photosStage, {
      xPercent: 100,
      opacity: 0,
      duration: 0.6,
      ease: 'power3.inOut',
      onComplete: () => {
        photosStage.style.visibility = 'hidden';
      }
    });

    // O detalhe desliza por detrás dos nomes (vindo da esquerda xPercent: -100 para 0)
    detailStage.style.display = 'block';
    gsap.fromTo(detailStage, 
      {
        xPercent: -100,
        opacity: 0
      },
      {
        xPercent: 0,
        opacity: 1,
        duration: 0.6,
        ease: 'power3.out',
        onComplete: () => {
          isAnimating = false;
          if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
        }
      }
    );
  } else {
    photosStage.style.display = 'none';
    detailStage.style.display = 'block';
  }
}

function closeArtistDetail() {
  if (isAnimating) return;

  const photosStage = document.getElementById('atelies-photos-stage');
  const detailStage = document.getElementById('atelies-detail-stage');
  if (!photosStage || !detailStage) return;

  activeArtistId = null;

  // Desmarca nomes ativos
  document.querySelectorAll('.artist-name-item').forEach(el => {
    el.classList.remove('is-active');
    el.classList.remove('is-hovered');
  });

  // Remove highlight das fotos
  document.querySelectorAll('.photo-cell').forEach(el => {
    el.classList.remove('is-highlighted');
  });

  if (typeof gsap !== 'undefined') {
    isAnimating = true;
    gsap.killTweensOf([photosStage, detailStage]);

    // O detalhe desliza de volta para trás da lista de nomes
    gsap.to(detailStage, {
      xPercent: -100,
      opacity: 0,
      duration: 0.5,
      ease: 'power3.inOut',
      onComplete: () => {
        detailStage.style.display = 'none';
        detailStage.innerHTML = '';
      }
    });

    // O grid de fotos desliza de volta da direita para o centro
    photosStage.style.visibility = 'visible';
    gsap.fromTo(photosStage,
      {
        xPercent: 100,
        opacity: 0
      },
      {
        xPercent: 0,
        opacity: 1,
        duration: 0.55,
        ease: 'power3.out',
        onComplete: () => {
          isAnimating = false;
          if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
        }
      }
    );
  } else {
    detailStage.style.display = 'none';
    photosStage.style.display = 'grid';
  }
}
