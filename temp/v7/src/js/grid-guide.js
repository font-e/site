/**
 * Grid Guia & Régua Numérica de 12 Colunas (Design System FONTE)
 * - 12 Colunas matemáticas com 11 divisórias verticais em #ff4200
 * - Números identificadores nas junções [1 2], [2 3], ..., [11 12]
 * - Máquina de estados: Fundo (0) -> Frente (99999) -> Desativado (hidden)
 * - Atalhos: Tecla 'G' / 'g' ou Duplo Clique no fundo da página
 */

const STORAGE_KEY = 'fonte_grid_mode';
const MODES = ['background', 'foreground', 'hidden'];

const MODE_LABELS = {
  background: 'GRID: AO FUNDO [G]',
  foreground: 'GRID: À FRENTE [G]',
  hidden: 'GRID: DESATIVADO [G]'
};

let currentModeIndex = 0;
let hudTimeout = null;

export function initGridGuide() {
  // Recupera estado prévio do usuário ou inicia em 'background'
  const savedMode = localStorage.getItem(STORAGE_KEY);
  if (savedMode && MODES.includes(savedMode)) {
    currentModeIndex = MODES.indexOf(savedMode);
  } else {
    currentModeIndex = 0; // 'background'
  }

  // Remove overlay legado se existir
  const legacyOverlay = document.querySelector('.residencia-grid-bg');
  if (legacyOverlay) {
    legacyOverlay.remove();
  }

  // Cria ou seleciona o overlay mestre
  let overlay = document.getElementById('grid-guide-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'grid-guide-overlay';
    overlay.className = 'grid-guide-overlay';
    overlay.setAttribute('aria-hidden', 'true');

    // Constrói as 12 colunas com 11 divisórias numeradas
    let colsHtml = '';
    for (let i = 1; i <= 12; i++) {
      if (i < 12) {
        colsHtml += `
          <div class="grid-guide-col" data-col="${i}">
            <div class="grid-guide-numbers">
              <span class="num-left">${i}</span>
              <span class="num-right">${i + 1}</span>
            </div>
          </div>
        `;
      } else {
        colsHtml += `<div class="grid-guide-col" data-col="${i}"></div>`;
      }
    }
    overlay.innerHTML = colsHtml;
    document.body.prepend(overlay);
  }

  // Cria o HUD de feedback visual discreto
  let hud = document.getElementById('grid-guide-hud');
  if (!hud) {
    hud = document.createElement('div');
    hud.id = 'grid-guide-hud';
    hud.className = 'grid-guide-hud';
    document.body.appendChild(hud);
  }

  // Aplica o modo inicial
  applyGridMode(false);

  // Listener para atalho de teclado 'G' ou 'g'
  window.addEventListener('keydown', (e) => {
    // Ignora se o foco estiver em campo de entrada de texto
    const targetTag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
    if (targetTag === 'input' || targetTag === 'textarea' || e.target.isContentEditable) {
      return;
    }

    if (e.key === 'g' || e.key === 'G') {
      e.preventDefault();
      cycleGridMode();
    }
  });

  // Listener para Duplo Clique em áreas livres da página
  document.addEventListener('dblclick', (e) => {
    const targetTag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
    if (['button', 'a', 'input', 'textarea', 'img'].includes(targetTag) || e.target.closest('button, a, .filter-pill, .modalidade-card, .artista-card')) {
      return;
    }
    cycleGridMode();
  });
}

export function cycleGridMode() {
  currentModeIndex = (currentModeIndex + 1) % MODES.length;
  applyGridMode(true);
}

function applyGridMode(showHud = true) {
  const mode = MODES[currentModeIndex];
  localStorage.setItem(STORAGE_KEY, mode);

  const overlay = document.getElementById('grid-guide-overlay');
  if (overlay) {
    overlay.classList.remove('mode-background', 'mode-foreground', 'mode-hidden');
    overlay.classList.add(`mode-${mode}`);
  }

  if (showHud) {
    showGridHud(MODE_LABELS[mode]);
  }
}

function showGridHud(text) {
  const hud = document.getElementById('grid-guide-hud');
  if (!hud) return;

  hud.textContent = text;
  hud.classList.add('is-visible');

  if (hudTimeout) {
    clearTimeout(hudTimeout);
  }

  hudTimeout = setTimeout(() => {
    hud.classList.remove('is-visible');
  }, 1300);
}
