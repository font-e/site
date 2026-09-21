/**
 * Módulo Especialista: Carregador e Alternador de Fontes (Google Fonts)
 * Arquitetura Modular & Máquina de Estados Determinística
 * Caminho 1: Resolução Canônica com Validação de Casing e Fallback Dinâmico
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
  isOriginal: true
};

class FontLoaderMachine {
  constructor() {
    this.fonts = [ORIGINAL_FONT];
    this.activeFontId = ORIGINAL_FONT.id;
    this.isOpen = false;
    this.isLoading = false;

    this.dom = {
      triggerBtn: null,
      popover: null,
      closeBtn: null,
      form: null,
      input: null,
      submitBtn: null,
      status: null,
      listContainer: null,
      listCount: null,
      presetsWrap: null
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
              // Descarta testes de fontes comprovadamente inexistentes (ex: yuyu)
              if (lowerName === 'yuyu') {
                return;
              }

              // Saneia e normaliza casing e delimitadores de URL
              const cleanName = toCapitalizedWords(f.name);
              const slug = toGoogleFontsSlug(cleanName);
              const sanitizedUrl = `https://fonts.googleapis.com/css2?family=${slug}&display=swap`;

              const entry = {
                id: f.id,
                name: cleanName,
                family: `"${cleanName}", sans-serif, cursive`,
                url: sanitizedUrl,
                isOriginal: false
              };

              this.fonts.push(entry);
              this.injectFontLink(entry.id, sanitizedUrl).catch(() => {});
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
    this.dom.form = document.getElementById('font-loader-form');
    this.dom.input = document.getElementById('font-loader-url-input');
    this.dom.submitBtn = document.getElementById('font-loader-submit-btn');
    this.dom.status = document.getElementById('font-loader-status');
    this.dom.listContainer = document.getElementById('font-loader-list');
    this.dom.listCount = document.getElementById('font-loader-list-count');
    this.dom.presetsWrap = document.getElementById('font-loader-presets-list');

    if (!this.dom.triggerBtn || !this.dom.popover) return;

    this.setupPreconnect();
    this.bindEvents();
    this.renderList();
    this.renderPresets();
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
    // Alternância do Popover
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

    // Submissão do formulário
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

    // Fechar via tecla Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.closePopover();
      }
    });

    // Impede fechamento acidental ao clicar dentro do popover
    this.dom.popover.addEventListener('click', (e) => {
      e.stopPropagation();
    });
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
      if (this.dom.input) {
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
   * Resolução inteligente de fontes do Google Fonts:
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

    // 3. URL de espécime do Google Fonts (ex: https://fonts.google.com/specimen/Playwrite+BE+WAL+Guides?preview.script=Latn)
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
      // 5. Nome simples da fonte (ex: "sofia sans semi condensed", "henny penny", "Space Grotesk")
      extractedName = clean.replace(/[<>'"`;]/g, '').trim();
    }

    if (!extractedName || extractedName.length < 2) {
      return null;
    }

    // Normaliza variações de casing para compatibilidade com o índice estrito do Google Fonts
    const nameVariants = Array.from(new Set([
      toCapitalizedWords(extractedName),
      toTitleCase(extractedName),
      extractedName.trim()
    ])).filter(Boolean);

    const candidates = [];

    // Se o usuário colou uma URL explícita com eixos customizados, tenta ela primeiro
    if (explicitUrl) {
      candidates.push({
        name: extractedName,
        url: explicitUrl
      });
    }

    // Adiciona as URLs canônicas (&display=swap) para cada variação de casing
    nameVariants.forEach(name => {
      const slug = toGoogleFontsSlug(name);
      const url = `https://fonts.googleapis.com/css2?family=${slug}&display=swap`;
      if (!candidates.some(c => c.url === url)) {
        candidates.push({ name, url });
      }
    });

    // Teste prévio assíncrono via fetch CORS para encontrar a variante que retorna 200 OK
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
        // Prossegue para o próximo candidato em caso de falha de conexão
      }
    }

    return null;
  }

  /**
   * Injeção da folha de estilos confirmada no <head>
   */
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

      // Aguarda confirmação de prontidão de renderização da fonte
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

      // Adiciona ou atualiza na lista de fontes disponíveis
      let existing = this.fonts.find(f => f.id === fontId || f.name.toLowerCase() === resolved.name.toLowerCase());
      if (!existing) {
        existing = {
          id: fontId,
          name: resolved.name,
          family: resolved.family,
          url: resolved.url,
          isOriginal: false
        };
        this.fonts.push(existing);
      } else {
        existing.url = resolved.url;
        existing.family = resolved.family;
        existing.name = resolved.name;
      }

      // Ativa imediatamente
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
    const linkEl = document.getElementById(`gf-link-${removed.id}`);
    if (linkEl) {
      linkEl.remove();
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

      // Clique no container ativa caso não esteja selecionada
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

    // Eixos e URLs canônicas 100% verificadas contra a API do Google Fonts
    const presets = [
      { name: 'Sofia Sans Semi Condensed', input: 'Sofia Sans Semi Condensed' },
      { name: 'Henny Penny', input: 'Henny Penny' },
      { name: 'Space Grotesk', input: 'Space Grotesk' },
      { name: 'Syne', input: 'Syne' },
      { name: 'Playfair Display', input: 'Playfair Display' },
      { name: 'Cinzel', input: 'Cinzel' }
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
