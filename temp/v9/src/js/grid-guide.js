// ==========================================================================
// UTILITÁRIO DE DESENVOLVEDOR: GRID MATEMÁTICO 12 COLUNAS & SISTEMA DE GUIAS X/Y
// Ativação via tecla 'G': Modo Oculto -> À Frente -> Sigilo
// Linha Y (#0038ff) alinhada à borda direita do menu com drag e gerador GRID Y (#008838)
// Linha X fixa (#ff4200) no rodapé do cabeçalho com drag e gerador GRID X (#ff00fc)
// ==========================================================================

const STATE = {
  mode: 0, // 0: OCULTO, 1: À FRENTE, 2: SIGILO
  labels: ['GRID: OCULTO [G]', 'GRID: À FRENTE [G]', 'GRID: SIGILO [G]'],
  
  // Guias customizadas arrastadas ou geradas
  customY: [], // { id: 'Y|1', x: 240, hidden: false }
  customX: [], // { id: 'X|1', y: 350, hidden: false }
  yCounter: 1,
  xCounter: 1,

  // Estados de visibilidade das guias fixas
  hiddenGuides: {
    Y: false,
    X: false,
    cols: {} // { 1: false, 2: false, ... }
  },
  deletedCols: {}, // { 1: false, 2: false, ... }

  // Popover ativo
  popover: null,

  // Dragging ativo
  drag: null
};

export function initGridGuide() {
  injectDevStyles();
  buildGridDOM();
  attachEvents();
}

function injectDevStyles() {
  if (document.getElementById('grid-guide-styles')) return;
  const style = document.createElement('style');
  style.id = 'grid-guide-styles';
  style.textContent = `
    /* Container mestre do Grid */
    .dev-grid-overlay {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100dvh;
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      pointer-events: none;
      transition: opacity 0.15s ease;
      opacity: 0;
      z-index: -1;
      box-sizing: border-box;
      overflow: hidden;
    }

    .dev-grid-overlay.mode-1,
    .dev-grid-overlay.mode-2 {
      opacity: 1;
      z-index: 999999;
    }

    /* MODO SIGILO: Oculta todos os textos/etiquetas da ferramenta, mantendo apenas as linhas */
    .dev-grid-overlay.mode-2 .dev-grid-num,
    .dev-grid-overlay.mode-2 .dev-grid-label-y-fixed,
    .dev-grid-overlay.mode-2 .dev-grid-label-y-custom,
    .dev-grid-overlay.mode-2 .dev-grid-label-x-fixed,
    .dev-grid-overlay.mode-2 .dev-grid-label-x-custom {
      display: none !important;
    }

    /* Colunas canônicas de 1 a 12: 1px pontilhadas/dashed, cor sólida 100% opaca #ff4200 */
    .dev-grid-col {
      border-right: 1px dashed #ff4200;
      position: relative;
      height: 100%;
      box-sizing: border-box;
      pointer-events: none;
    }

    .dev-grid-col:last-child {
      border-right: none;
    }

    /* Hit area interativa nas linhas divisórias das colunas */
    .dev-grid-col-line-hit {
      position: absolute;
      top: 0;
      right: -6px;
      width: 12px;
      height: 100%;
      cursor: pointer;
      pointer-events: auto;
      z-index: 10;
    }

    .dev-grid-num {
      position: absolute;
      right: 0;
      top: 4px;
      transform: translateX(50%);
      font-size: 10px;
      font-weight: 700;
      color: #ff4200;
      font-family: monospace;
      user-select: none;
      pointer-events: auto;
      cursor: pointer;
      background: #ffffff;
      padding: 1px 3px;
      border-radius: 2px;
      line-height: 1.1;
      z-index: 11;
    }

    .dev-grid-num.is-hidden-marker {
      opacity: 0.35;
      text-decoration: line-through;
    }

    /* Eixo Vertical Y Fixo (#0038ff): 1px sólido 100% opaco sem box-shadow */
    .dev-grid-line-y-fixed {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 0;
      border-right: 1px solid #0038ff;
      z-index: 20;
      pointer-events: auto;
      cursor: col-resize;
    }

    .dev-grid-line-y-fixed::before {
      content: '';
      position: absolute;
      top: 0;
      bottom: 0;
      left: -6px;
      width: 13px;
      cursor: col-resize;
    }

    .dev-grid-label-y-fixed {
      position: absolute;
      top: 4px;
      right: 4px;
      font-size: 10px;
      font-weight: 700;
      color: #0038ff;
      font-family: monospace;
      user-select: none;
      cursor: pointer;
      background: #ffffff;
      padding: 1px 4px;
      border-radius: 2px;
      line-height: 1.1;
      border: 1px solid #0038ff;
      z-index: 21;
    }

    /* Linhas Verticais Customizadas Y (#008838): 1px pontilhadas/dashed, 100% opacas, sem box-shadow */
    .dev-grid-line-y-custom {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 0;
      border-right: 1px dashed #008838;
      z-index: 20;
      pointer-events: auto;
      cursor: col-resize;
    }

    .dev-grid-line-y-custom::before {
      content: '';
      position: absolute;
      top: 0;
      bottom: 0;
      left: -6px;
      width: 13px;
      cursor: col-resize;
    }

    .dev-grid-label-y-custom {
      position: absolute;
      top: 4px;
      left: 4px;
      font-size: 10px;
      font-weight: 700;
      color: #008f39;
      font-family: monospace;
      user-select: none;
      cursor: pointer;
      background: #ffffff;
      padding: 1px 4px;
      border-radius: 2px;
      line-height: 1.1;
      border: 1px solid #008838;
      z-index: 21;
    }

    /* Eixo Horizontal X Fixo (#ff4200): 1px sólido 100% opaco sem box-shadow */
    .dev-grid-line-x-fixed {
      position: absolute;
      left: 0;
      right: 0;
      height: 0;
      border-bottom: 1px solid #ff4200;
      z-index: 20;
      pointer-events: auto;
      cursor: row-resize;
    }

    .dev-grid-line-x-fixed::before {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      top: -6px;
      height: 13px;
      cursor: row-resize;
    }

    .dev-grid-label-x-fixed {
      position: absolute;
      bottom: 4px;
      left: 12px;
      font-size: 10px;
      font-weight: 700;
      color: #ff4200;
      font-family: monospace;
      user-select: none;
      cursor: pointer;
      background: #ffffff;
      padding: 1px 4px;
      border-radius: 2px;
      line-height: 1.1;
      border: 1px solid #ff4200;
      z-index: 21;
    }

    /* Linhas Horizontais Customizadas e Grid X (#ff00fc): 1px pontilhadas/dashed, 100% opacas, sem box-shadow */
    .dev-grid-line-x-custom {
      position: absolute;
      left: 0;
      right: 0;
      height: 0;
      border-bottom: 1px dashed #ff00fc;
      z-index: 20;
      pointer-events: auto;
      cursor: row-resize;
    }

    .dev-grid-line-x-custom::before {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      top: -6px;
      height: 13px;
      cursor: row-resize;
    }

    .dev-grid-label-x-custom {
      position: absolute;
      bottom: 3px;
      left: 12px;
      font-size: 10px;
      font-weight: 700;
      color: #d000ce;
      font-family: monospace;
      user-select: none;
      cursor: pointer;
      background: #ffffff;
      padding: 1px 4px;
      border-radius: 2px;
      line-height: 1.1;
      border: 1px solid #ff00fc;
      z-index: 21;
    }

    /* Linha Ghost durante o arrasto: 1px pontilhada sem box-shadow */
    .dev-grid-ghost-line-v {
      position: fixed;
      top: 0;
      bottom: 0;
      width: 0;
      border-right: 1px dashed #008838;
      pointer-events: none;
      z-index: 9999999;
    }

    .dev-grid-ghost-line-h {
      position: fixed;
      left: 0;
      right: 0;
      height: 0;
      border-bottom: 1px dashed #ff00fc;
      pointer-events: none;
      z-index: 9999999;
    }

    /* HUD de status no topo */
    .dev-grid-hud {
      position: fixed;
      top: 12px;
      right: 20px;
      background: #ff4200;
      color: #fff;
      padding: 4px 8px;
      font-size: 10px;
      font-weight: 700;
      font-family: monospace;
      border-radius: 4px;
      z-index: 9999999;
      pointer-events: none;
      opacity: 0;
      transform: translateY(-4px);
      transition: all 0.2s;
    }

    .dev-grid-hud.is-visible {
      opacity: 1;
      transform: translateY(0);
    }

    /* Popover Minimalista de Opções com tipografia calibrada com a data da gaveta fechada */
    .dev-grid-popover {
      position: fixed;
      background: #002424;
      color: #ffffff;
      border: 1px solid #affffa;
      border-radius: 4px;
      padding: 6px 10px;
      font-family: var(--font-primary, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif) !important;
      font-size: var(--fs-meta, 12px) !important;
      font-weight: 400 !important;
      letter-spacing: -0.01em !important;
      line-height: 1 !important;
      z-index: 10000000;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      gap: 6px;
      pointer-events: auto;
      user-select: none;
      white-space: nowrap;
    }

    .dev-grid-popover-title {
      font-family: var(--font-primary, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif) !important;
      font-size: var(--fs-meta, 12px) !important;
      font-weight: 400 !important;
      letter-spacing: -0.01em !important;
      text-transform: uppercase;
      opacity: 0.85;
      margin-right: 4px;
    }

    /* Botão-Título para Guia Fixa (com olho) */
    .dev-grid-popover-title-btn {
      appearance: none;
      -webkit-appearance: none;
      border: 1px solid #affffa;
      background: rgba(175, 255, 250, 0.2);
      color: #ffffff;
      padding: 4px 8px;
      font-family: var(--font-primary, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif) !important;
      font-size: var(--fs-meta, 12px) !important;
      font-weight: 400 !important;
      letter-spacing: -0.01em !important;
      border-radius: 3px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: all 0.15s ease;
      text-transform: uppercase;
    }

    .dev-grid-popover-title-btn:hover {
      background: #ffffff;
      color: #002424;
      border-color: #ffffff;
    }

    .dev-grid-popover-btn {
      appearance: none;
      -webkit-appearance: none;
      border: 1px solid rgba(255, 255, 255, 0.3);
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
      padding: 4px 8px;
      font-family: var(--font-primary, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif) !important;
      font-size: var(--fs-meta, 12px) !important;
      font-weight: 400 !important;
      letter-spacing: -0.01em !important;
      border-radius: 3px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: all 0.15s ease;
    }

    .dev-grid-popover-btn:hover {
      background: #ffffff;
      color: #002424;
      border-color: #ffffff;
    }

    .dev-grid-popover-btn.btn-delete:hover,
    .dev-grid-popover-btn.btn-delete-axis:hover {
      background: #ff3344;
      color: #ffffff;
      border-color: #ff3344;
    }

    .dev-grid-popover-gridx-wrap {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border-left: 1px solid rgba(255, 255, 255, 0.2);
      padding-left: 6px;
    }

    .dev-grid-popover-input {
      width: 44px;
      height: 22px;
      background: #001616;
      border: 1px solid rgba(255, 255, 255, 0.4);
      color: #ffffff;
      font-family: var(--font-primary, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif) !important;
      font-size: var(--fs-meta, 12px) !important;
      font-weight: 400 !important;
      text-align: center;
      border-radius: 3px;
      outline: none;
    }

    .dev-grid-popover-input:focus {
      border-color: #00ffff;
    }

    /* Marcador discreto das guias fixas ocultadas (sem linha na extensão) */
    .dev-grid-label-y-fixed.is-fixed-hidden {
      border: 1px dashed #0038ff !important;
      background: rgba(255, 255, 255, 0.9) !important;
      color: #0038ff !important;
      opacity: 0.65;
      font-size: 10px;
      font-weight: 700;
      padding: 1px 4px;
      border-radius: 2px;
      cursor: pointer;
      pointer-events: auto;
    }

    .dev-grid-label-x-fixed.is-fixed-hidden {
      border: 1px dashed #ff4200 !important;
      background: rgba(255, 255, 255, 0.9) !important;
      color: #ff4200 !important;
      opacity: 0.65;
      font-size: 10px;
      font-weight: 700;
      padding: 1px 4px;
      border-radius: 2px;
      cursor: pointer;
      pointer-events: auto;
    }

    .dev-grid-overlay.mode-2 .is-fixed-hidden {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
}

function buildGridDOM() {
  let grid = document.getElementById('dev-grid-overlay');
  if (!grid) {
    grid = document.createElement('div');
    grid.id = 'dev-grid-overlay';
    grid.className = 'dev-grid-overlay';
    document.body.appendChild(grid);
  }

  let hud = document.getElementById('dev-grid-hud');
  if (!hud) {
    hud = document.createElement('div');
    hud.id = 'dev-grid-hud';
    hud.className = 'dev-grid-hud';
    document.body.appendChild(hud);
  }

  renderGuides();
}

function renderGuides() {
  const grid = document.getElementById('dev-grid-overlay');
  if (!grid) return;
  grid.innerHTML = '';

  // 1. Colunas do Grid 12
  for (let i = 1; i <= 12; i++) {
    const col = document.createElement('div');
    col.className = 'dev-grid-col';
    
    if (i < 12) {
      const isDeleted = !!(STATE.deletedCols && STATE.deletedCols[i]);
      if (isDeleted) {
        col.style.borderRight = 'none';
      } else {
        const isHidden = !!STATE.hiddenGuides.cols[i];
        if (!isHidden) {
          const hit = document.createElement('div');
          hit.className = 'dev-grid-col-line-hit';
          hit.dataset.type = 'col';
          hit.dataset.idx = i;
          col.appendChild(hit);
        }

        const num = document.createElement('span');
        num.className = `dev-grid-num ${isHidden ? 'is-hidden-marker' : ''}`;
        num.textContent = `${i}|${i + 1}`;
        num.dataset.type = 'col';
        num.dataset.idx = i;
        col.appendChild(num);

        if (isHidden) {
          col.style.borderRightColor = 'transparent';
        }
      }
    }
    grid.appendChild(col);
  }

  // 2. Linha Vertical Y Fixa (#0038ff)
  // Alinhada exatamente à borda direita do botão de menu (#menu-toggle-btn)
  const menuBtn = document.getElementById('menu-toggle-btn');
  const btnRect = menuBtn ? menuBtn.getBoundingClientRect() : null;
  const yFixedLeft = btnRect ? Math.round(btnRect.right) : 52;

  const isYHidden = !!STATE.hiddenGuides.Y;
  const yLine = document.createElement('div');
  yLine.className = 'dev-grid-line-y-fixed';
  yLine.style.left = `${yFixedLeft}px`;
  yLine.dataset.type = 'Y';

  const yLabel = document.createElement('span');
  yLabel.className = `dev-grid-label-y-fixed ${isYHidden ? 'is-fixed-hidden' : ''}`;
  yLabel.textContent = isYHidden ? '👁 Y' : 'Y';
  yLabel.dataset.type = 'Y';
  if (isYHidden) {
    yLine.style.display = 'none';
    yLabel.style.position = 'fixed';
    yLabel.style.top = '4px';
    yLabel.style.left = `${yFixedLeft - 10}px`;
    grid.appendChild(yLabel);
  } else {
    yLabel.style.left = 'auto';
    yLabel.style.right = '4px';
    yLine.appendChild(yLabel);
    grid.appendChild(yLine);
  }

  // 3. Linhas Verticais Customizadas Y (#008838)
  STATE.customY.forEach(guide => {
    if (guide.hidden) {
      const ghostLabel = document.createElement('span');
      ghostLabel.className = 'dev-grid-label-y-custom';
      ghostLabel.style.position = 'fixed';
      ghostLabel.style.left = `${guide.x + 2}px`;
      ghostLabel.style.top = '4px';
      ghostLabel.style.opacity = '0.35';
      ghostLabel.textContent = `${guide.id} 👁`;
      ghostLabel.dataset.type = 'customY';
      ghostLabel.dataset.id = guide.id;
      grid.appendChild(ghostLabel);
      return;
    }

    const cLine = document.createElement('div');
    cLine.className = 'dev-grid-line-y-custom';
    cLine.style.left = `${guide.x}px`;
    cLine.dataset.type = 'customY';
    cLine.dataset.id = guide.id;

    const cLabel = document.createElement('span');
    cLabel.className = 'dev-grid-label-y-custom';
    cLabel.textContent = guide.id;
    cLabel.dataset.type = 'customY';
    cLabel.dataset.id = guide.id;
    cLine.appendChild(cLabel);

    grid.appendChild(cLine);
  });

  // 4. Linha Horizontal X Fixa (#ff4200)
  const header = document.getElementById('logo-controller');
  const headerRect = header ? header.getBoundingClientRect() : null;
  const xFixedTop = headerRect ? Math.round(headerRect.bottom) : 60;

  const isXHidden = !!STATE.hiddenGuides.X;
  const xLine = document.createElement('div');
  xLine.className = 'dev-grid-line-x-fixed';
  xLine.style.top = `${xFixedTop}px`;
  xLine.dataset.type = 'X';

  const xLabel = document.createElement('span');
  xLabel.className = `dev-grid-label-x-fixed ${isXHidden ? 'is-fixed-hidden' : ''}`;
  xLabel.textContent = isXHidden ? '👁 X' : 'X';
  xLabel.dataset.type = 'X';
  if (isXHidden) {
    xLine.style.display = 'none';
    xLabel.style.position = 'fixed';
    xLabel.style.top = `${xFixedTop - 10}px`;
    xLabel.style.left = '8px';
    grid.appendChild(xLabel);
  } else {
    xLine.appendChild(xLabel);
    grid.appendChild(xLine);
  }

  // 5. Linhas Horizontais Customizadas X (#ff00fc)
  STATE.customX.forEach(guide => {
    if (guide.hidden) {
      const ghostLabel = document.createElement('span');
      ghostLabel.className = 'dev-grid-label-x-custom';
      ghostLabel.style.position = 'fixed';
      ghostLabel.style.top = `${guide.y + 2}px`;
      ghostLabel.style.left = '12px';
      ghostLabel.style.opacity = '0.35';
      ghostLabel.textContent = `${guide.id} 👁`;
      ghostLabel.dataset.type = 'customX';
      ghostLabel.dataset.id = guide.id;
      grid.appendChild(ghostLabel);
      return;
    }

    const cLine = document.createElement('div');
    cLine.className = 'dev-grid-line-x-custom';
    cLine.style.top = `${guide.y}px`;
    cLine.dataset.type = 'customX';
    cLine.dataset.id = guide.id;

    const cLabel = document.createElement('span');
    cLabel.className = 'dev-grid-label-x-custom';
    cLabel.textContent = guide.id;
    cLabel.dataset.type = 'customX';
    cLabel.dataset.id = guide.id;
    cLine.appendChild(cLabel);

    grid.appendChild(cLine);
  });
}

let hudTimeout;
function updateGridRender() {
  const grid = document.getElementById('dev-grid-overlay');
  const hud = document.getElementById('dev-grid-hud');
  if (!grid || !hud) return;
  
  grid.className = `dev-grid-overlay mode-${STATE.mode}`;
  hud.textContent = STATE.labels[STATE.mode];
  hud.classList.add('is-visible');
  
  clearTimeout(hudTimeout);
  hudTimeout = setTimeout(() => hud.classList.remove('is-visible'), 1500);

  closePopover();
  if (STATE.mode > 0) {
    renderGuides();
  }
}

function attachEvents() {
  // Atalho 'G' no teclado
  window.addEventListener('keydown', (e) => {
    const tag = e.target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;
    
    if (e.key.toLowerCase() === 'g') {
      e.preventDefault();
      STATE.mode = (STATE.mode + 1) % 3;
      updateGridRender();
    } else if (e.key === 'Escape') {
      closePopover();
    }
  });

  // Atualização geométrica no resize da janela
  window.addEventListener('resize', () => {
    if (STATE.mode > 0) {
      renderGuides();
    }
  });

  // Mouse Down no Grid para Drag ou Popover
  window.addEventListener('mousedown', handleMouseDown, true);

  // Fechar popover ao clicar fora
  document.addEventListener('pointerdown', (e) => {
    if (STATE.popover && !e.target.closest('.dev-grid-popover') && !e.target.closest('[data-type]')) {
      closePopover();
    }
  });
}

function handleMouseDown(e) {
  if (STATE.mode === 0) return;
  const target = e.target.closest('[data-type]');
  if (!target) return;

  const type = target.dataset.type;
  const id = target.dataset.id;
  const idx = target.dataset.idx;

  const startX = e.clientX;
  const startY = e.clientY;
  let hasMoved = false;
  let ghost = null;

  // Prepara arrasto se for Y, customY, X ou customX
  const onMouseMove = (moveEvent) => {
    const deltaX = Math.abs(moveEvent.clientX - startX);
    const deltaY = Math.abs(moveEvent.clientY - startY);

    if (!hasMoved && (deltaX > 4 || deltaY > 4)) {
      hasMoved = true;
      closePopover();

      if (type === 'Y' || type === 'customY') {
        ghost = document.createElement('div');
        ghost.className = 'dev-grid-ghost-line-v';
        document.body.appendChild(ghost);
      } else if (type === 'X' || type === 'customX') {
        ghost = document.createElement('div');
        ghost.className = 'dev-grid-ghost-line-h';
        document.body.appendChild(ghost);
      }
    }

    if (hasMoved && ghost) {
      if (type === 'Y' || type === 'customY') {
        ghost.style.left = `${moveEvent.clientX}px`;
      } else if (type === 'X' || type === 'customX') {
        ghost.style.top = `${moveEvent.clientY}px`;
      }
    }
  };

  const onMouseUp = (upEvent) => {
    window.removeEventListener('mousemove', onMouseMove, true);
    window.removeEventListener('mouseup', onMouseUp, true);

    if (ghost) {
      ghost.remove();
      ghost = null;
    }

    if (hasMoved) {
      // Finalização do arrasto de nova linha ou movimentação
      if (type === 'Y') {
        // Cria nova linha vertical #008838
        const newId = `Y|${STATE.yCounter++}`;
        STATE.customY.push({ id: newId, x: upEvent.clientX, hidden: false });
        renderGuides();
      } else if (type === 'customY') {
        // Reposiciona a linha customizada
        const item = STATE.customY.find(g => g.id === id);
        if (item) {
          item.x = upEvent.clientX;
          renderGuides();
        }
      } else if (type === 'X') {
        // Cria nova linha horizontal #ff00fc
        const newId = `X|${STATE.xCounter++}`;
        STATE.customX.push({ id: newId, y: upEvent.clientY, hidden: false });
        renderGuides();
      } else if (type === 'customX') {
        // Reposiciona a linha horizontal customizada
        const item = STATE.customX.find(g => g.id === id);
        if (item) {
          item.y = upEvent.clientY;
          renderGuides();
        }
      }
    } else {
      // Foi apenas um clique simples: abrir popover
      openPopover({ type, id, idx, x: upEvent.clientX, y: upEvent.clientY });
    }
  };

  window.addEventListener('mousemove', onMouseMove, true);
  window.addEventListener('mouseup', onMouseUp, true);
}

function openPopover({ type, id, idx, x, y }) {
  closePopover();

  const pop = document.createElement('div');
  pop.className = 'dev-grid-popover';

  let title = '';
  let isHidden = false;
  let isCustom = (type === 'customY' || type === 'customX');
  let isXFixed = (type === 'X');
  let isYFixed = (type === 'Y');
  let isCol = (type === 'col');

  if (isCol) {
    title = `COLUNA ${idx}|${parseInt(idx, 10) + 1}`;
    isHidden = !!STATE.hiddenGuides.cols[idx];
  } else if (isYFixed) {
    title = 'GUIA Y (FIXA)';
    isHidden = !!STATE.hiddenGuides.Y;
  } else if (type === 'customY') {
    title = `GUIA ${id}`;
    const item = STATE.customY.find(g => g.id === id);
    isHidden = item ? item.hidden : false;
  } else if (isXFixed) {
    title = 'GUIA X (FIXA)';
    isHidden = !!STATE.hiddenGuides.X;
  } else if (type === 'customX') {
    title = `GUIA ${id}`;
    const item = STATE.customX.find(g => g.id === id);
    isHidden = item ? item.hidden : false;
  }

  let html = '';

  if (isYFixed || isXFixed) {
    // 1. Botão-título no próprio título com caractere de olho antes de GUIA
    html += `
      <button type="button" class="dev-grid-popover-title-btn btn-title-fixed-toggle" title="${isHidden ? 'Exibir guia fixa' : 'Ocultar guia fixa'}">
        👁 ${title}
      </button>
    `;

    // 2. Opções Ocultar e Excluir para as demais linhas do eixo correspondente
    let allAxisHidden = false;
    if (isYFixed) {
      const activeCols = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].filter(i => !(STATE.deletedCols && STATE.deletedCols[i]));
      const allColsHidden = activeCols.length > 0 && activeCols.every(i => STATE.hiddenGuides.cols[i]);
      const hasCustomY = STATE.customY.length > 0;
      const allCustomYHidden = hasCustomY && STATE.customY.every(g => g.hidden);

      if (hasCustomY && activeCols.length > 0) {
        allAxisHidden = allCustomYHidden && allColsHidden;
      } else if (hasCustomY) {
        allAxisHidden = allCustomYHidden;
      } else if (activeCols.length > 0) {
        allAxisHidden = allColsHidden;
      } else {
        allAxisHidden = false;
      }
    } else {
      const axisItems = STATE.customX;
      allAxisHidden = axisItems.length > 0 && axisItems.every(g => g.hidden);
    }

    html += `
      <button type="button" class="dev-grid-popover-btn btn-toggle-axis" title="${allAxisHidden ? 'Exibir demais guias deste eixo' : 'Ocultar demais guias deste eixo'}">
        👁 ${allAxisHidden ? 'EXIBIR' : 'OCULTAR'}
      </button>
      <button type="button" class="dev-grid-popover-btn btn-delete-axis" title="Excluir todas as demais guias deste eixo">
        ✕ EXCLUIR
      </button>
    `;

    // 3. Opções Salvar e Carregar JSON (compila informações de guias visíveis)
    html += `
      <button type="button" class="dev-grid-popover-btn btn-save-json" title="Salvar todas as guias visíveis em arquivo JSON">
        💾 SALVAR JSON
      </button>
      <button type="button" class="dev-grid-popover-btn btn-load-json" title="Carregar guias de um arquivo JSON">
        📂 CARREGAR JSON
      </button>
      <input type="file" class="input-load-json" accept=".json" style="display:none;" />
    `;

    // 4. Gerador de Grid Y / X
    if (isYFixed) {
      html += `
        <div class="dev-grid-popover-gridx-wrap">
          <button type="button" class="dev-grid-popover-btn btn-grid-y" title="Dividir tela verticalmente com precisão matemática">
            GRID Y
          </button>
          <input type="number" class="dev-grid-popover-input input-grid-y" min="1" max="64" value="12" title="Número de divisões verticais" />
        </div>
      `;
    } else {
      html += `
        <div class="dev-grid-popover-gridx-wrap">
          <button type="button" class="dev-grid-popover-btn btn-grid-x" title="Dividir tela horizontalmente com precisão matemática">
            GRID X
          </button>
          <input type="number" class="dev-grid-popover-input input-grid-x" min="1" max="64" value="12" title="Número de divisões horizontais" />
        </div>
      `;
    }
  } else {
    // Guia customizada ou coluna
    html += `<span class="dev-grid-popover-title">${title}</span>`;
    html += `
      <button type="button" class="dev-grid-popover-btn btn-toggle-hide" title="${isHidden ? 'Exibir linha' : 'Ocultar linha'}">
        👁 ${isHidden ? 'EXIBIR' : 'OCULTAR'}
      </button>
    `;

    if (isCustom || isCol) {
      html += `
        <button type="button" class="dev-grid-popover-btn btn-delete" title="Excluir guia">
          ✕ EXCLUIR
        </button>
      `;
    }
  }

  pop.innerHTML = html;

  // Posicionamento inteligente na tela
  const pad = 12;
  let posX = x + pad;
  let posY = y + pad;
  if (posX + 540 > window.innerWidth) posX = window.innerWidth - 550;
  if (posY + 60 > window.innerHeight) posY = y - 50;

  pop.style.left = `${Math.max(8, posX)}px`;
  pop.style.top = `${Math.max(8, posY)}px`;

  document.body.appendChild(pop);
  STATE.popover = pop;

  // 1. Toggle da guia fixa pelo botão-título
  pop.querySelector('.btn-title-fixed-toggle')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isYFixed) {
      STATE.hiddenGuides.Y = !STATE.hiddenGuides.Y;
    } else if (isXFixed) {
      STATE.hiddenGuides.X = !STATE.hiddenGuides.X;
    }
    renderGuides();
    closePopover();
  });

  // 2. Toggle das demais guias do eixo
  pop.querySelector('.btn-toggle-axis')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isYFixed) {
      const activeCols = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].filter(i => !(STATE.deletedCols && STATE.deletedCols[i]));
      const allColsHidden = activeCols.length > 0 && activeCols.every(i => STATE.hiddenGuides.cols[i]);
      const hasCustomY = STATE.customY.length > 0;
      const allCustomYHidden = hasCustomY && STATE.customY.every(g => g.hidden);

      let shouldShow = false;
      if (hasCustomY && activeCols.length > 0) {
        shouldShow = allCustomYHidden && allColsHidden;
      } else if (hasCustomY) {
        shouldShow = allCustomYHidden;
      } else if (activeCols.length > 0) {
        shouldShow = allColsHidden;
      } else {
        shouldShow = false;
      }

      // Aplica tanto às novas linhas Y quanto às guias principais de colunas
      STATE.customY.forEach(g => { g.hidden = !shouldShow; });
      for (let i = 1; i <= 11; i++) {
        STATE.hiddenGuides.cols[i] = !shouldShow;
        if (shouldShow && STATE.deletedCols) {
          STATE.deletedCols[i] = false;
        }
      }
    } else if (isXFixed) {
      const allHidden = STATE.customX.length > 0 && STATE.customX.every(g => g.hidden);
      STATE.customX.forEach(g => { g.hidden = !allHidden; });
    }
    renderGuides();
    closePopover();
  });

  // 3. Excluir todas as demais guias do eixo
  pop.querySelector('.btn-delete-axis')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isYFixed) {
      // Exclui tanto as novas linhas Y quanto as guias principais de colunas
      STATE.customY = [];
      STATE.deletedCols = STATE.deletedCols || {};
      for (let i = 1; i <= 11; i++) {
        STATE.deletedCols[i] = true;
        STATE.hiddenGuides.cols[i] = true;
      }
    } else if (isXFixed) {
      STATE.customX = [];
    }
    renderGuides();
    closePopover();
  });

  // 4. Salvar JSON das guias visíveis
  pop.querySelector('.btn-save-json')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const visibleData = {
      tipo: "guias-fonte",
      versao: "1.0",
      data: new Date().toISOString(),
      viewport: {
        largura: window.innerWidth,
        altura: window.innerHeight
      },
      guias_fixas: {
        Y: !STATE.hiddenGuides.Y,
        X: !STATE.hiddenGuides.X
      },
      colunas_visiveis: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].filter(idx => !STATE.hiddenGuides.cols[idx] && !(STATE.deletedCols && STATE.deletedCols[idx])),
      guias_verticais: STATE.customY.filter(g => !g.hidden).map(g => ({ id: g.id, x: g.x })),
      guias_horizontais: STATE.customX.filter(g => !g.hidden).map(g => ({ id: g.id, y: g.y }))
    };

    const blob = new Blob([JSON.stringify(visibleData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fonte-guias-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    closePopover();
  });

  // 5. Carregar JSON
  const fileInput = pop.querySelector('.input-load-json');
  pop.querySelector('.btn-load-json')?.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput?.click();
  });

  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target.result);
        if (json.guias_verticais && Array.isArray(json.guias_verticais)) {
          STATE.customY = json.guias_verticais.map(g => ({ id: g.id, x: g.x, hidden: false }));
        }
        if (json.guias_horizontais && Array.isArray(json.guias_horizontais)) {
          STATE.customX = json.guias_horizontais.map(g => ({ id: g.id, y: g.y, hidden: false }));
        }
        if (json.guias_fixas) {
          if (typeof json.guias_fixas.Y === 'boolean') STATE.hiddenGuides.Y = !json.guias_fixas.Y;
          if (typeof json.guias_fixas.X === 'boolean') STATE.hiddenGuides.X = !json.guias_fixas.X;
        }
        if (json.colunas_visiveis && Array.isArray(json.colunas_visiveis)) {
          STATE.deletedCols = {};
          for (let i = 1; i <= 11; i++) {
            STATE.hiddenGuides.cols[i] = !json.colunas_visiveis.includes(i);
          }
        }
        renderGuides();
      } catch (err) {
        console.error('Erro ao ler JSON de guias:', err);
      }
      closePopover();
    };
    reader.readAsText(file);
  });

  // 6. Ação Ocultar / Exibir individual (para custom e col)
  pop.querySelector('.btn-toggle-hide')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (type === 'col') {
      STATE.hiddenGuides.cols[idx] = !STATE.hiddenGuides.cols[idx];
    } else if (type === 'customY') {
      const item = STATE.customY.find(g => g.id === id);
      if (item) item.hidden = !item.hidden;
    } else if (type === 'customX') {
      const item = STATE.customX.find(g => g.id === id);
      if (item) item.hidden = !item.hidden;
    }
    renderGuides();
    closePopover();
  });

  // 7. Ação Excluir individual (para custom e col)
  pop.querySelector('.btn-delete')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (type === 'customY') {
      STATE.customY = STATE.customY.filter(g => g.id !== id);
    } else if (type === 'customX') {
      STATE.customX = STATE.customX.filter(g => g.id !== id);
    } else if (type === 'col') {
      STATE.deletedCols = STATE.deletedCols || {};
      STATE.deletedCols[idx] = true;
    }
    renderGuides();
    closePopover();
  });

  // 8. Ação GRID Y com alinhamento exato nas linhas convencionais
  if (isYFixed) {
    const gridYBtn = pop.querySelector('.btn-grid-y');
    const gridYInput = pop.querySelector('.input-grid-y');

    const applyGridY = () => {
      const divisions = parseInt(gridYInput.value, 10);
      if (isNaN(divisions) || divisions <= 1) return;

      STATE.deletedCols = {};
      STATE.hiddenGuides.cols = {};

      const gridOverlay = document.getElementById('dev-grid-overlay');
      const cols = gridOverlay ? gridOverlay.querySelectorAll('.dev-grid-col') : [];

      if (divisions === 12 && cols.length >= 12) {
        for (let i = 0; i < 11; i++) {
          const colRect = cols[i].getBoundingClientRect();
          const lineX = Math.round(colRect.right);
          const newId = `Y|${i + 2}`;
          const existing = STATE.customY.find(g => g.id === newId);
          if (existing) {
            existing.x = lineX;
            existing.hidden = false;
          } else {
            STATE.customY.push({ id: newId, x: lineX, hidden: false });
          }
        }
      } else {
        const gridRect = gridOverlay ? gridOverlay.getBoundingClientRect() : { left: 0, width: window.innerWidth };
        for (let i = 1; i < divisions; i++) {
          const lineX = Math.round(gridRect.left + (i / divisions) * gridRect.width);
          const newId = `Y|${i + 1}`;
          const existing = STATE.customY.find(g => g.id === newId);
          if (existing) {
            existing.x = lineX;
            existing.hidden = false;
          } else {
            STATE.customY.push({ id: newId, x: lineX, hidden: false });
          }
        }
      }

      renderGuides();
      closePopover();
    };

    gridYBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      applyGridY();
    });

    gridYInput?.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        applyGridY();
      }
    });

    gridYInput?.addEventListener('click', (e) => e.stopPropagation());
  }

  // 9. Ação GRID X com divisão horizontal exata da viewport
  if (isXFixed) {
    const gridXBtn = pop.querySelector('.btn-grid-x');
    const gridXInput = pop.querySelector('.input-grid-x');

    const applyGridX = () => {
      const divisions = parseInt(gridXInput.value, 10);
      if (isNaN(divisions) || divisions <= 1) return;

      const gridOverlay = document.getElementById('dev-grid-overlay');
      const gridRect = gridOverlay ? gridOverlay.getBoundingClientRect() : { top: 0, height: window.innerHeight };

      for (let i = 1; i < divisions; i++) {
        const lineY = Math.round(gridRect.top + (i / divisions) * gridRect.height);
        const newId = `X|${i + 1}`;
        const existing = STATE.customX.find(g => g.id === newId);
        if (existing) {
          existing.y = lineY;
          existing.hidden = false;
        } else {
          STATE.customX.push({ id: newId, y: lineY, hidden: false });
        }
      }

      renderGuides();
      closePopover();
    };

    gridXBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      applyGridX();
    });

    gridXInput?.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        applyGridX();
      }
    });

    gridXInput?.addEventListener('click', (e) => e.stopPropagation());
  }
}

function closePopover() {
  if (STATE.popover) {
    STATE.popover.remove();
    STATE.popover = null;
  }
}
