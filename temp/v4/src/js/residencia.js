/**
 * RESIDÊNCIA FONTE — MÓDULO JS ESPECIALISTA
 * Renderização modular em grid suíço, expansões inline e navegação fluida
 */

export async function loadResidencia() {
  const container = document.getElementById('residencia-container');
  if (!container) return;

  try {
    const res = await fetch('./residencia.json');
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const data = await res.json();
    renderResidencia(data, container);
    initResidenciaInteractions(data);
    initResidenciaGsap();
  } catch (err) {
    console.error('[Residência] Falha ao carregar dados:', err);
    container.innerHTML = `
      <div class="residencia-layout-container" style="padding: 60px 20px; text-align: center;">
        <p style="font-size: var(--fs-body); font-weight: 500;">Não foi possível carregar os dados da residência no momento.</p>
        <p style="font-size: var(--fs-meta); margin-top: 8px;">Entre em contato com residencia<a href="mailto:residencia@font-e.org" class="email-at">@</a>font-e.org</p>
      </div>
    `;
  }
}

function renderResidencia(data, container) {
  const { institucional, modalidades = [], candidatura, artistas_residentes = [] } = data;

  const emailParts = (institucional.email || 'residencia@font-e.org').split('@');
  const emailUser = emailParts[0] || 'residencia';
  const emailDomain = emailParts[1] || 'font-e.org';

  const defaultImg = institucional.imagem_inicial || modalidades[0]?.imagem || 'https://firebrick-mallard-266745.hostingersite.com/media/pages/eventos/lava-3-edicao/642efed40f-1788370389/lava_2023_03-1400x1400-q82.webp';

  const html = `
    <!-- 1. TÍTULO DE SEÇÃO -->
    <div class="residencia-title-wrap">
      <h1 class="residencia-section-title">${institucional.titulo || 'RESIDÊNCIA'}</h1>
    </div>

    <div class="residencia-layout-container">
      
      <!-- 2. DECLARAÇÃO & MODALIDADES EXPANSÍVEIS (COLS 1-7) + IMAGEM STICKY (COLS 8-12) -->
      <div class="residencia-intro-grid">
        <div class="residencia-intro-left-col">
          <div class="residencia-intro-lead-box">
            <p class="residencia-intro-lead-text">${institucional.subtitulo}</p>
          </div>
          
          <div class="residencia-modalidades-list" id="residencia-modalidades-list">
            ${modalidades.map((mod, idx) => `
              <article class="modalidade-item" data-mod-id="${mod.id}" data-mod-index="${idx}" id="modalidade-item-${mod.id}">
                <div class="modalidade-header" tabindex="0" role="button" aria-expanded="false" aria-label="${mod.nome}">
                  <h3 class="modalidade-name">${mod.nome}</h3>
                  <div class="modalidade-duration">${mod.duracao}</div>
                  <div class="modalidade-toggle-icon">
                    <span class="modalidade-icon-plus">+</span>
                  </div>
                </div>
                <div class="modalidade-drawer" id="modalidade-drawer-${idx}">
                  <div class="modalidade-drawer-content">
                    <div class="modalidade-drawer-text">
                      <p class="modalidade-content-body">${mod.descricao || mod.resumo}</p>
                      ${mod.destaques && mod.destaques.length ? `
                        <ul class="modalidade-destaques-list">
                          ${mod.destaques.map(item => `<li>${item}</li>`).join('')}
                        </ul>
                      ` : ''}
                    </div>
                  </div>
                </div>
              </article>
            `).join('')}
          </div>
        </div>

        <div class="residencia-intro-image-col">
          <img id="residencia-hero-img" class="residencia-intro-img" src="${defaultImg}" alt="Residência FONTE" loading="lazy" />
        </div>
      </div>

      <!-- 3. FILTRO DE ARTISTAS & HISTÓRICO -->
      <div class="residencia-subhead-row">
        <span class="residencia-subhead-label">Artistas Residentes & Registros de Processo</span>
      </div>

      <div class="residencia-filter-bar" role="group" aria-label="Filtro de Artistas">
        <button type="button" class="filter-pill is-active" data-filter="all">TODOS</button>
        <button type="button" class="filter-pill" data-filter="Investigação Individual">INDIVIDUAL</button>
        <button type="button" class="filter-pill" data-filter="Residência Coletiva">COLETIVA (LAVA)</button>
        <button type="button" class="filter-pill" data-filter="Parceria Institucional">PARCERIA</button>
        <button type="button" class="filter-pill" data-filter="Ocupação Live">OCUPAÇÃO LIVE</button>
      </div>

      <!-- Painel de Inspeção Inline no Grid -->
      <div class="artista-inspect-panel" id="artista-inspect-panel">
        <div class="artista-inspect-img-col">
          <img id="inspect-img" src="" alt="" />
        </div>
        <div class="artista-inspect-info-col">
          <div>
            <h3 class="artista-inspect-title" id="inspect-nome"></h3>
            <div class="artista-inspect-subtitle" id="inspect-meta"></div>
            <p class="artista-inspect-text" id="inspect-desc"></p>
            <div class="artista-inspect-caption" id="inspect-legenda"></div>
          </div>
          <button type="button" class="artista-inspect-close-btn" id="inspect-close-btn">FECHAR DETALHES</button>
        </div>
      </div>

      <div class="artistas-master-grid" id="artistas-grid-container">
        ${artistas_residentes.map((art, idx) => `
          <article class="artista-card" data-modalidade="${art.modalidade}" data-artist-index="${idx}" id="artista-card-${art.id}" tabindex="0" role="button" aria-label="${art.nome}">
            <div class="artista-image-wrap">
              <img class="artista-image" src="${art.imagem}" alt="${art.nome}" loading="lazy" />
            </div>
            <div class="artista-meta-box">
              <h4 class="artista-nome">${art.nome}</h4>
              <div class="artista-origem">${art.origem} • ${art.ano}</div>
              <div class="artista-modalidade-label">${art.modalidade}</div>
            </div>
          </article>
        `).join('')}
      </div>

      <!-- 4. CANDIDATURA & INSCRIÇÕES -->
      <div class="candidatura-grid">
        <div class="candidatura-left-col">
          <div>
            <h2 class="candidatura-heading">${candidatura.titulo}</h2>
            <p class="candidatura-chamada">${candidatura.chamada}</p>
          </div>
          <div class="candidatura-email-line">
            Envio de propostas: ${emailUser}<a href="mailto:${institucional.email || 'residencia@font-e.org'}" class="email-at">@</a>${emailDomain}
          </div>
        </div>

        <div class="candidatura-right-col">
          <div class="candidatura-requisitos-label">Dossiê de candidatura (PDF):</div>
          <ul class="candidatura-requisitos-list">
            ${candidatura.requisitos.map(req => `<li>${req}</li>`).join('')}
          </ul>
        </div>
      </div>

    </div>
  `;

  container.innerHTML = html;
}

/**
 * Interações no grid: Acordeão único de modalidades, Filtro determinístico e Inspeção de artistas
 */
function initResidenciaInteractions(data) {
  const { institucional = {}, modalidades = [], artistas_residentes = [] } = data;
  const defaultImg = institucional.imagem_inicial || modalidades[0]?.imagem || 'https://firebrick-mallard-266745.hostingersite.com/media/pages/eventos/lava-3-edicao/642efed40f-1788370389/lava_2023_03-1400x1400-q82.webp';

  // --- 1. EXPANSÃO DE MODALIDADES (ACORDEÃO ÚNICO + TROCA DE IMAGEM STICKY) ---
  const modItems = document.querySelectorAll('.modalidade-item');
  const heroImg = document.getElementById('residencia-hero-img');
  let activeModIndex = null;
  let isAnimatingMod = false;

  const toggleModalidade = (index) => {
    if (isAnimatingMod) return;
    const item = modItems[index];
    if (!item) return;

    const drawer = item.querySelector('.modalidade-drawer');
    const header = item.querySelector('.modalidade-header');
    const mod = modalidades[index];

    if (activeModIndex === index) {
      // Fecha o item atual
      isAnimatingMod = true;
      item.classList.remove('is-open');
      if (header) header.setAttribute('aria-expanded', 'false');

      // Restaura a imagem inicial institucional
      if (heroImg && defaultImg) {
        if (typeof gsap !== 'undefined') {
          gsap.to(heroImg, {
            opacity: 0.3,
            duration: 0.15,
            onComplete: () => {
              heroImg.src = defaultImg;
              gsap.to(heroImg, { opacity: 1, duration: 0.3, ease: 'power2.out' });
            }
          });
        } else {
          heroImg.src = defaultImg;
        }
      }

      if (typeof gsap !== 'undefined') {
        gsap.to(drawer, {
          height: 0,
          opacity: 0,
          duration: 0.35,
          ease: 'power2.inOut',
          onComplete: () => {
            drawer.style.height = '0px';
            isAnimatingMod = false;
            if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
          }
        });
      } else {
        drawer.style.height = '0px';
        drawer.style.opacity = '0';
        isAnimatingMod = false;
      }
      activeModIndex = null;
    } else {
      // Fecha o item anterior
      isAnimatingMod = true;

      if (activeModIndex !== null && modItems[activeModIndex]) {
        const prevItem = modItems[activeModIndex];
        const prevDrawer = prevItem.querySelector('.modalidade-drawer');
        const prevHeader = prevItem.querySelector('.modalidade-header');
        prevItem.classList.remove('is-open');
        if (prevHeader) prevHeader.setAttribute('aria-expanded', 'false');

        if (typeof gsap !== 'undefined') {
          gsap.to(prevDrawer, {
            height: 0,
            opacity: 0,
            duration: 0.25,
            ease: 'power2.inOut'
          });
        } else {
          prevDrawer.style.height = '0px';
          prevDrawer.style.opacity = '0';
        }
      }

      // Abre o novo item
      item.classList.add('is-open');
      if (header) header.setAttribute('aria-expanded', 'true');

      // Troca suave de imagem sticky à direita
      if (heroImg && mod?.imagem) {
        if (typeof gsap !== 'undefined') {
          gsap.to(heroImg, {
            opacity: 0.3,
            duration: 0.15,
            onComplete: () => {
              heroImg.src = mod.imagem;
              gsap.to(heroImg, { opacity: 1, duration: 0.3, ease: 'power2.out' });
            }
          });
        } else {
          heroImg.src = mod.imagem;
        }
      }

      if (typeof gsap !== 'undefined') {
        drawer.style.height = 'auto';
        const targetHeight = drawer.offsetHeight;
        drawer.style.height = '0px';

        gsap.fromTo(drawer, 
          { height: 0, opacity: 0 },
          {
            height: targetHeight,
            opacity: 1,
            duration: 0.38,
            ease: 'power2.out',
            onComplete: () => {
              drawer.style.height = 'auto';
              isAnimatingMod = false;
              if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
            }
          }
        );
      } else {
        drawer.style.height = 'auto';
        drawer.style.opacity = '1';
        isAnimatingMod = false;
      }

      // 1. Posição base do container de modalidades em relação ao topo do documento
      const listContainer = document.getElementById('residencia-modalidades-list');
      const listTopDoc = listContainer 
        ? listContainer.getBoundingClientRect().top + (window.pageYOffset || document.documentElement.scrollTop)
        : item.getBoundingClientRect().top + (window.pageYOffset || document.documentElement.scrollTop);

      // 2. Soma a altura estática dos cabeçalhos fechados de todos os itens anteriores
      let itemsBeforeHeight = 0;
      for (let i = 0; i < index; i++) {
        const prevHeader = modItems[i]?.querySelector('.modalidade-header');
        if (prevHeader) {
          itemsBeforeHeight += prevHeader.offsetHeight;
        }
      }

      // 3. Altura dinâmica do cabeçalho sticky da página + 8px de respiro
      const headerEl = document.getElementById('logo-controller');
      const headerH = headerEl ? headerEl.offsetHeight : 66;
      const targetScroll = Math.max(0, listTopDoc + itemsBeforeHeight - headerH - 8);

      // 4. Executa a rolagem suave diretamente para a posição calculada
      window.scrollTo({
        top: targetScroll,
        behavior: 'smooth'
      });

      activeModIndex = index;
    }

    if (typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.refresh();
    }
  };

  modItems.forEach((item, idx) => {
    const header = item.querySelector('.modalidade-header');
    if (header) {
      header.addEventListener('click', () => toggleModalidade(idx));
      header.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleModalidade(idx);
        }
      });
    }
  });

  // --- 2. FILTRO DE ARTISTAS ---
  const filterPills = document.querySelectorAll('.filter-pill');
  const artistaCards = document.querySelectorAll('.artista-card');
  const inspectPanel = document.getElementById('artista-inspect-panel');

  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('is-active'));
      pill.classList.add('is-active');

      const filterVal = pill.getAttribute('data-filter');

      artistaCards.forEach(card => {
        const cardMod = card.getAttribute('data-modalidade');
        if (filterVal === 'all' || cardMod.toLowerCase().includes(filterVal.toLowerCase())) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });

      // Fechar inspector se filtrado
      if (inspectPanel) {
        inspectPanel.classList.remove('is-open');
      }
      artistaCards.forEach(c => c.classList.remove('is-active'));

      if (typeof ScrollTrigger !== 'undefined') {
        ScrollTrigger.refresh();
      }
    });
  });

  // --- 3. INSPEÇÃO INLINE DE ARTISTAS NO GRID (SEM LIGHTBOX) ---
  const inspectImg = document.getElementById('inspect-img');
  const inspectNome = document.getElementById('inspect-nome');
  const inspectMeta = document.getElementById('inspect-meta');
  const inspectDesc = document.getElementById('inspect-desc');
  const inspectLegenda = document.getElementById('inspect-legenda');
  const inspectCloseBtn = document.getElementById('inspect-close-btn');

  let activeArtistIndex = null;

  const openArtistInspect = (index) => {
    const artist = artistas_residentes[index];
    if (!artist || !inspectPanel) return;

    if (activeArtistIndex === index && inspectPanel.classList.contains('is-open')) {
      closeArtistInspect();
      return;
    }

    artistaCards.forEach((c, i) => {
      if (i === index) c.classList.add('is-active');
      else c.classList.remove('is-active');
    });

    inspectImg.src = artist.imagem;
    inspectImg.alt = artist.nome;
    inspectNome.textContent = artist.nome;
    inspectMeta.textContent = `${artist.origem} • ${artist.ano} • ${artist.modalidade}`;
    inspectDesc.textContent = artist.resumo;
    inspectLegenda.textContent = artist.legenda;

    inspectPanel.classList.add('is-open');
    activeArtistIndex = index;

    if (typeof gsap !== 'undefined') {
      gsap.fromTo(inspectPanel, { opacity: 0.6 }, { opacity: 1, duration: 0.35, ease: 'power2.out' });
    }

    const header = document.getElementById('logo-controller');
    const headerHeight = header ? header.offsetHeight : 66;
    const inspectTop = inspectPanel.getBoundingClientRect().top + window.scrollY - headerHeight - 6;

    window.scrollTo({
      top: inspectTop,
      behavior: 'smooth'
    });

    if (typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.refresh();
    }
  };

  const closeArtistInspect = () => {
    if (!inspectPanel) return;
    inspectPanel.classList.remove('is-open');
    artistaCards.forEach(c => c.classList.remove('is-active'));
    activeArtistIndex = null;

    if (typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.refresh();
    }
  };

  artistaCards.forEach(card => {
    const idx = parseInt(card.getAttribute('data-artist-index'), 10);
    card.addEventListener('click', () => openArtistInspect(idx));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openArtistInspect(idx);
      }
    });
  });

  if (inspectCloseBtn) {
    inspectCloseBtn.addEventListener('click', closeArtistInspect);
  }
}

/**
 * Animações GSAP sem reflow
 */
function initResidenciaGsap() {
  if (typeof gsap === 'undefined') return;

  gsap.from('.residencia-section-title', {
    y: 20,
    opacity: 0,
    duration: 0.7,
    ease: 'power2.out'
  });

  gsap.from('.residencia-intro-lead-text, .residencia-intro-image-col', {
    y: 15,
    opacity: 0,
    duration: 0.7,
    delay: 0.15,
    ease: 'power2.out'
  });

  if (typeof ScrollTrigger !== 'undefined') {
    ScrollTrigger.batch('.artista-card', {
      onEnter: (batch) => gsap.to(batch, {
        opacity: 1,
        stagger: 0.04,
        overwrite: true,
        duration: 0.4,
        ease: 'power2.out'
      }),
      start: 'top 92%'
    });

    ScrollTrigger.refresh();
  }
}
