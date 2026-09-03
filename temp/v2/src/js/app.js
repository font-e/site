import { loadAtelies } from './atelies.js';
import { loadProgramacao } from './programacao.js';

document.addEventListener('DOMContentLoaded', async () => {
  const ateliesContainer = document.getElementById('atelies-grid-container');
  const programacaoContainer = document.getElementById('programacao-grid-container');

  const promises = [];

  if (ateliesContainer) {
    promises.push(loadAtelies());
  }

  if (programacaoContainer) {
    promises.push(loadProgramacao());
  }

  await Promise.allSettled(promises);

  if (typeof ScrollTrigger !== 'undefined') {
    ScrollTrigger.refresh();
  }
});
