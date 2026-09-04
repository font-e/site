import { loadAtelies } from './atelies.js';
import { loadProgramacao } from './programacao.js';
import { loadResidencia } from './residencia.js';

document.addEventListener('DOMContentLoaded', async () => {
  const ateliesContainer = document.getElementById('atelies-grid-container');
  const programacaoContainer = document.getElementById('programacao-grid-container');
  const residenciaContainer = document.getElementById('residencia-container');

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

  await Promise.allSettled(promises);

  initSpaNavigation();

  if (typeof ScrollTrigger !== 'undefined') {
    ScrollTrigger.refresh();
  }
});

function initSpaNavigation() {
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

  // Scroll Spy para atualizar o estado ativo na SPA
  if (secProgramacao && secAtelies && navProgramacao && navAtelies) {
    const updateActiveNavOnScroll = () => {
      const header = document.getElementById('logo-controller');
      const headerHeight = header ? header.offsetHeight : 56;
      const ateliesTop = secAtelies.getBoundingClientRect().top - headerHeight - 80;

      if (ateliesTop <= 0) {
        navAtelies.classList.add('is-active');
        navProgramacao.classList.remove('is-active');
      } else {
        navProgramacao.classList.add('is-active');
        navAtelies.classList.remove('is-active');
      }
    };

    window.addEventListener('scroll', updateActiveNavOnScroll, { passive: true });
    updateActiveNavOnScroll();
  }
}
