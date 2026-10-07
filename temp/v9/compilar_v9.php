<?php

declare(strict_types=1);

/**
 * COMPILADOR CANÔNICO DE CÓDIGO-FONTE — RESIDÊNCIA FONTE (v8)
 * Localização: compilar.php (Raiz do projeto)
 * Destino: BUNDLE_FRONTEND_COMPILADO.txt
 * 
 * Funcionalidades:
 * 1. Mapeia index.html e todos os CSS e JS locais vinculados.
 * 2. Rastreia recursivamente imports de ES Modules (import ... from './...') e CSS (@import).
 * 3. Cria cabeçalho com sumário/manifesto analítico (linhas, tamanho em KB e caminho).
 * 4. Delimita cada arquivo com blocos de separação visual padronizados.
 */

$baseDir = __DIR__;
$htmlFile = $baseDir . DIRECTORY_SEPARATOR . 'index.html';
$outputFile = $baseDir . DIRECTORY_SEPARATOR . 'BUNDLE_FRONTEND_COMPILADO.txt';

if (!file_exists($htmlFile)) {
    die("ERRO: O arquivo index.html não foi encontrado na raiz: {$baseDir}\n");
}

$arquivosParaCompilar = [];

// Função auxiliar para normalizar caminhos de arquivos
function normalizarCaminho(string $caminho): string {
    return str_replace(['\\', '/'], DIRECTORY_SEPARATOR, $caminho);
}

function caminhoRelativo(string $caminhoAbsoluto, string $baseDir): string {
    $rel = str_replace($baseDir, '', $caminhoAbsoluto);
    return ltrim(str_replace('\\', '/', $rel), '/');
}

// 1. Inserir o próprio index.html
$arquivosParaCompilar['index.html'] = $htmlFile;

// 2. Varrer index.html em busca de links de CSS e scripts JS locais
$htmlContent = file_get_contents($htmlFile);

// Busca <link rel="stylesheet" href="...">
preg_match_all('/<link[^>]+rel=["\']stylesheet["\'][^>]+href=["\']([^"\']+)["\']/i', $htmlContent, $cssMatches);
// Trata tags link onde o href vem antes do rel
preg_match_all('/<link[^>]+href=["\']([^"\']+\.css(?:\?[^"\']*)?)["\'][^>]+rel=["\']stylesheet["\']/i', $htmlContent, $cssMatchesAlt);
$todosCss = array_merge($cssMatches[1] ?? [], $cssMatchesAlt[1] ?? []);

foreach ($todosCss as $cssHref) {
    // Ignora links externos/CDNs
    if (preg_match('/^(https?:\/\/|\/\/)/i', $cssHref)) {
        continue;
    }
    // Remove query strings se houver
    $cleanPath = explode('?', $cssHref)[0];
    $cleanPath = ltrim($cleanPath, './');
    $caminhoAbs = $baseDir . DIRECTORY_SEPARATOR . normalizarCaminho($cleanPath);
    if (file_exists($caminhoAbs)) {
        $arquivosParaCompilar[caminhoRelativo($caminhoAbs, $baseDir)] = $caminhoAbs;
    }
}

// Busca <script src="...">
preg_match_all('/<script[^>]+src=["\']([^"\']+)["\']/i', $htmlContent, $jsMatches);
foreach ($jsMatches[1] ?? [] as $jsSrc) {
    if (preg_match('/^(https?:\/\/|\/\/)/i', $jsSrc)) {
        continue;
    }
    $cleanPath = explode('?', $jsSrc)[0];
    $cleanPath = ltrim($cleanPath, './');
    $caminhoAbs = $baseDir . DIRECTORY_SEPARATOR . normalizarCaminho($cleanPath);
    if (file_exists($caminhoAbs)) {
        $arquivosParaCompilar[caminhoRelativo($caminhoAbs, $baseDir)] = $caminhoAbs;
    }
}

// 3. Rastreamento recursivo de ES Modules (imports em JS) e @import em CSS
$filaVerificacao = array_values($arquivosParaCompilar);
$visitados = [];

while (!empty($filaVerificacao)) {
    $arquivoAtual = array_shift($filaVerificacao);
    if (isset($visitados[$arquivoAtual]) || !file_exists($arquivoAtual)) {
        continue;
    }
    $visitados[$arquivoAtual] = true;

    $ext = pathinfo($arquivoAtual, PATHINFO_EXTENSION);
    $conteudo = file_get_contents($arquivoAtual);
    $dirArquivo = dirname($arquivoAtual);

    if ($ext === 'js') {
        // Detecta: import ... from './outro.js' ou import './outro.js'
        preg_match_all('/(?:import|export)\s+(?:.+from\s+)?["\'](\.[^"\']+)["\']/i', $conteudo, $importMatches);
        foreach ($importMatches[1] ?? [] as $relImport) {
            $importLimpo = explode('?', $relImport)[0];
            // Garante extensão .js caso seja omitida
            if (!str_ends_with($importLimpo, '.js')) {
                $importLimpo .= '.js';
            }
            $caminhoModulo = realpath($dirArquivo . DIRECTORY_SEPARATOR . normalizarCaminho($importLimpo));
            if ($caminhoModulo && file_exists($caminhoModulo)) {
                $chaveRel = caminhoRelativo($caminhoModulo, $baseDir);
                if (!isset($arquivosParaCompilar[$chaveRel])) {
                    $arquivosParaCompilar[$chaveRel] = $caminhoModulo;
                    $filaVerificacao[] = $caminhoModulo;
                }
            }
        }
    } elseif ($ext === 'css') {
        // Detecta: @import url('./outro.css') ou @import './outro.css'
        preg_match_all('/@import\s+(?:url\()?["\']?(\.[^"\')]+)["\']?\)?/i', $conteudo, $cssImportMatches);
        foreach ($cssImportMatches[1] ?? [] as $relCss) {
            $importLimpo = explode('?', $relCss)[0];
            $caminhoCssImport = realpath($dirArquivo . DIRECTORY_SEPARATOR . normalizarCaminho($importLimpo));
            if ($caminhoCssImport && file_exists($caminhoCssImport)) {
                $chaveRel = caminhoRelativo($caminhoCssImport, $baseDir);
                if (!isset($arquivosParaCompilar[$chaveRel])) {
                    $arquivosParaCompilar[$chaveRel] = $caminhoCssImport;
                    $filaVerificacao[] = $caminhoCssImport;
                }
            }
        }
    }
}

// 4. Montar o Manifesto / Sumário analítico no topo do TXT
$totalArquivos = count($arquivosParaCompilar);
$dataHora = date('d/m/Y H:i:s');
$bytesTotal = 0;
$linhasTotal = 0;

$tabelaManifesto = [];
foreach ($arquivosParaCompilar as $rel => $abs) {
    $tamanhoBytes = filesize($abs);
    $linhas = count(file($abs));
    $bytesTotal += $tamanhoBytes;
    $linhasTotal += $linhas;
    $tamanhoKb = round($tamanhoBytes / 1024, 2);

    $tabelaManifesto[] = sprintf(
        "| %-35s | %8.2f KB | %6d linhas |",
        $rel,
        $tamanhoKb,
        $linhas
    );
}

$totalKb = round($bytesTotal / 1024, 2);

$separadorLinha = str_repeat('=', 85);
$separadorArquivo = str_repeat('-', 85);

$txt = [];
$txt[] = $separadorLinha;
$txt[] = "COMPILAÇÃO CONSOLIDADA DE FRONT-END — RESIDÊNCIA FONTE (V8)";
$txt[] = "Data/Hora de Geração: {$dataHora}";
$txt[] = "Ambiente Local: {$baseDir}";
$txt[] = "Estatísticas: {$totalArquivos} arquivos | {$totalKb} KB total | {$linhasTotal} linhas de código";
$txt[] = $separadorLinha;
$txt[] = "";
$txt[] = "### MANIFESTO DE ARQUIVOS INCLUÍDOS NO BUNDLE:";
$txt[] = "+-------------------------------------+-------------+---------------+";
$txt[] = "| Caminho Relativo                    | Tamanho     | Linhas        |";
$txt[] = "+-------------------------------------+-------------+---------------+";
foreach ($tabelaManifesto as $linhaTabela) {
    $txt[] = $linhaTabela;
}
$txt[] = "+-------------------------------------+-------------+---------------+";
$txt[] = "";
$txt[] = $separadorLinha;
$txt[] = "CONTEÚDO COMPLETO DOS ARQUIVOS (INÍCIO DO CÓDIGO-FONTE)";
$txt[] = $separadorLinha;
$txt[] = "";

// 5. Inserir o conteúdo de cada arquivo com cabeçalho de metadados
$contador = 1;
foreach ($arquivosParaCompilar as $rel => $abs) {
    $conteudoArquivo = file_get_contents($abs);
    $linhasArquivo = count(explode("\n", $conteudoArquivo));
    $kbArquivo = round(filesize($abs) / 1024, 2);

    $txt[] = "";
    $txt[] = $separadorArquivo;
    $txt[] = "ARQUIVO [{$contador}/{$totalArquivos}]: {$rel}";
    $txt[] = "Caminho Absoluto: {$abs}";
    $txt[] = "Metadados: {$linhasArquivo} linhas | {$kbArquivo} KB";
    $txt[] = $separadorArquivo;
    $txt[] = "";
    $txt[] = $conteudoArquivo;
    $txt[] = "";
    $txt[] = "# FIM DO ARQUIVO: {$rel}";
    $txt[] = "";
    $contador++;
}

// 6. Gravação física do TXT consolidado
file_put_contents($outputFile, implode("\n", $txt));

// Resposta formatada para execução via Terminal (CLI) ou Navegador (Herd)
if (php_sapi_name() === 'cli') {
    echo "\n>>> BUNDLE GERADO COM SUCESSO!\n";
    echo "Destino: {$outputFile}\n";
    echo "Total de Arquivos: {$totalArquivos}\n";
    echo "Peso Total: {$totalKb} KB ({$linhasTotal} linhas)\n\n";
} else {
    header('Content-Type: text/html; charset=utf-8');
    echo "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Compilador FONTE v8</title>";
    echo "<style>body{font-family:monospace;background:#002424;color:#ccfffe;padding:30px;line-height:1.6;}";
    echo "h1{color:#38bdf8;} table{border-collapse:collapse;width:100%;max-width:800px;margin:20px 0;}";
    echo "th,td{border:1px solid #ccfffe;padding:8px 12px;text-align:left;} th{background:rgba(204,255,254,0.1);}";
    echo "a.btn{display:inline-block;background:#ccfffe;color:#002424;padding:10px 20px;text-decoration:none;font-weight:bold;border-radius:4px;margin-top:15px;}</style></head><body>";
    echo "<h1>✓ Compilação de Front-end Concluída com Sucesso</h1>";
    echo "<p><strong>Destino:</strong> <code>{$outputFile}</code></p>";
    echo "<p><strong>Métricas:</strong> {$totalArquivos} arquivos compilados | {$totalKb} KB | {$linhasTotal} linhas</p>";
    echo "<table><thead><tr><th>Caminho Relativo</th><th>Tamanho</th><th>Linhas</th></tr></thead><tbody>";
    foreach ($arquivosParaCompilar as $rel => $abs) {
        $kb = round(filesize($abs) / 1024, 2);
        $ln = count(file($abs));
        echo "<tr><td><strong>{$rel}</strong></td><td>{$kb} KB</td><td>{$ln}</td></tr>";
    }
    echo "</tbody></table>";
    echo "<a href='BUNDLE_FRONTEND_COMPILADO.txt' download class='btn'>↓ Baixar BUNDLE_FRONTEND_COMPILADO.txt</a>";
    echo "</body></html>";
}