/**
 * RESIDÊNCIA FONTE — GERAL.JS
 * Motor da Padronagem Vetorial (Canvas de Fundo com Duas Camadas)
 * Consome o módulo canônico vectors.js e sincroniza destaques via IntersectionObserver.
 */

import { generateCrossMatrix, FRAGMENT_PATHS, NEGATIVE_PATHS } from './vectors.js';

export function initCanvasEngine() {
  const canvasNormal = document.getElementById('canvas-normal');
  const canvasHighlight = document.getElementById('canvas-highlight');
  if (!canvasNormal || !canvasHighlight) return;

  const ctxNormal = canvasNormal.getContext('2d', { alpha: true });
  const ctxHighlight = canvasHighlight.getContext('2d', { alpha: true });
  if (!ctxNormal || !ctxHighlight) return;

  const CONFIG = {
    strokeWidth: 3.5,
    colorNormal: '#ffffff',
    colorHighlight: '#affffa'
  };

  let cells = [];
  let canvasWidth = 0;
  let canvasHeight = 0;
  let pSequenceState = 0; // 0 = Inicial, 1 = Negativo, 2 = Restante + Original em #00ffff, 3 = Completo Branco
  let activeHighlightSet = new Set(['f', 'o']); // Destaque da seção inicial de abertura

  /* Dicionário Oficial de Destaques por Seção */
  const sectionHighlightsMap = {
    'sec-abertura':    ['f', 'o'],
    'sec-programacao': ['f', 'n'],
    'sec-residencia':  ['e', 't'],
    'sec-atelies':     ['o', 'n'],
    'sec-arquivo':     ['f', 't']
  };

  function updateGrid() {
    const isMobile = canvasWidth < 600;
    const matrix = generateCrossMatrix({
      width: canvasWidth,
      height: canvasHeight,
      isMobile
    });
    cells = matrix.cells;
  }

  function drawPattern() {
    ctxNormal.clearRect(0, 0, canvasWidth, canvasHeight);
    ctxHighlight.clearRect(0, 0, canvasWidth, canvasHeight);

    ctxNormal.lineCap = 'square';
    ctxNormal.lineJoin = 'miter';
    ctxHighlight.lineCap = 'square';
    ctxHighlight.lineJoin = 'miter';

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const isHighlight = activeHighlightSet.has(cell.letter);
      const ctx = isHighlight ? ctxHighlight : ctxNormal;

      ctx.save();
      ctx.translate(cell.cx, cell.cy);
      ctx.scale(cell.scale, cell.scale);
      ctx.translate(-530, -530); // 1060 / 2 para ancoragem no centro exato da célula

      const baseStrokeColor = isHighlight ? CONFIG.colorHighlight : CONFIG.colorNormal;
      ctx.lineWidth = CONFIG.strokeWidth / cell.scale;

      if (pSequenceState === 0) {
        // Estado 0: Estado inicial original
        if (cell.path) {
          ctx.strokeStyle = baseStrokeColor;
          ctx.stroke(cell.path);
        }
      } else {
        // Estado 1: Todas as outras formas MENOS a original (negativo)
        if (cell.negativePath) {
          ctx.strokeStyle = baseStrokeColor;
          ctx.stroke(cell.negativePath);
        }
      }

      ctx.restore();
    }
  }

  function resizeCanvases() {
    const dpr = window.devicePixelRatio || 1;
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;

    canvasNormal.width = Math.floor(canvasWidth * dpr);
    canvasNormal.height = Math.floor(canvasHeight * dpr);
    ctxNormal.setTransform(1, 0, 0, 1, 0, 0);
    ctxNormal.scale(dpr, dpr);

    canvasHighlight.width = Math.floor(canvasWidth * dpr);
    canvasHighlight.height = Math.floor(canvasHeight * dpr);
    ctxHighlight.setTransform(1, 0, 0, 1, 0, 0);
    ctxHighlight.scale(dpr, dpr);

    updateGrid();
    drawPattern();
  }

  function setHighlight(sectionId) {
    const lettersToHighlight = sectionHighlightsMap[sectionId];
    if (lettersToHighlight) {
      const lettersStr = lettersToHighlight.slice().sort().join('');
      const currentStr = Array.from(activeHighlightSet).sort().join('');
      if (lettersStr !== currentStr) {
        activeHighlightSet = new Set(lettersToHighlight);
        drawPattern();
      }
    }
  }

  function checkActiveSection() {
    const sectionIds = Object.keys(sectionHighlightsMap);
    const scrollY = window.scrollY;
    const headerHeight = document.getElementById('logo-controller')?.offsetHeight || 64;
    const probe = scrollY + headerHeight + 150;

    let currentId = sectionIds[0];
    for (let i = 0; i < sectionIds.length; i++) {
      const el = document.getElementById(sectionIds[i]);
      if (el) {
        const top = el.getBoundingClientRect().top + scrollY;
        if (probe >= top) {
          currentId = sectionIds[i];
        }
      }
    }
    setHighlight(currentId);
  }

  function initObserver() {
    let scrollTicking = false;
    window.addEventListener('scroll', () => {
      if (!scrollTicking) {
        requestAnimationFrame(() => {
          checkActiveSection();
          scrollTicking = false;
        });
        scrollTicking = true;
      }
    }, { passive: true });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setHighlight(entry.target.id);
        }
      });
    }, { rootMargin: '-10% 0px -40% 0px', threshold: [0, 0.2] });

    document.querySelectorAll('.section-block, .abertura-section').forEach(section => {
      observer.observe(section);
    });

    checkActiveSection();
  }

  resizeCanvases();
  window.addEventListener('resize', resizeCanvases, { passive: true });
  initObserver();

  // Expõe a função de definição de destaque para integração com a navegação
  window._fonteSetHighlight = setHighlight;

  function cycleNextVersion() {
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const nextVer = (cell.version % 5) + 1;
      const nextKey = `${cell.letter}${nextVer}`;
      cell.version = nextVer;
      cell.key = nextKey;
      cell.path = FRAGMENT_PATHS[nextKey];
      cell.negativePath = NEGATIVE_PATHS[nextKey];
    }
    drawPattern();
  }

  /* Alternância de Estado via Tecla 'P' (0 = Original <-> 1 = Negativo)
     Avanço Circular de Versões via Tecla 'C' (f1 -> f2, o5 -> o1, etc.) */
  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) return;

    if (e.key === 'p' || e.key === 'P') {
      pSequenceState = pSequenceState === 0 ? 1 : 0;
      drawPattern();
    } else if (e.key === 'c' || e.key === 'C') {
      cycleNextVersion();
    }
  });

  // Expõe as funções para depuração e integração externa
  window._fonteSetPState = (st) => {
    pSequenceState = st ? 1 : 0;
    drawPattern();
  };

  window._fonteCycleNextVersion = cycleNextVersion;

  // Expõe a função de redesenho para integração com o futuro laboratório sandbox
  window._fonteRedrawCanvas = () => {
    updateGrid();
    drawPattern();
  };
}