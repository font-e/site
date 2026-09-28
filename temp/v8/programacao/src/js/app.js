import { loadProgramacao } from './programacao.js';

document.addEventListener('DOMContentLoaded', async () => {
  await loadProgramacao();

  if (typeof ScrollTrigger !== 'undefined') {
    ScrollTrigger.refresh();
  }
});
