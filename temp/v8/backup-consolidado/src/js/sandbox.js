/**
 * SANDBOX.JS - MINI SANDBOX LIGHTBOX EM TELA CHEIA (TECLA L)
 * Formas CSS nativas puras baseadas em Liars Collective e King's Cross (Fred Cave / Studio Frith)
 * Suporte a Drag & Drop, Redimensionamento Proporcional, Rotação e Ajuste de Cores/Sliders
 * Residência Artística FONTE
 */

// Definição das formas mantidas: 01, 02 e 06
const SANDBOX_BLOCKS = [
  {
    id: 'liars-rings',
    num: '01',
    name: 'Liars Ring Stack',
    desc: '4 elipses tangenciais concêntricas — reposicionáveis e redimensionáveis individualmente',
    render: () => `
      <div class="sandbox-rings-stage-group" id="group-liars-rings">
        <!-- Anel 1 -->
        <div class="sandbox-composition-wrapper slr-ring-wrapper" data-comp-id="liars-rings" data-ring-index="0" data-init-top="15" data-init-left="30" style="top: 15px; left: 30px; z-index: 5;">
          <div class="sandbox-composition style-liars-ring" style="--comp-border: #0044ff; --comp-text: #0044ff; --comp-bg: rgba(255, 255, 255, 0.08); --comp-bg-blur: 10px;">
            <div class="sandbox-comp-backdrop"></div>
            <span class="slr-title">RESIDÊNCIA</span>
          </div>
          <div class="sandbox-rotate-handle" title="Arraste para rotacionar" aria-label="Rotacionar anel">&#x21BB;</div>
          <div class="sandbox-resize-handle" title="Arraste para redimensionar proporcionalmente">&#x25FF;</div>
        </div>

        <!-- Anel 2 -->
        <div class="sandbox-composition-wrapper slr-ring-wrapper" data-comp-id="liars-rings" data-ring-index="1" data-init-top="105" data-init-left="30" style="top: 105px; left: 30px; z-index: 6;">
          <div class="sandbox-composition style-liars-ring" style="--comp-border: #0044ff; --comp-text: #0044ff; --comp-bg: rgba(255, 255, 255, 0.08); --comp-bg-blur: 10px;">
            <div class="sandbox-comp-backdrop"></div>
            <span class="slr-subtitle">artística & imersão</span>
          </div>
          <div class="sandbox-rotate-handle" title="Arraste para rotacionar" aria-label="Rotacionar anel">&#x21BB;</div>
          <div class="sandbox-resize-handle" title="Arraste para redimensionar proporcionalmente">&#x25FF;</div>
        </div>

        <!-- Anel 3 -->
        <div class="sandbox-composition-wrapper slr-ring-wrapper" data-comp-id="liars-rings" data-ring-index="2" data-init-top="195" data-init-left="30" style="top: 195px; left: 30px; z-index: 7;">
          <div class="sandbox-composition style-liars-ring" style="--comp-border: #0044ff; --comp-text: #0044ff; --comp-bg: rgba(255, 255, 255, 0.08); --comp-bg-blur: 10px;">
            <div class="sandbox-comp-backdrop"></div>
            <span class="slr-info">inscrições / 2026</span>
          </div>
          <div class="sandbox-rotate-handle" title="Arraste para rotacionar" aria-label="Rotacionar anel">&#x21BB;</div>
          <div class="sandbox-resize-handle" title="Arraste para redimensionar proporcionalmente">&#x25FF;</div>
        </div>

        <!-- Anel 4 -->
        <div class="sandbox-composition-wrapper slr-ring-wrapper" data-comp-id="liars-rings" data-ring-index="3" data-init-top="285" data-init-left="30" style="top: 285px; left: 30px; z-index: 8;">
          <div class="sandbox-composition style-liars-ring" style="--comp-border: #0044ff; --comp-text: #0044ff; --comp-bg: rgba(255, 255, 255, 0.08); --comp-bg-blur: 10px;">
            <div class="sandbox-comp-backdrop"></div>
            <span class="slr-footer">ateliês & processos</span>
          </div>
          <div class="sandbox-rotate-handle" title="Arraste para rotacionar" aria-label="Rotacionar anel">&#x21BB;</div>
          <div class="sandbox-resize-handle" title="Arraste para redimensionar proporcionalmente">&#x25FF;</div>
        </div>
      </div>
    `
  },
  {
    id: 'arch-portal',
    num: '02',
    name: 'Arco Tombstone (LAVA! #4)',
    desc: 'Semicírculo superior 180° com divisória no centro + base retangular (fiel à referência)',
    render: () => `
      <div class="sandbox-composition-wrapper" data-comp-id="arch-portal">
        <div class="sandbox-composition style-arch-tombstone" style="--comp-border: #000000; --comp-text: #000000; --comp-bg: transparent;">
          <div class="sandbox-comp-backdrop"></div>
          <div class="sat-top-semicircle">
            <span class="sat-top-text">24/09</span>
          </div>
          <div class="sat-bottom-box">
            <span class="sat-bottom-title">LAVA! #4</span>
            <span class="sat-bottom-sub">inscreva-se</span>
          </div>
        </div>
        <div class="sandbox-rotate-handle" title="Arraste para rotacionar" aria-label="Rotacionar elemento">&#x21BB;</div>
        <div class="sandbox-resize-handle" title="Arraste para redimensionar proporcionalmente">&#x25FF;</div>
      </div>
    `
  },
  {
    id: 'bipartite-dome',
    num: '06',
    name: 'Cúpula Bipartida N1C',
    desc: 'Padrão: Fundo transparente com bordas e letras cyan (#00FFFF)',
    render: () => `
      <div class="sandbox-composition-wrapper" data-comp-id="bipartite-dome">
        <div class="sandbox-composition style-bipartite-dome" style="--comp-border: #00ffff; --comp-text: #00ffff; --comp-bg: transparent;">
          <div class="sandbox-comp-backdrop"></div>
          <div class="sbd-top-dome">
            <span class="sbd-top-text">_</span>
          </div>
          <div class="sbd-bottom-block">
            <span class="sbd-bottom-text">inscrições<br>aquiã!<br><br>Querida, presta atenção: vai rolar esse babado babadeiro ein. Não perca!<br><br>BORA LÁ!</span>
          </div>
        </div>
        <div class="sandbox-rotate-handle" title="Arraste para rotacionar" aria-label="Rotacionar elemento">&#x21BB;</div>
        <div class="sandbox-resize-handle" title="Arraste para redimensionar proporcionalmente">&#x25FF;</div>
      </div>
    `
  }
];

export function initSandbox() {
  const existingOverlay = document.getElementById('sandbox-overlay');
  const wasActive = existingOverlay ? existingOverlay.classList.contains('is-active') : false;
  if (existingOverlay) {
    existingOverlay.remove();
  }
  const existingTrigger = document.getElementById('sandbox-trigger-badge');
  if (existingTrigger) {
    existingTrigger.remove();
  }

  // 1. Injeta o botão trigger no canto inferior direito
  const triggerBtn = document.createElement('button');
  triggerBtn.type = 'button';
  triggerBtn.className = 'sandbox-trigger-badge';
  triggerBtn.id = 'sandbox-trigger-badge';
  triggerBtn.setAttribute('aria-label', 'Abrir Mini Sandbox (Pressione L)');
  triggerBtn.innerHTML = `
    <span class="sandbox-trigger-key">L</span>
    <span>MINI SANDBOX</span>
  `;
  document.body.appendChild(triggerBtn);

  // 2. Injeta o Lightbox Overlay com Sidebar Lateral
  const overlay = document.createElement('div');
  overlay.className = `sandbox-overlay${wasActive ? ' is-active' : ''}`;
  overlay.id = 'sandbox-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Mini Sandbox de Estilos');

  overlay.innerHTML = `
    <!-- BARRA LATERAL (SIDEBAR) ESQUERDA -->
    <aside class="sandbox-sidebar">
      <div class="sandbox-sidebar-header">
        <div class="sandbox-sidebar-brand">
          <span class="sandbox-sidebar-title">SANDBOX</span>
          <span class="sandbox-tag-pill">LAB</span>
        </div>
        <button type="button" class="sandbox-sidebar-close" id="sandbox-close-btn" aria-label="Fechar Sandbox">
          &times;
        </button>
      </div>

      <!-- Navegação de Abas na Lateral -->
      <div class="sandbox-sidebar-nav">
        <span class="sandbox-sidebar-section-title">ABAS DE TESTE</span>
        <nav class="sandbox-sidebar-tabs" role="tablist" aria-label="Abas do Sandbox">
          <!-- 02. BOTÕES (ATIVA POR PADRÃO - ABA MAIS RECENTE) -->
          <button type="button" class="sandbox-sidebar-tab is-active" data-sandbox-tab="botoes" role="tab" aria-selected="true">
            <span class="sandbox-tab-badge">02</span>
            <span class="sandbox-tab-text">BOTÕES</span>
          </button>
          <!-- 01. FORMAS -->
          <button type="button" class="sandbox-sidebar-tab" data-sandbox-tab="formas" role="tab" aria-selected="false">
            <span class="sandbox-tab-badge">01</span>
            <span class="sandbox-tab-text">FORMAS</span>
          </button>
        </nav>
      </div>

      <!-- Rodapé da Sidebar com Atalhos -->
      <div class="sandbox-sidebar-footer">
        <div class="sandbox-shortcut-row">
          <kbd class="sandbox-kbd">L</kbd>
          <span>alternar abas</span>
        </div>
        <div class="sandbox-shortcut-row">
          <kbd class="sandbox-kbd">ESC</kbd>
          <span>fechar sandbox</span>
        </div>
      </div>
    </aside>

    <!-- ÁREA PRINCIPAL DE CONTEÚDO À DIREITA -->
    <main class="sandbox-content-area">
      <!-- ABA 2: BOTÕES (Inicia ativa por padrão!) -->
      <div class="sandbox-viewport sandbox-tab-pane is-active" id="sandbox-viewport-botoes">
        <article class="sandbox-block sandbox-block-botoes" id="sandbox-block-folder-tabs">
          <div class="sandbox-block-header">
            <div class="sandbox-block-badge">
              <span>02 / ABAS DE FICHÁRIO & PROGRAMAÇÃO</span>
            </div>
            <div class="sandbox-block-actions">
              <!-- Slider de Curvatura entre 0px e 800px com input numérico em texto (padrão inicial 16px) -->
              <div class="sandbox-radius-ctrl-box">
                <label for="sandbox-tab-radius-slider" class="sandbox-radius-ctrl-label">Curvatura:</label>
                <input type="range" id="sandbox-tab-radius-slider" class="sandbox-radius-slider" min="0" max="800" value="16" step="1" aria-label="Curvatura das abas em pixels">
                <div class="sandbox-radius-input-group">
                  <input type="number" id="sandbox-tab-radius-num" class="sandbox-radius-num-input" min="0" max="800" value="16" aria-label="Valor numérico da curvatura">
                  <span class="sandbox-radius-unit">px</span>
                </div>
              </div>
            </div>
          </div>

          <div class="sandbox-botoes-stage" id="stage-botoes-tabs">
            <!-- Fundo com Textura Real de Concreto (Fundo da Seção Programação) -->
            <div class="sandbox-botoes-hero-bg"></div>

            <!-- Trilho de Abas no Topo de Montagem -->
            <div class="sandbox-folder-tabs-header">
              <div class="sandbox-folder-tabs-rail" id="sandbox-folder-tabs-rail">
                <button type="button" class="sandbox-folder-tab-btn" data-section="toda">
                  <span>TODA</span>
                </button>
                <button type="button" class="sandbox-folder-tab-btn is-active" data-section="presente">
                  <span>PRESENTE</span>
                </button>
                <button type="button" class="sandbox-folder-tab-btn" data-section="inscricoes">
                  <span>INSCRIÇÕES ABERTAS</span>
                </button>
                <button type="button" class="sandbox-folder-tab-btn" data-section="proxima">
                  <span>PRÓXIMA</span>
                </button>
              </div>
            </div>

            <!-- Janela / Bloco de Montagem com Linha Contínua de 1.5px no topo -->
            <div class="sandbox-botoes-content-panel" id="sandbox-botoes-content-panel">
              <div class="sandbox-botoes-title-wrap">
                <h1 class="sbm-event-title">Montagem</h1>
                <p class="sbm-event-subtitle">Marcelo Amorim</p>
              </div>
            </div>
          </div>
        </article>
      </div>

      <!-- ABA 1: FORMAS (01, 02 e 06) -->
      <div class="sandbox-viewport sandbox-tab-pane" id="sandbox-viewport-formas" style="display: none;">
        ${SANDBOX_BLOCKS.map(block => `
          <article class="sandbox-block" id="sandbox-block-${block.id}" data-block-id="${block.id}">
            <div class="sandbox-block-header">
              <div class="sandbox-block-badge">
                <span>${block.num} / ${block.name}</span>
              </div>
              <div class="sandbox-block-actions">
                <button type="button" class="sandbox-action-btn sandbox-reset-btn" data-target-id="${block.id}" title="Voltar ao centro, rotação zero e escala padrão">
                  &#8634; RECENTRALIZAR
                </button>
                <button type="button" class="sandbox-action-btn sandbox-adjust-btn" data-target-id="${block.id}">
                  &#9881; AJUSTAR ESTILO
                </button>
              </div>
            </div>
            <div class="sandbox-block-stage" id="stage-${block.id}">
              <div class="sandbox-stage-bg" id="stage-bg-${block.id}"></div>
              ${block.render()}
            </div>
          </article>
        `).join('')}
      </div>
    </main>

    <!-- Popover Flutuante de Ajustes com Sliders e Cores Específicas -->
    <div class="sandbox-popover" id="sandbox-popover">
      <div class="sandbox-popover-header">
        <span class="sandbox-popover-title" id="sandbox-popover-title">PERSONALIZAR ESTILO</span>
        <button type="button" class="sandbox-popover-close" id="sandbox-popover-close" aria-label="Fechar painel">&times;</button>
      </div>

      <!-- Cor de Texto -->
      <div class="sandbox-popover-group">
        <div class="sandbox-popover-label-row">
          <label class="sandbox-popover-label">Cor do Texto</label>
        </div>
        <div class="sandbox-pill-row" id="popover-text-row">
          <button type="button" class="sandbox-pill-btn" data-prop="text" data-val="#0044ff">
            <span class="sandbox-color-dot" style="background: #0044ff;"></span> Azul Ref (#0044ff)
          </button>
          <button type="button" class="sandbox-pill-btn" data-prop="text" data-val="#00FFFF">
            <span class="sandbox-color-dot" style="background: #00FFFF;"></span> Cyan (#00FFFF)
          </button>
          <button type="button" class="sandbox-pill-btn" data-prop="text" data-val="#ccfffe">
            <span class="sandbox-color-dot" style="background: #ccfffe;"></span> Accent Cyan
          </button>
          <button type="button" class="sandbox-pill-btn" data-prop="text" data-val="#000000">
            <span class="sandbox-color-dot" style="background: #000000;"></span> Preto
          </button>
          <button type="button" class="sandbox-pill-btn" data-prop="text" data-val="#ffffff">
            <span class="sandbox-color-dot" style="background: #ffffff;"></span> Branco
          </button>
        </div>
      </div>

      <!-- Blend Mode do Elemento -->
      <div class="sandbox-popover-group">
        <div class="sandbox-popover-label-row">
          <label class="sandbox-popover-label">Filtro / Blend Mode</label>
        </div>
        <div class="sandbox-pill-row" id="popover-blend-row">
          <button type="button" class="sandbox-pill-btn is-active" data-prop="blend" data-val="normal">Normal</button>
          <button type="button" class="sandbox-pill-btn" data-prop="blend" data-val="multiply">Multiply</button>
          <button type="button" class="sandbox-pill-btn" data-prop="blend" data-val="difference">Difference</button>
          <button type="button" class="sandbox-pill-btn" data-prop="blend" data-val="screen">Screen</button>
          <button type="button" class="sandbox-pill-btn" data-prop="blend" data-val="overlay">Overlay</button>
          <button type="button" class="sandbox-pill-btn" data-prop="blend" data-val="exclusion">Exclusion</button>
        </div>
      </div>

      <!-- Cor de Fundo da Forma -->
      <div class="sandbox-popover-group">
        <div class="sandbox-popover-label-row">
          <label class="sandbox-popover-label">Cor de Fundo da Forma</label>
        </div>
        <div class="sandbox-pill-row" id="popover-bg-row">
          <button type="button" class="sandbox-pill-btn is-active" data-prop="bg" data-val="transparent">Transparente</button>
          <button type="button" class="sandbox-pill-btn" data-prop="bg" data-val="#00FFFF">Cyan (#00FFFF)</button>
          <button type="button" class="sandbox-pill-btn" data-prop="bg" data-val="#ccfffe">Accent Cyan</button>
          <button type="button" class="sandbox-pill-btn" data-prop="bg" data-val="#0044ff">Azul Ref</button>
          <button type="button" class="sandbox-pill-btn" data-prop="bg" data-val="#ffaacc">Rosa</button>
          <button type="button" class="sandbox-pill-btn" data-prop="bg" data-val="#ffe066">Amarelo</button>
          <button type="button" class="sandbox-pill-btn" data-prop="bg" data-val="#1cb548">Verde</button>
          <button type="button" class="sandbox-pill-btn" data-prop="bg" data-val="#ff1a1a">Vermelho</button>
          <button type="button" class="sandbox-pill-btn" data-prop="bg" data-val="#ffffff">Branco</button>
          <button type="button" class="sandbox-pill-btn" data-prop="bg" data-val="#000000">Preto</button>
        </div>
      </div>

      <!-- Cor de Borda -->
      <div class="sandbox-popover-group">
        <div class="sandbox-popover-label-row">
          <label class="sandbox-popover-label">Cor de Borda</label>
        </div>
        <div class="sandbox-pill-row" id="popover-border-row">
          <button type="button" class="sandbox-pill-btn" data-prop="border" data-val="#000000">Preto</button>
          <button type="button" class="sandbox-pill-btn" data-prop="border" data-val="#00FFFF">Cyan (#00FFFF)</button>
          <button type="button" class="sandbox-pill-btn" data-prop="border" data-val="#0044ff">Azul Ref</button>
          <button type="button" class="sandbox-pill-btn" data-prop="border" data-val="#ccfffe">Accent Cyan</button>
          <button type="button" class="sandbox-pill-btn" data-prop="border" data-val="#ffffff">Branco</button>
          <button type="button" class="sandbox-pill-btn" data-prop="border" data-val="transparent">Sem Borda</button>
        </div>
      </div>

      <!-- Slider: Opacidade do Fundo da Forma (Não afeta texto nem borda) -->
      <div class="sandbox-popover-group">
        <div class="sandbox-popover-label-row">
          <label class="sandbox-popover-label">Opacidade do Fundo</label>
          <span class="sandbox-popover-value" id="val-comp-opacity">100%</span>
        </div>
        <input type="range" class="sandbox-slider" id="slider-comp-opacity" min="0" max="100" value="100">
      </div>

      <!-- Slider: Blur do Fundo (Backdrop Blur - Não afeta texto nem borda) -->
      <div class="sandbox-popover-group">
        <div class="sandbox-popover-label-row">
          <label class="sandbox-popover-label">Desfoque / Blur do Fundo</label>
          <span class="sandbox-popover-value" id="val-comp-blur">10px</span>
        </div>
        <input type="range" class="sandbox-slider" id="slider-comp-blur" min="0" max="40" value="10">
      </div>

      <!-- Slider: Rotação Interativa -->
      <div class="sandbox-popover-group">
        <div class="sandbox-popover-label-row">
          <label class="sandbox-popover-label">Rotação do Elemento</label>
          <span class="sandbox-popover-value" id="val-comp-rotate">0°</span>
        </div>
        <input type="range" class="sandbox-slider" id="slider-comp-rotate" min="-180" max="180" value="0">
      </div>

      <!-- Slider: Escala Proporcional (Zoom) -->
      <div class="sandbox-popover-group">
        <div class="sandbox-popover-label-row">
          <label class="sandbox-popover-label">Escala Proporcional (Zoom)</label>
          <span class="sandbox-popover-value" id="val-comp-scale">100%</span>
        </div>
        <input type="range" class="sandbox-slider" id="slider-comp-scale" min="40" max="250" value="100">
      </div>

      <button type="button" class="sandbox-copy-btn" id="sandbox-copy-btn">
        COPIAR CSS DO ESTILO
      </button>
    </div>
  `;

  document.body.appendChild(overlay);

  // 3. Mecânica do Pop-over e Controles
  const { hidePopover } = initPopoverControls(overlay);

  // 4. Mecânica de Drag & Drop, Rotação e Redimensionamento
  initDragAndResize(overlay);

  // 5. Alternância entre as abas FORMAS e BOTÕES
  const { selectTab } = initSandboxTopTabs(overlay);

  // 6. Mecânica da Prancha de Botões de Fichário
  initFolderTabsPane(overlay);

  // 7. Mecânica do Teclado e Alternância
  const toggleNextTab = () => {
    const activeTabBtn = overlay.querySelector('.sandbox-sidebar-tab.is-active');
    const currentTab = activeTabBtn ? activeTabBtn.getAttribute('data-sandbox-tab') : 'botoes';
    const nextTab = currentTab === 'botoes' ? 'formas' : 'botoes';
    selectTab(nextTab);
  };

  const toggleSandbox = (open) => {
    const isActive = overlay.classList.contains('is-active');
    const shouldOpen = typeof open === 'boolean' ? open : !isActive;

    if (shouldOpen) {
      overlay.classList.add('is-active');
      document.body.style.overflow = 'hidden';
      // Sempre inicia na aba mais recente criada ('botoes')
      selectTab('botoes');
    } else {
      overlay.classList.remove('is-active');
      document.body.style.overflow = '';
      if (typeof hidePopover === 'function') {
        hidePopover();
      }
    }
  };

  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable) {
      return;
    }

    if (e.key === 'l' || e.key === 'L') {
      e.preventDefault();
      const isActive = overlay.classList.contains('is-active');
      if (!isActive) {
        toggleSandbox(true);
      } else {
        // Quando o lightbox está aberto, L alterna entre as abas de teste
        toggleNextTab();
      }
    } else if (e.key === 'Escape') {
      if (overlay.classList.contains('is-active')) {
        toggleSandbox(false);
      }
    }
  });

  triggerBtn.addEventListener('click', () => toggleSandbox(true));
  document.getElementById('sandbox-close-btn').addEventListener('click', () => toggleSandbox(false));
}

/**
 * Inicializa Drag and Drop, Rotação e Redimensionamento Proporcional em cada elemento
 */
function initDragAndResize(overlay) {
  const wrappers = overlay.querySelectorAll('.sandbox-composition-wrapper');

  wrappers.forEach(wrapper => {
    let state = {
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      startX: 0,
      startY: 0,
      startScale: 1,
      startAngle: 0,
      initialRotation: 0,
      isDragging: false,
      isResizing: false,
      isRotating: false
    };

    wrapper._transformState = state;

    const applyTransform = () => {
      wrapper.style.transform = `translate(${state.x}px, ${state.y}px) rotate(${state.rotation}deg) scale(${state.scale})`;
    };

    // Botão de recentralizar do bloco
    const blockEl = wrapper.closest('.sandbox-block');
    const resetBtn = blockEl ? blockEl.querySelector('.sandbox-reset-btn') : null;
    if (resetBtn && !resetBtn._hasResetHandler) {
      resetBtn._hasResetHandler = true;
      resetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const blockWrappers = blockEl.querySelectorAll('.sandbox-composition-wrapper');
        blockWrappers.forEach(bw => {
          if (bw._transformState) {
            bw._transformState.x = 0;
            bw._transformState.y = 0;
            bw._transformState.scale = 1;
            bw._transformState.rotation = 0;
            bw.style.transform = 'translate(0px, 0px) rotate(0deg) scale(1)';
          }
        });
        const scaleSlider = document.getElementById('slider-comp-scale');
        const scaleVal = document.getElementById('val-comp-scale');
        if (scaleSlider && scaleVal) {
          scaleSlider.value = 100;
          scaleVal.textContent = '100%';
        }
        const rotSlider = document.getElementById('slider-comp-rotate');
        const rotVal = document.getElementById('val-comp-rotate');
        if (rotSlider && rotVal) {
          rotSlider.value = 0;
          rotVal.textContent = '0°';
        }
      });
    }

    // Drag com Pointer Events no wrapper
    wrapper.addEventListener('pointerdown', (e) => {
      // Ignora se clicou nas alças de resize ou rotação
      if (e.target.closest('.sandbox-resize-handle') || e.target.closest('.sandbox-rotate-handle')) {
        return;
      }

      state.isDragging = true;
      state.startX = e.clientX - state.x;
      state.startY = e.clientY - state.y;
      wrapper.classList.add('is-dragging');
      wrapper.setPointerCapture(e.pointerId);
    });

    wrapper.addEventListener('pointermove', (e) => {
      if (!state.isDragging) return;
      state.x = e.clientX - state.startX;
      state.y = e.clientY - state.startY;
      applyTransform();
    });

    const stopDrag = (e) => {
      if (state.isDragging) {
        state.isDragging = false;
        wrapper.classList.remove('is-dragging');
        try { wrapper.releasePointerCapture(e.pointerId); } catch (_) {}
      }
    };

    wrapper.addEventListener('pointerup', stopDrag);
    wrapper.addEventListener('pointercancel', stopDrag);

    // Alça de Rotação
    const rotHandle = wrapper.querySelector('.sandbox-rotate-handle');
    if (rotHandle) {
      rotHandle.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        state.isRotating = true;
        const rect = wrapper.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        state.startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
        state.initialRotation = state.rotation;
        wrapper.classList.add('is-rotating');
        rotHandle.setPointerCapture(e.pointerId);
      });

      rotHandle.addEventListener('pointermove', (e) => {
        if (!state.isRotating) return;
        const rect = wrapper.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
        let diff = currentAngle - state.startAngle;
        let newRot = Math.round(state.initialRotation + diff);
        while (newRot > 180) newRot -= 360;
        while (newRot < -180) newRot += 360;
        state.rotation = newRot;
        applyTransform();

        const rotSlider = document.getElementById('slider-comp-rotate');
        const rotVal = document.getElementById('val-comp-rotate');
        if (rotSlider && rotVal) {
          rotSlider.value = state.rotation;
          rotVal.textContent = `${state.rotation}°`;
        }
      });

      const stopRotate = (e) => {
        if (state.isRotating) {
          state.isRotating = false;
          wrapper.classList.remove('is-rotating');
          try { rotHandle.releasePointerCapture(e.pointerId); } catch (_) {}
        }
      };

      rotHandle.addEventListener('pointerup', stopRotate);
      rotHandle.addEventListener('pointercancel', stopRotate);
    }

    // Alça de Redimensionamento Proporcional
    const handle = wrapper.querySelector('.sandbox-resize-handle');
    if (handle) {
      handle.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        state.isResizing = true;
        state.startX = e.clientX;
        state.startY = e.clientY;
        state.startScale = state.scale;
        wrapper.classList.add('is-resizing');
        handle.setPointerCapture(e.pointerId);
      });

      handle.addEventListener('pointermove', (e) => {
        if (!state.isResizing) return;
        const deltaX = e.clientX - state.startX;
        const deltaY = e.clientY - state.startY;
        const avgDelta = (deltaX + deltaY) / 2;

        const newScale = Math.max(0.35, Math.min(2.8, state.startScale + avgDelta * 0.005));
        state.scale = parseFloat(newScale.toFixed(2));
        applyTransform();

        const scaleSlider = document.getElementById('slider-comp-scale');
        const scaleVal = document.getElementById('val-comp-scale');
        if (scaleSlider && scaleVal) {
          scaleSlider.value = Math.round(state.scale * 100);
          scaleVal.textContent = `${Math.round(state.scale * 100)}%`;
        }
      });

      const stopResize = (e) => {
        if (state.isResizing) {
          state.isResizing = false;
          wrapper.classList.remove('is-resizing');
          try { handle.releasePointerCapture(e.pointerId); } catch (_) {}
        }
      };

      handle.addEventListener('pointerup', stopResize);
      handle.addEventListener('pointercancel', stopResize);
    }
  });
}

/**
 * Inicializa o Pop-over com controles de cores, rotação e sliders
 */
function initPopoverControls(overlay) {
  const popover = document.getElementById('sandbox-popover');
  const popoverTitle = document.getElementById('sandbox-popover-title');
  let currentTargetBlock = null;

  const showPopover = (blockEl, clientX, clientY) => {
    currentTargetBlock = blockEl;
    const blockId = blockEl.dataset.blockId;
    const foundBlock = SANDBOX_BLOCKS.find(b => b.id === blockId);

    popoverTitle.textContent = foundBlock ? `${foundBlock.num} / ${foundBlock.name}` : 'AJUSTAR ESTILO';
    popover.classList.add('is-visible');

    // Sincroniza sliders com valores atuais do bloco
    syncSlidersWithBlock(blockEl);

    // Posicionamento inteligente
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;
    const popWidth = 360;
    const popHeight = 520;

    let posX = clientX ? clientX + 24 : winWidth - popWidth - 30;
    let posY = clientY ? clientY - 140 : 80;

    if (posX + popWidth > winWidth - 20) posX = winWidth - popWidth - 20;
    if (posX < 20) posX = 20;
    if (posY + popHeight > winHeight - 20) posY = winHeight - popHeight - 20;
    if (posY < 20) posY = 20;

    popover.style.left = `${posX}px`;
    popover.style.top = `${posY}px`;
  };

  const hidePopover = () => {
    popover.classList.remove('is-visible');
    currentTargetBlock = null;
  };

  document.getElementById('sandbox-popover-close').addEventListener('click', hidePopover);

  // Abertura do Popover via botão "Ajustar Estilo"
  overlay.querySelectorAll('.sandbox-adjust-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const blockEl = btn.closest('.sandbox-block');
      showPopover(blockEl, e.clientX, e.clientY);
    });
  });

  // Clique rápido (sem arrasto) no bloco também abre o popover
  overlay.querySelectorAll('.sandbox-block-stage').forEach(stage => {
    let downTime = 0;
    stage.addEventListener('pointerdown', () => { downTime = Date.now(); });
    stage.addEventListener('pointerup', (e) => {
      if (Date.now() - downTime < 250 && !e.target.closest('.sandbox-resize-handle') && !e.target.closest('.sandbox-rotate-handle')) {
        const blockEl = stage.closest('.sandbox-block');
        showPopover(blockEl, e.clientX, e.clientY);
      }
    });
  });

  // Alternância de Pílulas (Text Color, Blend, Bg Color, Border Color)
  popover.addEventListener('click', (e) => {
    const pill = e.target.closest('.sandbox-pill-btn');
    if (!pill || !currentTargetBlock) return;

    const prop = pill.dataset.prop;
    const val = pill.dataset.val;

    pill.parentElement.querySelectorAll('.sandbox-pill-btn').forEach(b => b.classList.remove('is-active'));
    pill.classList.add('is-active');

    const comps = currentTargetBlock.querySelectorAll('.sandbox-composition');
    const wrappers = currentTargetBlock.querySelectorAll('.sandbox-composition-wrapper');

    switch (prop) {
      case 'text':
        comps.forEach(comp => {
          comp.style.setProperty('--comp-text', val);
          comp.querySelectorAll('span, h2, div, p').forEach(el => {
            if (!el.classList.contains('sandbox-comp-backdrop')) {
              el.style.color = val;
            }
          });
        });
        break;

      case 'blend':
        // Aplica tanto no wrapper quanto na composição para garantir que o blend ocorra sem isolamento
        wrappers.forEach(w => {
          w.style.setProperty('--comp-blend', val);
          w.style.mixBlendMode = val;
        });
        comps.forEach(comp => {
          comp.style.setProperty('--comp-blend', val);
          comp.style.mixBlendMode = val;
        });
        break;

      case 'bg':
        comps.forEach(comp => {
          comp.style.setProperty('--comp-bg', val);
          const backdrop = comp.querySelector('.sandbox-comp-backdrop');
          if (backdrop) backdrop.style.backgroundColor = val;
        });
        break;

      case 'border':
        comps.forEach(comp => {
          comp.style.setProperty('--comp-border', val);
          comp.style.borderColor = val;
          comp.querySelectorAll('.sat-top-semicircle, .sbd-top-dome').forEach(div => {
            div.style.borderBottomColor = val;
          });
        });
        break;
    }
  });

  // Sliders Reativos
  // Opacidade do Fundo: Afeta APENAS o fundo da forma, NUNCA o texto ou a borda
  const compOpacitySlider = document.getElementById('slider-comp-opacity');
  const compOpacityVal = document.getElementById('val-comp-opacity');
  compOpacitySlider.addEventListener('input', () => {
    if (!currentTargetBlock) return;
    const pct = compOpacitySlider.value;
    compOpacityVal.textContent = `${pct}%`;
    const comps = currentTargetBlock.querySelectorAll('.sandbox-composition');
    comps.forEach(comp => {
      comp.style.setProperty('--comp-bg-opacity', pct / 100);
      const backdrop = comp.querySelector('.sandbox-comp-backdrop');
      if (backdrop) backdrop.style.opacity = pct / 100;
    });
  });

  // Blur do Fundo: Afeta APENAS o fundo da forma, NUNCA o texto ou a borda
  const compBlurSlider = document.getElementById('slider-comp-blur');
  const compBlurVal = document.getElementById('val-comp-blur');
  compBlurSlider.addEventListener('input', () => {
    if (!currentTargetBlock) return;
    const px = compBlurSlider.value;
    compBlurVal.textContent = `${px}px`;
    const comps = currentTargetBlock.querySelectorAll('.sandbox-composition');
    comps.forEach(comp => {
      comp.style.setProperty('--comp-bg-blur', `${px}px`);
      comp.style.backdropFilter = px > 0 ? `blur(${px}px)` : 'none';
      comp.style.webkitBackdropFilter = px > 0 ? `blur(${px}px)` : 'none';
      const backdrop = comp.querySelector('.sandbox-comp-backdrop');
      if (backdrop) {
        backdrop.style.backdropFilter = px > 0 ? `blur(${px}px)` : 'none';
        backdrop.style.webkitBackdropFilter = px > 0 ? `blur(${px}px)` : 'none';
      }
    });
  });

  // Slider de Rotação
  const rotSlider = document.getElementById('slider-comp-rotate');
  const rotVal = document.getElementById('val-comp-rotate');
  rotSlider.addEventListener('input', () => {
    if (!currentTargetBlock) return;
    const deg = parseInt(rotSlider.value, 10);
    rotVal.textContent = `${deg}°`;
    const wrappers = currentTargetBlock.querySelectorAll('.sandbox-composition-wrapper');
    wrappers.forEach(w => {
      if (w._transformState) {
        w._transformState.rotation = deg;
        w.style.transform = `translate(${w._transformState.x}px, ${w._transformState.y}px) rotate(${deg}deg) scale(${w._transformState.scale})`;
      }
    });
  });

  // Slider de Escala Proporcional (Zoom)
  const scaleSlider = document.getElementById('slider-comp-scale');
  const scaleVal = document.getElementById('val-comp-scale');
  scaleSlider.addEventListener('input', () => {
    if (!currentTargetBlock) return;
    const pct = scaleSlider.value;
    scaleVal.textContent = `${pct}%`;
    const wrappers = currentTargetBlock.querySelectorAll('.sandbox-composition-wrapper');
    wrappers.forEach(w => {
      if (w._transformState) {
        w._transformState.scale = pct / 100;
        w.style.transform = `translate(${w._transformState.x}px, ${w._transformState.y}px) rotate(${w._transformState.rotation}deg) scale(${w._transformState.scale})`;
      }
    });
  });

  // Copiar CSS do Estilo
  const copyBtn = document.getElementById('sandbox-copy-btn');
  copyBtn.addEventListener('click', () => {
    if (!currentTargetBlock) return;
    const comp = currentTargetBlock.querySelector('.sandbox-composition');
    const wrapper = currentTargetBlock.querySelector('.sandbox-composition-wrapper');
    if (!comp) return;

    const style = window.getComputedStyle(comp);
    const backdrop = comp.querySelector('.sandbox-comp-backdrop');
    const bgOpacity = backdrop && backdrop.style.opacity ? backdrop.style.opacity : '1';
    const bgBlur = backdrop && backdrop.style.backdropFilter ? backdrop.style.backdropFilter : 'none';

    const cssSummary = `/* Configuração do Estilo ${currentTargetBlock.dataset.blockId} */
color: ${comp.style.getPropertyValue('--comp-text') || style.color};
mix-blend-mode: ${wrapper?.style.mixBlendMode || comp.style.getPropertyValue('--comp-blend') || 'normal'};
background-color: ${comp.style.getPropertyValue('--comp-bg') || 'transparent'};
border-color: ${comp.style.getPropertyValue('--comp-border') || style.borderColor};
background-opacity: ${bgOpacity};
backdrop-filter: ${bgBlur};
transform: ${wrapper ? wrapper.style.transform : 'none'};`;

    navigator.clipboard.writeText(cssSummary).then(() => {
      copyBtn.textContent = 'COPIADO COM SUCESSO!';
      setTimeout(() => { copyBtn.textContent = 'COPIAR CSS DO ESTILO'; }, 2000);
    }).catch(() => {
      copyBtn.textContent = 'ERRO AO COPIAR';
    });
  });

  return { showPopover, hidePopover };
}

function syncSlidersWithBlock(blockEl) {
  const comp = blockEl.querySelector('.sandbox-composition');
  const wrapper = blockEl.querySelector('.sandbox-composition-wrapper');

  if (comp) {
    const backdrop = comp.querySelector('.sandbox-comp-backdrop');
    const op = backdrop && backdrop.style.opacity ? Math.round(parseFloat(backdrop.style.opacity) * 100) : 100;
    const opSlider = document.getElementById('slider-comp-opacity');
    const opVal = document.getElementById('val-comp-opacity');
    if (opSlider && opVal) {
      opSlider.value = op;
      opVal.textContent = `${op}%`;
    }

    const blProp = comp.style.getPropertyValue('--comp-bg-blur');
    const blStyle = blProp || (backdrop && backdrop.style.backdropFilter) || comp.style.backdropFilter || '10px';
    const blMatches = String(blStyle).match(/\d+/);
    const bl = blMatches ? parseInt(blMatches[0], 10) : 10;
    const blSlider = document.getElementById('slider-comp-blur');
    const blVal = document.getElementById('val-comp-blur');
    if (blSlider && blVal) {
      blSlider.value = bl;
      blVal.textContent = `${bl}px`;
    }
  }

  if (wrapper && wrapper._transformState) {
    const sc = Math.round(wrapper._transformState.scale * 100);
    const scSlider = document.getElementById('slider-comp-scale');
    const scVal = document.getElementById('val-comp-scale');
    if (scSlider && scVal) {
      scSlider.value = sc;
      scVal.textContent = `${sc}%`;
    }

    const rot = wrapper._transformState.rotation || 0;
    const rotSlider = document.getElementById('slider-comp-rotate');
    const rotVal = document.getElementById('val-comp-rotate');
    if (rotSlider && rotVal) {
      rotSlider.value = rot;
      rotVal.textContent = `${rot}°`;
    }
  }
}

/**
 * Alternância entre as abas FORMAS e BOTÕES do Sandbox
 */
function initSandboxTopTabs(overlay) {
  const tabs = overlay.querySelectorAll('.sandbox-sidebar-tab, .sandbox-topbar-tab');
  const panes = overlay.querySelectorAll('.sandbox-tab-pane');
  const popover = document.getElementById('sandbox-popover');

  const selectTab = (targetTab) => {
    if (!targetTab) return;

    tabs.forEach(t => {
      const isActive = t.getAttribute('data-sandbox-tab') === targetTab;
      t.classList.toggle('is-active', isActive);
      t.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    panes.forEach(pane => {
      const targetId = `sandbox-viewport-${targetTab}`;
      const isMatch = pane.id === targetId;
      if (isMatch) {
        pane.style.setProperty('display', 'flex', 'important');
        pane.classList.add('is-active');
      } else {
        pane.style.setProperty('display', 'none', 'important');
        pane.classList.remove('is-active');
      }
    });

    // Esconde o popover de ajustes de formas ao navegar para botões
    if (targetTab !== 'formas' && popover) {
      popover.classList.remove('is-visible');
    }
  };

  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const targetTab = tab.getAttribute('data-sandbox-tab');
      selectTab(targetTab);
    });
  });

  return { selectTab };
}

/**
 * Mecânica da Prancha de Botões de Fichário:
 * - Slider de curvatura entre 0px e 800px sincronizado com campo numérico (padrão 18px)
 * - Seleção de abas: ao clicar, a aba fica ativa (fundo branco, sem linha inferior) e as demais inativas (accent-cyan)
 */
function initFolderTabsPane(overlay) {
  const container = overlay.querySelector('#sandbox-block-folder-tabs');
  if (!container) return;

  const folderTabs = container.querySelectorAll('.sandbox-folder-tab-btn');
  const slider = container.querySelector('#sandbox-tab-radius-slider');
  const numInput = container.querySelector('#sandbox-tab-radius-num');

  const setRadius = (val) => {
    let num = parseInt(val, 10);
    if (isNaN(num)) num = 16;
    const clamped = Math.max(0, Math.min(800, num));
    if (slider && Number(slider.value) !== clamped) slider.value = clamped;
    if (numInput && Number(numInput.value) !== clamped) numInput.value = clamped;
    container.style.setProperty('--folder-tab-radius', `${clamped}px ${clamped}px 0 0`);
  };

  // Padrão inicial: 16px
  setRadius(16);

  if (slider) {
    slider.addEventListener('input', (e) => {
      setRadius(e.target.value);
    });
  }

  if (numInput) {
    numInput.addEventListener('input', (e) => {
      setRadius(e.target.value);
    });
    numInput.addEventListener('change', (e) => {
      setRadius(e.target.value);
    });
  }

  // Alternância das Abas de Seção ('TODA', 'PRESENTE', 'INSCRIÇÕES ABERTAS', 'PRÓXIMA')
  folderTabs.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      folderTabs.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
    });
  });
}

