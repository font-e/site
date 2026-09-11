/**
 * RESIDÊNCIA FONTE — MÓDULO JS ESPECIALISTA
 * Arquitetura de 3 colunas (4 + 4 + 4 = 12 colunas)
 * - Títulos diretos das modalidades (sem gavetas)
 * - Área dinâmica de texto explicativo
 * - Coluna de imagens com rolagem vertical (fichas de residências passadas)
 */

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Normaliza e associa os registros de artistas/ações à modalidade selecionada
 */
function getArtistasPorModalidade(artistas, mod) {
  if (!artistas || !Array.isArray(artistas) || !mod) return [];

  const modId = (mod.id || '').toLowerCase().trim();
  const modNome = (mod.nome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  return artistas.filter(art => {
    if (!art.modalidade) return false;
    const artMod = art.modalidade.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    if (artMod.includes(modNome) || modNome.includes(artMod)) return true;
    if (modId === 'individual' && artMod.includes('individual')) return true;
    if (modId === 'coletiva' && (artMod.includes('coletiva') || artMod.includes('lava'))) return true;
    if (modId === 'institucional' && artMod.includes('institucional')) return true;
    if (modId === 'ocupacao' && (artMod.includes('ocupacao') || artMod.includes('live'))) return true;

    return false;
  });
}

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

function renderAllGalleryItems(data) {
  const { modalidades = [], artistas_residentes = [] } = data;
  let html = '';

  modalidades.forEach((mod) => {
    const artistas = getArtistasPorModalidade(artistas_residentes, mod);
    artistas.forEach((art, artIdx) => {
      const isFirstOfMod = (artIdx === 0);
      const anchorAttr = isFirstOfMod ? `data-mod-anchor="${escapeHtml(mod.id)}" id="gallery-anchor-${escapeHtml(mod.id)}"` : '';
      const cidadeAno = [
        art.origem ? escapeHtml(art.origem).toUpperCase() : '',
        art.ano ? escapeHtml(String(art.ano)) : ''
      ].filter(Boolean).join(' • ');

      html += `
        <article class="residencia-gallery-item" id="ficha-${escapeHtml(art.id)}" data-mod-id="${escapeHtml(mod.id)}" ${anchorAttr}>
          <div class="residencia-gallery-img-wrap">
            <img src="${art.imagem}" 
                 alt="${escapeHtml(art.nome)}" 
                 loading="lazy" />
          </div>
          <div class="residencia-gallery-meta">
            <h3 class="residencia-gallery-artist-name">${escapeHtml(art.nome)}</h3>
            ${cidadeAno ? `<div class="residencia-gallery-cidade-ano">${cidadeAno}</div>` : ''}
            <div class="residencia-gallery-modalidade-label">${escapeHtml(art.modalidade || mod.nome)}</div>
          </div>
        </article>
      `;
    });
  });

  return html;
}

function renderResidencia(data, container) {
  const { institucional = {}, modalidades = [], candidatura = {} } = data;

  const emailParts = (institucional.email || 'residencia@font-e.org').split('@');
  const emailUser = emailParts[0] || 'residencia';
  const emailDomain = emailParts[1] || 'font-e.org';

  const html = `
    <!-- 1. TÍTULO DE SEÇÃO (ALINHADO À DIREITA NO LIMITE DA COLUNA 10) -->
    <div class="residencia-title-wrap">
      <h1 class="residencia-section-title">${escapeHtml(institucional.titulo || 'RESIDÊNCIA')}</h1>
    </div>

    <div class="residencia-layout-container">
      
      <!-- 2. GRID MASTER (12 COLUNAS: GRUPO A: 4 COLS, GRUPO B: 4 COLS, GRUPO C: 4 COLS) -->
      <div class="residencia-master-grid" id="residencia-master-grid">
        
        <!-- COLUNAS A + B (COLS 1 A 8: 8 COLUNAS) -->
        <div class="residencia-left-col">
          
          <!-- LINHA 1: TÍTULO T (OCUPA COLUNAS A E B) -->
          <div class="residencia-row-t">
            <h2 class="residencia-t-text">${escapeHtml(institucional.subtitulo || 'Pesquisa autodirigida e suporte curatorial em um ambiente intelectualmente estimulante gerido por artistas.')}</h2>
          </div>

          <!-- LINHAS 2 A 5: MODALIDADES (M# EM A, D# EM B, GAVETA NA LINHA ABAIXO OCUPANDO A E B) -->
          <div class="residencia-rows-list">
            ${modalidades.map((mod, idx) => `
              <div class="residencia-row-mod" data-mod-index="${idx}" data-mod-id="${escapeHtml(mod.id)}">
                
                <!-- LINHA SUPERIOR: MODALIDADE (COLUNA A) + DURAÇÃO (COLUNA B) -->
                <div class="residencia-mod-header" data-mod-index="${idx}">
                  <!-- COLUNA A (4 COLS): MODALIDADE M# -->
                  <div class="residencia-col-m">
                    <button type="button" 
                            class="residencia-col-m-btn" 
                            id="residencia-btn-${escapeHtml(mod.id)}"
                            aria-expanded="false"
                            aria-controls="residencia-drawer-${escapeHtml(mod.id)}"
                            data-mod-index="${idx}">
                      <span class="residencia-m-text">${escapeHtml(mod.nome)}</span>
                    </button>
                  </div>

                  <!-- COLUNA B (4 COLS): DURAÇÃO D# -->
                  <div class="residencia-col-d">
                    <div class="residencia-d-duracao">
                      <span class="residencia-d-text">${escapeHtml(mod.duracao || '')}</span>
                    </div>
                  </div>
                </div>

                <!-- GAVETA: ABRE NA LINHA ABAIXO OCUPANDO AS COLUNAS A E B (SEM DIVISÓRIA VERTICAL) -->
                <div class="residencia-d-drawer" id="residencia-drawer-${escapeHtml(mod.id)}" style="height: 0; overflow: hidden; opacity: 0;">
                  <div class="residencia-d-drawer-inner">
                    <p class="residencia-d-desc">${escapeHtml(mod.descricao || mod.resumo || '')}</p>
                    ${(mod.destaques && mod.destaques.length) ? `
                      <ul class="residencia-d-destaques">
                        ${mod.destaques.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
                      </ul>
                    ` : ''}
                  </div>
                </div>

              </div>
            `).join('')}
          </div>

        </div>

        <!-- COLUNA C (4 COLUNAS): GALERIA G (SCROLL ÚNICO COM TODAS AS MODALIDADES) -->
        <div class="residencia-gallery-col" id="residencia-modalidade-gallery" role="region" aria-label="Galeria de Residências">
          ${renderAllGalleryItems(data)}
        </div>

      </div>

      <!-- 3. CANDIDATURA & INSCRIÇÕES -->
      <div class="candidatura-grid">
        <div class="candidatura-left-col">
          <div>
            <h2 class="candidatura-heading">${escapeHtml(candidatura.titulo || 'Inscrições & Candidaturas')}</h2>
            <p class="candidatura-chamada">${escapeHtml(candidatura.chamada || '')}</p>
          </div>
          <div class="candidatura-email-line">
            Envio de propostas: ${escapeHtml(emailUser)}<a href="mailto:${escapeHtml(institucional.email || 'residencia@font-e.org')}" class="email-at">@</a>${escapeHtml(emailDomain)}
          </div>
        </div>

        <div class="candidatura-right-col">
          <div class="candidatura-requisitos-label">Dossiê de candidatura (PDF):</div>
          <ul class="candidatura-requisitos-list">
            ${(candidatura.requisitos || []).map(req => `<li>${escapeHtml(req)}</li>`).join('')}
          </ul>
        </div>
      </div>

    </div>
  `;

  container.innerHTML = html;
}

/**
 * Rola o container da galeria (scroll único) para que o primeiro evento
 * da modalidade selecionada fique no topo da área da galeria.
 */
function scrollGalleryToModalidade(modId) {
  const gallery = document.getElementById('residencia-modalidade-gallery');
  if (!gallery) return;

  const target = gallery.querySelector(`[data-mod-anchor="${modId}"]`);
  if (!target) return;

  const galleryRect = gallery.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const scrollDelta = targetRect.top - galleryRect.top;

  gallery.scrollBy({
    top: scrollDelta,
    behavior: 'smooth'
  });
}

/**
 * Alterna (abre/fecha) a gaveta da modalidade nas colunas A e B,
 * mantendo recálculo explícito do ScrollTrigger e sincronizando a galeria.
 */
function toggleModalidadeRow(modIndex, data) {
  const mod = data.modalidades[modIndex];
  if (!mod) return;

  const allRows = document.querySelectorAll('.residencia-row-mod');
  const targetRow = document.querySelector(`.residencia-row-mod[data-mod-index="${modIndex}"]`);
  if (!targetRow) return;

  const isAlreadyOpen = targetRow.classList.contains('is-open');

  allRows.forEach((row) => {
    const rowIdx = parseInt(row.getAttribute('data-mod-index'), 10);
    const drawer = row.querySelector('.residencia-d-drawer');
    const btnM = row.querySelector('.residencia-col-m-btn');

    if (rowIdx === modIndex) {
      if (isAlreadyOpen) {
        // Fecha se já estiver aberto
        row.classList.remove('is-open');
        if (btnM) {
          btnM.classList.remove('is-active');
          btnM.setAttribute('aria-expanded', 'false');
        }
        if (drawer && typeof gsap !== 'undefined') {
          gsap.to(drawer, {
            height: 0,
            opacity: 0,
            duration: 0.35,
            ease: 'power2.inOut',
            onComplete: () => {
              if (typeof ScrollTrigger !== 'undefined') {
                ScrollTrigger.refresh();
              }
            }
          });
        } else if (drawer) {
          drawer.style.height = '0';
          drawer.style.opacity = '0';
        }
      } else {
        // Abre e calcula altura dinâmica
        row.classList.add('is-open');
        if (btnM) {
          btnM.classList.add('is-active');
          btnM.setAttribute('aria-expanded', 'true');
        }
        if (drawer && typeof gsap !== 'undefined') {
          gsap.set(drawer, { height: 'auto', opacity: 1 });
          const targetHeight = drawer.offsetHeight;
          gsap.fromTo(drawer,
            { height: 0, opacity: 0 },
            {
              height: targetHeight,
              opacity: 1,
              duration: 0.38,
              ease: 'power2.out',
              onComplete: () => {
                drawer.style.height = 'auto';
                if (typeof ScrollTrigger !== 'undefined') {
                  ScrollTrigger.refresh();
                }
              }
            }
          );
        } else if (drawer) {
          drawer.style.height = 'auto';
          drawer.style.opacity = '1';
        }
      }
    } else {
      // Fecha outras gavetas
      if (row.classList.contains('is-open')) {
        row.classList.remove('is-open');
        if (btnM) {
          btnM.classList.remove('is-active');
          btnM.setAttribute('aria-expanded', 'false');
        }
        if (drawer && typeof gsap !== 'undefined') {
          gsap.to(drawer, {
            height: 0,
            opacity: 0,
            duration: 0.3,
            ease: 'power2.inOut',
            onComplete: () => {
              if (typeof ScrollTrigger !== 'undefined') {
                ScrollTrigger.refresh();
              }
            }
          });
        } else if (drawer) {
          drawer.style.height = '0';
          drawer.style.opacity = '0';
        }
      }
    }
  });

  // Rola suavemente a galeria até o primeiro evento da modalidade
  scrollGalleryToModalidade(mod.id);
}

/**
 * Inicialização das interações com delegação determinística de eventos
 */
function initResidenciaInteractions(data) {
  const { modalidades = [] } = data;
  if (!modalidades.length) return;

  const rows = document.querySelectorAll('.residencia-row-mod');
  rows.forEach((row) => {
    const idx = parseInt(row.getAttribute('data-mod-index'), 10);
    const header = row.querySelector('.residencia-mod-header');

    if (header) {
      header.addEventListener('click', (e) => {
        e.preventDefault();
        toggleModalidadeRow(idx, data);
      });
    }

    const btnM = row.querySelector('.residencia-col-m-btn');
    if (btnM) {
      btnM.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleModalidadeRow(idx, data);
        }
      });
    }
  });
}

/**
 * Animações de entrada com GSAP sem reflow
 */
function initResidenciaGsap() {
  if (typeof gsap === 'undefined') return;

  gsap.from('.residencia-section-title', {
    y: 20,
    opacity: 0,
    duration: 0.6,
    ease: 'power2.out'
  });

  gsap.from('.residencia-master-grid', {
    opacity: 0,
    duration: 0.6,
    delay: 0.15,
    ease: 'power2.out',
    onComplete: () => {
      if (typeof ScrollTrigger !== 'undefined') {
        ScrollTrigger.refresh();
      }
    }
  });
}
