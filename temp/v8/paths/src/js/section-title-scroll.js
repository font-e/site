/**
 * FONTE - SECTION-TITLE-SCROLL.JS (VERSÃO BASIC)
 * Módulo de Títulos de Seção:
 *
 * 1. SIMPLIFICAÇÃO TIPOGRÁFICA:
 *    - Remove qualquer resquício de camadas adicionais (.title-layer-light, .title-layer-bold, .sr-only)
 *      caso tenham sido injetadas, restaurando o texto original limpo no DOM.
 *
 * 2. ZERO JANK / TRANSIT NATIVO:
 *    - Desativa 100% de loops de animação, listeners de scroll contínuos e injeção de inline styles
 *      (transform, opacity, fontVariationSettings, letterSpacing).
 *    - A transição tectônica entre seções é gerenciada com fidelidade e fluidez absoluta diretamente
 *      pelo compositor da GPU via regras de empilhamento CSS (z-index descendente e painéis opacos).
 */

export function initSectionTitleScroll() {
  // Limpeza de segurança defensiva: restaura o texto puro caso spans dinâmicos existam
  const titles = document.querySelectorAll('.section-hero-title');
  titles.forEach((title) => {
    const rawText = title.getAttribute('data-raw-text');
    if (rawText) {
      title.textContent = rawText;
      title.removeAttribute('data-raw-text');
    } else {
      const srOnly = title.querySelector('.sr-only');
      if (srOnly) {
        title.textContent = srOnly.textContent.trim();
      }
    }

    // Garante que não restem inline styles interferindo na renderização pura do CSS
    title.style.transform = '';
    title.style.opacity = '';
    title.style.fontVariationSettings = '';
    title.style.letterSpacing = '';
    title.style.fontWeight = '';
  });
}
