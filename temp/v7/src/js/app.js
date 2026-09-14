import { loadAtelies } from './atelies.js';
import { loadProgram } from './program.js';
import { loadResidencia } from './residencia.js';
import { initGridGuide } from './grid-guide.js';
import { initArqModule } from './arq.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Atualiza dinamicamente a altura do cabeçalho sticky
  const updateHeaderHeight = () => {
    const header = document.getElementById('logo-controller');
    if (header) {
      const h = header.offsetHeight;
      document.documentElement.style.setProperty('--header-height', `${h}px`);
    }
  };
  updateHeaderHeight();
  window.addEventListener('resize', updateHeaderHeight, { passive: true });

  // Inicializa o Grid Guia & Régua de 12 Colunas
  initGridGuide();
  initMenuToggle();

  const ateliesContainer = document.getElementById('atelies-grid-container');
  const programacaoContainer = document.getElementById('programacao-grid-container');
  const residenciaContainer = document.getElementById('sec-residencia');
  const archiveContainer = document.getElementById('table-body-container');

  const promises = [];

  if (programacaoContainer) {
    promises.push(loadProgram());
  }

  if (ateliesContainer) {
    promises.push(loadAtelies());
  }

  if (residenciaContainer) {
    promises.push(loadResidencia());
  }

  if (archiveContainer) {
    promises.push(initArqModule());
  }

  await Promise.allSettled(promises);

  initSpaNavigation();

  if (typeof ScrollTrigger !== 'undefined') {
    ScrollTrigger.refresh();
  }
});

function initSpaNavigation() {
  initMenuToggle();

  const navBtns = document.querySelectorAll('.header-nav-btn[href^="#"]');

  if (navBtns.length > 0) {
    navBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        // Ao clicar em um link de seção, fecha as gavetas de conteúdo e o menu compacto
        if (window._drawerClose) window._drawerClose(null);
        if (window._arqDrawerClose) window._arqDrawerClose(null);
        if (window._closeCompactMenu) window._closeCompactMenu();

        const targetId = btn.getAttribute('href').substring(1);
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          e.preventDefault();
          const header = document.getElementById('logo-controller');
          const headerHeight = header ? header.offsetHeight : 56;
          
          // Alinha o topo do bloco de título da seção (4 colunas) com a base do cabeçalho fixo
          const titleBox = targetEl.querySelector('.archive-header-bar, .programacao-header-bar, .residencia-header-bar, .atelies-header-bar, .archive-title-box, .programacao-title-box, .residencia-title-box, .atelies-title-box') || targetEl;
          const targetTop = titleBox.getBoundingClientRect().top + window.scrollY - headerHeight;

          window.scrollTo({
            top: Math.max(0, targetTop),
            behavior: 'smooth'
          });
        }
      });
    });
  }

  // Previne recarregamento quando clica no item da página em que já está e realiza scroll suave ao topo
  const allNavBtns = document.querySelectorAll('.header-nav-btn');
  allNavBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const href = btn.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      try {
        const url = new URL(btn.href, window.location.href);
        const currentPath = window.location.pathname.replace(/\/$/, '') || '/index.html';
        const targetPath = url.pathname.replace(/\/$/, '') || '/index.html';
        
        const isCurrentPage = currentPath === targetPath || 
          ((currentPath.endsWith('/index.html') || currentPath.endsWith('/arquivo.html') || currentPath === '') &&
           (targetPath.endsWith('/index.html') || targetPath.endsWith('/arquivo.html') || targetPath === ''));

        if (isCurrentPage && url.hostname === window.location.hostname) {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } catch {
        // Fallback nativo
      }
    });
  });

  // Scroll Spy dinâmico para atualizar o estado ativo dos botões no menu
  const trackedSections = [
    { id: 'sec-programacao', btnId: 'nav-btn-programacao' },
    { id: 'sec-residencia', btnId: 'nav-btn-residencia' },
    { id: 'sec-atelies', btnId: 'nav-btn-atelies' },
    { id: 'sec-arquivo', btnId: 'nav-btn-arquivo' }
  ].map(item => ({
    section: document.getElementById(item.id),
    btn: document.getElementById(item.btnId)
  })).filter(item => item.section && item.btn && item.btn.getAttribute('href')?.startsWith('#'));

  if (trackedSections.length > 0) {
    const updateActiveNavOnScroll = () => {
      const header = document.getElementById('logo-controller');
      const headerHeight = header ? header.offsetHeight : 56;
      const scrollPos = window.scrollY + headerHeight + 100;

      let activeItem = trackedSections[0];
      for (let i = 0; i < trackedSections.length; i++) {
        const titleBox = trackedSections[i].section.querySelector('.archive-header-bar, .programacao-header-bar, .residencia-header-bar, .atelies-header-bar, .archive-title-box, .programacao-title-box, .residencia-title-box, .atelies-title-box') || trackedSections[i].section;
        const top = titleBox.getBoundingClientRect().top + window.scrollY;
        if (scrollPos >= top) {
          activeItem = trackedSections[i];
        }
      }

      trackedSections.forEach(item => {
        if (item === activeItem) {
          item.btn.classList.add('is-active');
        } else {
          item.btn.classList.remove('is-active');
        }
      });
    };

    window.addEventListener('scroll', updateActiveNavOnScroll, { passive: true });
    updateActiveNavOnScroll();
  }
}

/**
 * Menu colapsável:
 * Botão ≡ que vira ⨯ ao ser clicado e expande os itens à direita.
 * Marca dinamicamente em qual seção estamos e permite navegação suave.
 * Fecha automaticamente após 8 segundos sem interação do mouse.
 */
function initMenuToggle() {
  window._initMenuToggle = initMenuToggle;
  const toggleBtn = document.getElementById('menu-toggle-btn');
  const navContainer = document.getElementById('header-nav-left');
  const toggleIcon = document.getElementById('menu-toggle-icon');
  const navItems = document.getElementById('header-nav-items');

  if (!toggleBtn || !navContainer) return;

  if (toggleBtn.dataset.initialized) return;
  toggleBtn.dataset.initialized = 'true';

  let autoCloseTimer = null;

  const clearAutoClose = () => {
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer);
      autoCloseTimer = null;
    }
  };

  const startAutoClose = () => {
    clearAutoClose();
    if (navContainer.classList.contains('is-open')) {
      autoCloseTimer = setTimeout(() => {
        toggleMenu(false);
      }, 8000);
    }
  };

  const toggleMenu = (open) => {
    const shouldOpen = typeof open === 'boolean' ? open : !navContainer.classList.contains('is-open');
    if (shouldOpen) {
      navContainer.classList.add('is-open');
      toggleBtn.setAttribute('aria-expanded', 'true');
      if (toggleIcon) toggleIcon.textContent = '⨯';
      if (navItems) navItems.setAttribute('aria-hidden', 'false');
      if (!navContainer.matches(':hover')) {
        startAutoClose();
      }
    } else {
      clearAutoClose();
      navContainer.classList.remove('is-open');
      toggleBtn.setAttribute('aria-expanded', 'false');
      if (toggleIcon) toggleIcon.textContent = '≡';
      if (navItems) navItems.setAttribute('aria-hidden', 'true');
    }
  };

  window._closeCompactMenu = () => toggleMenu(false);

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  // Temporizador de 8s quando o cursor não está sobre o menu
  navContainer.addEventListener('mouseleave', () => {
    if (navContainer.classList.contains('is-open')) {
      startAutoClose();
    }
  });

  navContainer.addEventListener('mouseenter', () => {
    clearAutoClose();
  });

  // Fechar ao pressionar Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navContainer.classList.contains('is-open')) {
      toggleMenu(false);
    }
  });

  // Fechar ao clicar fora
  document.addEventListener('click', (e) => {
    if (navContainer.classList.contains('is-open') && !navContainer.contains(e.target)) {
      toggleMenu(false);
    }
  });
}

