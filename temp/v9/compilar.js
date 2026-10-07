import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseDir = __dirname;
const htmlFile = path.join(baseDir, 'index.html');
const outputFile = path.join(baseDir, 'BUNDLE_FRONTEND_COMPILADO.txt');

if (!fs.existsSync(htmlFile)) {
  console.error(`ERRO: O arquivo index.html não foi encontrado na raiz: ${baseDir}`);
  process.exit(1);
}

const arquivosParaCompilar = new Map();

function normalizarCaminho(caminho) {
  return caminho.replace(/[\\/]/g, path.sep);
}

function caminhoRelativo(caminhoAbsoluto, base) {
  const rel = path.relative(base, caminhoAbsoluto);
  return rel.replace(/\\/g, '/');
}

// 1. Inserir o próprio index.html
arquivosParaCompilar.set('index.html', htmlFile);

// 2. Varrer index.html em busca de links de CSS e scripts JS locais
const htmlContent = fs.readFileSync(htmlFile, 'utf-8');

// Busca <link rel="stylesheet" href="..."> e <link href="..." rel="stylesheet">
const cssRegex1 = /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/gi;
const cssRegex2 = /<link[^>]+href=["']([^"']+\.css(?:\?[^"']*)?)["'][^>]+rel=["']stylesheet["']/gi;

let match;
const todosCss = [];
while ((match = cssRegex1.exec(htmlContent)) !== null) {
  todosCss.push(match[1]);
}
while ((match = cssRegex2.exec(htmlContent)) !== null) {
  todosCss.push(match[1]);
}

for (const cssHref of todosCss) {
  if (/^(https?:\/\/|\/\/)/i.test(cssHref)) continue;
  const cleanPath = cssHref.split('?')[0].replace(/^\.\//, '');
  const caminhoAbs = path.join(baseDir, normalizarCaminho(cleanPath));
  if (fs.existsSync(caminhoAbs)) {
    arquivosParaCompilar.set(caminhoRelativo(caminhoAbs, baseDir), caminhoAbs);
  }
}

// Busca <script src="...">
const jsRegex = /<script[^>]+src=["']([^"']+)["']/gi;
while ((match = jsRegex.exec(htmlContent)) !== null) {
  const jsSrc = match[1];
  if (/^(https?:\/\/|\/\/)/i.test(jsSrc)) continue;
  const cleanPath = jsSrc.split('?')[0].replace(/^\.\//, '');
  const caminhoAbs = path.join(baseDir, normalizarCaminho(cleanPath));
  if (fs.existsSync(caminhoAbs)) {
    arquivosParaCompilar.set(caminhoRelativo(caminhoAbs, baseDir), caminhoAbs);
  }
}

// 3. Rastreamento recursivo de ES Modules (imports em JS) e @import em CSS
const filaVerificacao = Array.from(arquivosParaCompilar.values());
const visitados = new Set();

while (filaVerificacao.length > 0) {
  const arquivoAtual = filaVerificacao.shift();
  if (visitados.has(arquivoAtual) || !fs.existsSync(arquivoAtual)) continue;
  visitados.add(arquivoAtual);

  const ext = path.extname(arquivoAtual).toLowerCase();
  const conteudo = fs.readFileSync(arquivoAtual, 'utf-8');
  const dirArquivo = path.dirname(arquivoAtual);

  if (ext === '.js') {
    // Detecta: import ... from './outro.js' ou import './outro.js' ou export ... from './outro.js'
    const importRegex = /(?:import|export)\s+(?:.+?from\s+)?["'](\.[^"']+)["']/gi;
    let importMatch;
    while ((importMatch = importRegex.exec(conteudo)) !== null) {
      let relImport = importMatch[1].split('?')[0];
      if (!relImport.endsWith('.js')) {
        relImport += '.js';
      }
      const caminhoModulo = path.resolve(dirArquivo, normalizarCaminho(relImport));
      if (fs.existsSync(caminhoModulo)) {
        const chaveRel = caminhoRelativo(caminhoModulo, baseDir);
        if (!arquivosParaCompilar.has(chaveRel)) {
          arquivosParaCompilar.set(chaveRel, caminhoModulo);
          filaVerificacao.push(caminhoModulo);
        }
      }
    }
  } else if (ext === '.css') {
    const cssImportRegex = /@import\s+(?:url\()?["']?(\.[^"')]+)["']?\)?/gi;
    let cssMatch;
    while ((cssMatch = cssImportRegex.exec(conteudo)) !== null) {
      const relCss = cssMatch[1].split('?')[0];
      const caminhoCss = path.resolve(dirArquivo, normalizarCaminho(relCss));
      if (fs.existsSync(caminhoCss)) {
        const chaveRel = caminhoRelativo(caminhoCss, baseDir);
        if (!arquivosParaCompilar.has(chaveRel)) {
          arquivosParaCompilar.set(chaveRel, caminhoCss);
          filaVerificacao.push(caminhoCss);
        }
      }
    }
  }
}

// 4. Montar o Manifesto / Sumário analítico no topo do TXT
const totalArquivos = arquivosParaCompilar.size;
const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const dataHora = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

let bytesTotal = 0;
let linhasTotal = 0;

const tabelaManifesto = [];
for (const [rel, abs] of arquivosParaCompilar.entries()) {
  const stat = fs.statSync(abs);
  const conteudo = fs.readFileSync(abs, 'utf-8');
  const linhas = conteudo.split(/\r?\n/).length;
  bytesTotal += stat.size;
  linhasTotal += linhas;
  const tamanhoKb = (stat.size / 1024).toFixed(2);

  const colRel = rel.padEnd(35);
  const colSize = `${tamanhoKb} KB`.padStart(11);
  const colLines = `${linhas} linhas`.padStart(13);
  tabelaManifesto.push(`| ${colRel} | ${colSize} | ${colLines} |`);
}

const totalKb = (bytesTotal / 1024).toFixed(2);

const separadorLinha = '='.repeat(85);
const separadorArquivo = '-'.repeat(85);

const txt = [];
txt.push(separadorLinha);
txt.push('COMPILAÇÃO CONSOLIDADA DE FRONT-END — RESIDÊNCIA FONTE (V8)');
txt.push(`Data/Hora de Geração: ${dataHora}`);
txt.push(`Ambiente Local: ${baseDir}`);
txt.push(`Estatísticas: ${totalArquivos} arquivos | ${totalKb} KB total | ${linhasTotal} linhas de código`);
txt.push(separadorLinha);
txt.push('');
txt.push('### MANIFESTO DE ARQUIVOS INCLUÍDOS NO BUNDLE:');
txt.push('+-------------------------------------+-------------+---------------+');
txt.push('| Caminho Relativo                    | Tamanho     | Linhas        |');
txt.push('+-------------------------------------+-------------+---------------+');
for (const l of tabelaManifesto) {
  txt.push(l);
}
txt.push('+-------------------------------------+-------------+---------------+');
txt.push('');
txt.push(separadorLinha);
txt.push('CONTEÚDO COMPLETO DOS ARQUIVOS (INÍCIO DO CÓDIGO-FONTE)');
txt.push(separadorLinha);
txt.push('');

// 5. Inserir o conteúdo de cada arquivo com cabeçalho de metadados
let contador = 1;
for (const [rel, abs] of arquivosParaCompilar.entries()) {
  const conteudoArquivo = fs.readFileSync(abs, 'utf-8');
  const linhasArquivo = conteudoArquivo.split(/\r?\n/).length;
  const kbArquivo = (fs.statSync(abs).size / 1024).toFixed(2);

  txt.push('');
  txt.push(separadorArquivo);
  txt.push(`ARQUIVO [${contador}/${totalArquivos}]: ${rel}`);
  txt.push(`Caminho Absoluto: ${abs}`);
  txt.push(`Metadados: ${linhasArquivo} linhas | ${kbArquivo} KB`);
  txt.push(separadorArquivo);
  txt.push('');
  txt.push(conteudoArquivo);
  txt.push('');
  txt.push(`# FIM DO ARQUIVO: ${rel}`);
  txt.push('');
  contador++;
}

// 6. Gravação física do TXT consolidado
fs.writeFileSync(outputFile, txt.join('\n'), 'utf-8');

console.log('\n>>> BUNDLE GERADO COM SUCESSO!');
console.log(`Destino: ${outputFile}`);
console.log(`Total de Arquivos: ${totalArquivos}`);
console.log(`Peso Total: ${totalKb} KB (${linhasTotal} linhas)\n`);
