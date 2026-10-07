/**
 * RESIDÊNCIA FONTE — INTRO.JS (INTEGRAÇÃO PAREDE 3D & INTRO)
 * - Motor canônico do canvas vetorial de fundo (geral.js)
 * - Rotação suave da parede 3D via scroll (150vh = 180° de giro)
 * - Escala do Logo: 400% no topo reduzindo suavemente até 100% no início do fade/blur (~300°)
 * - Parede deslocada a 70% à esquerda / 30% à direita
 * - Dupla face: Face 1 (Manifesto) e Face 2 (Em cartaz / Título / Programação)
 */

import { initCanvasEngine } from './src/js/geral.js';

// 1. Inicialização do motor de fundo (camadas vetoriais com proteção singleton)
if (!window._canvasEngineInitialized) {
  initCanvasEngine();
  window._canvasEngineInitialized = true;
}

// 2. Menu expansível acessível (registra apenas em intro.html se não houver o menu pleno do app.js)
const menuBtn = document.getElementById('menu-toggle-btn');
const navLeft = document.getElementById('header-nav-left');
if (menuBtn && navLeft && !window._appMenuInitialized && !document.querySelector('.nav-item-dropdown')) {
  menuBtn.addEventListener('click', () => {
    const isOpen = navLeft.classList.toggle('is-open');
    menuBtn.setAttribute('aria-expanded', String(isOpen));
  });
}

// 3. Elementos do Palco 3D e Logo
const stage = document.getElementById('stage');
const wall = document.getElementById('wall');
const frontContent = document.getElementById('frontContent');
const backContent = document.getElementById('backContent');
const logo = document.getElementById('site-logo');
const logoWrap = document.querySelector('.logo-hero-wrap');
const sidePoster = document.getElementById('sidePoster');

// Estado físico padrão calibrado (X = -2°, Y = -36°, Z = 0°, Dist = -500px, Speed = 1.0)
const state = {
  speed: 1.0,
  baseRotX: -2,
  baseRotY: -36,
  baseRotZ: 0,
  distZ: -500,
  currentScrollRotY: 0,
  targetScrollRotY: 0
};

// Ponto onde o fade/blur da parede se inicia (300°)
const fadeStartDeg = 300;
const fadeDurationDeg = 88 * (180 / 150) * state.speed;

// 4. Loop de Animação Contínuo (Hardware-accelerated)
function loop() {
  const vh = window.innerHeight;
  const scrollY = window.pageYOffset || document.documentElement.scrollTop;

  // Cada 150vh = 180° de giro da parede
  const scrollDegrees = (scrollY / (1.5 * vh)) * 180 * state.speed;
  state.targetScrollRotY = scrollDegrees;

  // Interpolação suave contínua (lerp 0.08)
  state.currentScrollRotY += (state.targetScrollRotY - state.currentScrollRotY) * 0.08;

  // Rotação Y total aplicada à parede
  const totalY = state.currentScrollRotY + state.baseRotY;

  /* ----------------------------------------------------------------------
     REGRA: Redução do Logo (3.3 -> 1.0) e Transição de Margem Direita
     - No topo (rotProgress = 0): scale(3.3) e margin-right: calc(20vw + 20px)
     - No final (~300°, rotProgress = 1): scale(1.0) e margin-right: 20px
     ---------------------------------------------------------------------- */
  if (logo) {
    const rotProgress = Math.min(Math.max(state.currentScrollRotY / fadeStartDeg, 0), 1);
    const logoScale = 1 + (2.3 * (1 - rotProgress));
    logo.style.transform = `scale(${logoScale.toFixed(3)})`;

    if (logoWrap) {
      const currentOffsetVw = 30 * (1 - rotProgress);
      logoWrap.style.marginRight = currentOffsetVw > 0.001
        ? `calc(${currentOffsetVw.toFixed(2)}vw + 20px)`
        : '20px';
    }
  }

  /* ----------------------------------------------------------------------
     Controle de Visibilidade das Faces:
     - Face 1 (Frente com manifesto): visível na primeira metade (< 138°)
     - Face 2 (Verso com em cartaz/título/programação): visível entre 126° e 318°
     ---------------------------------------------------------------------- */
  if (frontContent) {
    const showFront = (state.currentScrollRotY < 138);
    frontContent.style.opacity = showFront ? '1' : '0';
  }

  if (backContent) {
    const showBack = (state.currentScrollRotY >= 126 && state.currentScrollRotY <= 318);
    backContent.style.opacity = showBack ? '1' : '0';
  }

  /* ----------------------------------------------------------------------
     REGRA: Imagem Lateral à esquerda da parede
     - Sempre separada por gap de 5vw da parede
     - Começa a rolar a partir da base aos 90° e sobe normalmente
     ---------------------------------------------------------------------- */
  if (sidePoster) {
    // Largura geométrica da parede em repouso e seu lado esquerdo (centro em 70vw)
    const wallWidth = (0.90 * vh) * (470 / 320);
    const wallLeft = (window.innerWidth * 0.70) - (wallWidth / 2);
    // Borda direita da imagem fica a 5vw da borda esquerda da parede
    const targetRightEdge = wallLeft - (window.innerWidth * 0.05);
    const rightOffsetPx = Math.max(12, window.innerWidth - targetRightEdge);
    sidePoster.style.right = `${rightOffsetPx.toFixed(1)}px`;

    // Cinemática de subida a partir de 90°
    const rotBeyond90 = state.currentScrollRotY - 110;
    if (rotBeyond90 <= 0) {
      sidePoster.style.transform = `translate3d(0, ${vh + 80}px, 0)`;
      sidePoster.style.visibility = 'hidden';
    } else {
      sidePoster.style.visibility = 'visible';
      // 180° equivalem a 1.5 * vh de scroll
      const scrollSpeedPxPerDeg = (1.5 * vh) / 180;
      const translateY = vh - (rotBeyond90 * scrollSpeedPxPerDeg);
      sidePoster.style.transform = `translate3d(0, ${translateY.toFixed(1)}px, 0)`;
      if (translateY < -vh) {
        sidePoster.style.visibility = 'hidden';
      }
    }
  }

  // Efeito de desfoque atmosférico e fade final a partir de 300°
  let blurPx = 0;
  let opacityVal = 1;

  if (state.currentScrollRotY > fadeStartDeg) {
    const progress = Math.min(1, Math.max(0, (state.currentScrollRotY - fadeStartDeg) / fadeDurationDeg));
    blurPx = progress * 88;
    opacityVal = 1 - progress;
  }

  if (stage) {
    stage.style.filter = `blur(${blurPx}px)`;
    stage.style.opacity = opacityVal;
    stage.style.visibility = opacityVal <= 0.005 ? 'hidden' : 'visible';
    stage.style.pointerEvents = opacityVal <= 0.005 ? 'none' : 'auto';
  }

  // Aplicação das transformações tridimensionais na parede
  if (wall) {
    wall.style.transform = `
      translate3d(0, 0, ${state.distZ}px)
      rotateX(${state.baseRotX}deg)
      rotateY(${totalY}deg)
      rotateZ(${state.baseRotZ}deg)
    `;
  }

  requestAnimationFrame(loop);
}

// Inicia o ciclo de renderização
requestAnimationFrame(loop);
