import { initNavPhysics, updateNavPhysics } from './nav.js';
import { initGsapScene } from './scene.js';
import { loadProgramacao } from './programacao.js';
import { loadArchiveData } from './arquivo.js';

document.addEventListener('DOMContentLoaded', async () => {
  initGsapScene();
  initNavPhysics();
  updateNavPhysics();

  await Promise.allSettled([
    loadProgramacao(),
    loadArchiveData()
  ]);

  if (typeof ScrollTrigger !== 'undefined') {
    ScrollTrigger.refresh();
  }
  updateNavPhysics();
});
