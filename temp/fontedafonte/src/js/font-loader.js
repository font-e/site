/**
 * Módulo Especialista: Carregador e Alternador de Fontes
 * Arquitetura Modular & Máquina de Estados Determinística
 * 
 * Caminho 1: Resolução Canônica com Validação de Casing e Fallback Dinâmico (Google Fonts)
 * Caminho 2: Autocomplete Conectado ao Catálogo do Google Fonts (com filtros de categoria)
 * Caminho 3: Ingestão de Webfonts Arbitrárias (@font-face dinâmico para .woff2, .woff, .ttf ou Fontshare/CDN)
 * Atalho de Teclado: Tecla 'F' para alternar o painel
 */

const STORAGE_FONTS_KEY = 'fonte_loaded_fonts_v1';
const STORAGE_ACTIVE_KEY = 'fonte_active_font_v1';

/**
 * Converte o nome para Title Case (primeira letra maiúscula de cada palavra, resto minúsculo)
 * Ex: "sofia sans semi condensed" -> "Sofia Sans Semi Condensed"
 */
function toTitleCase(fontName) {
  return fontName
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Converte capitalizando a primeira letra de cada palavra mantendo maiúsculas existentes (ex: siglas)
 * Ex: "Playwrite BE WAL Guides" -> "Playwrite BE WAL Guides"
 */
function toCapitalizedWords(fontName) {
  return fontName
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Converte o nome da família no formato canônico do Google Fonts (espaços separados por '+' literal)
 * Ex: "Playwrite BE WAL Guides" -> "Playwrite+BE+WAL+Guides"
 */
function toGoogleFontsSlug(fontName) {
  return fontName
    .trim()
    .split(/\s+/)
    .map(w => encodeURIComponent(w))
    .join('+');
}

const ORIGINAL_FONT = {
  id: 'font-original',
  name: 'Stag Sans',
  family: "'Stag Sans', sans-serif",
  url: null,
  isOriginal: true,
  type: 'original'
};

class FontLoaderMachine {
  constructor() {
    this.fonts = [ORIGINAL_FONT];
    this.activeFontId = ORIGINAL_FONT.id;
    this.isOpen = false;
    this.isLoading = false;
    this.activeTab = 'google'; // 'google' | 'catalog' | 'custom'

    // Catálogo de Fontes
    this.catalog = [];
    this.catalogCategory = 'all';
    this.catalogLoaded = false;
    this.catalogHighlightedIndex = -1;
    this.loadedPreviewFonts = new Set();

    this.dom = {
      triggerBtn: null,
      popover: null,
      closeBtn: null,
      status: null,
      listContainer: null,
      listCount: null,
      // Abas
      tabBtns: {},
      tabPanels: {},
      // Caminho 1
      form: null,
      input: null,
      submitBtn: null,
      presetsWrap: null,
      // Caminho 2 (Autocomplete / Catálogo)
      catalogInput: null,
      catalogDropdown: null,
      catalogFilters: null,
      // Caminho 3 (Custom Webfonts / @font-face)
      customForm: null,
      customNameInput: null,
      customUrlInput: null,
      customSubmitBtn: null
    };

    this.initStorage();
  }

  /**
   * Inicialização e autocura de registros salvos no localStorage
   */
  initStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_FONTS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          parsed.forEach(f => {
            if (f && f.id !== ORIGINAL_FONT.id && f.name && f.family) {
              const lowerName = f.name.toLowerCase().trim();
              if (lowerName === 'yuyu') return;

              if (f.type === 'custom' || f.type === 'font-face') {
                // Fonte arbitrária (@font-face ou stylesheet customizado)
                const entry = {
                  id: f.id,
                  name: f.name,
                  family: f.family,
                  url: f.url,
                  isOriginal: false,
                  type: f.type
                };
                this.fonts.push(entry);
                if (f.url) {
                  this.injectCustomFont(entry.id, entry.name, entry.url).catch(() => {});
                }
              } else {
                // Google Fonts canônico
                const cleanName = toCapitalizedWords(f.name);
                const slug = toGoogleFontsSlug(cleanName);
                const sanitizedUrl = `https://fonts.googleapis.com/css2?family=${slug}&display=swap`;

                const entry = {
                  id: f.id,
                  name: cleanName,
                  family: `"${cleanName}", sans-serif, cursive`,
                  url: sanitizedUrl,
                  isOriginal: false,
                  type: 'google'
                };

                this.fonts.push(entry);
                this.injectFontLink(entry.id, sanitizedUrl).catch(() => {});
              }
            }
          });
        }
      }

      const active = localStorage.getItem(STORAGE_ACTIVE_KEY);
      if (active && this.fonts.some(f => f.id === active)) {
        this.activeFontId = active;
        const font = this.fonts.find(f => f.id === active);
        if (font) {
          this.applyFontFamily(font.family);
        }
      }
    } catch (e) {
      console.warn('FontLoader: Erro ao ler localStorage:', e);
    }
  }

  saveStorage() {
    try {
      const customFonts = this.fonts.filter(f => !f.isOriginal);
      localStorage.setItem(STORAGE_FONTS_KEY, JSON.stringify(customFonts));
      localStorage.setItem(STORAGE_ACTIVE_KEY, this.activeFontId);
    } catch (e) {
      console.warn('FontLoader: Erro ao gravar localStorage:', e);
    }
  }

  initDOM() {
    this.dom.triggerBtn = document.getElementById('font-loader-trigger-btn');
    this.dom.popover = document.getElementById('font-loader-popover');
    this.dom.closeBtn = document.getElementById('font-loader-close-btn');
    this.dom.status = document.getElementById('font-loader-status');
    this.dom.listContainer = document.getElementById('font-loader-list');
    this.dom.listCount = document.getElementById('font-loader-list-count');

    // Abas
    this.dom.tabBtns = {
      google: document.getElementById('font-tab-btn-google'),
      catalog: document.getElementById('font-tab-btn-catalog'),
      custom: document.getElementById('font-tab-btn-custom')
    };

    this.dom.tabPanels = {
      google: document.getElementById('font-tab-panel-google'),
      catalog: document.getElementById('font-tab-panel-catalog'),
      custom: document.getElementById('font-tab-panel-custom')
    };

    // Caminho 1: URL / Nome Google Fonts
    this.dom.form = document.getElementById('font-loader-form');
    this.dom.input = document.getElementById('font-loader-url-input');
    this.dom.submitBtn = document.getElementById('font-loader-submit-btn');
    this.dom.presetsWrap = document.getElementById('font-loader-presets-list');

    // Caminho 2: Autocomplete / Catálogo
    this.dom.catalogInput = document.getElementById('font-loader-catalog-input');
    this.dom.catalogDropdown = document.getElementById('font-loader-autocomplete-dropdown');
    this.dom.catalogFilters = document.getElementById('font-loader-catalog-filters');

    // Caminho 3: Webfonts Arbitrárias / @font-face
    this.dom.customForm = document.getElementById('font-loader-custom-form');
    this.dom.customNameInput = document.getElementById('font-loader-custom-name');
    this.dom.customUrlInput = document.getElementById('font-loader-custom-url');
    this.dom.customSubmitBtn = document.getElementById('font-loader-custom-submit-btn');

    if (!this.dom.triggerBtn || !this.dom.popover) return;

    this.setupPreconnect();
    this.bindEvents();
    this.bindTabs();
    this.bindCatalog();
    this.bindCustomWebfonts();
    this.renderList();
    this.renderPresets();

    // Carregamento assíncrono antecipado do catálogo
    this.loadCatalog().catch(() => {});
  }

  setupPreconnect() {
    if (!document.querySelector('link[href="https://fonts.googleapis.com"]')) {
      const preconnect1 = document.createElement('link');
      preconnect1.rel = 'preconnect';
      preconnect1.href = 'https://fonts.googleapis.com';
      document.head.appendChild(preconnect1);
    }
    if (!document.querySelector('link[href="https://fonts.gstatic.com"]')) {
      const preconnect2 = document.createElement('link');
      preconnect2.rel = 'preconnect';
      preconnect2.href = 'https://fonts.gstatic.com';
      preconnect2.crossOrigin = 'anonymous';
      document.head.appendChild(preconnect2);
    }
  }

  bindEvents() {
    // Alternância do Popover via botão
    this.dom.triggerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePopover();
    });

    if (this.dom.closeBtn) {
      this.dom.closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closePopover();
      });
    }

    // Submissão do formulário (Caminho 1)
    if (this.dom.form) {
      this.dom.form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const value = this.dom.input ? this.dom.input.value.trim() : '';
        if (value) {
          await this.loadFromInput(value);
        }
      });
    }

    // Fechar ao clicar fora
    document.addEventListener('click', (e) => {
      if (this.isOpen && !this.dom.popover.contains(e.target) && !this.dom.triggerBtn.contains(e.target)) {
        this.closePopover();
      }
    });

    // Fechar via tecla Escape ou Abrir/Alternar via tecla 'F'
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.closePopover();
        return;
      }

      // Atalho de Teclado [F]:
      // Dispara apenas quando o usuário não estiver focado em um input, textarea ou contenteditable
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      const isInputFocused = activeTag === 'input' || activeTag === 'textarea' || (document.activeElement && document.activeElement.isContentEditable);

      if ((e.key === 'f' || e.key === 'F') && !isInputFocused && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        this.togglePopover();
      }
    });

    // Impede fechamento acidental ao clicar dentro do popover
    this.dom.popover.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  bindTabs() {
    Object.keys(this.dom.tabBtns).forEach(tabKey => {
      const btn = this.dom.tabBtns[tabKey];
      if (!btn) return;

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.switchTab(tabKey);
      });
    });
  }

  switchTab(tabKey) {
    this.activeTab = tabKey;

    Object.keys(this.dom.tabBtns).forEach(k => {
      const btn = this.dom.tabBtns[k];
      const panel = this.dom.tabPanels[k];
      const isActive = k === tabKey;

      if (btn) {
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      }

      if (panel) {
        panel.classList.toggle('is-active', isActive);
        if (isActive) {
          panel.removeAttribute('hidden');
        } else {
          panel.setAttribute('hidden', '');
        }
      }
    });

    this.clearStatus();

    // Foco contextual por aba
    setTimeout(() => {
      if (tabKey === 'google' && this.dom.input) {
        this.dom.input.focus();
        this.dom.input.select();
      } else if (tabKey === 'catalog' && this.dom.catalogInput) {
        this.dom.catalogInput.focus();
        this.dom.catalogInput.select();
      } else if (tabKey === 'custom' && this.dom.customNameInput) {
        this.dom.customNameInput.focus();
        this.dom.customNameInput.select();
      }
    }, 40);
  }

  /**
   * Caminho 2: Autocomplete Conectado ao Catálogo Completo do Google Fonts (Solução 1)
   * Consome o índice oficial aberto de mais de 2.000 famílias via CDN com cache em sessionStorage
   * e fallback transparente para o índice local.
   */
  async loadCatalog() {
    if (this.catalogLoaded && this.catalog.length > 0) return;

    const CACHE_KEY = 'fonte_gfonts_catalog_v2';

    // 1. Tenta recuperar do cache de sessão
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 100) {
          this.catalog = parsed;
          this.catalogLoaded = true;
          return;
        }
      }
    } catch {
      // Ignora erro de storage e prossegue para fetch
    }

    // 2. Consumo assíncrono do índice completo aberto via CDN
    try {
      const res = await fetch('https://api.fontsource.org/v1/fonts');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          // Filtra prioritariamente fontes do Google Fonts ou disponíveis no ecossistema
          const formatted = data
            .filter(item => item && item.family)
            .map(item => ({
              name: item.family,
              category: item.category || 'sans-serif'
            }));

          this.catalog = formatted;
          this.catalogLoaded = true;

          try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(formatted));
          } catch {
            // Se exceder cota de sessionStorage, mantém apenas em memória
          }
          return;
        }
      }
    } catch (e) {
      console.warn('FontLoader: Erro ao obter catálogo via CDN Fontsource, tentando fallback local...', e);
    }

    // 3. Fallback para o catálogo local /google-fonts-catalog.json
    try {
      const res = await fetch('/google-fonts-catalog.json');
      if (res.ok) {
        this.catalog = await res.json();
        this.catalogLoaded = true;
      }
    } catch (e) {
      console.warn('FontLoader: Erro ao carregar google-fonts-catalog.json local:', e);
    }
  }

  /**
   * Solução 3: Carregamento on-demand ultra-leve de preview tipográfico com Subsetting (&text=)
   * O Google Fonts retorna um payload mínimo (~1KB) contendo apenas os caracteres do nome da fonte.
   */
  loadFontPreview(fontName) {
    if (!fontName || this.loadedPreviewFonts.has(fontName)) return;
    this.loadedPreviewFonts.add(fontName);

    const slug = toGoogleFontsSlug(toCapitalizedWords(fontName));
    const textParam = encodeURIComponent(fontName.trim());
    const previewUrl = `https://fonts.googleapis.com/css2?family=${slug}&text=${textParam}&display=swap`;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = previewUrl;
    link.dataset.previewFor = fontName;
    document.head.appendChild(link);
  }

  bindCatalog() {
    if (!this.dom.catalogInput || !this.dom.catalogDropdown) return;

    // Filtros de Categoria
    if (this.dom.catalogFilters) {
      this.dom.catalogFilters.addEventListener('click', (e) => {
        const chip = e.target.closest('.font-loader-filter-chip');
        if (!chip) return;
        e.stopPropagation();

        const cat = chip.dataset.cat || 'all';
        this.catalogCategory = cat;

        this.dom.catalogFilters.querySelectorAll('.font-loader-filter-chip').forEach(c => {
          c.classList.toggle('is-active', c === chip);
        });

        this.renderCatalogAutocomplete(this.dom.catalogInput.value.trim());
      });
    }

    // Input de busca
    this.dom.catalogInput.addEventListener('input', () => {
      this.renderCatalogAutocomplete(this.dom.catalogInput.value.trim());
    });

    this.dom.catalogInput.addEventListener('focus', () => {
      this.renderCatalogAutocomplete(this.dom.catalogInput.value.trim());
    });

    // Navegação via teclado no Autocomplete (ArrowDown, ArrowUp, Enter)
    this.dom.catalogInput.addEventListener('keydown', async (e) => {
      const items = this.dom.catalogDropdown.querySelectorAll('.font-loader-autocomplete-item');
      if (!items || items.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.catalogHighlightedIndex = (this.catalogHighlightedIndex + 1) % items.length;
        this.updateCatalogHighlight(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.catalogHighlightedIndex = (this.catalogHighlightedIndex - 1 + items.length) % items.length;
        this.updateCatalogHighlight(items);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (this.catalogHighlightedIndex >= 0 && items[this.catalogHighlightedIndex]) {
          const fontName = items[this.catalogHighlightedIndex].dataset.fontName;
          if (fontName) {
            await this.selectCatalogFont(fontName);
          }
        } else if (items.length > 0) {
          const fontName = items[0].dataset.fontName;
          if (fontName) {
            await this.selectCatalogFont(fontName);
          }
        }
      }
    });

    // Fechar dropdown ao clicar fora do input/dropdown
    document.addEventListener('click', (e) => {
      if (!this.dom.catalogDropdown.contains(e.target) && e.target !== this.dom.catalogInput) {
        this.closeCatalogDropdown();
      }
    });
  }

  updateCatalogHighlight(items) {
    items.forEach((item, idx) => {
      item.classList.toggle('is-selected', idx === this.catalogHighlightedIndex);
      if (idx === this.catalogHighlightedIndex) {
        item.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  renderCatalogAutocomplete(query) {
    if (!this.dom.catalogDropdown) return;
    this.catalogHighlightedIndex = -1;

    const q = query.toLowerCase().trim();
    let filtered = this.catalog;

    if (this.catalogCategory !== 'all') {
      filtered = filtered.filter(f => f.category === this.catalogCategory);
    }

    if (q) {
      // Prioriza fontes que começam exatamente com a busca, seguidas pelas que contêm a busca
      const startsWithMatches = [];
      const containsMatches = [];

      filtered.forEach(f => {
        const lower = f.name.toLowerCase();
        if (lower.startsWith(q)) {
          startsWithMatches.push(f);
        } else if (lower.includes(q)) {
          containsMatches.push(f);
        }
      });

      filtered = [...startsWithMatches, ...containsMatches];
    }

    const results = filtered.slice(0, 12);

    if (results.length === 0) {
      this.dom.catalogDropdown.innerHTML = `
        <div style="padding: 10px; font-size: 0.75rem; color: #666; text-align: center;">
          ${this.catalog.length === 0 ? 'Carregando catálogo de fontes...' : `Nenhuma fonte encontrada para "${query}"`}
        </div>
      `;
      this.dom.catalogDropdown.classList.add('is-open');
      return;
    }

    this.dom.catalogDropdown.innerHTML = '';
    results.forEach((item, idx) => {
      const el = document.createElement('div');
      el.className = 'font-loader-autocomplete-item';
      el.dataset.fontName = item.name;
      el.dataset.index = idx;

      // Dispara o download on-demand otimizado de preview (Subsetting &text= de ~1KB)
      this.loadFontPreview(item.name);

      const nameSpan = document.createElement('span');
      nameSpan.className = 'font-loader-autocomplete-name';
      nameSpan.textContent = item.name;
      // Aplica a tipografia real no título
      nameSpan.style.fontFamily = `"${item.name}", sans-serif`;

      const catBadge = document.createElement('span');
      catBadge.className = 'font-loader-autocomplete-cat';
      catBadge.textContent = item.category;

      el.appendChild(nameSpan);
      el.appendChild(catBadge);

      el.addEventListener('click', async (e) => {
        e.stopPropagation();
        await this.selectCatalogFont(item.name);
      });

      this.dom.catalogDropdown.appendChild(el);
    });

    this.dom.catalogDropdown.classList.add('is-open');
  }

  closeCatalogDropdown() {
    if (this.dom.catalogDropdown) {
      this.dom.catalogDropdown.classList.remove('is-open');
    }
  }

  async selectCatalogFont(fontName) {
    this.closeCatalogDropdown();
    if (this.dom.catalogInput) {
      this.dom.catalogInput.value = fontName;
    }
    await this.loadFromInput(fontName);
  }

  /**
   * Caminho 3: Ingestão de Webfonts Arbitrárias (@font-face dinâmico)
   */
  bindCustomWebfonts() {
    if (!this.dom.customForm) return;

    this.dom.customForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = this.dom.customNameInput ? this.dom.customNameInput.value.trim() : '';
      const url = this.dom.customUrlInput ? this.dom.customUrlInput.value.trim() : '';

      if (!name || !url) return;
      await this.loadCustomWebfont(name, url);
    });
  }

  /**
   * Injeta regras @font-face ou folha de estilo de repositórios arbitrários (Fontshare, CDN Fonts, etc)
   */
  async injectCustomFont(id, fontName, fontUrl) {
    const isBinaryFile = /\.(woff2|woff|ttf|otf|eot)(\?.*)?$/i.test(fontUrl);
    const sanitizedId = `custom-font-${id}`;

    if (isBinaryFile) {
      // Injeta regra @font-face no elemento <style id="dynamic-font-loader">
      let styleTag = document.getElementById('dynamic-font-loader');
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'dynamic-font-loader';
        document.head.appendChild(styleTag);
      }

      // Determina o formato apropriado
      let format = 'woff2';
      if (/\.woff(\?.*)?$/i.test(fontUrl)) format = 'woff';
      else if (/\.ttf(\?.*)?$/i.test(fontUrl)) format = 'truetype';
      else if (/\.otf(\?.*)?$/i.test(fontUrl)) format = 'opentype';

      const rule = `
@font-face {
  font-family: '${fontName}';
  src: url('${fontUrl}') format('${format}');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}
`;
      // Remove regra anterior da mesma fonte se houver
      const existingRules = styleTag.textContent;
      const regex = new RegExp(`@font-face\\s*\\{[^}]*font-family:\\s*['"]${fontName}['"][^}]*\\}`, 'g');
      styleTag.textContent = existingRules.replace(regex, '') + '\n' + rule;
      return true;
    } else {
      // É uma folha de estilo externa (ex: Fontshare, CDNFonts)
      const existingLink = document.getElementById(sanitizedId);
      if (existingLink) existingLink.remove();

      return new Promise((resolve) => {
        const link = document.createElement('link');
        link.id = sanitizedId;
        link.rel = 'stylesheet';
        link.href = fontUrl;
        link.onload = () => resolve(true);
        link.onerror = () => {
          link.remove();
          resolve(false);
        };
        document.head.appendChild(link);
      });
    }
  }

  async loadCustomWebfont(fontName, fontUrl) {
    this.showStatus(`Importando "${fontName}"...`, 'loading');
    if (this.dom.customSubmitBtn) this.dom.customSubmitBtn.disabled = true;

    try {
      const fontId = `custom-${fontName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      const success = await this.injectCustomFont(fontId, fontName, fontUrl);

      if (!success) {
        this.showStatus(`Falha ao carregar arquivo de fonte de: ${fontUrl}`, 'error');
        return;
      }

      // Aguarda confirmação no document.fonts se suportado
      if (document.fonts && document.fonts.load) {
        try {
          await Promise.race([
            document.fonts.load(`1em "${fontName}"`),
            new Promise(res => setTimeout(res, 2000))
          ]);
        } catch (e) {
          console.warn('FontLoader: document.fonts.load custom warning:', e);
        }
      }

      const familyString = `"${fontName}", sans-serif, system-ui`;

      let existing = this.fonts.find(f => f.id === fontId || f.name.toLowerCase() === fontName.toLowerCase());
      if (!existing) {
        existing = {
          id: fontId,
          name: fontName,
          family: familyString,
          url: fontUrl,
          isOriginal: false,
          type: 'custom'
        };
        this.fonts.push(existing);
      } else {
        existing.url = fontUrl;
        existing.family = familyString;
        existing.name = fontName;
        existing.type = 'custom';
      }

      this.activateFont(existing.id);
      this.saveStorage();
      this.renderList();
      this.showStatus(`"${fontName}" importada e aplicada!`, 'success');

      if (this.dom.customNameInput) this.dom.customNameInput.value = '';
      if (this.dom.customUrlInput) this.dom.customUrlInput.value = '';
    } catch (err) {
      console.warn('FontLoader: erro ao importar webfont customizada:', err);
      this.showStatus('Erro ao importar webfont customizada.', 'error');
    } finally {
      if (this.dom.customSubmitBtn) this.dom.customSubmitBtn.disabled = false;
    }
  }

  togglePopover() {
    if (this.isOpen) {
      this.closePopover();
    } else {
      this.openPopover();
    }
  }

  openPopover() {
    this.isOpen = true;
    this.dom.popover.classList.add('is-active');
    this.dom.popover.setAttribute('aria-hidden', 'false');
    this.dom.triggerBtn.classList.add('is-active');
    this.dom.triggerBtn.setAttribute('aria-expanded', 'true');

    // Mantém o menu principal aberto
    const navLeft = document.getElementById('header-nav-left');
    if (navLeft) {
      navLeft.classList.add('is-open');
    }

    setTimeout(() => {
      if (this.activeTab === 'google' && this.dom.input) {
        this.dom.input.focus();
        this.dom.input.select();
      } else if (this.activeTab === 'catalog' && this.dom.catalogInput) {
        this.dom.catalogInput.focus();
        this.dom.catalogInput.select();
      } else if (this.activeTab === 'custom' && this.dom.customNameInput) {
        this.dom.customNameInput.focus();
        this.dom.customNameInput.select();
      }
    }, 50);
  }

  closePopover() {
    this.isOpen = false;
    this.dom.popover.classList.remove('is-active');
    this.dom.popover.setAttribute('aria-hidden', 'true');
    this.dom.triggerBtn.classList.remove('is-active');
    this.dom.triggerBtn.setAttribute('aria-expanded', 'false');
    this.closeCatalogDropdown();
    this.clearStatus();
  }

  showStatus(msg, type = 'loading') {
    if (!this.dom.status) return;
    this.dom.status.className = `font-loader-status is-visible is-${type}`;
    this.dom.status.textContent = msg;
  }

  clearStatus() {
    if (!this.dom.status) return;
    this.dom.status.className = 'font-loader-status';
    this.dom.status.textContent = '';
  }

  /**
   * Resolução inteligente de fontes do Google Fonts (Caminho 1):
   * 1. Extrai o nome da família a partir de URLs de espécime, links de embed ou texto puro.
   * 2. Monta candidatos com Title Case, Word Capitalization e formato canônico.
   * 3. Faz checagem assíncrona prévia via fetch para garantir status HTTP 200 antes de injetar no DOM.
   */
  async resolveFont(rawInput) {
    let clean = rawInput.trim();

    // 1. Tag HTML <link href="...">
    const linkMatch = clean.match(/href=["'](https:\/\/fonts\.googleapis\.com\/css2[^"']+)["']/i);
    if (linkMatch) {
      clean = linkMatch[1];
    }

    // 2. Regra CSS @import url('...')
    const importMatch = clean.match(/url\(["']?(https:\/\/fonts\.googleapis\.com\/css2[^"')]+)["']?\)/i);
    if (importMatch) {
      clean = importMatch[1];
    }

    let explicitUrl = null;
    let extractedName = '';

    // 3. URL de espécime do Google Fonts
    if (clean.includes('fonts.google.com/specimen/')) {
      try {
        const urlObj = new URL(clean);
        const segments = urlObj.pathname.split('/').filter(Boolean);
        const rawSlug = segments[segments.length - 1];
        if (rawSlug) {
          extractedName = decodeURIComponent(rawSlug.replace(/%2B/gi, ' ').replace(/\+/g, ' '));
        }
      } catch {
        const match = clean.match(/fonts\.google\.com\/specimen\/([^?#&]+)/i);
        if (match) {
          extractedName = decodeURIComponent(match[1].replace(/%2B/gi, ' ').replace(/\+/g, ' '));
        }
      }
    } else if (clean.includes('fonts.googleapis.com/css')) {
      // 4. URL direta da API css2
      try {
        const normalized = clean.replace(/%2B/gi, '+');
        const parsedUrl = new URL(normalized);
        const familyParam = parsedUrl.searchParams.get('family');
        if (familyParam) {
          extractedName = decodeURIComponent(familyParam.split(':')[0].replace(/%2B/gi, ' ').replace(/\+/g, ' '));
          explicitUrl = normalized;
        }
      } catch {
        const regexMatch = clean.match(/family=([^&:]+)/i);
        if (regexMatch) {
          extractedName = decodeURIComponent(regexMatch[1].replace(/%2B/gi, ' ').replace(/\+/g, ' '));
          explicitUrl = clean.replace(/%2B/gi, '+');
        }
      }
    } else {
      // 5. Nome simples da fonte
      extractedName = clean.replace(/[<>'"`;]/g, '').trim();
    }

    if (!extractedName || extractedName.length < 2) {
      return null;
    }

    const nameVariants = Array.from(new Set([
      toCapitalizedWords(extractedName),
      toTitleCase(extractedName),
      extractedName.trim()
    ])).filter(Boolean);

    const candidates = [];

    if (explicitUrl) {
      candidates.push({
        name: extractedName,
        url: explicitUrl
      });
    }

    nameVariants.forEach(name => {
      const slug = toGoogleFontsSlug(name);
      const url = `https://fonts.googleapis.com/css2?family=${slug}&display=swap`;
      if (!candidates.some(c => c.url === url)) {
        candidates.push({ name, url });
      }
    });

    for (const candidate of candidates) {
      try {
        const response = await fetch(candidate.url, { method: 'GET', mode: 'cors' });
        if (response.ok) {
          return {
            name: candidate.name,
            family: `"${candidate.name}", sans-serif, cursive`,
            url: candidate.url
          };
        }
      } catch {
        // prossegue em caso de falha de conexão
      }
    }

    return null;
  }

  injectFontLink(id, verifiedUrl) {
    const existing = document.getElementById(`gf-link-${id}`);
    if (existing) {
      existing.remove();
    }

    const sanitizedUrl = verifiedUrl.replace(/%2B/gi, '+');
    return new Promise((resolve) => {
      const link = document.createElement('link');
      link.id = `gf-link-${id}`;
      link.rel = 'stylesheet';
      link.href = sanitizedUrl;
      link.onload = () => resolve(sanitizedUrl);
      link.onerror = () => {
        link.remove();
        resolve(null);
      };
      document.head.appendChild(link);
    });
  }

  async loadFromInput(rawInput) {
    this.showStatus('Localizando no catálogo do Google Fonts...', 'loading');
    if (this.dom.submitBtn) this.dom.submitBtn.disabled = true;

    try {
      const resolved = await this.resolveFont(rawInput);
      if (!resolved) {
        const cleanName = rawInput.trim().replace(/[<>'"`;]/g, '');
        this.showStatus(`Fonte "${cleanName}" não encontrada no Google Fonts.`, 'error');
        console.warn(`FontLoader: Nenhuma variante encontrada para "${cleanName}".`);
        return;
      }

      this.showStatus(`Carregando "${resolved.name}"...`, 'loading');

      const fontId = `font-${resolved.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

      // Injeta folha de estilos validada
      await this.injectFontLink(fontId, resolved.url);

      if (document.fonts && document.fonts.load) {
        try {
          await Promise.race([
            document.fonts.load(`1em "${resolved.name}"`),
            new Promise(res => setTimeout(res, 2000))
          ]);
        } catch (fontErr) {
          console.warn('FontLoader: aviso document.fonts.load:', fontErr);
        }
      }

      let existing = this.fonts.find(f => f.id === fontId || f.name.toLowerCase() === resolved.name.toLowerCase());
      if (!existing) {
        existing = {
          id: fontId,
          name: resolved.name,
          family: resolved.family,
          url: resolved.url,
          isOriginal: false,
          type: 'google'
        };
        this.fonts.push(existing);
      } else {
        existing.url = resolved.url;
        existing.family = resolved.family;
        existing.name = resolved.name;
      }

      this.activateFont(existing.id);

      this.saveStorage();
      this.renderList();
      this.showStatus(`"${resolved.name}" aplicada com sucesso!`, 'success');

      if (this.dom.input) {
        this.dom.input.value = '';
      }
    } catch (err) {
      console.warn('FontLoader: erro ao processar fonte:', err);
      this.showStatus('Erro ao comunicar com o Google Fonts.', 'error');
    } finally {
      if (this.dom.submitBtn) this.dom.submitBtn.disabled = false;
    }
  }

  applyFontFamily(familyString) {
    document.documentElement.style.setProperty('--font-primary', familyString);
    if (typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.refresh();
    }
  }

  activateFont(id) {
    const font = this.fonts.find(f => f.id === id);
    if (!font) return;

    this.activeFontId = font.id;
    this.applyFontFamily(font.family);
    this.saveStorage();
    this.renderList();
  }

  deleteFont(id, e) {
    if (e) e.stopPropagation();
    const index = this.fonts.findIndex(f => f.id === id);
    if (index === -1) return;

    const [removed] = this.fonts.splice(index, 1);

    // Remove elemento <link> do DOM se existir
    const linkEl = document.getElementById(`gf-link-${removed.id}`) || document.getElementById(`custom-font-${removed.id}`);
    if (linkEl) {
      linkEl.remove();
    }

    // Se houver regra @font-face no <style id="dynamic-font-loader">, limpa
    const styleTag = document.getElementById('dynamic-font-loader');
    if (styleTag) {
      const regex = new RegExp(`@font-face\\s*\\{[^}]*font-family:\\s*['"]${removed.name}['"][^}]*\\}`, 'g');
      styleTag.textContent = styleTag.textContent.replace(regex, '');
    }

    // Se a fonte excluída estava ativa, retorna à Stag Sans original
    if (this.activeFontId === removed.id) {
      this.activateFont(ORIGINAL_FONT.id);
    } else {
      this.saveStorage();
      this.renderList();
    }
  }

  renderList() {
    if (!this.dom.listContainer) return;
    this.dom.listContainer.innerHTML = '';

    if (this.dom.listCount) {
      this.dom.listCount.textContent = `(${this.fonts.length})`;
    }

    this.fonts.forEach(font => {
      const isCurrent = font.id === this.activeFontId;
      const item = document.createElement('div');
      item.className = `font-loader-item ${isCurrent ? 'is-current' : ''}`;
      item.id = `font-item-${font.id}`;

      // Informações e pré-visualização tipográfica
      const info = document.createElement('div');
      info.className = 'font-loader-item-info';

      const nameEl = document.createElement('span');
      nameEl.className = 'font-loader-item-name';
      nameEl.style.fontFamily = font.family;
      nameEl.textContent = font.isOriginal ? `${font.name} (Original)` : font.name;

      const sampleEl = document.createElement('span');
      sampleEl.className = 'font-loader-item-sample';
      sampleEl.style.fontFamily = font.family;
      sampleEl.textContent = 'Aa Bb Cc 1 2 3 / FONTE';

      info.appendChild(nameEl);
      info.appendChild(sampleEl);

      // Ações
      const actions = document.createElement('div');
      actions.className = 'font-loader-item-actions';

      const applyBtn = document.createElement('button');
      applyBtn.type = 'button';
      applyBtn.className = 'font-loader-apply-btn';
      applyBtn.textContent = isCurrent ? 'ATIVA' : 'USAR';
      applyBtn.disabled = isCurrent;
      applyBtn.setAttribute('aria-label', `Usar fonte ${font.name}`);
      applyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.activateFont(font.id);
      });
      actions.appendChild(applyBtn);

      if (!font.isOriginal) {
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'font-loader-delete-btn';
        delBtn.innerHTML = '&times;';
        delBtn.title = 'Remover fonte da lista';
        delBtn.setAttribute('aria-label', `Remover fonte ${font.name}`);
        delBtn.addEventListener('click', (e) => this.deleteFont(font.id, e));
        actions.appendChild(delBtn);
      }

      item.appendChild(info);
      item.appendChild(actions);

      if (!isCurrent) {
        item.style.cursor = 'pointer';
        item.addEventListener('click', () => this.activateFont(font.id));
      }

      this.dom.listContainer.appendChild(item);
    });
  }

  renderPresets() {
    if (!this.dom.presetsWrap) return;
    this.dom.presetsWrap.innerHTML = '';

    const presets = [
      { name: 'Sofia Sans Semi Condensed', input: 'Sofia Sans Semi Condensed' },
      { name: 'Space Grotesk', input: 'Space Grotesk' },
      { name: 'Playfair Display', input: 'Playfair Display' },
      { name: 'Fira Code', input: 'Fira Code' },
      { name: 'Roboto Condensed', input: 'Roboto Condensed' }
    ];

    presets.forEach(p => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'font-loader-preset-chip';
      chip.textContent = p.name;
      chip.addEventListener('click', async (e) => {
        e.stopPropagation();
        await this.loadFromInput(p.input);
      });
      this.dom.presetsWrap.appendChild(chip);
    });
  }
}

let instance = null;

export function initFontLoader() {
  if (!instance) {
    instance = new FontLoaderMachine();
  }
  instance.initDOM();
  return instance;
}
