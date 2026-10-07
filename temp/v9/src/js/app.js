/**
 * RESIDÊNCIA FONTE — APP.JS
 * Maestro da SPA (Orquestração Segura de Módulos)
 * Integração Canônica com FonteState
 */

import { FonteState } from './state.js';
import { initProgram } from './program.js';
import { initCanvasEngine } from './geral.js';
import { initAtelies } from './atelies.js';
import { initResidencia } from './residencia.js';
import { initGridGuide } from './grid-guide.js';
import { initArqModule } from './arq.js';
import { initInfoModule } from './info.js';
import { renderDrawerSubtabsHtml, scrollToDrawerTop } from './zoom-viewer.js';
import { openZoomGallery } from './zoom-gallery.js';

async function boot() {
  // 0. Inicialização do Dataset Canônico Unificado
  try {
    await FonteState.init();
  } catch (err) {
    console.error('[App] Erro crítico ao inicializar FonteState:', err);
  }

  // 1. Interface Global e Motor Gráfico
  try {
    initGlobalUI();
  } catch (err) {
    console.error('[App] Erro em initGlobalUI:', err);
  }

  try {
    initCanvasEngine();
  } catch (err) {
    console.error('[App] Erro em initCanvasEngine:', err);
  }

  try {
    initGridGuide();
  } catch (err) {
    console.error('[App] Erro em initGridGuide:', err);
  }

  // 2. Módulos de Conteúdo Isolados Conectados ao FonteState
  const programContainer = document.getElementById('sec-programacao');
  if (programContainer) {
    try {
      initProgram(programContainer);
    } catch (err) {
      console.error('[App] Erro em initProgram:', err);
    }
  }

  const ateliesContainer = document.getElementById('sec-atelies');
  if (ateliesContainer) {
    try {
      initAtelies(ateliesContainer);
    } catch (err) {
      console.error('[App] Erro em initAtelies:', err);
    }
  }

  const residenciaContainer = document.getElementById('sec-residencia');
  if (residenciaContainer) {
    try {
      initResidencia(residenciaContainer);
    } catch (err) {
      console.error('[App] Erro em initResidencia:', err);
    }
  }

  const arquivoContainer = document.getElementById('sec-arquivo');
  if (arquivoContainer) {
    try {
      initArqModule();
    } catch (err) {
      console.error('[App] Erro em initArqModule:', err);
    }
  }

  const infoContainer = document.getElementById('sec-info');
  if (infoContainer) {
    try {
      initInfoModule(infoContainer);
    } catch (err) {
      console.error('[App] Erro em initInfoModule:', err);
    }
  }

  // 3. Recorte Geométrico da Linha sob as Abas Ativas (Fusão em Peça Única)
  requestAnimationFrame(() => {
    updateAllTabCutouts();
  });
  window.addEventListener('resize', updateAllTabCutouts);

  // 4. Registro Global de Navegação Cruzada em Teia (In-Drawer Continuous Navigation)
  setupInDrawerContinuousNavigation();

  // 5. Interação Direta com a Seção de Abertura (Banner em Cartaz)
  const aberturaSec = document.getElementById('sec-abertura');
  if (aberturaSec) {
    aberturaSec.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-event-id]');
      if (trigger) {
        e.preventDefault();
        const eventId = trigger.dataset.eventId;
        const progSec = document.getElementById('sec-programacao');
        if (progSec) {
          const textEl = progSec.querySelector('.section-hero-title') || progSec;
          const headerHeight = document.getElementById('logo-controller')?.offsetHeight || 56;
          const targetPosition = textEl.getBoundingClientRect().top + window.scrollY - headerHeight;
          window.scrollTo({ top: Math.max(0, targetPosition), behavior: 'smooth' });
        }
        if (window._progOpenEvent) {
          window._progOpenEvent(eventId);
        }
      }
    });
  }
}

/**
 * Navegação Cruzada em Teia: permite clicar em nomes de agentes culturais dentro de qualquer gaveta
 * e abrir ali mesmo o perfil relacional daquela pessoa, sem perder o scroll da tela.
 */
function setupInDrawerContinuousNavigation() {
  window._openPessoaProfileInDrawer = (slug, originSection) => {
    const pessoa = FonteState.getPessoa(slug);
    if (!pessoa) return;

    // Localiza a gaveta aberta na seção de origem
    const drawer = originSection.querySelector('.universal-drawer');
    if (!drawer) return;

    // Salva o HTML original para permitir retornar à mostra
    if (!drawer.dataset.originalHtml) {
      drawer.dataset.originalHtml = drawer.innerHTML;
    }

    const participacoes = Array.isArray(pessoa.participacoes) ? pessoa.participacoes : [];
    const avatar = pessoa.avatar;
    const ratio = avatar?.ratio || 1;

    const subtabs = [
      { id: 'sobre', label: 'SOBRE' },
      { id: 'atuacoes', label: 'ATUAÇÕES' }
    ];

    let currentTab = 'sobre';

    const renderPessoaInDrawer = () => {
      const subtabsHtml = renderDrawerSubtabsHtml({
        tabs: subtabs,
        activeTab: currentTab
      });

      let contentHtml = '';
      if (currentTab === 'atuacoes') {
        contentHtml = `
          <div class="drawer-tab-content">
            <div class="editorial-block" style="margin-bottom: 20px;">
              <span class="editorial-label">Histórico no FONTE (${participacoes.length})</span>
            </div>
            <ul style="list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:10px;">
              ${participacoes.map(p => `
                <li style="padding: 10px 14px; border: var(--border-width, 1px) solid var(--border-color); background: var(--bg-white);">
                  <strong>${p.ano}</strong> — ${p.titulo} 
                  <span style="opacity:0.7; font-size:var(--fs-meta); margin-left:6px;">(${p.categoria}${p.papel ? ` • ${p.papel}` : ''})</span>
                </li>
              `).join('')}
            </ul>
          </div>
        `;
      } else {
        contentHtml = `
          <div class="drawer-tab-content">
            <div class="editorial-val prose" style="margin-bottom: 24px;">
              ${pessoa.bio || `<p>${pessoa.bio_preview || 'Agente cultural catalogado no acervo.'}</p>`}
            </div>
            ${Array.isArray(pessoa.links) && pessoa.links.length > 0 ? `
              <div class="atelies-drawer-links" style="display:flex; gap:16px; flex-wrap:wrap; font-size:var(--fs-meta);">
                ${pessoa.links.map(l => `<span>${l.rotulo}: <a href="${l.url}" target="_blank" rel="noopener noreferrer" style="text-decoration:underline;"><strong>${l.rotulo}</strong></a></span>`).join('')}
              </div>
            ` : ''}
          </div>
        `;
      }

      drawer.innerHTML = `
        <div class="drawer-left-column">
          <div style="padding: 12px var(--content-indent-left, 60px) 0 0; display:flex; justify-content:space-between; align-items:center;">
            <button type="button" class="header-nav-btn btn-back-drawer" style="padding:0 12px; height:28px; font-size:11px;" title="Retornar à mostra">
              ← VOLTAR À MOSTRA
            </button>
          </div>

          <div class="drawer-editorial-header">
            <h2 class="event-title">
              <span class="event-title-text">${pessoa.nome}</span>
            </h2>
          </div>

          ${subtabsHtml}

          <div class="drawer-tab-pane-container">
            ${contentHtml}
          </div>
        </div>

        <div class="drawer-media-pane">
          ${avatar ? `
            <div class="drawer-gallery-track">
              <div class="drawer-gallery-item" style="aspect-ratio: ${ratio}; background-color: #888888;">
                <img src="${avatar.thumb || avatar.zoom}" alt="${pessoa.nome}" style="aspect-ratio: ${ratio};" loading="lazy">
              </div>
            </div>
          ` : `<div style="color:#888; text-align:center; padding:48px 24px; font-size:var(--fs-meta);">Retrato do acervo</div>`}
        </div>
      `;

      // Evento Voltar à mostra
      drawer.querySelector('.btn-back-drawer')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (drawer.dataset.originalHtml) {
          drawer.innerHTML = drawer.dataset.originalHtml;
          delete drawer.dataset.originalHtml;
        }
      });

      // Fechar gaveta
      drawer.querySelector('[data-action="close-drawer"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const closeBtn = originSection.querySelector('[data-action="close-drawer"]');
        if (closeBtn) closeBtn.click();
      });

      // Troca de sub-abas do perfil
      drawer.querySelectorAll('.drawer-subtab-btn:not([data-action="close-drawer"])').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          currentTab = btn.dataset.tab;
          renderPessoaInDrawer();
        });
      });

      // Clique em imagem da galeria lateral -> Abre Galeria Zoom
      drawer.querySelectorAll('.drawer-gallery-item').forEach(itemEl => {
        itemEl.addEventListener('click', (e) => {
          e.stopPropagation();
          openZoomGallery({
            container: drawer,
            item: pessoa,
            initialIndex: 0,
            title: pessoa.nome
          });
        });
      });
    };

    renderPessoaInDrawer();
  };
}

export function updateTabCutout(sectionEl) {
  if (!sectionEl) return;
  const activeTab = sectionEl.querySelector('.filter-pill.is-active, .section-folder-tab-btn.is-active');
  const panel = sectionEl.querySelector('.section-content-panel');
  if (activeTab && panel) {
    const tabRect = activeTab.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const left = Math.max(0, tabRect.left - panelRect.left);
    const width = tabRect.width;
    panel.style.setProperty('--tab-cut-left', `${left}px`);
    panel.style.setProperty('--tab-cut-width', `${width}px`);
  }
}

export function updateAllTabCutouts() {
  document.querySelectorAll('.section-block').forEach(sec => updateTabCutout(sec));
}

window.updateTabCutout = updateTabCutout;
window.updateAllTabCutouts = updateAllTabCutouts;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

function initGlobalUI() {
  const navContainer = document.getElementById('header-nav-left');
  const menuToggle = document.getElementById('menu-toggle-btn');
  const toggleIcon = document.getElementById('menu-toggle-icon');
  const navItems = document.getElementById('header-nav-items');

  let autoCloseTimer = null;

  const closeMenu = () => {
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer);
      autoCloseTimer = null;
    }
    if (navContainer && navContainer.classList.contains('is-open')) {
      navContainer.classList.remove('is-open');
      if (menuToggle) {
        menuToggle.classList.remove('is-active');
        menuToggle.setAttribute('aria-expanded', 'false');
      }
      if (toggleIcon) toggleIcon.textContent = '≡';
      if (navItems) navItems.setAttribute('aria-hidden', 'true');
    }
  };

  const openMenu = () => {
    if (navContainer) {
      navContainer.classList.add('is-open');
      if (menuToggle) {
        menuToggle.classList.add('is-active');
        menuToggle.setAttribute('aria-expanded', 'true');
      }
      if (toggleIcon) toggleIcon.textContent = '✕';
      if (navItems) navItems.setAttribute('aria-hidden', 'false');
    }
  };

  const toggleMenu = () => {
    if (navContainer && navContainer.classList.contains('is-open')) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  const resetAutoCloseTimer = () => {
    clearTimeout(autoCloseTimer);
    if (navContainer && navContainer.classList.contains('is-open')) {
      autoCloseTimer = setTimeout(() => {
        closeMenu();
      }, 6000);
    }
  };

  if (navContainer) {
    navContainer.addEventListener('mouseleave', resetAutoCloseTimer);
    navContainer.addEventListener('mouseenter', () => {
      clearTimeout(autoCloseTimer);
      autoCloseTimer = null;
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navContainer && navContainer.classList.contains('is-open')) {
      closeMenu();
    }
  });

  document.addEventListener('click', (e) => {
    if (navContainer && navContainer.classList.contains('is-open')) {
      if (!navContainer.contains(e.target)) {
        closeMenu();
      }
    }
  });

  document.body.addEventListener('click', (e) => {
    const toggleClicked = e.target.closest('#menu-toggle-btn');
    if (toggleClicked) {
      e.preventDefault();
      e.stopPropagation();
      toggleMenu();
      return;
    }

    const subnavBtn = e.target.closest('.header-subnav-btn');
    if (subnavBtn) {
      e.preventDefault();
      e.stopPropagation();

      document.querySelectorAll('.header-subnav-menu').forEach(m => {
        m.classList.add('is-hidden');
        setTimeout(() => m.classList.remove('is-hidden'), 400);
      });

      const targetSec = subnavBtn.getAttribute('data-target-sec');

      // 1. Programação
      if (subnavBtn.dataset.progFilter && window._progSetFilter) {
        window._progSetFilter(subnavBtn.dataset.progFilter);
      }

      // 2. Residência
      if (subnavBtn.dataset.residenciaMod && window._selectResidenciaModality) {
        window._selectResidenciaModality(subnavBtn.dataset.residenciaMod);
      }

      // 3. Ateliês
      if (subnavBtn.dataset.ateliesTab && window._selectAteliesTab) {
        window._selectAteliesTab(subnavBtn.dataset.ateliesTab);
      }

      // 4. Info
      if (subnavBtn.dataset.infoTab && window._selectInfoTab) {
        window._selectInfoTab(subnavBtn.dataset.infoTab);
      }

      // Rola até a seção com compensação do cabeçalho alinhando o topo do texto do título à base do cabeçalho
      if (targetSec) {
        const secEl = document.getElementById(targetSec);
        if (secEl) {
          const textEl = secEl.querySelector('.section-hero-title') || secEl;
          const headerHeight = document.getElementById('logo-controller')?.offsetHeight || 56;
          const targetPosition = textEl.getBoundingClientRect().top + window.scrollY - headerHeight;
          window.scrollTo({ top: Math.max(0, targetPosition), behavior: 'smooth' });
        }
        if (window._fonteSetHighlight) {
          window._fonteSetHighlight(targetSec);
        }

        document.querySelectorAll('.header-nav-btn[href^="#"]').forEach(b => b.classList.remove('is-active'));
        const parentNavBtn = document.querySelector(`.header-nav-btn[href="#${targetSec}"]`);
        if (parentNavBtn) parentNavBtn.classList.add('is-active');

        const parentMenu = subnavBtn.closest('.header-subnav-menu');
        if (parentMenu) {
          parentMenu.querySelectorAll('.header-subnav-btn').forEach(b => b.classList.remove('is-active'));
        }
        subnavBtn.classList.add('is-active');

        if (window.innerWidth <= 768) {
          closeMenu();
        }
      }
      return;
    }

    const navLink = e.target.closest('.header-nav-btn[href^="#"]');
    if (navLink) {
      e.preventDefault();
      const targetId = navLink.getAttribute('href').substring(1);

      if (targetId === 'sec-programacao' && window._progSetFilter) {
        window._progSetFilter('TODA');
      } else if (targetId === 'sec-atelies' && window._closeArtistDetail) {
        window._closeArtistDetail();
      } else if (targetId === 'sec-residencia' && window._selectResidenciaModality) {
        window._selectResidenciaModality('programas');
      } else if (targetId === 'sec-info' && window._selectInfoTab) {
        window._selectInfoTab('historico');
      }

      if (window._fonteSetHighlight) window._fonteSetHighlight(targetId);
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        const textEl = targetEl.querySelector('.section-hero-title') || targetEl;
        const headerHeight = document.getElementById('logo-controller')?.offsetHeight || 56;
        const targetPosition = textEl.getBoundingClientRect().top + window.scrollY - headerHeight;
        window.scrollTo({ top: Math.max(0, targetPosition), behavior: 'smooth' });
      }

      document.querySelectorAll('.header-nav-btn[href^="#"]').forEach(b => b.classList.remove('is-active'));
      navLink.classList.add('is-active');

      if (window.innerWidth <= 768) {
        closeMenu();
      }
    }
  });
}
