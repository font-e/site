/**
 * FONTE - GERAL.JS (VERSÃO BASIC)
 * Lógica canônica de navegação, abas de programação/residência/info,
 * sincronização de ateliês, grid guia e alternância de fontes com tag toast.
 * Posição e rolagem normais dos títulos (sem sticky).
 */

document.addEventListener('DOMContentLoaded', () => {
  initMenuToggle();
  initNavScroll();
  initProgramacaoTabs();
  initResidenciaTabs();
  initInfoTabs();
  initAteliesInteraction();
  initGridGuide();
  initFontToggle();
});

/* 1. MENU COLAPSÁVEL DO CABEÇALHO */
function initMenuToggle() {
  const toggleBtn = document.getElementById('menu-toggle-btn');
  const navContainer = document.getElementById('header-nav-left');
  const icon = document.getElementById('menu-toggle-icon');

  if (!toggleBtn || !navContainer) return;

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = navContainer.classList.toggle('is-open');
    toggleBtn.classList.toggle('is-active', isOpen);
    toggleBtn.setAttribute('aria-expanded', String(isOpen));
    if (icon) {
      icon.textContent = isOpen ? '✕' : '≡';
    }
  });

  // Fecha o menu ao clicar fora dele
  document.addEventListener('click', (e) => {
    if (!navContainer.contains(e.target)) {
      navContainer.classList.remove('is-open');
      toggleBtn.classList.remove('is-active');
      toggleBtn.setAttribute('aria-expanded', 'false');
      if (icon) icon.textContent = '≡';
    }
  });
}

/* 2. SCROLL SUAVE PARA SEÇÕES */
function initNavScroll() {
  const navButtons = document.querySelectorAll('[data-scroll-to]');
  navButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = btn.getAttribute('data-scroll-to');
      const targetSec = document.getElementById(targetId);
      if (targetSec) {
        targetSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

/* 3. ABAS DE PROGRAMAÇÃO (FILTRAGEM DE EVENTOS) */
function initProgramacaoTabs() {
  const tabs = document.querySelectorAll('#prog-tabs-rail .section-folder-tab-btn');
  const items = document.querySelectorAll('.programacao-event-item');

  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      tabs.forEach(t => t.classList.remove('is-active'));
      tab.classList.add('is-active');

      const filter = tab.getAttribute('data-prog-filter') || 'all';

      items.forEach(item => {
        const itemTag = item.getAttribute('data-event-tag') || '';
        if (filter === 'all' || itemTag === filter) {
          item.style.display = '';
        } else {
          item.style.display = 'none';
        }
      });
    });
  });
}

/* 4. ABAS DE RESIDÊNCIA (TRANSIÇÃO ENTRE 3 SUBSEÇÕES TEXTUAIS) */
function initResidenciaTabs() {
  const tabs = document.querySelectorAll('#res-tabs-rail .section-folder-tab-btn');
  const panes = document.querySelectorAll('.res-tab-pane');

  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      tabs.forEach(t => t.classList.remove('is-active'));
      tab.classList.add('is-active');

      const targetPaneId = tab.getAttribute('data-res-pane');
      panes.forEach(pane => {
        if (pane.id === targetPaneId) {
          pane.classList.add('is-active');
        } else {
          pane.classList.remove('is-active');
        }
      });
    });
  });
}

/* 5. INTERAÇÃO DA SEÇÃO DE ATELIÊS (SINCRONIZAÇÃO ENTRE 9 NOMES E 9 FOTOS 3x3) */
function initAteliesInteraction() {
  const nameItems = document.querySelectorAll('.artist-name-item');
  const photoCells = document.querySelectorAll('.photo-cell');

  function setActiveIndex(idx) {
    nameItems.forEach(item => {
      const match = item.getAttribute('data-artist-index') === String(idx);
      item.classList.toggle('is-active', match);
    });

    photoCells.forEach(cell => {
      const match = cell.getAttribute('data-artist-index') === String(idx);
      cell.classList.toggle('is-highlighted', match);
    });
  }

  nameItems.forEach(item => {
    const idx = item.getAttribute('data-artist-index');
    item.addEventListener('mouseenter', () => setActiveIndex(idx));
    item.addEventListener('click', () => setActiveIndex(idx));
  });

  photoCells.forEach(cell => {
    const idx = cell.getAttribute('data-artist-index');
    cell.addEventListener('mouseenter', () => setActiveIndex(idx));
    cell.addEventListener('click', () => setActiveIndex(idx));
  });
}

/* 6. GRID GUIA DE 12 COLUNAS (TECLA 'G') */
function initGridGuide() {
  const overlay = document.getElementById('grid-guide-overlay');

  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) return;
    if (e.key === 'g' || e.key === 'G') {
      if (overlay) {
        overlay.classList.toggle('is-active');
      }
    }
  });
}

/* 7. ALTERNÂNCIA DE FONTES COM A TECLA 'F' (SPLINE SANS -> FIRA SANS -> EPILOGUE) */
function initFontToggle() {
  const FONTS = [
    { id: 'spline', name: 'Spline Sans' },
    { id: 'fira', name: 'Fira Sans' },
    { id: 'epilogue', name: 'Epilogue' }
  ];

  let toastTimeout = null;

  const showFontToast = (fontName) => {
    let tag = document.getElementById('font-toast-tag');
    if (!tag) {
      tag = document.createElement('div');
      tag.id = 'font-toast-tag';
      tag.className = 'font-toast-tag';
      tag.setAttribute('aria-live', 'polite');
      tag.setAttribute('aria-atomic', 'true');
      document.body.appendChild(tag);
    }

    tag.textContent = fontName;
    tag.classList.add('is-visible');

    if (toastTimeout) {
      clearTimeout(toastTimeout);
    }

    toastTimeout = setTimeout(() => {
      tag.classList.remove('is-visible');
    }, 3000);
  };

  window.addEventListener('keydown', (e) => {
    // Não interfere caso o usuário esteja em campos de texto editáveis
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) return;

    if (e.key === 'f' || e.key === 'F') {
      const currentAttr = document.documentElement.getAttribute('data-font');
      let currentIndex = 0; // padrão: 'spline'
      if (currentAttr === 'fira' || document.body.classList.contains('font-fira')) {
        currentIndex = 1;
      } else if (currentAttr === 'epilogue' || document.body.classList.contains('font-epilogue')) {
        currentIndex = 2;
      }

      const nextIndex = (currentIndex + 1) % FONTS.length;
      const nextFont = FONTS[nextIndex];

      document.documentElement.setAttribute('data-font', nextFont.id);
      document.body.classList.remove('font-fira', 'font-epilogue', 'font-spline');
      document.body.classList.add(`font-${nextFont.id}`);

      // Exibe a tag idêntica à aba hover por 3 segundos
      showFontToast(nextFont.name);
    }
  });
}

/* 8. ABAS DE INFO (SOBRE, HISTÓRICO E APOIE) */
function initInfoTabs() {
  const tabs = document.querySelectorAll('#info-tabs-rail .section-folder-tab-btn');
  const panes = document.querySelectorAll('#sec-info .info-tab-pane');

  if (!tabs.length || !panes.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      tabs.forEach(t => t.classList.remove('is-active'));
      tab.classList.add('is-active');

      const targetPaneId = tab.getAttribute('data-info-pane');
      panes.forEach(pane => {
        if (pane.id === targetPaneId) {
          pane.classList.add('is-active');
        } else {
          pane.classList.remove('is-active');
        }
      });
    });
  });
}
