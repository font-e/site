// Motor Físico do Menu à Esquerda
const sectionsMapping = [
  { id: 'sec-programacao', btnId: 'btn-prog' },
  { id: 'sec-residencia',  btnId: 'btn-res' },
  { id: 'sec-ateliers',    btnId: 'btn-ate' },
  { id: 'sec-arquivo',     btnId: 'btn-arq' },
  { id: 'sec-info',        btnId: 'btn-inf' }
];

export function getTopCeiling() {
  const topCeiling = 180; // Teto limite superior para o primeiro item do menu (afastado do logo)
  document.documentElement.style.setProperty('--logo-bottom-offset', `${topCeiling}px`);
  return topCeiling;
}

export function updateNavPhysics() {
  const vh = window.innerHeight;
  const menuH = 32;
  const gap = 8;
  const topCeiling = getTopCeiling();
  const totalItems = sectionsMapping.length;

  for (let i = 0; i < totalItems; i++) {
    const item = sectionsMapping[i];
    const section = document.getElementById(item.id);
    const btn = document.getElementById(item.btnId);
    if (!section || !btn) continue;

    const rect = section.getBoundingClientRect();
    const bottomRestY = vh - ((totalItems - i) * menuH + (totalItems - 1 - i) * gap);
    const topStickyY = topCeiling + i * (menuH + gap);
    
    // Calcula posição considerando que o container principal também scrolla
    // 'rect.top' dá a distância do topo do viewport até o início da section
    const targetY = Math.max(topStickyY, Math.min(rect.top, bottomRestY));
    btn.style.transform = `translate3d(0, ${targetY}px, 0)`;

    const isActive = rect.top < bottomRestY && rect.bottom > (topStickyY + menuH);
    btn.classList.toggle('active', isActive);
  }
}

export function scrollToSection(sectionId) {
  const idx = sectionsMapping.findIndex(s => s.id === sectionId);
  const section = document.getElementById(sectionId);
  if (section && idx !== -1) {
    const sectionTop = section.getBoundingClientRect().top + window.scrollY;
    const topStickyY = getTopCeiling() + idx * (32 + 8);
    const targetScroll = sectionTop - topStickyY;
    window.scrollTo({ top: targetScroll, behavior: 'smooth' });
  }
}

export function initNavPhysics() {
  window.addEventListener('scroll', updateNavPhysics, { passive: true });
  window.addEventListener('resize', updateNavPhysics, { passive: true });
  // Expose to window for inline onclick attributes
  window.scrollToSection = scrollToSection;
}
