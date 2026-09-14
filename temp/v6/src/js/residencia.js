/**
 * RESIDENCIA.JS
 * Lógica de carregamento e interação da seção Residência
 */

let cachedData = null;

export async function loadResidencia() {
  const container = document.getElementById('sec-residencia');
  if (!container) return;

  try {
    let response = await fetch('./residencia.json');
    if (!response.ok) response = await fetch('/residencia.json');
    if (!response.ok) response = await fetch('./public/residencia.json');
    if (!response.ok) throw new Error('Falha ao carregar residencia.json');
    cachedData = await response.json();

    renderIntro(cachedData.institucional, cachedData.candidatura);
    renderModalities(cachedData.modalidades);
    renderGallery(cachedData.artistas_residentes);
    
    initResidenciaInteractions();

  } catch (error) {
    console.error('Erro no módulo Residência:', error);
  }
}

function renderIntro(inst, cand) {
  const subtituloEl = document.getElementById('residencia-subtitulo');
  const infoEl = document.getElementById('residencia-candidatura-info');
  const requisitosEl = document.getElementById('residencia-requisitos-lista');

  if (subtituloEl) {
    subtituloEl.textContent = inst.subtitulo;
  }

  renderCandidaturas();
}

function renderCandidaturas() {
  const contentCol = document.getElementById('residencia-main-content-col');
  if (!contentCol || !cachedData) return;

  const cand = cachedData.candidatura;
  const listHtml = cand.requisitos.map(req => `<li>— ${req}</li>`).join('');

  contentCol.innerHTML = `
    <div class="residencia-candidaturas-box animate-in">
      <div class="residencia-candidaturas-content">
        <h3>${cand.titulo}</h3>
        <p>${cand.chamada}</p>
        <p>Envio de propostas: <a href="mailto:${cand.email}">${cand.email}</a></p>
      </div>
      <div class="residencia-dossie-content">
        <h4>DOSSIÊ DE CANDIDATURA (PDF):</h4>
        <ul>${listHtml}</ul>
      </div>
    </div>
  `;
}

function renderModalities(modalidades) {
  const btnsContainer = document.getElementById('residencia-modality-btns');
  if (!btnsContainer) return;

  const buttonsHtml = `
    <button class="filter-pill is-active" data-modality="inscricoes">INSCRIÇÕES</button>
    ${modalidades.map(mod => `
      <button class="filter-pill" data-modality="${mod.id}">${mod.nome.toUpperCase()}</button>
    `).join('')}
  `;
  btnsContainer.innerHTML = buttonsHtml;
}

function renderGallery(residentes) {
  const gallery = document.getElementById('residencia-gallery');
  if (!gallery) return;

  gallery.innerHTML = residentes.map(res => `
    <div class="residencia-media-item">
      <img src="${res.imagem}" alt="${res.nome}" loading="lazy">
      <div class="residencia-media-info">
        <div class="residencia-media-name">${res.nome}</div>
        <div class="residencia-media-meta">
          ${res.modalidade ? res.modalidade.toUpperCase() : ''} / ${res.ano}
        </div>
      </div>
    </div>
  `).join('');
}

function initResidenciaInteractions() {
  const btns = document.querySelectorAll('#residencia-modality-btns .filter-pill');
  const contentCol = document.getElementById('residencia-main-content-col');
  let activeModalityId = 'inscricoes';

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const modalityId = btn.dataset.modality;
      
      if (activeModalityId === modalityId) return;

      activeModalityId = modalityId;
      btns.forEach(b => {
        b.classList.toggle('is-active', b.dataset.modality === modalityId);
      });

      if (modalityId === 'inscricoes') {
        renderCandidaturas();
      } else {
        const modalityData = cachedData.modalidades.find(m => m.id === modalityId);
        showModalityContent(modalityData);
      }
    });
  });

  function showModalityContent(mod) {
    const highlightsHtml = mod.destaques ? `
      <ul class="residencia-drawer-highlights">
        ${mod.destaques.map(d => `<li>• ${d}</li>`).join('')}
      </ul>
    ` : '';

    contentCol.innerHTML = `
      <div class="residencia-modality-content animate-in">
        <div class="residencia-drawer-text">
          <h4>${mod.nome}</h4>
          ${mod.duracao ? `<div class="residencia-drawer-meta">${mod.duracao}</div>` : ''}
          <p>${mod.descricao}</p>
          ${highlightsHtml}
        </div>
      </div>
    `;
  }
}
