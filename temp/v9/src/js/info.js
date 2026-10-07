// ==========================================================================
// MÓDULO SPA: INFO (Memorial, Histórico, Equipe & Apoie)
// Conectado exclusivamente ao FonteState.getInfo()
// ==========================================================================

import { FonteState } from './state.js';

const state = {
  activeTab: 'historico' // 'historico' | 'equipe' | 'visitacao' | 'apoie'
};

export async function initInfoModule(sectionEl) {
  if (!sectionEl) return;
  await FonteState.init();

  renderTabs(sectionEl);
  renderContent(sectionEl);
  attachEvents(sectionEl);

  window._selectInfoTab = (tabId) => {
    state.activeTab = tabId;
    renderTabs(sectionEl);
    renderContent(sectionEl);
  };
}

function renderTabs(sectionEl) {
  const container = sectionEl.querySelector('#info-facets-container');
  if (!container) return;

  const tabs = [
    { id: 'historico', label: 'HISTÓRICO' },
    { id: 'equipe', label: 'EQUIPE' },
    { id: 'visitacao', label: 'VISITAÇÃO & CONTATOS' },
    { id: 'apoie', label: 'APOIE' }
  ];

  container.innerHTML = tabs.map(t => `
    <button type="button" 
            class="filter-pill ${state.activeTab === t.id ? 'is-active' : ''}" 
            data-tab="${t.id}">
      ${t.label}
    </button>
  `).join('');

  if (window.updateTabCutout) {
    requestAnimationFrame(() => {
      window.updateTabCutout(sectionEl);
    });
  }
}

function renderContent(sectionEl) {
  const container = sectionEl.querySelector('#info-content-panel');
  if (!container) return;

  const info = FonteState.getInfo();

  if (state.activeTab === 'historico') {
    const topicos = info.historico_topicos || [];
    container.innerHTML = `
      <div class="info-content-container">
        <div class="info-col-main">
          ${info.historico_intro ? `
            <div class="residencia-intro-lead" style="margin-bottom: 36px;">
              ${info.historico_intro}
            </div>
          ` : ''}

          <div class="info-timeline-wrapper">
            ${topicos.map(top => {
              const fotos = top.fotos || [];
              return `
                <div class="info-topic-card">
                  <div class="info-topic-year">${top.data || ''}</div>
                  <h3 class="info-topic-title">${top.titulo || ''}</h3>
                  <div class="editorial-val prose" style="margin-bottom: 20px;">
                    ${top.texto || ''}
                  </div>
                  ${fotos.length > 0 ? `
                    <div style="display:flex; gap:16px; flex-wrap:wrap; margin-top:16px;">
                      ${fotos.map(f => `
                        <div style="width: 220px; aspect-ratio: ${f.ratio || 1.498}; background-color: #888888; overflow:hidden; border: 1px solid var(--border-color);">
                          <img src="${f.thumb || f.zoom}" alt="${f.legenda || top.titulo}" style="width:100%; height:100%; object-fit:cover;" loading="lazy">
                        </div>
                      `).join('')}
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div class="info-col-side">
          <h4 class="residencia-section-label" style="margin-bottom: 12px;">LINHA DO TEMPO</h4>
          <p class="editorial-val" style="font-size: var(--fs-meta); opacity: 0.85;">
            Espaço gerido por artistas sediado em São Paulo desde 2013, dedicado à pesquisa e à interlocução crítica continuada.
          </p>
        </div>
      </div>
    `;
  } else if (state.activeTab === 'equipe') {
    const equipe = info.equipe_atual || [];
    const anteriores = info.colaboracoes_anteriores || [];

    container.innerHTML = `
      <div class="info-content-container">
        <div class="info-col-main">
          <h3 class="residencia-content-subtitle" style="margin-bottom: 20px;">EQUIPE ATUAL</h3>
          <div class="info-team-grid">
            ${equipe.map(mem => `
              <div class="info-member-card">
                ${mem.foto_url ? `
                  <div class="info-member-photo-wrap" style="aspect-ratio: ${mem.foto_ratio || 1};">
                    <img src="${mem.foto_url}" alt="${mem.nome}" loading="lazy">
                  </div>
                ` : ''}
                <h4 class="info-member-name">${mem.nome}</h4>
                <div class="info-member-role">${mem.funcao} • ${mem.periodo}</div>
                <div class="editorial-val prose" style="font-size: var(--fs-meta);">
                  ${mem.bio || ''}
                </div>
              </div>
            `).join('')}
          </div>

          ${anteriores.length > 0 ? `
            <h3 class="residencia-content-subtitle" style="margin-top: 56px; margin-bottom: 20px;">COLABORAÇÕES ANTERIORES</h3>
            <div class="info-team-grid">
              ${anteriores.map(mem => `
                <div class="info-member-card">
                  ${mem.foto_url ? `
                    <div class="info-member-photo-wrap" style="aspect-ratio: ${mem.foto_ratio || 1};">
                      <img src="${mem.foto_url}" alt="${mem.nome}" loading="lazy">
                    </div>
                  ` : ''}
                  <h4 class="info-member-name">${mem.nome}</h4>
                  <div class="info-member-role">${mem.funcao} • ${mem.periodo}</div>
                  <div class="editorial-val prose" style="font-size: var(--fs-meta);">
                    ${mem.bio || ''}
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>

        <div class="info-col-side">
          <h4 class="residencia-section-label" style="margin-bottom: 12px;">GOVERNANÇA</h4>
          <p class="editorial-val" style="font-size: var(--fs-meta); opacity: 0.85;">
            Composição institucional de gestão, curadoria, pesquisa e colaborações interdisciplinares.
          </p>
        </div>
      </div>
    `;
  } else if (state.activeTab === 'visitacao') {
    container.innerHTML = `
      <div class="info-content-container">
        <div class="info-col-main">
          <div style="display:flex; flex-direction:column; gap:36px;">
            <div>
              <h3 class="residencia-content-subtitle">ENDEREÇO & SEDE</h3>
              <p class="editorial-val" style="white-space: pre-line; margin-top: 8px;">
                ${info.endereco_completo || 'Rua Mourato Coelho, 751\nPinheiros - São Paulo, Brasil'}
              </p>
              ${info.como_chegar ? `
                <p class="editorial-val" style="margin-top: 12px; font-size: var(--fs-meta); opacity: 0.85;">
                  <strong>Como chegar:</strong> ${info.como_chegar}
                </p>
              ` : ''}
            </div>

            <div>
              <h3 class="residencia-content-subtitle">HORÁRIOS DE VISITAÇÃO</h3>
              <div class="editorial-val prose" style="margin-top: 8px;">
                ${info.horarios || '<p>De segunda a sábado, das 14 às 18h.</p>'}
              </div>
            </div>

            ${info.acessibilidade ? `
              <div>
                <h3 class="residencia-content-subtitle">ACESSIBILIDADE</h3>
                <div class="editorial-val prose" style="margin-top: 8px;">
                  ${info.acessibilidade}
                </div>
              </div>
            ` : ''}

            <div>
              <h3 class="residencia-content-subtitle">CONTATOS DIRETOS</h3>
              <div class="editorial-stack" style="margin-top: 12px;">
                ${info.email_contato ? `
                  <div class="editorial-block">
                    <span class="editorial-label">ATENDIMENTO GERAL & RESIDÊNCIA</span>
                    <div class="editorial-val"><a href="mailto:${info.email_contato}" style="text-decoration:underline;">${info.email_contato}</a></div>
                  </div>
                ` : ''}
                ${info.email_imprensa ? `
                  <div class="editorial-block">
                    <span class="editorial-label">IMPRENSA & PRODUÇÃO</span>
                    <div class="editorial-val"><a href="mailto:${info.email_imprensa}" style="text-decoration:underline;">${info.email_imprensa}</a></div>
                  </div>
                ` : ''}
              </div>
            </div>
          </div>
        </div>

        <div class="info-col-side">
          <h4 class="residencia-section-label" style="margin-bottom: 12px;">CONTATO</h4>
          <p class="editorial-val" style="font-size: var(--fs-meta); opacity: 0.85;">
            Visitas a ateliês e acompanhamento de programas expositivos abertos ao público.
          </p>
        </div>
      </div>
    `;
  } else if (state.activeTab === 'apoie') {
    const apoios = info.modalidades_apoio || [];

    container.innerHTML = `
      <div class="info-content-container">
        <div class="info-col-main">
          ${info.apoie_manifesto ? `
            <div class="residencia-intro-lead" style="margin-bottom: 32px;">
              ${info.apoie_manifesto}
            </div>
          ` : ''}

          <div style="display:flex; flex-direction:column; gap:28px;">
            ${apoios.map(a => `
              <div class="info-apoio-card">
                <h3 class="info-topic-title" style="margin-bottom: 6px;">${a.titulo}</h3>
                ${a.subtitulo ? `<div style="font-size: var(--fs-meta); font-weight: 600; text-transform:uppercase; color:#0038ff; margin-bottom: 16px;">${a.subtitulo}</div>` : ''}
                <div class="editorial-val prose" style="margin-bottom: 20px;">
                  ${a.corpo_texto || ''}
                </div>
                ${a.dados_bancarios_pix ? `
                  <div style="background: rgba(175, 255, 250, 0.2); border: 1px solid var(--border-color); padding: 12px 16px; margin-bottom: 16px; font-size: var(--fs-meta);">
                    <strong>Chave PIX / Dados:</strong> ${a.dados_bancarios_pix}
                  </div>
                ` : ''}
                ${Array.isArray(a.botoes) && a.botoes.length > 0 ? `
                  <div style="display:flex; gap:12px; flex-wrap:wrap;">
                    ${a.botoes.map(b => `
                      <a href="${b.url}" target="_blank" rel="noopener noreferrer" class="header-nav-btn is-active" style="text-decoration:none; padding: 0 20px;">
                        ${b.rotulo || 'APOIAR'}
                      </a>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>

        <div class="info-col-side">
          <h4 class="residencia-section-label" style="margin-bottom: 12px;">PROGRAMA DE AMIGUES</h4>
          <p class="editorial-val" style="font-size: var(--fs-meta); opacity: 0.85;">
            Apoie a autonomia artística da Residência FONTE e garanta a sustentabilidade de nossos programas públicos.
          </p>
        </div>
      </div>
    `;
  }
}

function attachEvents(sectionEl) {
  const facets = sectionEl.querySelector('#info-facets-container');
  if (facets) {
    facets.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-pill');
      if (btn && btn.dataset.tab) {
        state.activeTab = btn.dataset.tab;
        renderTabs(sectionEl);
        renderContent(sectionEl);
      }
    });
  }
}
