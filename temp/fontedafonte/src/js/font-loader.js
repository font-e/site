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
      // Bloco 1 (Biblioteca / Presets)
      presetsWrap: null,
      // Bloco 2 (Google Fonts URL / Catálogo)
      form: null,
      input: null,
      submitBtn: null,
      catalogInput: null,
      catalogDropdown: null,
      catalogFilters: null,
      // Bloco 3 (Upload Drag & Drop)
      dropzone: null,
      fileInput: null,
      // Bloco 4 (Custom Webfonts / @font-face)
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

              if (f.type === 'custom' || f.type === 'font-face' || f.type === 'file') {
                // Fonte arbitrária (@font-face, stylesheet customizado ou arquivo local)
                const entry = {
                  id: f.id,
                  name: f.name,
                  family: f.family,
                  url: f.url,
                  cssRules: f.cssRules || null,
                  variantsText: f.variantsText || null,
                  isOriginal: false,
                  type: f.type
                };
                this.fonts.push(entry);
                if (f.url || f.cssRules) {
                  this.injectCustomFont(entry.id, entry.name, entry.url, entry.cssRules).catch(() => {});
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

    // Bloco 2: Google Fonts (URL direta + Catálogo com autocomplete e preview)
    this.dom.form = document.getElementById('font-loader-form');
    this.dom.input = document.getElementById('font-loader-url-input');
    this.dom.submitBtn = document.getElementById('font-loader-submit-btn');
    this.dom.catalogInput = document.getElementById('font-loader-catalog-input');
    this.dom.catalogDropdown = document.getElementById('font-loader-autocomplete-dropdown');
    this.dom.catalogFilters = document.getElementById('font-loader-catalog-filters');

    // Bloco 3: Webfonts Arbitrárias / @font-face
    this.dom.customForm = document.getElementById('font-loader-custom-form');
    this.dom.customNameInput = document.getElementById('font-loader-custom-name');
    this.dom.customUrlInput = document.getElementById('font-loader-custom-url');
    this.dom.customSubmitBtn = document.getElementById('font-loader-custom-submit-btn');

    if (!this.dom.triggerBtn || !this.dom.popover) return;

    this.setupPreconnect();
    this.bindEvents();
    this.bindDrawers();
    this.bindCatalog();
    this.bindCustomWebfonts();
    this.renderList();

    // Carregamento assíncrono antecipado do catálogo
    this.loadCatalog().catch(() => {});
  }

  /**
   * Conecta as gavetas do painel lateral para abertura e fechamento independente
   */
  bindDrawers() {
    const drawerBtns = this.dom.popover.querySelectorAll('.font-loader-drawer-btn');
    drawerBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const targetId = btn.getAttribute('data-drawer-target');
        const drawerBlock = btn.closest('.font-loader-drawer');
        const bodyEl = document.getElementById(targetId);

        if (bodyEl && drawerBlock) {
          const isOpen = drawerBlock.classList.contains('is-open');
          if (isOpen) {
            drawerBlock.classList.remove('is-open');
            bodyEl.classList.add('is-collapsed');
            btn.setAttribute('aria-expanded', 'false');
          } else {
            drawerBlock.classList.add('is-open');
            bodyEl.classList.remove('is-collapsed');
            btn.setAttribute('aria-expanded', 'true');
          }
        }
      });
    });
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

  /**
   * Bloco 3: Upload de Fontes (Drag & Drop + File Picker)
   */
  bindUpload() {
    if (!this.dom.dropzone || !this.dom.fileInput) return;

    // Clique na dropzone dispara o file input
    this.dom.dropzone.addEventListener('click', () => {
      this.dom.fileInput.click();
    });

    // Tecla Enter ou Espaço com foco na dropzone
    this.dom.dropzone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.dom.fileInput.click();
      }
    });

    // Seleção via janela de arquivos nativa
    this.dom.fileInput.addEventListener('change', (e) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        this.handleUploadedFiles(Array.from(files));
        this.dom.fileInput.value = ''; // Limpa para permitir re-upload do mesmo arquivo
      }
    });

    // Eventos Drag & Drop
    const preventDefaults = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      this.dom.dropzone.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      this.dom.dropzone.addEventListener(eventName, () => {
        this.dom.dropzone.classList.add('is-dragover');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      this.dom.dropzone.addEventListener(eventName, () => {
        this.dom.dropzone.classList.remove('is-dragover');
      }, false);
    });

    this.dom.dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length > 0) {
        this.handleUploadedFiles(Array.from(dt.files));
      }
    }, false);
  }

  /**
   * Processa arquivos de fonte carregados (.woff2, .woff, .ttf, .otf)
   * Identifica famílias e realiza as correspondências de peso e estilo conforme os parâmetros do site
   */
  async handleUploadedFiles(files) {
    const validExtensions = ['.woff2', '.woff', '.ttf', '.otf'];
    const validFiles = files.filter(file => {
      const lower = file.name.toLowerCase();
      return validExtensions.some(ext => lower.endsWith(ext));
    });

    if (validFiles.length === 0) {
      this.showStatus('Selecione arquivos de fonte válidos (.woff2, .woff, .ttf, .otf)', 'error');
      return;
    }

    this.showStatus(`Processando ${validFiles.length} arquivo(s) de fonte...`, 'loading');

    // 1. Extrai metadados e agrupa por família tipográfica
    const familyGroups = new Map();

    for (const file of validFiles) {
      const info = this.parseFontFileInfo(file.name);
      if (!familyGroups.has(info.familyName)) {
        familyGroups.set(info.familyName, []);
      }
      familyGroups.get(info.familyName).push({ file, info });
    }

    // 2. Processa cada família identificada
    let lastActivatedId = null;

    for (const [familyName, items] of familyGroups.entries()) {
      try {
        const familyResult = await this.processFontFamilyGroup(familyName, items);
        if (familyResult) {
          lastActivatedId = familyResult.id;
        }
      } catch (err) {
        console.warn(`FontLoader: Falha ao processar família "${familyName}":`, err);
        this.showStatus(`Erro ao processar a família "${familyName}".`, 'error');
      }
    }

    if (lastActivatedId) {
      this.activateFont(lastActivatedId);
      this.saveStorage();
      this.renderList();
    }
  }

  /**
   * Analisa o nome do arquivo para deduzir família, peso (100 a 900) e estilo (normal / italic)
   */
  parseFontFileInfo(filename) {
    const lower = filename.toLowerCase();
    const extMatch = filename.match(/\.(woff2|woff|ttf|otf)$/i);
    const ext = extMatch ? extMatch[1].toLowerCase() : 'woff2';

    // Mapeamento de formatos CSS
    let format = 'woff2';
    if (ext === 'woff') format = 'woff';
    else if (ext === 'ttf') format = 'truetype';
    else if (ext === 'otf') format = 'opentype';

    // Detecta estilo (itálico vs normal)
    const isItalic = /(italic|oblique)/i.test(lower);
    const fontStyle = isItalic ? 'italic' : 'normal';

    // Detecta peso tipográfico (font-weight)
    let fontWeight = 400;
    let weightName = 'Regular';

    if (/(thin|hairline)/i.test(lower)) {
      fontWeight = 100;
      weightName = 'Thin';
    } else if (/(extralight|ultralight)/i.test(lower)) {
      fontWeight = 200;
      weightName = 'ExtraLight';
    } else if (/(light)/i.test(lower)) {
      fontWeight = 300;
      weightName = 'Light';
    } else if (/(medium)/i.test(lower)) {
      fontWeight = 500;
      weightName = 'Medium';
    } else if (/(semibold|demibold)/i.test(lower)) {
      fontWeight = 600;
      weightName = 'SemiBold';
    } else if (/(extrabold|ultrabold)/i.test(lower)) {
      fontWeight = 800;
      weightName = 'ExtraBold';
    } else if (/(black|heavy)/i.test(lower)) {
      fontWeight = 900;
      weightName = 'Black';
    } else if (/(bold)/i.test(lower)) {
      fontWeight = 700;
      weightName = 'Bold';
    } else if (/(variablefont|variable|wght)/i.test(lower)) {
      fontWeight = '100 900';
      weightName = 'Variable';
    } else {
      fontWeight = 400;
      weightName = 'Regular';
    }

    // Extrai o nome da família limpando sufixos e extensões
    let baseName = filename.replace(/\.(woff2|woff|ttf|otf)$/i, '');
    
    // Remove sufixos de peso e estilo comuns
    baseName = baseName.replace(/[-_]?(thin|hairline|extralight|ultralight|light|regular|normal|book|medium|semibold|demibold|extrabold|ultrabold|bold|black|heavy|italic|oblique|variablefont[^\s]*|variable|slnt[^\s]*|wght[^\s]*|\d+pt)/gi, '');
    
    // Limpa separadores residuais
    baseName = baseName.replace(/[-_]+/g, ' ').trim();
    if (!baseName) {
      baseName = filename.replace(/\.(woff2|woff|ttf|otf)$/i, '').replace(/[-_]+/g, ' ').trim();
    }

    const familyName = toCapitalizedWords(baseName);

    return {
      filename,
      ext,
      format,
      fontStyle,
      fontWeight,
      weightName,
      familyName
    };
  }

  /**
   * Processa conjunto de arquivos pertencentes à mesma família tipográfica,
   * gerando regras @font-face coordenadas para cobrir os parâmetros do site (100 a 900)
   */
  async processFontFamilyGroup(familyName, items) {
    const fontId = `file-${familyName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const familyString = `"${familyName}", sans-serif`;

    const generatedRules = [];
    const variantSummaries = [];
    let primaryDataUrl = '';

    // Lê os arquivos como DataURL e ArrayBuffer
    const loadedVariants = [];

    for (const item of items) {
      const { file, info } = item;
      try {
        const [dataUrl, arrayBuffer] = await Promise.all([
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          }),
          file.arrayBuffer().catch(() => null)
        ]);

        if (!primaryDataUrl) primaryDataUrl = dataUrl;

        loadedVariants.push({
          info,
          dataUrl,
          arrayBuffer
        });

        variantSummaries.push(`${info.weightName} (${info.fontWeight}${info.fontStyle === 'italic' ? ' Italic' : ''})`);

        // Tenta registrar na API nativa FontFace do navegador
        if (arrayBuffer && typeof FontFace !== 'undefined') {
          try {
            const fontFace = new FontFace(familyName, arrayBuffer, {
              style: info.fontStyle,
              weight: String(info.fontWeight),
              display: 'swap'
            });
            await fontFace.load();
            document.fonts.add(fontFace);
          } catch (ffErr) {
            console.warn('FontLoader: FontFace API aviso:', ffErr);
          }
        }
      } catch (fErr) {
        console.warn(`FontLoader: Falha ao ler arquivo ${file.name}:`, fErr);
      }
    }

    if (loadedVariants.length === 0) {
      throw new Error('Nenhum arquivo pôde ser lido');
    }

    // Se houver apenas 1 arquivo e não for variável, cria regra com range amplo (100 900)
    // para cobrir todos os parâmetros do site (títulos bold, textos normais, etc)
    if (loadedVariants.length === 1 && loadedVariants[0].info.fontWeight !== '100 900') {
      const v = loadedVariants[0];
      const singleRule = `
@font-face {
  font-family: '${familyName}';
  src: url('${v.dataUrl}') format('${v.info.format}');
  font-weight: 100 900;
  font-style: ${v.info.fontStyle};
  font-display: swap;
}
`;
      generatedRules.push(singleRule);
    } else {
      // Múltiplos arquivos: gera correspondências específicas para cada variante
      for (const v of loadedVariants) {
        const rule = `
@font-face {
  font-family: '${familyName}';
  src: url('${v.dataUrl}') format('${v.info.format}');
  font-weight: ${v.info.fontWeight};
  font-style: ${v.info.fontStyle};
  font-display: swap;
}
`;
        generatedRules.push(rule);
      }
    }

    // Injeta as regras completas no elemento <style id="dynamic-font-loader">
    let styleTag = document.getElementById('dynamic-font-loader');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'dynamic-font-loader';
      document.head.appendChild(styleTag);
    }

    // Remove regras anteriores desta família
    const existingRules = styleTag.textContent;
    const regex = new RegExp(`@font-face\\s*\\{[^}]*font-family:\\s*['"]${familyName}['"][^}]*\\}`, 'g');
    styleTag.textContent = existingRules.replace(regex, '') + '\n' + generatedRules.join('\n');

    // Força checagem via document.fonts
    if (document.fonts && document.fonts.load) {
      try {
        await Promise.race([
          document.fonts.load(`1em "${familyName}"`),
          new Promise(res => setTimeout(res, 2000))
        ]);
      } catch (fErr) {
        console.warn('FontLoader: aviso document.fonts.load:', fErr);
      }
    }

    // Salva ou atualiza no registro
    const summaryText = loadedVariants.length > 1 
      ? `${loadedVariants.length} arquivos correspondidos` 
      : `${loadedVariants[0].info.weightName} (.${loadedVariants[0].info.ext})`;

    let existing = this.fonts.find(f => f.id === fontId || f.name.toLowerCase() === familyName.toLowerCase());
    if (!existing) {
      existing = {
        id: fontId,
        name: familyName,
        family: familyString,
        url: primaryDataUrl,
        cssRules: generatedRules.join('\n'),
        variantsText: summaryText,
        isOriginal: false,
        type: 'file'
      };
      this.fonts.push(existing);
    } else {
      existing.url = primaryDataUrl;
      existing.family = familyString;
      existing.name = familyName;
      existing.cssRules = generatedRules.join('\n');
      existing.variantsText = summaryText;
      existing.type = 'file';
    }

    this.showStatus(`Família "${familyName}" identificada (${summaryText}) e pronta!`, 'success');
    return existing;
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
          if (this.dom.catalogInput) {
            this.renderCatalogAutocomplete(this.dom.catalogInput.value.trim());
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
    } finally {
      if (this.dom.catalogInput) {
        this.renderCatalogAutocomplete(this.dom.catalogInput.value.trim());
      }
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
        const rawVal = this.dom.catalogInput.value.trim();
        if (rawVal.includes('fonts.google') || rawVal.includes('fonts.googleapis') || rawVal.includes('http')) {
          await this.loadFromInput(rawVal);
          return;
        }
        if (this.catalogHighlightedIndex >= 0 && items[this.catalogHighlightedIndex]) {
          const fontName = items[this.catalogHighlightedIndex].dataset.fontName;
          if (fontName) {
            await this.selectCatalogFont(fontName);
            return;
          }
        } else if (items.length > 0) {
          const fontName = items[0].dataset.fontName;
          if (fontName) {
            await this.selectCatalogFont(fontName);
            return;
          }
        } else if (rawVal) {
          await this.loadFromInput(rawVal);
        }
      }
    });

    // Renderiza lista inicial do catálogo
    this.renderCatalogAutocomplete('');
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
  async injectCustomFont(id, fontName, fontUrl, customCssRules = null) {
    const isDataUrl = typeof fontUrl === 'string' && fontUrl.startsWith('data:');
    const isBinaryUrl = typeof fontUrl === 'string' && /\.(woff2|woff|ttf|otf|eot)(\?.*)?$/i.test(fontUrl);
    const isBinaryFile = isDataUrl || isBinaryUrl;
    const sanitizedId = `custom-font-${id}`;

    if (isBinaryFile || customCssRules) {
      // Injeta regra @font-face no elemento <style id="dynamic-font-loader">
      let styleTag = document.getElementById('dynamic-font-loader');
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'dynamic-font-loader';
        document.head.appendChild(styleTag);
      }

      if (customCssRules) {
        const existingRules = styleTag.textContent;
        const regex = new RegExp(`@font-face\\s*\\{[^}]*font-family:\\s*['"]${fontName}['"][^}]*\\}`, 'g');
        styleTag.textContent = existingRules.replace(regex, '') + '\n' + customCssRules;
        return true;
      }

      // Determina o formato apropriado
      let format = 'woff2';
      if (isDataUrl) {
        if (fontUrl.includes('font/woff2')) format = 'woff2';
        else if (fontUrl.includes('font/woff')) format = 'woff';
        else if (fontUrl.includes('font/ttf') || fontUrl.includes('application/x-font-ttf')) format = 'truetype';
        else if (fontUrl.includes('font/otf') || fontUrl.includes('application/x-font-opentype')) format = 'opentype';
      } else {
        if (/\.woff(\?.*)?$/i.test(fontUrl)) format = 'woff';
        else if (/\.ttf(\?.*)?$/i.test(fontUrl)) format = 'truetype';
        else if (/\.otf(\?.*)?$/i.test(fontUrl)) format = 'opentype';
      }

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
    let cleanUrl = fontUrl.trim();
    // Extrai URL se veio de tag <link href="...">
    const linkMatch = cleanUrl.match(/href=["']([^"']+)["']/i);
    if (linkMatch) cleanUrl = linkMatch[1];
    // Extrai URL se veio de @import url(...)
    const importMatch = cleanUrl.match(/url\(["']?([^"')]+)["']?\)/i);
    if (importMatch) cleanUrl = importMatch[1];

    this.showStatus(`Importando "${fontName}"...`, 'loading');
    if (this.dom.customSubmitBtn) this.dom.customSubmitBtn.disabled = true;

    try {
      const fontId = `custom-${fontName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      const success = await this.injectCustomFont(fontId, fontName, cleanUrl);

      if (!success) {
        this.showStatus(`Falha ao carregar arquivo de fonte de: ${cleanUrl}`, 'error');
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
          url: cleanUrl,
          isOriginal: false,
          type: 'custom'
        };
        this.fonts.push(existing);
      } else {
        existing.url = cleanUrl;
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
      if (this.dom.catalogInput) {
        this.dom.catalogInput.focus();
        this.dom.catalogInput.select();
      } else if (this.dom.input) {
        this.dom.input.focus();
        this.dom.input.select();
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
    // O aviso de sucesso foi eliminado conforme solicitação
    if (type === 'success') {
      this.clearStatus();
      return;
    }
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

      info.appendChild(nameEl);

      if (font.variantsText) {
        const variantsEl = document.createElement('span');
        variantsEl.className = 'font-loader-item-variants-badge';
        variantsEl.textContent = font.variantsText;
        info.appendChild(variantsEl);
      }

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
}
 
let instance = null;

export function initFontLoader() {
  if (!instance) {
    instance = new FontLoaderMachine();
  }
  instance.initDOM();
  return instance;
}
