/**
 * RESIDÊNCIA FONTE — VECTORS.JS
 * Fonte Canônica dos Vetores Tipográficos do Design System FONTE
 * Exporta strings SVG puras, instâncias de Path2D e gerador de matriz cruzada.
 */

export const VIEWBOX_SIZE = 1060;
export const LETTERS = ['f', 'o', 'n', 't', 'e'];

/* 1. CAMINHOS VETORIAIS BRUTOS (STRINGS SVG) */
export const RAW_FRAGMENTS = {
  // Letra E (5 variantes)
  'e1': 'M538.226 406.93V292.36M148.067 1025.09H911.422',
  'e2': 'M900.11 292.36V34.91m11.31 990.18V774.72m-131.47 -367.79H538.23',
  'e3': 'M900.11 34.91H148.07m763.35 739.81H538.23',
  'e4': 'M538.23 774.72v-125.9h241.72m-631.88 -613.91v990.18',
  'e5': 'M779.95 648.82V406.93m-241.72 -114.57h361.88',

  // Letra F (5 variantes)
  'f1': 'M708.665 873.189H901.589M595.243 807.425v-202.6',
  'f2': 'M408.68 604.827v202.6m186.56 -202.6h113.43',
  'f3': 'M159.57 604.827h249.11m492.91 268.362V312.069',
  'f4': 'M159.57 312.069V604.827m249.11 202.6h186.56',
  'f5': 'M708.67 604.827V873.189m192.92 -561.12H159.57',

  // Letra N (5 variantes)
  'n1': 'M681.805 463.52h-4.241L448.558 34.91H65.466',
  'n2': 'M994.21 34.91H681.8m-616.33 990.18h312.41',
  'n3': 'M994.21 1025.09V34.91m-312.41 0v428.61h-4.24',
  'n4': 'M377.88 1025.09V546.97h4.24l257.28 478.12',
  'n5': 'M639.4 1025.09h354.81m-928.74 -990.18v990.18',

  // Letra O (5 variantes)
  'o1': 'M136.286 654.48q0 181.08 111.767 282.91 M485.88 531.06q15.256 -35.01 43.826 -35.01 29.368 0 44.707 35.36',
  'o2': 'M248.05 937.39q111.765 101.85 281.66 101.85 M574.41 531.41q15.33 35.385 15.33 125.9m-18.1 134.11q-14.865 34.215 -41.93 34.22',
  'o3': 'M813.28 365.21q-109.875 -103.98 -283.57 -103.97M248.69 364.5q-112.41 103.275 -112.4 289.98 M589.74 657.31q0 92.43 -18.1 134.11',
  'o4': 'M529.71 1039.24q168.6 0 281.01 -99.73m112.41 -285.03q0 -185.3 -109.85 -289.27 M468.39 657.31h0q0 -86.115 17.49 -126.25',
  'o5': 'M810.72 939.51q112.38 -99.72 112.41 -285.03m-393.42 -393.24q-168.615 0 -281.02 103.26 M529.71 825.64q-27.645 0 -42.82 -34.19 -18.495 -41.67 -18.5 -134.14h0',

  // Letra T (5 variantes)
  't1': 'M116.878 299.43h217.7m390.159 725.66V299.43',
  't2': 'M724.74 299.43h217.69V34.91',
  't3': 'M334.58 299.43v725.66',
  't4': 'M334.58 1025.09h390.16m-607.86 -990.18v264.52',
  't5': 'M942.43 34.91H116.88'
};

export const RAW_COMPLETES = {
  'f': 'M708.665,604.83v268.36m192.924-561.12H159.573 M159.573,312.07v292.76m249.106,202.59H595.243 M159.573,604.83H408.679M901.59,873.19V312.07 M408.679,604.83v202.59m186.564-202.59H708.665 M708.665,873.19H901.589m-306.346-65.77V604.83',
  'o': 'M136.29,654.48q0,181.08,111.76,282.91 M485.88,531.06q15.255-35.01,43.83-35.01,29.37,0,44.7,35.36 M248.05,937.39q111.765,101.85,281.66,101.85 M574.41,531.41q15.33,35.385,15.33,125.9m-18.1,134.11q-14.865,34.215-41.93,34.22 M813.28,365.21q-109.875-103.98-283.57-103.97M248.69,364.5q-112.41,103.275-112.4,289.98 M589.74,657.31q0,92.43-18.1,134.11 M810.72,939.51q112.38-99.72,112.41-285.03m-393.42-393.24q-168.615,0-281.02,103.26 M529.71,825.64q-27.645,0-42.82-34.19-18.5-41.67-18.5-134.14h0 M529.71,1039.24q168.6,0,281.01-99.73m112.41-285.03q0-185.3-109.85-289.27 M468.39,657.31h0q0-86.115,17.49-126.25',
  'n': 'M681.8,463.52h-4.24l-229-428.61H65.47 M994.21,34.91H681.8m-616.33,990.18h312.41 M994.21,1025.09V34.91m-312.41,0v428.61h-4.24 M377.88,1025.09V546.97h4.24l257.28,478.12 M639.4,1025.09h354.81m-928.74-990.18v990.18',
  't': 'M116.88,299.43h217.7m390.16,725.66V299.43 M724.74,299.43h217.69V34.91 M334.58,299.43v725.66 M334.58,1025.09h390.15m-607.85-990.18v264.52 M942.43,34.91H116.88',
  'e': 'M538.23,406.93V292.36m-390.16,732.73h763.35 M900.11,292.36V34.91m11.31,990.18V774.72m-131.46-367.79H538.23 M900.11,34.91H148.07m763.35,739.81H538.23 M538.23,774.72v-125.9h241.73m-631.89-613.91v990.18 M779.96,648.82V406.93m-241.73-114.57h361.88'
};

/* 2. INSTÂNCIAS DE PATH2D (COMPILADAS PARA CANVAS 2D) */
export const FRAGMENT_PATHS = Object.fromEntries(
  Object.entries(RAW_FRAGMENTS).map(([key, d]) => [key, new Path2D(d)])
);

export const COMPLETE_PATHS = Object.fromEntries(
  Object.entries(RAW_COMPLETES).map(([key, d]) => [key, new Path2D(d)])
);

/* Caminhos Negativos: Todas as outras variantes da letra MENOS a variante original da célula */
export const NEGATIVE_PATHS = Object.fromEntries(
  Object.keys(RAW_FRAGMENTS).map(key => {
    const letter = key[0];
    const ver = parseInt(key.slice(1), 10);
    const otherFragments = [1, 2, 3, 4, 5]
      .filter(v => v !== ver)
      .map(v => RAW_FRAGMENTS[`${letter}${v}`])
      .join(' ');
    return [key, new Path2D(otherFragments)];
  })
);

/* 3. GERADOR DE MATRIZ TIPOGRÁFICA CRUZADA (FONTE VERTICAL & HORIZONTAL) */
export function generateCrossMatrix({ width, height, isMobile }) {
  const cols = isMobile ? 6 : 12;
  const colWidth = width / cols;
  const colHeight = colWidth; // Proporção quadrada estrita
  const rows = Math.ceil(height / colHeight) + 1;
  const usableSize = colWidth * 0.76;
  const scale = usableSize / VIEWBOX_SIZE;

  // Contadores independentes de versão (1 a 5) para cada letra
  const versionCounters = {
    f: 1,
    o: 1,
    n: 1,
    t: 1,
    e: 1
  };

  const cells = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // 1. Identificação da letra com leitura cruzada: (r + c) % 5
      const letter = LETTERS[(r + c) % 5];

      // 2. Extração da versão atual da letra e rotação circular para a próxima
      const version = versionCounters[letter];
      versionCounters[letter] = (version % 5) + 1;

      const cx = c * colWidth + colWidth / 2;
      const cy = r * colHeight + colHeight / 2;

      cells.push({
        r,
        c,
        cx,
        cy,
        letter,
        version,
        scale,
        key: `${letter}${version}`,
        path: FRAGMENT_PATHS[`${letter}${version}`],
        negativePath: NEGATIVE_PATHS[`${letter}${version}`],
        completePath: COMPLETE_PATHS[letter]
      });
    }
  }

  return { cells, cols, rows, colWidth, colHeight };
}