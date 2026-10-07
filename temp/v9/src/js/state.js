/**
 * =============================================================================
 * FONTE STATE — GERENCIADOR DE ESTADO GLOBAL E ADAPTADOR DE DADOS CANÔNICO
 * Caminho: src/js/state.js
 * Propósito: Carregamento do dataset canônico, eliminação de mocks e
 *            disponibilização de API reativa para todos os módulos da SPA.
 * =============================================================================
 */

let _data = null;
let _initPromise = null;

export const FonteState = {
    /**
     * Inicializa o carregamento do JSON canônico.
     * Tenta './site-teste.json', com fallback para '/site.json' ou './site.json'.
     */
    async init(customUrl = null) {
        if (_data) return _data;
        if (_initPromise) return _initPromise;

        const urlsToTry = customUrl 
            ? [customUrl] 
            : ['./site-teste.json', '/site-teste.json', '/site.json', './site.json'];

        _initPromise = (async () => {
            let lastError = null;

            for (const url of urlsToTry) {
                try {
                    const response = await fetch(url, { cache: 'no-cache' });
                    if (response.ok) {
                        _data = await response.json();
                        window.__FONTE_DATA__ = _data;
                        window.__FONTE_DATA_READY__ = true;
                        
                        // Dispara evento global para componentes que escutam reatividade
                        window.dispatchEvent(new CustomEvent('fonte:data-ready', { detail: _data }));
                        return _data;
                    }
                } catch (err) {
                    lastError = err;
                }
            }

            console.error('[FonteState] Falha ao carregar dataset canônico:', lastError);
            throw new Error('Não foi possível carregar os dados da FONTE.');
        })();

        return _initPromise;
    },

    /**
     * Retorna a árvore bruta completa
     */
    getRawData() {
        return _data || window.__FONTE_DATA__ || null;
    },

    /**
     * METADADOS INSTITUCIONAIS & SEO
     */
    getMeta() {
        return this.getRawData()?.meta || {};
    },

    /**
     * SEÇÃO INFO: Memorial, Histórico, Equipe e Apoie
     */
    getInfo() {
        return this.getRawData()?.info || {};
    },

    getEquipeAtual() {
        return this.getInfo()?.equipe_atual || [];
    },

    getColaboracoesAnteriores() {
        return this.getInfo()?.colaboracoes_anteriores || [];
    },

    getTopicosHistorico() {
        return this.getInfo()?.historico_topicos || [];
    },

    getModalidadesApoio() {
        return this.getInfo()?.modalidades_apoio || [];
    },

    /**
     * SEÇÃO PROGRAMAÇÃO
     * Retorna apenas os eventos ativos (sem PASSADAS)
     * Abas canônicas: GERAL, PRESENTE, INSCRIÇÕES ABERTAS, PRÓXIMA
     * Exclui o curso em andamento (olho-d-agua-narrativas-e-processos-na-arte-contemporanea)
     */
    getProgramacao() {
        const raw = this.getRawData()?.programacao;
        const eventos = [];
        const idsMapeados = new Set();

        if (Array.isArray(raw)) {
            return raw;
        }

        const isCurso = (ev) => {
            const id = (ev.id || '').toLowerCase();
            const tit = (ev.titulo || ev.title || '').toLowerCase();
            const cat = (ev.categoria || ev.tipo || '').toLowerCase();
            return id.includes('narrativas-e-processos') || cat.includes('curso') || tit.includes('narrativas e processos');
        };

        const adicionar = (lista, status) => {
            if (!Array.isArray(lista)) return;
            lista.forEach(ev => {
                if (isCurso(ev)) return;
                if (!idsMapeados.has(ev.id)) {
                    idsMapeados.add(ev.id);
                    eventos.push({
                        ...ev,
                        status: status,
                        subsection: status,
                        rawTitle: ev.titulo || ev.title || ''
                    });
                }
            });
        };

        if (raw) {
            adicionar(raw.presente, 'PRESENTE');
            adicionar(raw.inscricoes_abertas, 'INSCRIÇÕES ABERTAS');
            // PRÓXIMA só adiciona itens que ainda não foram catalogados em abertas ou presente
            adicionar(raw.proxima, 'PRÓXIMA');
        }

        return eventos;
    },

    /**
     * SEÇÃO RESIDÊNCIA
     */
    getResidencia() {
        return this.getRawData()?.residencia || {};
    },

    /**
     * Retorna APENAS os artistas que participaram de Residência Individual
     * com resolução precisa de imagens das galerias do acervo
     */
    getArtistasResidentes() {
        const res = this.getResidencia();
        const items = [];
        const slugsVistos = new Set();
        const arquivo = this.getArquivo();

        // 1. Coleta da modalidade Investigação Individual
        const modIndividual = res.modalidades ? res.modalidades['investigacao-individual'] : null;
        if (modIndividual && Array.isArray(modIndividual.cards_arquivo)) {
            modIndividual.cards_arquivo.forEach(card => {
                const slug = card.id;
                if (!slugsVistos.has(slug)) {
                    slugsVistos.add(slug);
                    const p = this.getPessoa(slug) || {};
                    const ev = arquivo.find(e => e.id === slug) || {};
                    
                    const imgThumb = card.imagem 
                        || ev.galeria?.[0]?.thumb 
                        || ev.imagem_capa 
                        || p.avatar?.thumb 
                        || '';
                    const imgZoom = ev.galeria?.[0]?.zoom 
                        || p.avatar?.zoom 
                        || imgThumb;
                    const ratio = ev.galeria?.[0]?.ratio 
                        || p.avatar?.ratio 
                        || 1.498;

                    items.push({
                        id: slug,
                        slug: slug,
                        nome: card.titulo || card.artistas || p.nome || slug,
                        ano: card.ano || (p.participacoes?.[0]?.ano) || '2023',
                        modalidade: modIndividual.titulo || 'Investigação Individual',
                        imagem: imgThumb,
                        bio: p.bio || p.bio_preview || '',
                        resumo: p.bio_preview || '',
                        links: p.links || [],
                        participacoes: p.participacoes || [],
                        galeria: imgThumb ? [{ thumb: imgThumb, zoom: imgZoom, ratio }] : [],
                        textos: []
                    });
                }
            });
        }

        // 2. Coleta complementar de pessoas com 'Residência individual' comprovada em participações
        const pessoas = this.getPessoasArray();
        pessoas.forEach(p => {
            if (slugsVistos.has(p.slug)) return;
            const partInd = p.participacoes?.find(part => {
                const cat = (part.categoria || '').toLowerCase();
                const papel = (part.papel || '').toLowerCase();
                return cat === 'residência individual' && (!papel || papel.includes('artista'));
            });
            if (partInd) {
                slugsVistos.add(p.slug);
                const ev = arquivo.find(e => e.id === p.slug) || {};
                const imgThumb = ev.galeria?.[0]?.thumb 
                    || ev.imagem_capa 
                    || p.avatar?.thumb 
                    || '';
                const imgZoom = ev.galeria?.[0]?.zoom 
                    || p.avatar?.zoom 
                    || imgThumb;
                const ratio = ev.galeria?.[0]?.ratio 
                    || p.avatar?.ratio 
                    || 1.498;

                items.push({
                    id: p.slug,
                    slug: p.slug,
                    nome: p.nome,
                    ano: partInd.ano || '2023',
                    modalidade: partInd.categoria || 'Residência Individual',
                    imagem: imgThumb,
                    bio: p.bio || p.bio_preview || '',
                    resumo: p.bio_preview || '',
                    links: p.links || [],
                    participacoes: p.participacoes || [],
                    galeria: imgThumb ? [{ thumb: imgThumb, zoom: imgZoom, ratio }] : [],
                    textos: []
                });
            }
        });

        return items;
    },

    /**
     * SEÇÃO ATELIÊS
     */
    getAtelies() {
        return this.getRawData()?.atelies || {};
    },

    /**
     * Retorna os membros dos ateliês divididos por atuais ou anteriores
     */
    getMembrosAtelie(filtro = 'atuais') {
        const ateliesRaw = this.getAtelies();
        const pessoas = this.getPessoasArray();
        const items = [];
        const slugsVistos = new Set();

        if (filtro === 'atuais') {
            // Membros oficiais do nó atelies.membros
            if (Array.isArray(ateliesRaw.membros)) {
                ateliesRaw.membros.forEach(m => {
                    slugsVistos.add(m.slug);
                    const p = this.getPessoa(m.slug) || {};
                    items.push({
                        id: m.slug,
                        slug: m.slug,
                        nome: m.nome,
                        desde: m.desde || '2023',
                        status: 'atual',
                        imagem: m.foto || p.avatar?.thumb || '',
                        bio: p.bio || m.bio_preview || '',
                        sobre: p.bio || m.bio_preview || '',
                        pesquisa: p.bio_preview || p.bio || '',
                        obras: '',
                        links: p.links || [],
                        participacoes: p.participacoes || [],
                        galeria: p.avatar ? [p.avatar] : (m.foto ? [{ thumb: m.foto, zoom: m.foto, ratio: 1 }] : [])
                    });
                });
            }

            // Complementa com pessoas que têm atelie.ativo === true
            pessoas.forEach(p => {
                if (!slugsVistos.has(p.slug) && p.atelie && p.atelie.ativo === true) {
                    slugsVistos.add(p.slug);
                    items.push({
                        id: p.slug,
                        slug: p.slug,
                        nome: p.nome,
                        desde: p.atelie.periodos?.[0]?.rotulo?.split('–')?.[0] || '2023',
                        status: 'atual',
                        imagem: p.avatar?.thumb || '',
                        bio: p.bio || p.bio_preview || '',
                        sobre: p.bio || p.bio_preview || '',
                        pesquisa: p.bio_preview || p.bio || '',
                        obras: '',
                        links: p.links || [],
                        participacoes: p.participacoes || [],
                        galeria: p.avatar ? [p.avatar] : []
                    });
                }
            });
        } else if (filtro === 'anteriores') {
            const ALINE_SETTON_PHOTO = 'https://firebrick-mallard-266745.hostingersite.com/media/pages/eventos/aline-setton/3e5313c0d1-1789686086/aline_setton-1400x1400-q82.webp';
            pessoas.forEach(p => {
                if (p.atelie && p.atelie.ativo === false) {
                    slugsVistos.add(p.slug);
                    const isAline = p.slug === 'aline-setton';
                    const imgThumb = isAline ? ALINE_SETTON_PHOTO : (p.avatar?.thumb || '');
                    items.push({
                        id: p.slug,
                        slug: p.slug,
                        nome: p.nome,
                        periodo: p.atelie.periodos?.[0]?.rotulo || 'Anterior',
                        status: 'anterior',
                        imagem: imgThumb,
                        bio: p.bio || p.bio_preview || '',
                        sobre: p.bio || p.bio_preview || '',
                        pesquisa: p.bio_preview || p.bio || '',
                        obras: '',
                        links: p.links || [],
                        participacoes: p.participacoes || [],
                        galeria: isAline ? [{ thumb: ALINE_SETTON_PHOTO, zoom: ALINE_SETTON_PHOTO, ratio: 1 }] : (p.avatar ? [p.avatar] : [])
                    });
                }
            });
        }

        return items;
    },

    /**
     * SEÇÃO ARQUIVO (Acervo Histórico Integral)
     */
    getArquivo() {
        return this.getRawData()?.arquivo || [];
    },

    /**
     * CATÁLOGO DE PESSOAS (Dicionário chaveado por slug)
     */
    getPessoas() {
        return this.getRawData()?.pessoas || {};
    },

    /**
     * Retorna o catálogo de pessoas convertido em Array ordenado por nome
     */
    getPessoasArray() {
        const dic = this.getPessoas();
        return Object.values(dic).sort((a, b) => a.nome.localeCompare(b.nome));
    },

    /**
     * Busca uma pessoa pelo slug ou por correspondência aproximada de nome
     */
    getPessoa(slugOuNome) {
        if (!slugOuNome) return null;
        const dic = this.getPessoas();

        // Busca exata por slug
        if (dic[slugOuNome]) {
            return dic[slugOuNome];
        }

        // Busca por correspondência de nome
        const chaveNome = slugOuNome.trim().toLowerCase();
        return Object.values(dic).find(p => p.nome.trim().toLowerCase() === chaveNome) || null;
    },

    /**
     * Busca um evento no Arquivo ou na Programação por slug/id
     */
    getEvento(id) {
        if (!id) return null;
        const arquivo = this.getArquivo();
        const encontrado = arquivo.find(ev => ev.id === id);
        if (encontrado) return encontrado;

        const programacao = this.getProgramacao();
        return programacao.find(ev => ev.id === id) || null;
    }
};

// Vinculação global e compatibilidade retroativa
window.FonteState = FonteState;
export default FonteState;
