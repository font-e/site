/**
 * RESIDÊNCIA FONTE — MÓDULO JS ESPECIALISTA
 * Integração assíncrona de dados, máquina de estados para filtros e animações GSAP
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
      <div class="pilar-card" style="grid-column: span 12; text-align: center; padding: 60px 20px;">
        <p class="pilar-title">Erro ao carregar dados da residência</p>
        <p class="pilar-desc">Por favor, recarregue a página ou entre em contato com residencia@font-e.org.</p>
      </div>
    `;
  }
}

function renderResidencia(data, container) {
  const { institucional, pilares, modalidades, infraestrutura, candidatura, artistas_residentes } = data;

  const html = `
    <div class="residencia-section" id="residencia-root">
      
      <!-- 1. HERO / DECLARAÇÃO INSTITUCIONAL -->
      <div class="residencia-hero-grid" id="residencia-hero">
        <div class="residencia-hero-left">
          <div>
            <span class="residencia-tag">PROGRAMA DE RESIDÊNCIA</span>
            <h1 class="residencia-title">${institucional.titulo}</h1>
            <p class="residencia-statement-lead">${institucional.subtitulo}</p>
          </div>
          <div class="residencia-meta-list">
            <div class="residencia-meta-item">
              <strong>Localização:</strong>
              <span>${institucional.localizacao.endereco}</span>
            </div>
            <div class="residencia-meta-item">
              <strong>Horário de Funcionamento:</strong>
              <span>${institucional.localizacao.horario}</span>
            </div>
            <div class="residencia-meta-item">
              <strong>Direção Artística:</strong>
              <span>${institucional.direcao}</span>
            </div>
            <div class="residencia-meta-item">
              <strong>Contato Direto:</strong>
              <span>${institucional.localizacao.contato}</span>
            </div>
          </div>
        </div>

        <div class="residencia-hero-right">
          <div>
            <span class="residencia-tag" style="background-color: transparent; border: 1.5px solid var(--border-color); color: var(--bg-black);">MANIFESTO & ATUAÇÃO</span>
            <p class="residencia-statement-body">${institucional.declaracao}</p>
          </div>
          <div class="residencia-actions">
            <a href="#sec-candidatura" class="residencia-btn" id="btn-hero-candidatar">
              <span>CANDIDATAR-SE / OPEN CALL</span>
              <span>→</span>
            </a>
            <a href="#sec-modalidades" class="residencia-btn residencia-btn-secondary" id="btn-hero-modalidades">
              <span>MODALIDADES</span>
            </a>
            <a href="#sec-residentes" class="residencia-btn residencia-btn-secondary" id="btn-hero-residentes">
              <span>ARTISTAS RESIDENTES</span>
            </a>
          </div>
        </div>
      </div>

      <!-- 2. PILARES CONCEITUAIS -->
      <div class="residencia-pilares-grid" id="residencia-pilares">
        ${pilares.map(pilar => `
          <article class="pilar-card" id="pilar-${pilar.id}">
            <div>
              <div class="pilar-number">${pilar.numero} / PILAR</div>
              <h2 class="pilar-title">${pilar.titulo}</h2>
            </div>
            <p class="pilar-desc">${pilar.descricao}</p>
          </article>
        `).join('')}
      </div>

      <!-- 3. SEÇÃO DE MODALIDADES -->
      <div id="sec-modalidades">
        <div class="section-header-bar">
          <div class="section-header-title">MODALIDADES DE IMERSÃO & PESQUISA</div>
          <div class="section-header-sub">FLUXO CONTÍNUO & CHAMADAS ABERTAS</div>
        </div>

        <div class="modalidades-grid">
          ${modalidades.map(mod => `
            <article class="modalidade-card" id="modalidade-${mod.id}">
              <div>
                <div class="modalidade-header">
                  <span class="modalidade-code-badge">${mod.codigo}</span>
                  <h3 class="modalidade-name">${mod.nome}</h3>
                  <div class="modalidade-duration">Duração: ${mod.duracao}</div>
                  <p class="modalidade-summary">${mod.resumo}</p>
                </div>
                <ul class="modalidade-destaques-list">
                  ${mod.destaques.map(item => `<li>${item}</li>`).join('')}
                </ul>
              </div>
              <div>
                <button type="button" class="modalidade-toggle-btn" data-mod-id="${mod.id}">
                  VER ESTRUTURA COMPLETA +
                </button>
              </div>
            </article>
          `).join('')}
        </div>
      </div>

      <!-- 4. ARTISTAS RESIDENTES & ARQUIVO DE PROCESSOS -->
      <div id="sec-residentes">
        <div class="section-header-bar">
          <div class="section-header-title">ARTISTAS RESIDENTES & REGISTROS DE ATELIÊ</div>
          <div class="section-header-sub">HISTÓRICO DE RESIDÊNCIAS NO foNTE</div>
        </div>

        <div class="residentes-controls-bar">
          <div class="residentes-filters" role="group" aria-label="Filtro por Modalidade">
            <button type="button" class="filter-chip is-active" data-filter="all">TODOS (${artistas_residentes.length})</button>
            <button type="button" class="filter-chip" data-filter="Investigação Individual">INDIVIDUAL</button>
            <button type="button" class="filter-chip" data-filter="Residência Coletiva">COLETIVA (LAVA)</button>
            <button type="button" class="filter-chip" data-filter="Parceria Institucional">PARCERIA / PRÊMIOS</button>
            <button type="button" class="filter-chip" data-filter="Ocupação Live">OCUPAÇÃO LIVE</button>
          </div>
          <div class="residentes-counter" id="residentes-counter-display">
            EXIBINDO <strong>${artistas_residentes.length}</strong> REGISTROS
          </div>
        </div>

        <div class="residentes-grid" id="artistas-grid-container">
          ${artistas_residentes.map((art, idx) => `
            <article class="artista-card" data-modalidade="${art.modalidade}" data-artist-index="${idx}" id="card-artista-${art.id}" tabindex="0" role="button" aria-label="Ver detalhes de ${art.nome}">
              <div class="artista-image-container">
                <span class="artista-badge-float">${art.ano}</span>
                <img class="artista-image" src="${art.imagem}" alt="${art.nome} - ${art.legenda}" loading="lazy" />
              </div>
              <div class="artista-info-block">
                <div>
                  <h3 class="artista-nome">${art.nome}</h3>
                  <div class="artista-origem-ano">${art.origem}</div>
                  <p class="artista-resumo">${art.resumo}</p>
                </div>
                <div class="artista-footer">
                  <span class="artista-modalidade-tag">${art.modalidade}</span>
                  <span class="artista-ver-mais">DETALHES +</span>
                </div>
              </div>
            </article>
          `).join('')}
        </div>
      </div>

      <!-- 5. INFRAESTRUTURA & VIDA NO ESPAÇO -->
      <div class="infra-grid" id="sec-infra">
        <div class="infra-left">
          <span class="residencia-tag">INFRAESTRUTURA</span>
          <h2 class="infra-left-title">ESTRUTURA INDUSTRIAL PREPARADA PARA A CRIAÇÃO</h2>
          <p class="infra-left-desc">
            Instalado em um galpão adaptado em Pinheiros, o foNTE oferece ateliês iluminados, oficinas especializadas e equipamentos profissionais para suportar desde pinturas em grande escala e esculturas pesadas até instalações sonoras e performances.
          </p>
        </div>
        <div class="infra-right">
          ${infraestrutura.map(inf => `
            <div class="infra-item">
              <h3 class="infra-item-title">${inf.item}</h3>
              <p class="infra-item-desc">${inf.detalhes}</p>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 6. CANDIDATURA & INSCRIÇÕES -->
      <div class="candidatura-grid" id="sec-candidatura">
        <div class="candidatura-left">
          <div>
            <span class="residencia-tag" style="background-color: var(--bg-black); color: var(--bg-white);">OPEN CALL & FLUXO CONTÍNUO</span>
            <h2 class="candidatura-title">${candidatura.titulo}</h2>
            <p class="candidatura-lead">${candidatura.chamada}</p>
          </div>
          <div>
            <a href="mailto:${candidatura.contato_cta}?subject=Candidatura%20Resid%C3%AAncia%20foNTE" class="residencia-btn" style="width: 100%;">
              <span>ENVIAR DOSSIÊ POR E-MAIL</span>
              <span>↗</span>
            </a>
          </div>
        </div>

        <div class="candidatura-right">
          <div>
            <h3 class="requisitos-title">DOCUMENTAÇÃO EXIGIDA NO DOSSIÊ (PDF):</h3>
            <ul class="requisitos-list">
              ${candidatura.requisitos.map((req, i) => `
                <li>
                  <span class="num">${String(i + 1).padStart(2, '0')}</span>
                  <span>${req}</span>
                </li>
              `).join('')}
            </ul>
          </div>
          <div class="candidatura-footer-box">
            <div class="candidatura-email-lead">Envio digital contínuo para:</div>
            <a class="candidatura-email-link" href="mailto:${candidatura.contato_cta}">${candidatura.contato_cta}</a>
          </div>
        </div>
      </div>

    </div>

    <!-- MODAL DE DETALHE DO ARTISTA -->
    <div class="residencia-modal-overlay" id="artista-modal" aria-hidden="true" role="dialog">
      <div class="residencia-modal-container" role="document">
        <button class="modal-close-btn" id="modal-close" aria-label="Fechar modal">✕</button>
        <div class="modal-image-col">
          <img id="modal-img" src="" alt="" />
        </div>
        <div class="modal-content-col">
          <div>
            <span class="modal-tag" id="modal-modalidade"></span>
            <h2 class="modal-artist-title" id="modal-nome"></h2>
            <div class="modal-artist-origin" id="modal-origem"></div>
            <p class="modal-artist-desc" id="modal-desc"></p>
            <p class="modal-artist-caption" id="modal-legenda"></p>
          </div>
          <div>
            <a id="modal-email-btn" href="mailto:residencia@font-e.org" class="residencia-btn" style="width: 100%;">
              CONSULTAR DISPONIBILIDADE
            </a>
          </div>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

/**
 * Máquina de estados para filtros e modais
 */
function initResidenciaInteractions(data) {
  const { artistas_residentes, modalidades } = data;
  const filterChips = document.querySelectorAll('.filter-chip');
  const artistaCards = document.querySelectorAll('.artista-card');
  const counterDisplay = document.getElementById('residentes-counter-display');

  // Filtros de Artistas
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('is-active'));
      chip.classList.add('is-active');

      const filterVal = chip.getAttribute('data-filter');
      let visibleCount = 0;

      artistaCards.forEach(card => {
        const cardMod = card.getAttribute('data-modalidade');
        if (filterVal === 'all' || cardMod.toLowerCase().includes(filterVal.toLowerCase())) {
          card.style.display = 'flex';
          visibleCount++;
        } else {
          card.style.display = 'none';
        }
      });

      if (counterDisplay) {
        counterDisplay.innerHTML = `EXIBINDO <strong>${visibleCount}</strong> REGISTROS`;
      }

      if (typeof ScrollTrigger !== 'undefined') {
        ScrollTrigger.refresh();
      }
    });
  });

  // Modal de Detalhes do Artista
  const modalOverlay = document.getElementById('artista-modal');
  const modalCloseBtn = document.getElementById('modal-close');
  const modalImg = document.getElementById('modal-img');
  const modalNome = document.getElementById('modal-nome');
  const modalOrigem = document.getElementById('modal-origem');
  const modalModalidade = document.getElementById('modal-modalidade');
  const modalDesc = document.getElementById('modal-desc');
  const modalLegenda = document.getElementById('modal-legenda');

  const openArtistModal = (artist) => {
    if (!modalOverlay || !artist) return;
    modalImg.src = artist.imagem;
    modalImg.alt = artist.nome;
    modalNome.textContent = artist.nome;
    modalOrigem.textContent = `${artist.origem} • ${artist.ano}`;
    modalModalidade.textContent = artist.modalidade;
    modalDesc.textContent = artist.resumo;
    modalLegenda.textContent = artist.legenda;

    modalOverlay.classList.add('is-open');
    modalOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  const closeArtistModal = () => {
    if (!modalOverlay) return;
    modalOverlay.classList.remove('is-open');
    modalOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  artistaCards.forEach(card => {
    const idx = parseInt(card.getAttribute('data-artist-index'), 10);
    const artist = artistas_residentes[idx];

    card.addEventListener('click', () => openArtistModal(artist));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openArtistModal(artist);
      }
    });
  });

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closeArtistModal);
  }

  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        closeArtistModal();
      }
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay && modalOverlay.classList.contains('is-open')) {
      closeArtistModal();
    }
  });

  // Toggle de Modalidades
  const modToggleBtns = document.querySelectorAll('.modalidade-toggle-btn');
  modToggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const modId = btn.getAttribute('data-mod-id');
      const mod = modalidades.find(m => m.id === modId);
      if (mod) {
        alert(`${mod.codigo} — ${mod.nome.toUpperCase()}\n\nDuração: ${mod.duracao}\n\n${mod.descricao}\n\nPara agendar ou submeter proposta: residencia@font-e.org`);
      }
    });
  });

  // Rolagem suave para links internos
  document.querySelectorAll('a[href^="#sec-"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const targetId = this.getAttribute('href').substring(1);
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        const header = document.getElementById('logo-controller');
        const headerHeight = header ? header.offsetHeight : 56;
        const targetTop = targetEl.getBoundingClientRect().top + window.scrollY - headerHeight - 12;
        window.scrollTo({
          top: targetTop,
          behavior: 'smooth'
        });
      }
    });
  });
}

/**
 * Animações GSAP de entrada sem reflow de layout
 */
function initResidenciaGsap() {
  if (typeof gsap === 'undefined') return;

  gsap.from('#residencia-hero .residencia-title', {
    y: 20,
    opacity: 0,
    duration: 0.8,
    ease: 'power2.out'
  });

  gsap.from('#residencia-hero .residencia-statement-lead, #residencia-hero .residencia-statement-body', {
    y: 15,
    opacity: 0,
    duration: 0.8,
    delay: 0.2,
    ease: 'power2.out'
  });

  if (typeof ScrollTrigger !== 'undefined') {
    ScrollTrigger.batch('.pilar-card', {
      onEnter: (batch) => gsap.to(batch, {
        opacity: 1,
        y: 0,
        stagger: 0.1,
        overwrite: true,
        duration: 0.6,
        ease: 'power2.out'
      }),
      start: 'top 85%'
    });

    ScrollTrigger.batch('.modalidade-card', {
      onEnter: (batch) => gsap.to(batch, {
        opacity: 1,
        y: 0,
        stagger: 0.1,
        overwrite: true,
        duration: 0.6,
        ease: 'power2.out'
      }),
      start: 'top 85%'
    });

    ScrollTrigger.batch('.artista-card', {
      onEnter: (batch) => gsap.to(batch, {
        opacity: 1,
        scale: 1,
        stagger: 0.05,
        overwrite: true,
        duration: 0.5,
        ease: 'power2.out'
      }),
      start: 'top 90%'
    });

    ScrollTrigger.refresh();
  }
}
