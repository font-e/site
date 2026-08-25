import { updateNavPhysics } from './nav.js';

export function initGsapScene() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    console.error('GSAP ou ScrollTrigger não carregados.');
    return;
  }
  
  gsap.registerPlugin(ScrollTrigger);
  const logo = document.getElementById('site-logo');
  const paredeEl = document.getElementById('parede-3d');
  const textoEl = document.getElementById('texto-intro');

  gsap.to("#parede-3d", {
    rotationY: 1888,
    ease: "none",
    scrollTrigger: {
      trigger: "body",
      start: "top top",
      end: "bottom bottom",
      scrub: 1.2
    },
    onUpdate: function() {
      if (!paredeEl) return;
      const actualRotY = gsap.getProperty(paredeEl, "rotationY");
      const netAngle = -30 + actualRotY;
      if (textoEl) {
        textoEl.style.opacity = netAngle >= 90 ? '0' : '1';
        textoEl.style.visibility = netAngle >= 90 ? 'hidden' : 'visible';
      }
    }
  });

  const calcDimensions = () => {
    const vw = window.innerWidth;
    const initW = Math.min(vw * 0.45, 600) * 0.85;
    const ratio = (logo && logo.naturalWidth && logo.naturalHeight) ? (logo.naturalWidth / logo.naturalHeight) : 4.8;
    const targetW = (vw * (2 / 12)) * 0.8;
    const targetLeft = ((vw * (2 / 12)) - targetW) / 2;
    return { initW, targetW, targetLeft, targetH: targetW / ratio };
  };

  if (logo) {
    gsap.set(logo, { top: "calc(6vh - 20px)", left: "50%", xPercent: -50, x: 0, width: calcDimensions().initW, height: 'auto' });

    const introTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: ".initial-spacer",
        start: "top top",
        end: "bottom top",
        scrub: 0.6,
        onUpdate: updateNavPhysics
      }
    });

    introTimeline.to(logo, {
      top: 64,
      left: () => calcDimensions().targetLeft,
      xPercent: 0,
      x: 0,
      width: () => calcDimensions().targetW,
      ease: "power2.inOut",
      duration: 1
    }, 0);
  }

  window.addEventListener('resize', () => {
    ScrollTrigger.refresh();
    updateNavPhysics();
  });
}
