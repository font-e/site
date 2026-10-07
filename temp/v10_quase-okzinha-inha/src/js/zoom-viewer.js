// ==========================================================================
// MÓDULO UNIFICADO: ZOOM & COMPONENTES EDITORIAIS DA GAVETA
// ==========================================================================

/**
 * Renderiza a barra horizontal de abas no mesmo padrão das abas de seções:
 * - A linha horizontal tem a largura estrita da coluna de conteúdo textual (cols 1-8).
 * - Inclui aba estática de fechar (✕) alinhada à direita da área da linha com o mesmo recuo do texto.
 */
export function renderDrawerSubtabsHtml({ tabs = [], activeTab = 'sobre' }) {
  if (!Array.isArray(tabs) || tabs.length === 0) return '';

  return `
    <div class="drawer-subtabs-bar">
      <div class="drawer-subtabs-rail">
        ${tabs.map(tab => `
          <button type="button" 
                  class="drawer-subtab-btn ${activeTab === tab.id ? 'is-active' : ''}" 
                  data-tab="${tab.id}">
            ${tab.label}
          </button>
        `).join('')}
      </div>
      <div class="drawer-subtabs-actions">
        <div class="drawer-share-cluster" id="drawer-share-cluster">
          <div class="drawer-share-actions">
            <button type="button" 
                    class="drawer-subtab-btn drawer-share-action-btn" 
                    data-action="copy-link" 
                    title="Copiar link" 
                    aria-label="Copiar link">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            </button>
            <button type="button" 
                    class="drawer-subtab-btn drawer-share-action-btn" 
                    data-action="share-whatsapp" 
                    title="Compartilhar no WhatsApp" 
                    aria-label="Compartilhar no WhatsApp">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
            </button>
            <button type="button" 
                    class="drawer-subtab-btn drawer-share-action-btn" 
                    data-action="share-email" 
                    title="Enviar por e-mail" 
                    aria-label="Enviar por e-mail">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            </button>
          </div>
          <button type="button" 
                  class="drawer-subtab-btn drawer-share-toggle-btn" 
                  data-action="toggle-share" 
                  title="Compartilhar" 
                  aria-label="Compartilhar">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          </button>
        </div>
        <button type="button" 
                class="drawer-subtab-btn drawer-subtab-close-btn" 
                data-action="close-drawer" 
                title="Fechar gaveta" 
                aria-label="Fechar gaveta">
          ✕
        </button>
      </div>
    </div>
  `;
}

if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    const toggleBtn = e.target.closest('[data-action="toggle-share"]');
    if (toggleBtn) {
      e.preventDefault();
      e.stopPropagation();
      const cluster = toggleBtn.closest('.drawer-share-cluster');
      if (cluster) {
        cluster.classList.toggle('is-open');
      }
      return;
    }

    const actionBtn = e.target.closest('.drawer-share-action-btn');
    if (actionBtn) {
      e.preventDefault();
      e.stopPropagation();
      const action = actionBtn.dataset.action;
      const currentUrl = window.location.href;
      if (action === 'copy-link') {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(currentUrl).catch(() => {});
        }
      } else if (action === 'share-whatsapp') {
        const text = encodeURIComponent(`FONTE — ${currentUrl}`);
        window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank', 'noopener,noreferrer');
      } else if (action === 'share-email') {
        const subject = encodeURIComponent('FONTE');
        const body = encodeURIComponent(`Confira no FONTE: ${currentUrl}`);
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
      }
      actionBtn.classList.add('is-active');
      setTimeout(() => actionBtn.classList.remove('is-active'), 800);
      return;
    }

    if (!e.target.closest('.drawer-share-cluster')) {
      document.querySelectorAll('.drawer-share-cluster.is-open').forEach(el => el.classList.remove('is-open'));
    }
  });
}

/**
 * Rola a tela suavemente para que o topo da gaveta fique exatamente alinhado ao topo da viewport,
 * com rolagem direta, uniforme e linear sem solavancos.
 */
export function scrollToDrawerTop(element) {
  if (!element) return;
  requestAnimationFrame(() => {
    const rect = element.getBoundingClientRect();
    const targetTop = Math.ceil(rect.top + window.scrollY);
    window.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
  });
}

/**
 * Renderiza o conteúdo da aba "SOBRE"
 * Contém apenas o conteúdo do resumo, sem esse título em tela.
 */
export function renderSobreTabHtml({ resumo = '' }) {
  if (!resumo) {
    return `
      <div class="drawer-tab-content drawer-tab-sobre">
        <div class="editorial-val" style="opacity: 0.7;">Informações adicionais em breve.</div>
      </div>
    `;
  }

  return `
    <div class="drawer-tab-content drawer-tab-sobre">
      <div class="editorial-val prose">${resumo}</div>
    </div>
  `;
}

/**
 * Renderiza o conteúdo da aba "FICHA TÉCNICA"
 * Todas as informações dispostas uma acima da outra (coluna única vertical).
 */
export function renderFichaTecnicaTabHtml({
  artistas = '',
  curadoria = '',
  periodo = '',
  visitacao = '',
  horario = '',
  creditos = [],
  outros = []
}) {
  return `
    <div class="drawer-tab-content drawer-tab-ficha-tecnica">
      <div class="editorial-stack">
        ${artistas ? `
          <div class="editorial-block">
            <span class="editorial-label">ARTISTAS / MINISTRANTES</span>
            <div class="editorial-val">${artistas}</div>
          </div>
        ` : ''}

        ${curadoria && curadoria !== '—' ? `
          <div class="editorial-block">
            <span class="editorial-label">CURADORIA</span>
            <div class="editorial-val">${curadoria}</div>
          </div>
        ` : ''}

        ${periodo && periodo !== '—' ? `
          <div class="editorial-block">
            <span class="editorial-label">PERÍODO</span>
            <div class="editorial-val">${periodo}</div>
          </div>
        ` : ''}

        ${(visitacao || horario) ? `
          <div class="editorial-block">
            <span class="editorial-label">VISITAÇÃO</span>
            <div class="editorial-val">${visitacao || horario}</div>
          </div>
        ` : ''}

        ${Array.isArray(creditos) && creditos.length > 0 ? creditos.map(c => `
          <div class="editorial-block">
            <span class="editorial-label">${(c.funcao || 'CRÉDITOS').toUpperCase()}</span>
            <div class="editorial-val">${Array.isArray(c.nomes) ? c.nomes.join(', ') : (c.nomes || c.texto || '')}</div>
          </div>
        `).join('') : ''}

        ${Array.isArray(outros) && outros.length > 0 ? outros.map(o => `
          <div class="editorial-block">
            <span class="editorial-label">${o.label.toUpperCase()}</span>
            <div class="editorial-val">${o.val}</div>
          </div>
        `).join('') : ''}
      </div>
    </div>
  `;
}

/**
 * Converte URL para formato embed (YouTube, Vimeo, Instagram ou direto)
 */
function getEmbedUrl(url = '') {
  if (!url) return '';
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|live\/|embed\/|v\/|shorts\/))([\w-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }
  const igMatch = url.match(/(?:instagram\.com|instagr\.am)\/(?:reel|p|tv)\/([\w-]+)/);
  if (igMatch && igMatch[1]) {
    return `https://www.instagram.com/reel/${igMatch[1]}/embed/`;
  }
  return url;
}

/**
 * Renderiza o conteúdo da aba "VÍDEOS"
 * Embeds dos vídeos dispostos em grid responsivo.
 */
export function renderVideosTabHtml(videos = []) {
  if (!Array.isArray(videos) || videos.length === 0) {
    return `
      <div class="drawer-tab-content drawer-tab-videos">
        <div class="editorial-val" style="opacity: 0.7;">Sem registros em vídeo disponíveis.</div>
      </div>
    `;
  }

  return `
    <div class="drawer-tab-content drawer-tab-videos">
      <div class="drawer-videos-grid">
        ${videos.map(v => {
          const embedUrl = getEmbedUrl(v.url);
          const isDirectVideo = embedUrl.endsWith('.mp4') || embedUrl.endsWith('.webm');
          const isInstagram = embedUrl.includes('instagram.com');
          return `
            <div class="drawer-video-card ${isInstagram ? 'is-instagram' : ''}">
              <div class="drawer-video-frame-wrap ${isInstagram ? 'is-instagram-frame' : ''}">
                ${isDirectVideo ? `
                  <video src="${embedUrl}" controls preload="metadata" playsinline></video>
                ` : `
                  <iframe src="${embedUrl}" 
                          title="${v.titulo || 'Vídeo'}" 
                          loading="lazy" 
                          frameborder="0" 
                          scrolling="no"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                          allowfullscreen>
                  </iframe>
                `}
              </div>
              <div class="drawer-video-info">
                ${v.titulo ? `<h4 class="drawer-video-title">${v.titulo}</h4>` : ''}
                ${(v.autoria || v.autor) ? `<p class="drawer-video-caption" style="font-size: var(--fs-meta); opacity: 0.75; margin-top: 4px;">Por ${v.autoria || v.autor}</p>` : ''}
                ${v.legenda ? `<p class="drawer-video-caption">${v.legenda}</p>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

/**
 * Renderiza o conteúdo da aba "TEXTOS"
 */
export function renderTextosTabHtml(textos = []) {
  if (!Array.isArray(textos) || textos.length === 0) {
    return `
      <div class="drawer-tab-content drawer-tab-textos">
        <div class="editorial-val" style="opacity: 0.7;">Em fase de digitalização no acervo.</div>
      </div>
    `;
  }

  return `
    <div class="drawer-tab-content drawer-tab-textos">
      <div class="editorial-block" style="margin-bottom: 24px;">
        <span class="editorial-label">TEXTOS CRÍTICOS & ENSAIOS</span>
      </div>
      ${textos.map(t => `
        <div class="editorial-text-item" style="margin-bottom: 32px;">
          <h4 style="font-size: var(--fs-name); font-weight: 500; margin: 0 0 6px 0;">${t.titulo || 'Texto Crítico'}</h4>
          ${(t.autoria || t.autor) ? `<span style="font-size: var(--fs-meta); display: block; opacity: 0.7; margin-bottom: 12px;">Por ${t.autoria || t.autor}</span>` : ''}
          <div class="editorial-val prose">${t.texto || ''}</div>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Formata lista de pessoas como texto plano puro (sem botões ou links interativos)
 * Para uso exclusivo em cabeçalhos fechados e linhas da planilha do arquivo
 */
export function formatPlainPeople(people, defaultText = '—') {
  if (!people) return defaultText;
  if (typeof people === 'string') return people.trim() || defaultText;
  if (!Array.isArray(people) || people.length === 0) return defaultText;

  return people.map(p => {
    if (typeof p === 'string') return p;
    return p.nome || p.titulo || '';
  }).filter(Boolean).join(', ') || defaultText;
}

/**
 * Formata lista relacional de pessoas ({ nome, slug, has_perfil }) gerando links interativos para navegação em teia
 * Para uso exclusivo em áreas de texto dentro de gavetas abertas
 */
export function formatRelationalPeople(people, defaultText = '—') {
  if (!people) return defaultText;
  if (typeof people === 'string') return people.trim() || defaultText;
  if (!Array.isArray(people) || people.length === 0) return defaultText;

  return people.map(p => {
    if (typeof p === 'string') return p;
    const nome = p.nome || p.titulo || '';
    if (p.has_perfil && p.slug) {
      return `<button type="button" class="person-cross-link" data-pessoa-slug="${p.slug}" title="Ver perfil de ${nome}">${nome}</button>`;
    }
    return nome;
  }).filter(Boolean).join(', ') || defaultText;
}

/**
 * Renderiza o conteúdo da aba "ATUAÇÕES" para perfis de pessoas
 */
export function renderParticipacoesTabHtml(participacoes = []) {
  if (!Array.isArray(participacoes) || participacoes.length === 0) {
    return `
      <div class="drawer-tab-content drawer-tab-atuacoes">
        <div class="editorial-val" style="opacity: 0.7;">Nenhuma atuação catalogada.</div>
      </div>
    `;
  }

  return `
    <div class="drawer-tab-content drawer-tab-atuacoes">
      <div class="editorial-block" style="margin-bottom: 20px;">
        <span class="editorial-label">HISTÓRICO DE ATUAÇÕES NO FONTE</span>
      </div>
      <div class="editorial-participacoes-list" style="display:flex; flex-direction:column; gap:16px;">
        ${participacoes.map(part => {
          const tit = part.titulo || 'Evento';
          const ano = part.ano || '';
          const cat = part.categoria || '';
          const papel = part.papel ? ` (${part.papel})` : '';
          const hasEv = !!part.id;
          return `
            <div class="editorial-participacao-item" style="border-bottom: var(--border-width, 1px) solid var(--border-color); padding-bottom: 12px;">
              <div style="font-size: var(--fs-name); font-weight: 500;">
                ${hasEv ? `<button type="button" class="person-cross-link" data-evento-id="${part.id}" title="Ver detalhes de ${tit}">${tit}</button>` : tit}
              </div>
              <div style="font-size: var(--fs-meta); opacity: 0.75; margin-top: 4px; text-transform: uppercase;">
                ${[ano, cat + papel].filter(Boolean).join(' • ')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

/**
 * Formata datas de início e término em PERÍODO
 */
export function formatPeriodo(item) {
  if (item.periodo) return item.periodo;
  if (item.inicio && item.fim) {
    const fmt = (d) => {
      const parts = String(d).split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return d;
    };
    if (item.inicio === item.fim) return fmt(item.inicio);
    return `${fmt(item.inicio)} a ${fmt(item.fim)}`;
  }
  if (item.date) return item.date;
  if (item.ano) return String(item.ano);
  return '—';
}

/**
 * Renderizador canônico de gaveta para Agente Cultural / Pessoa
 * Garante uniformidade estrita em Arquivo, Ateliês, Residência e Programação
 */
export function renderPessoaDrawerHtml({
  pessoa,
  activeTab = 'sobre',
  isResidencia = false
}) {
  if (!pessoa) return '';

  let participacoes = Array.isArray(pessoa.participacoes) ? pessoa.participacoes : [];
  if (isResidencia) {
    participacoes = participacoes.filter(p => {
      const cat = (p.categoria || p.cat || '').toLowerCase();
      return !cat.includes('residência individual') && !cat.includes('residencia individual');
    });
  }

  const subtabs = [
    { id: 'sobre', label: 'SOBRE' }
  ];
  if (participacoes.length > 0) {
    subtabs.push({ id: 'atuacoes', label: 'ATUAÇÕES' });
  }

  const effectiveTab = subtabs.some(s => s.id === activeTab) ? activeTab : 'sobre';

  const subtabsHtml = renderDrawerSubtabsHtml({
    tabs: subtabs,
    activeTab: effectiveTab
  });

  let activePaneHtml = '';
  if (effectiveTab === 'atuacoes' && participacoes.length > 0) {
    activePaneHtml = renderParticipacoesTabHtml(participacoes);
  } else {
    activePaneHtml = `
      <div class="drawer-tab-content">
        <div class="editorial-val prose" style="margin-bottom: 24px;">
          ${pessoa.bio || pessoa.sobre || `<p>${pessoa.bio_preview || 'Agente cultural catalogado no acervo da Residência FONTE.'}</p>`}
        </div>
        ${Array.isArray(pessoa.links) && pessoa.links.length > 0 ? `
          <div class="atelies-drawer-links" style="display:flex; gap:16px; flex-wrap:wrap; font-size:var(--fs-meta);">
            ${pessoa.links.map(l => `<span>${l.rotulo}: <a href="${l.url}" target="_blank" rel="noopener noreferrer" style="text-decoration:underline;"><strong>${l.rotulo}</strong></a></span>`).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  const avatar = pessoa.avatar;
  const ratio = avatar?.ratio || 1;
  const avatarUrl = avatar?.thumb || avatar?.zoom || pessoa.imagem || '';

  const mediaHtml = avatarUrl ? `
    <div class="drawer-gallery-track">
      <div class="drawer-gallery-item" data-idx="0" style="aspect-ratio: ${ratio}; background-color: #888888;">
        <img src="${avatarUrl}" alt="${pessoa.nome}" style="aspect-ratio: ${ratio};" loading="lazy">
      </div>
    </div>
  ` : `<div style="color:#888; text-align:center; padding:48px 24px; font-size:var(--fs-meta);">Foto de perfil do acervo</div>`;

  return `
    <div class="universal-drawer">
      <div class="drawer-left-column">
        <div class="drawer-editorial-header">
          <h2 class="event-title">
            <span class="event-title-text">${pessoa.nome}</span>
          </h2>
        </div>
        ${subtabsHtml}
        <div class="drawer-tab-pane-container">
          ${activePaneHtml}
        </div>
      </div>
      <div class="drawer-media-pane">
        ${mediaHtml}
      </div>
    </div>
  `;
}

/**
 * Renderizador canônico de gaveta para Evento / Mostra
 */
export function renderEventoDrawerHtml({
  evento,
  activeTab = 'sobre'
}) {
  const artFormatted = formatRelationalPeople(evento.artistas || evento.ministrantes);
  const curFormatted = formatRelationalPeople(evento.curadoria, '—');
  const periodoDisplay = formatPeriodo(evento);
  const visitacaoDisplay = evento.visitacao || evento.horario || '';
  const resumoDisplay = evento.resumo || evento.sobre || evento.content || '';
  const textosList = evento.texto_critico 
    ? [{ titulo: 'Texto Crítico', texto: evento.texto_critico }] 
    : (Array.isArray(evento.textos) ? evento.textos : []);
  const videosList = Array.isArray(evento.videos) ? evento.videos : [];

  const subtabs = [
    { id: 'sobre', label: 'SOBRE' },
    { id: 'ficha-tecnica', label: 'FICHA TÉCNICA' }
  ];
  if (textosList.length > 0) subtabs.push({ id: 'textos', label: 'TEXTOS' });
  if (videosList.length > 0) subtabs.push({ id: 'videos', label: 'VÍDEOS' });

  const effectiveTab = subtabs.some(s => s.id === activeTab) ? activeTab : 'sobre';

  const subtabsHtml = renderDrawerSubtabsHtml({
    tabs: subtabs,
    activeTab: effectiveTab
  });

  let activePaneHtml = '';
  if (effectiveTab === 'ficha-tecnica') {
    activePaneHtml = renderFichaTecnicaTabHtml({
      artistas: artFormatted,
      curadoria: curFormatted,
      periodo: periodoDisplay,
      visitacao: visitacaoDisplay,
      horario: evento.horario,
      creditos: Array.isArray(evento.creditos) ? evento.creditos.map(c => ({
        funcao: c.funcao || 'CRÉDITOS',
        nomes: formatRelationalPeople(c.nomes)
      })) : []
    });
  } else if (effectiveTab === 'textos' && textosList.length > 0) {
    activePaneHtml = renderTextosTabHtml(textosList);
  } else if (effectiveTab === 'videos' && videosList.length > 0) {
    activePaneHtml = renderVideosTabHtml(videosList);
  } else {
    activePaneHtml = renderSobreTabHtml({ resumo: resumoDisplay });
  }

  let imgs = [];
  if (Array.isArray(evento.galeria) && evento.galeria.length > 0) {
    imgs = evento.galeria.map(g => ({
      url: g.zoom || g.thumb || g.url,
      thumb: g.thumb || g.zoom || g.url,
      zoom: g.zoom || g.thumb || g.url,
      ratio: g.ratio || (g.width && g.height ? g.width / g.height : 1.498),
      legenda: g.legenda || evento.titulo || evento.title || '',
      fotografia: g.fotografia || '',
      disponivel: g.disponivel === true,
      url_venda: g.url_venda || ''
    }));
  } else if (Array.isArray(evento.expanded_images) && evento.expanded_images.length > 0) {
    imgs = evento.expanded_images;
  } else if (Array.isArray(evento.images) && evento.images.length > 0) {
    imgs = evento.images.map(img => typeof img === 'string' ? { url: img, thumb: img, zoom: img, ratio: 1.498, legenda: evento.titulo || evento.title || '' } : img);
  }

  const mediaHtml = imgs.length > 0 ? `
    <div class="drawer-gallery-track">
      ${imgs.map((img, idx) => `
        <div class="drawer-gallery-item" 
             data-idx="${idx}"
             style="aspect-ratio: ${img.ratio || 1.498}; background-color: #888888;">
          <img src="${img.thumb || img.url}" alt="${img.legenda || ''}" loading="lazy" style="aspect-ratio: ${img.ratio || 1.498};">
        </div>
      `).join('')}
    </div>
  ` : `<div style="color:#888; text-align:center; padding:48px 24px; font-size:var(--fs-meta);">Sem registros fotográficos</div>`;

  return `
    <div class="universal-drawer">
      <div class="drawer-left-column">
        <div class="drawer-editorial-header">
          <h2 class="event-title">
            <span class="event-title-text">${evento.titulo || evento.title}</span>
            ${evento.subtitulo ? `<span class="event-subtitle-text">${evento.subtitulo}</span>` : ''}
          </h2>
        </div>
        ${subtabsHtml}
        <div class="drawer-tab-pane-container">
          ${activePaneHtml}
        </div>
      </div>
      <div class="drawer-media-pane">
        ${mediaHtml}
      </div>
    </div>
  `;
}
