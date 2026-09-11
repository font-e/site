import { loadAtelies } from './atelies.js';
import { loadProgramacao } from './programacao.js';
import { loadResidencia } from './residencia.js';
import { initGridGuide } from './grid-guide.js';
import { initArchiveModule } from './arquivo.js';

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

  const ateliesContainer = document.getElementById('atelies-grid-container');
  const programacaoContainer = document.getElementById('programacao-grid-container');
  const residenciaContainer = document.getElementById('residencia-container');
  const archiveContainer = document.getElementById('table-body-container');

  const promises = [];

  if (programacaoContainer) {
    promises.push(loadProgramacao());
  }

  if (ateliesContainer) {
    promises.push(loadAtelies());
  }

  if (residenciaContainer) {
    promises.push(loadResidencia());
  }

  if (archiveContainer) {
    promises.push(initArchiveModule());
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
  const secProgramacao = document.getElementById('sec-programacao');
  const secAtelies = document.getElementById('sec-atelies');
  const navProgramacao = document.getElementById('nav-btn-programacao');
  const navAtelies = document.getElementById('nav-btn-atelies');

  if (navBtns.length > 0) {
    navBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetId = btn.getAttribute('href').substring(1);
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          e.preventDefault();
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

  // Scroll Spy dinâmico para atualizar o estado ativo na SPA
  const trackedSections = [
    { id: 'sec-programacao', btnId: 'nav-btn-programacao' },
    { id: 'sec-residencia', btnId: 'nav-btn-residencia' },
    { id: 'sec-atelies', btnId: 'nav-btn-atelies' },
    { id: 'sec-arquivo', btnId: 'nav-btn-arquivo' }
  ].map(item => ({
    section: document.getElementById(item.id),
    btn: document.getElementById(item.btnId)
  })).filter(item => item.section && item.btn && item.btn.getAttribute('href')?.startsWith('#'));

  if (trackedSections.length > 1) {
    const updateActiveNavOnScroll = () => {
      const header = document.getElementById('logo-controller');
      const headerHeight = header ? header.offsetHeight : 56;
      const scrollPos = window.scrollY + headerHeight + 100;

      let activeItem = trackedSections[0];
      for (let i = 0; i < trackedSections.length; i++) {
        const top = trackedSections[i].section.offsetTop;
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
 * Menu colapsável (index3.html):
 * Botão ≡ que vira ⨯ ao ser clicado e expande os itens à direita.
 * Fecha automaticamente após 8 segundos em que o mouse não estiver sobre ele.
 */
function initMenuToggle() {
  const toggleBtn = document.getElementById('menu-toggle-btn');
  const navContainer = document.getElementById('header-nav-left');
  const toggleIcon = document.getElementById('menu-toggle-icon');
  const navItems = document.getElementById('header-nav-items');

  if (!toggleBtn || !navContainer) return;

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

