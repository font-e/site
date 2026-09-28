/**
 * ENGINE DA PADRONAGEM FONTE (CANVAS EM DUAS CAMADAS FIXAS)
 * Letras vetoriais em fragmentos e completas (tecla P)
 * Destaques sincronizados via IntersectionObserver por seção
 */

export function initCanvasEngine() {
  const canvasNormal = document.getElementById('canvas-normal');
  const canvasHighlight = document.getElementById('canvas-highlight');
  if (!canvasNormal || !canvasHighlight) return;

  const ctxNormal = canvasNormal.getContext('2d', { alpha: true });
  const ctxHighlight = canvasHighlight.getContext('2d', { alpha: true });
  if (!ctxNormal || !ctxHighlight) return;

  /* Parâmetros Consolidados do Painel */
  const CONFIG = {
    cellSize: 160,
    gap: 32,
    strokeWidth: 4,
    colorNormal: '#ffffff',
    colorHighlight: '#ffffff'
  };

  /* Fragmentos Vetoriais */
  const VIEWBOX_SIZE = 1060;
  const FRAGMENT_PATHS = {
    'e1': new Path2D('M538.226 406.93V292.36M148.067 1025.09H911.422'),
    'e2': new Path2D('M900.11 292.36V34.91m11.31 990.18V774.72m-131.47 -367.79H538.23'),
    'e3': new Path2D('M900.11 34.91H148.07m763.35 739.81H538.23'),
    'e4': new Path2D('M538.23 774.72v-125.9h241.72m-631.88 -613.91v990.18'),
    'e5': new Path2D('M779.95 648.82V406.93m-241.72 -114.57h361.88'),
    'f1': new Path2D('M708.665 873.189H901.589M595.243 807.425v-202.6'),
    'f2': new Path2D('M408.68 604.827v202.6m186.56 -202.6h113.43'),
    'f3': new Path2D('M159.57 604.827h249.11m492.91 268.362V312.069'),
    'f4': new Path2D('M159.57 312.069V604.827m249.11 202.6h186.56'),
    'f5': new Path2D('M708.67 604.827V873.189m192.92 -561.12H159.57'),
    'n1': new Path2D('M681.805 463.52h-4.241L448.558 34.91H65.466'),
    'n2': new Path2D('M994.21 34.91H681.8m-616.33 990.18h312.41'),
    'n3': new Path2D('M994.21 1025.09V34.91m-312.41 0v428.61h-4.24'),
    'n4': new Path2D('M377.88 1025.09V546.97h4.24l257.28 478.12'),
    'n5': new Path2D('M639.4 1025.09h354.81m-928.74 -990.18v990.18'),
    'o1': new Path2D('M136.286 654.48q0 181.08 111.767 282.91 M485.88 531.06q15.256 -35.01 43.826 -35.01 29.368 0 44.707 35.36'),
    'o2': new Path2D('M248.05 937.39q111.765 101.85 281.66 101.85 M574.41 531.41q15.33 35.385 15.33 125.9m-18.1 134.11q-14.865 34.215 -41.93 34.22'),
    'o3': new Path2D('M813.28 365.21q-109.875 -103.98 -283.57 -103.97M248.69 364.5q-112.41 103.275 -112.4 289.98 M589.74 657.31q0 92.43 -18.1 134.11'),
    'o4': new Path2D('M529.71 1039.24q168.6 0 281.01 -99.73m112.41 -285.03q0 -185.3 -109.85 -289.27 M468.39 657.31h0q0 -86.115 17.49 -126.25'),
    'o5': new Path2D('M810.72 939.51q112.38 -99.72 112.41 -285.03m-393.42 -393.24q-168.615 0 -281.02 103.26 M529.71 825.64q-27.645 0 -42.82 -34.19 -18.495 -41.67 -18.5 -134.14h0'),
    't1': new Path2D('M116.878 299.43h217.7m390.159 725.66V299.43'),
    't2': new Path2D('M724.74 299.43h217.69V34.91'),
    't3': new Path2D('M334.58 299.43v725.66'),
    't4': new Path2D('M334.58 1025.09h390.16m-607.86 -990.18v264.52'),
    't5': new Path2D('M942.43 34.91H116.88')
  };

  /* Versão com Letras Completas */
  const COMPLETE_PATHS = {
    'f': new Path2D('M708.665,604.83v268.36m192.924-561.12H159.573 M159.573,312.07v292.76m249.106,202.59H595.243 M159.573,604.83H408.679M901.59,873.19V312.07 M408.679,604.83v202.59m186.564-202.59H708.665 M708.665,873.19H901.589m-306.346-65.77V604.83'),
    'o': new Path2D('M136.29,654.48q0,181.08,111.76,282.91 M485.88,531.06q15.255-35.01,43.83-35.01,29.37,0,44.7,35.36 M248.05,937.39q111.765,101.85,281.66,101.85 M574.41,531.41q15.33,35.385,15.33,125.9m-18.1,134.11q-14.865,34.215-41.93,34.22 M813.28,365.21q-109.875-103.98-283.57-103.97M248.69,364.5q-112.41,103.275-112.4,289.98 M589.74,657.31q0,92.43-18.1,134.11 M810.72,939.51q112.38-99.72,112.41-285.03m-393.42-393.24q-168.615,0-281.02,103.26 M529.71,825.64q-27.645,0-42.82-34.19-18.5-41.67-18.5-134.14h0 M529.71,1039.24q168.6,0,281.01-99.73m112.41-285.03q0-185.3-109.85-289.27 M468.39,657.31h0q0-86.115,17.49-126.25'),
    'n': new Path2D('M681.8,463.52h-4.24l-229-428.61H65.47 M994.21,34.91H681.8m-616.33,990.18h312.41 M994.21,1025.09V34.91m-312.41,0v428.61h-4.24 M377.88,1025.09V546.97h4.24l257.28,478.12 M639.4,1025.09h354.81m-928.74-990.18v990.18'),
    't': new Path2D('M116.88,299.43h217.7m390.16,725.66V299.43 M724.74,299.43h217.69V34.91 M334.58,299.43v725.66 M334.58,1025.09h390.15m-607.85-990.18v264.52 M942.43,34.91H116.88'),
    'e': new Path2D('M538.23,406.93V292.36m-390.16,732.73h763.35 M900.11,292.36V34.91m11.31,990.18V774.72m-131.46-367.79H538.23 M900.11,34.91H148.07m763.35,739.81H538.23 M538.23,774.72v-125.9h241.73m-631.89-613.91v990.18 M779.96,648.82V406.93m-241.73-114.57h361.88')
  };

  const LETTERS = ['f', 'o', 'n', 't', 'e'];

  let cells = [];
  let canvasWidth, canvasHeight;
  let isCompleteMode = false;
  let activeHighlightSet = new Set(['f', 'n']); // Destaque padrão inicial (Programação)

  /* Dicionário de Destaques por Seção */
  const sectionHighlightsMap = {
    'sec-programacao': ['f', 'n'],
    'sec-residencia':  ['e', 't'],
    'sec-atelies':     ['o', 'n'],
    'sec-arquivo':     ['f', 't']
  };

  function generateGridData() {
    cells = [];
    const cols = Math.ceil(canvasWidth / CONFIG.cellSize);
    const rows = Math.ceil(canvasHeight / CONFIG.cellSize);
    const usableSize = Math.max(2, CONFIG.cellSize - CONFIG.gap);
    const scale = usableSize / VIEWBOX_SIZE;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = c * CONFIG.cellSize + CONFIG.cellSize / 2;
        const cy = r * CONFIG.cellSize + CONFIG.cellSize / 2;
        const letter = LETTERS[(r + c) % 5];
        const version = (((2 * r + c) % 5) + 1);

        cells.push({
          cx, cy, letter, version, scale
        });
      }
    }
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
      const path = isCompleteMode
        ? COMPLETE_PATHS[cell.letter]
        : FRAGMENT_PATHS[`${cell.letter}${cell.version}`];

      ctx.save();
      ctx.translate(cell.cx, cell.cy);
      ctx.scale(cell.scale, cell.scale);
      ctx.translate(-VIEWBOX_SIZE / 2, -VIEWBOX_SIZE / 2);

      ctx.lineWidth = CONFIG.strokeWidth / cell.scale;
      ctx.strokeStyle = isHighlight ? CONFIG.colorHighlight : CONFIG.colorNormal;
      ctx.stroke(path);

      ctx.restore();
    }
  }

  function resizeCanvases() {
    const dpr = window.devicePixelRatio || 1;
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;

    canvasNormal.width = canvasWidth * dpr;
    canvasNormal.height = canvasHeight * dpr;
    ctxNormal.setTransform(1, 0, 0, 1, 0, 0);
    ctxNormal.scale(dpr, dpr);

    canvasHighlight.width = canvasWidth * dpr;
    canvasHighlight.height = canvasHeight * dpr;
    ctxHighlight.setTransform(1, 0, 0, 1, 0, 0);
    ctxHighlight.scale(dpr, dpr);

    generateGridData();
    drawPattern();
  }

  function initIntersectionObserver() {
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.35
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.id;
          const lettersToHighlight = sectionHighlightsMap[sectionId];

          if (lettersToHighlight) {
            activeHighlightSet = new Set(lettersToHighlight);
            drawPattern();
          }
        }
      });
    }, observerOptions);

    document.querySelectorAll('.section-block').forEach(section => {
      observer.observe(section);
    });
  }

  resizeCanvases();
  window.addEventListener('resize', resizeCanvases);
  initIntersectionObserver();

  /* Alternância para Letras Completas via Tecla 'P' */
  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) return;
    if (e.key === 'p' || e.key === 'P') {
      isCompleteMode = !isCompleteMode;
      drawPattern();
    }
  });
}
