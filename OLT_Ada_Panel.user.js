// ==UserScript==
// @name         OLT Monitor — Painel Integrado Ada
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Cola output do PuTTY, filtra ONUs inativas e busca dados dos clientes automaticamente no Ada
// @author       Luís Eduardo
// @match        *://192.168.111.245/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // ─────────────────────────────────────────────
    // ESTILOS
    // ─────────────────────────────────────────────
    const CSS = `
        #olt-fab {
            position: fixed;
            bottom: 28px;
            left: 28px;
            z-index: 99999;
            width: 52px;
            height: 52px;
            background: #1a6b3a;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 4px 16px rgba(0,0,0,0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 22px;
            color: white;
            transition: background 0.2s, transform 0.15s;
            font-family: monospace;
        }
        #olt-fab:hover { background: #22893d; transform: scale(1.08); }

        #olt-panel {
            position: fixed;
            bottom: 90px;
            left: 24px;
            z-index: 99998;
            width: 860px;
            max-width: 96vw;
            max-height: 90vh;
            background: #0e1117;
            border: 1px solid #22304a;
            border-radius: 6px;
            box-shadow: 0 8px 40px rgba(0,0,0,0.55);
            display: none;
            flex-direction: column;
            font-family: 'Courier New', monospace;
            color: #c8d0e0;
            overflow: hidden;
        }
        #olt-panel.open { display: flex; }

        #olt-header {
            background: #141923;
            padding: 10px 16px;
            display: flex;
            align-items: center;
            gap: 10px;
            border-bottom: 1px solid #22304a;
            flex-shrink: 0;
        }
        #olt-header .badge { background: #00c47a; color: #000; font-size: 10px; padding: 2px 8px; border-radius: 2px; font-weight: bold; letter-spacing: 1px; }
        #olt-header h2 { font-size: 14px; color: #fff; margin: 0; font-family: sans-serif; font-weight: 600; flex: 1; }
        #olt-close { background: none; border: none; color: #5a6480; cursor: pointer; font-size: 18px; padding: 0 4px; }
        #olt-close:hover { color: #ff4d6d; }

        #olt-body { padding: 14px 16px; overflow-y: auto; flex: 1; }

        .olt-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }

        .olt-input-block { background: #13161e; border: 1px solid #252b3b; border-radius: 3px; overflow: hidden; }
        .olt-input-label { background: #1a1f2e; padding: 7px 12px; font-size: 10px; color: #00c47a; letter-spacing: 1.5px; border-bottom: 1px solid #252b3b; }
        .olt-input-label span { color: #3a4565; font-size: 9px; margin-left: 8px; }
        .olt-textarea {
            width: 100%; height: 120px; background: #13161e; border: none;
            color: #8ba0c0; font-family: 'Courier New', monospace; font-size: 11px;
            padding: 8px 12px; resize: vertical; outline: none; box-sizing: border-box;
        }
        .olt-textarea:focus { background: #161b27; }
        .olt-textarea::placeholder { color: #3a4565; }

        .olt-actions { display: flex; gap: 8px; margin-bottom: 12px; align-items: center; }

        .olt-btn { font-family: sans-serif; font-weight: 600; font-size: 12px; border: none; cursor: pointer; border-radius: 3px; padding: 8px 18px; transition: all 0.15s; }
        .olt-btn-primary { background: #00c47a; color: #000; }
        .olt-btn-primary:hover { background: #00e58d; }
        .olt-btn-primary:disabled { background: #1a4a35; color: #3a6a55; cursor: not-allowed; }
        .olt-btn-secondary { background: #1a1f2e; color: #c8d0e0; border: 1px solid #252b3b; }
        .olt-btn-secondary:hover { border-color: #00c47a; color: #00c47a; }
        .olt-btn-export { background: transparent; color: #00c47a; border: 1px solid #00c47a; font-size: 11px; padding: 6px 14px; font-family: sans-serif; font-weight: 600; cursor: pointer; border-radius: 3px; transition: all 0.15s; }
        .olt-btn-export:hover { background: #00c47a; color: #000; }

        .olt-stats { display: flex; gap: 16px; margin-left: auto; font-size: 11px; align-items: center; }
        .olt-stat { display: flex; align-items: center; gap: 5px; }
        .olt-dot { width: 6px; height: 6px; border-radius: 50%; }
        .dot-red { background: #ff4d6d; box-shadow: 0 0 5px #ff4d6d; }
        .dot-green { background: #00c47a; box-shadow: 0 0 5px #00c47a; }

        .olt-progress { background: #1a1f2e; border: 1px solid #252b3b; border-radius: 3px; padding: 10px 14px; font-size: 12px; color: #00c47a; margin-bottom: 10px; display: none; }
        .olt-progress-bar { height: 3px; background: #252b3b; border-radius: 2px; margin-top: 8px; overflow: hidden; }
        .olt-progress-fill { height: 100%; background: #00c47a; width: 0%; transition: width 0.3s; }

        .olt-alert { background: rgba(255,183,3,0.1); border: 1px solid rgba(255,183,3,0.3); border-radius: 3px; padding: 8px 12px; font-size: 11px; color: #ffb703; margin-bottom: 10px; display: none; }

        .olt-results-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        .olt-results-title { font-size: 11px; color: #5a6480; letter-spacing: 1px; }
        .olt-badge { background: #ff4d6d; color: #fff; font-size: 10px; padding: 2px 8px; border-radius: 2px; }

        .olt-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .olt-table thead tr { background: #1a1f2e; border-bottom: 2px solid #252b3b; }
        .olt-table th { padding: 8px 10px; text-align: left; font-size: 10px; color: #5a6480; letter-spacing: 1.2px; font-weight: 400; }
        .olt-table tbody tr { border-bottom: 1px solid #1a1f2e; }
        .olt-table tbody tr:hover { background: #141923; }
        .olt-table td { padding: 8px 10px; vertical-align: middle; }

        .td-onu { color: #3a4565; font-size: 11px; }
        .td-contrato { color: #00c47a; font-weight: bold; font-size: 13px; }
        .td-nome { color: #fff; font-family: sans-serif; }
        .td-end { font-size: 11px; font-family: sans-serif; line-height: 1.4; }
        .td-loading { color: #3a4565; font-size: 11px; font-style: italic; }
        .td-ok { color: #c8d0e0; }
        .td-erro { color: #ff4d6d; }

        .pill { display: inline-block; font-size: 10px; padding: 2px 7px; border-radius: 2px; letter-spacing: 0.8px; white-space: nowrap; }
        .pill-dgi { background: rgba(255,77,109,0.15); color: #ff4d6d; border: 1px solid rgba(255,77,109,0.3); }
        .pill-loami { background: rgba(255,183,3,0.15); color: #ffb703; border: 1px solid rgba(255,183,3,0.3); }
        .pill-inact { background: rgba(90,100,128,0.15); color: #5a6480; border: 1px solid #252b3b; }

        .copy-btn { background: #1a1f2e; color: #5a6480; border: 1px solid #252b3b; padding: 3px 10px; font-size: 10px; cursor: pointer; border-radius: 2px; font-family: monospace; transition: all 0.12s; white-space: nowrap; }
        .copy-btn:hover { color: #00c47a; border-color: #00c47a; }
        .copy-btn.ok { color: #00c47a; border-color: #00c47a; }

        .maps-link { font-size: 10px; color: #3a6a8a; text-decoration: none; margin-left: 6px; }
        .maps-link:hover { color: #00c47a; }

        .olt-empty { text-align: center; padding: 30px; color: #3a4565; font-size: 13px; }
    `;

    const styleEl = document.createElement('style');
    styleEl.textContent = CSS;
    document.head.appendChild(styleEl);

    // ─────────────────────────────────────────────
    // HTML DO PAINEL
    // ─────────────────────────────────────────────
    const panel = document.createElement('div');
    panel.id = 'olt-panel';
    panel.innerHTML = `
        <div id="olt-header">
            <div class="badge">OLT</div>
            <h2>Monitor GPON — Filtragem Automática</h2>
            <button id="olt-close" title="Fechar">✕</button>
        </div>
        <div id="olt-body">
            <div class="olt-grid">
                <div class="olt-input-block">
                    <div class="olt-input-label">▌ ONU STATUS <span>onu status gpon X</span></div>
                    <textarea class="olt-textarea" id="olt-status" placeholder="Cole aqui o output do comando: onu status gpon X"></textarea>
                </div>
                <div class="olt-input-block">
                    <div class="olt-input-label">▌ ONU DESCRIPTION <span>onu description show gpon X</span></div>
                    <textarea class="olt-textarea" id="olt-desc" placeholder="Cole aqui o output do comando: onu description show gpon X"></textarea>
                </div>
            </div>

            <div class="olt-actions">
                <button class="olt-btn olt-btn-primary" id="olt-processar">▶ PROCESSAR E BUSCAR NO ADA</button>
                <button class="olt-btn olt-btn-secondary" id="olt-limpar">✕ Limpar</button>
                <div class="olt-stats" id="olt-stats" style="display:none">
                    <div class="olt-stat"><div class="olt-dot dot-red"></div><span id="olt-cnt-inativos">0 inativos</span></div>
                    <div class="olt-stat"><div class="olt-dot dot-green"></div><span id="olt-cnt-ativos">0 ativos</span></div>
                </div>
            </div>

            <div class="olt-alert" id="olt-alert"></div>

            <div class="olt-progress" id="olt-progress">
                <span id="olt-progress-txt">Buscando dados no Ada...</span>
                <div class="olt-progress-bar"><div class="olt-progress-fill" id="olt-progress-fill"></div></div>
            </div>

            <div id="olt-result-area">
                <div class="olt-empty">📡 Cole os dados do PuTTY e clique em PROCESSAR</div>
            </div>

            <div id="olt-log-panel" style="margin-top:14px;display:none">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
                    <div style="font-size:10px;font-family:monospace;color:#5a6480;letter-spacing:1px">▌ LOG DE DIAGNÓSTICO</div>
                    <button onclick="document.getElementById('olt-log-content').innerHTML='';oltLogs.length=0" style="background:#1a1f2e;border:1px solid #252b3b;color:#5a6480;font-size:10px;padding:2px 10px;cursor:pointer;border-radius:2px;font-family:monospace">limpar</button>
                    <button onclick="oltCopiarLog()" style="background:#1a1f2e;border:1px solid #252b3b;color:#5a6480;font-size:10px;padding:2px 10px;cursor:pointer;border-radius:2px;font-family:monospace">copiar log</button>
                </div>
                <div id="olt-log-content" style="background:#080b10;border:1px solid #1a1f2e;border-radius:3px;padding:8px 12px;height:160px;overflow-y:auto;font-family:monospace"></div>
            </div>
        </div>
    `;
    document.body.appendChild(panel);

    // Botão flutuante
    const fab = document.createElement('button');
    fab.id = 'olt-fab';
    fab.title = 'Abrir Monitor OLT';
    fab.textContent = '📡';
    document.body.appendChild(fab);

    // ─────────────────────────────────────────────
    // TOGGLE PAINEL
    // ─────────────────────────────────────────────
    fab.addEventListener('click', () => panel.classList.toggle('open'));
    document.getElementById('olt-close').addEventListener('click', () => panel.classList.remove('open'));

    // ─────────────────────────────────────────────
    // PARSING
    // ─────────────────────────────────────────────
    function parseStatus(texto) {
        const onus = {};
        for (const linha of texto.split('\n')) {
            const m = linha.match(/^\s*(\d+)\s+([0-9A-Fa-f]{8})\s+(Active|Inactive)\s+(.*)$/);
            if (!m) continue;
            const num = m[1], serial = m[2], status = m[3];
            const mMotivo = linha.match(/(DGI|LOAMI[\w+]*|LOFI[\w+]*|LOSI[\w+]*)/);
            onus[num] = { num, serial, operStatus: status, motivo: mMotivo ? mMotivo[0] : (status === 'Inactive' ? 'Inactive' : '') };
        }
        return onus;
    }

    function parseDesc(texto) {
        const descs = {};
        for (const linha of texto.split('\n')) {
            const m = linha.match(/gpon\s+\d+\s+onu\s+(\d+)\s+(.+)/i);
            if (!m) continue;
            const num = m[1], descricao = m[2].trim();
            const mContrato = descricao.match(/_(\d{4})/);
            const contrato = mContrato ? mContrato[1] : null;
            const nome = descricao.replace(/^[^_]*_/, '').replace(/^\d+/, '').replace(/^_?/, '').trim() || descricao;
            descs[num] = { descricao, contrato, nome };
        }
        return descs;
    }

    function pillHtml(motivo) {
        if (motivo.includes('DGI')) return `<span class="pill pill-dgi">DGI</span>`;
        if (/LOAMI|LOFI|LOSI/.test(motivo)) return `<span class="pill pill-loami">${motivo}</span>`;
        return `<span class="pill pill-inact">INACTIVE</span>`;
    }

    // ─────────────────────────────────────────────
    // LOG
    // ─────────────────────────────────────────────
    const oltLogs = [];
    window.oltLogs = oltLogs;

    function oltLog(tipo, msg, obj) {
        const ts = new Date().toLocaleTimeString('pt-BR');
        const linha = `[${ts}] [${tipo}] ${msg}`;
        const entry = { tipo, linha, obj };
        oltLogs.push(entry);

        // console
        if (tipo === 'ERR') console.error(linha, obj || '');
        else if (tipo === 'WARN') console.warn(linha, obj || '');
        else console.log(linha, obj || '');

        // painel visual
        const logEl = document.getElementById('olt-log-content');
        if (!logEl) return;
        const cores = { OK: '#00c47a', INFO: '#8ba0c0', WARN: '#ffb703', ERR: '#ff4d6d' };
        const cor = cores[tipo] || '#8ba0c0';
        const div = document.createElement('div');
        div.style.cssText = `color:${cor};font-size:11px;line-height:1.5;border-bottom:1px solid #1a1f2e;padding:3px 0;`;
        div.textContent = linha;
        if (obj !== undefined) {
            try { div.textContent += ' ' + JSON.stringify(obj).substring(0, 300); } catch(e) {}
        }
        logEl.appendChild(div);
        logEl.scrollTop = logEl.scrollHeight;
    }

    // ─────────────────────────────────────────────
    // API ADA
    // ─────────────────────────────────────────────

    // Busca o IdCliente pelo número de contrato via gateway/Clientes.dataprovider.php
    function buscarIdCliente(numeroContrato) {
        return new Promise((resolve) => {
            $.ajax({
                type: 'GET',
                url: 'gateway/Clientes.dataprovider.php',
                data: {
                    sSearch: numeroContrato,
                    iDisplayStart: 0,
                    iDisplayLength: 100,
                    sEcho: 1,
                    iColumns: 6
                },
                dataType: 'json',
                success: function (json) {
                    oltLog('INFO', `[gateway] contrato buscado: "${numeroContrato}" → total retornado: ${json && json.aaData ? json.aaData.length : 0} linha(s)`);

                    if (json && json.aaData && json.aaData.length > 0) {
                        let idCliente = null, nomeAda = null, cpf = null;
                        for (const row of json.aaData) {
                            const contratoRow = String(row[0]).trim();
                            const contratoNorm = String(numeroContrato).trim();
                            const bateu = contratoRow === contratoNorm;
                            oltLog('INFO', `  linha: contrato="${contratoRow}" (${contratoRow.length} chars) vs "${contratoNorm}" (${contratoNorm.length} chars) → ${bateu ? '✓ MATCH' : '✗ não bateu'}`);
                            if (bateu) {
                                nomeAda = row[1];
                                cpf = row[2];
                                const mId = String(row[5]).match(/data-id="(\d+)"/i);
                                if (mId) {
                                    idCliente = mId[1];
                                    oltLog('OK', `[gateway] IdCliente=${idCliente} | Nome=${nomeAda}`);
                                } else {
                                    oltLog('WARN', `[gateway] contrato bateu mas data-id não encontrado no HTML: ${String(row[5]).substring(0, 150)}`);
                                }
                                break;
                            }
                        }
                        if (!idCliente && !nomeAda) {
                            const totalBanco = json.iTotalRecords || json.iTotalDisplayRecords || '?';
                            oltLog('WARN', `[gateway] nenhuma linha bateu com "${numeroContrato}" (buscou ${json.aaData.length} de ${totalBanco} total)`);
                            // mostrar onde o número apareceu nos resultados (nome, cpf, grupo?)
                            for (const row of json.aaData) {
                                const contrato = String(row[0]).trim();
                                const nome = String(row[1] || '');
                                const cpf  = String(row[2] || '');
                                const grupo = String(row[4] || '');
                                const apareceu = [nome, cpf, grupo].filter(v => v.includes(numeroContrato));
                                if (apareceu.length) {
                                    oltLog('INFO', `  falso positivo → contrato=${contrato} | "${numeroContrato}" encontrado em: ${apareceu.join(' | ')}`);
                                }
                            }
                            oltLog('WARN', `[gateway] possível causa: contrato "${numeroContrato}" não existe no Ada ou está cadastrado de forma diferente`);
                        }
                        resolve({ idCliente, nomeAda, cpf });
                    } else {
                        oltLog('WARN', `[gateway] resposta vazia ou sem aaData para contrato "${numeroContrato}"`, json);
                        resolve({ idCliente: null, nomeAda: null, cpf: null });
                    }
                },
                error: function (xhr, status, err) {
                    oltLog('ERR', `[gateway] falha HTTP: status=${status} err=${err} body=${xhr.responseText.substring(0, 200)}`);
                    resolve({ idCliente: null, nomeAda: null, cpf: null });
                }
            });
        });
    }

    // Busca endereço pelo IdCliente
    function buscarDadosCliente(idCliente) {
        return new Promise((resolve) => {
            $.ajax({
                type: 'POST',
                url: 'controller/ClienteController.php',
                data: { call: 'carregarClienteAction', IdCliente: idCliente },
                dataType: 'json',
                success: function (r) {
                    oltLog('INFO', `[cadastro] resposta para IdCliente=${idCliente}:`, r);
                    if (!r) {
                        oltLog('WARN', `[cadastro] resposta nula para IdCliente=${idCliente}`);
                        resolve({});
                        return;
                    }
                    const partes = [r.EnderecoInst, r.NumeroInst, r.BairroInst, r.CidadeInst].filter(Boolean);
                    const enderecoCompleto = partes.join(', ');
                    if (!enderecoCompleto) {
                        oltLog('WARN', `[cadastro] IdCliente=${idCliente} — EnderecoInst="${r.EnderecoInst}" NumeroInst="${r.NumeroInst}" BairroInst="${r.BairroInst}" CidadeInst="${r.CidadeInst}" → todos vazios!`);
                        oltLog('INFO', `[cadastro] todas as chaves recebidas: ${Object.keys(r).join(', ')}`);
                    } else {
                        oltLog('OK', `[cadastro] endereço montado: "${enderecoCompleto}"`);
                    }
                    resolve({
                        endereco: enderecoCompleto || '-',
                        bairro: r.BairroInst || '',
                        cidade: r.CidadeInst || '',
                        pontoRef: r.PontoRefInst || '',
                        grupo: r.GrupoAutenticacao || '',
                        bloqueado: r.GrupoAutenticacao && r.GrupoAutenticacao.toUpperCase().includes('BLOQUEADO')
                    });
                },
                error: function (xhr, status, err) {
                    oltLog('ERR', `[cadastro] falha HTTP para IdCliente=${idCliente}: status=${status} err=${err} body=${xhr.responseText.substring(0, 200)}`);
                    resolve({});
                }
            });
        });
    }

    // ─────────────────────────────────────────────
    // RENDER TABELA
    // ─────────────────────────────────────────────
    let resultados = [];

    function renderTabela() {
        const area = document.getElementById('olt-result-area');
        if (resultados.length === 0) {
            area.innerHTML = `<div class="olt-empty">✅ Nenhuma ONU inativa encontrada.</div>`;
            return;
        }

        const rows = resultados.map((r, i) => `
            <tr id="olt-row-${i}">
                <td class="td-onu">ONU ${r.num}</td>
                <td>${pillHtml(r.motivo)}</td>
                <td class="td-contrato">${r.contrato || '—'}</td>
                <td class="td-nome">${r.nomeAda || r.nome || '—'}</td>
                <td class="td-end td-loading" id="olt-end-${i}">buscando...</td>
                <td>
                    ${r.contrato ? `<button class="copy-btn" onclick="oltCopiar('${r.contrato}',this)">${r.contrato}</button>` : '—'}
                </td>
            </tr>
        `).join('');

        area.innerHTML = `
            <div class="olt-results-header">
                <div class="olt-results-title">▌ ONUs INATIVAS</div>
                <div class="olt-badge">${resultados.length} clientes</div>
                <div style="display:flex;gap:6px;margin-left:auto">
                    <button class="olt-btn-export" onclick="oltExportarCSV()">⬇ CSV</button>
                    <button class="olt-btn-export" onclick="oltExportarPDF()" style="color:#ffb703;border-color:#ffb703">⬇ PDF</button>
                </div>
            </div>
            <div style="background:#13161e;border:1px solid #252b3b;border-radius:3px;overflow:auto">
                <table class="olt-table">
                    <thead><tr>
                        <th>ONU</th><th>STATUS</th><th>CONTRATO</th>
                        <th>NOME</th><th>ENDEREÇO</th><th></th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    }

    function atualizarLinha(i, dados) {
        const endEl = document.getElementById(`olt-end-${i}`);
        if (endEl) {
            if (dados.endereco && dados.endereco !== '-') {
                const bloq = dados.bloqueado ? ' style="border-left:3px solid #ff4d6d;padding-left:6px"' : '';
                const ref = dados.pontoRef ? `<br><small style="color:#3a4565">Ref: ${dados.pontoRef}</small>` : '';
                endEl.className = 'td-end td-ok';
                endEl.innerHTML = `<span${bloq}>${dados.endereco}${ref}</span>`;
                resultados[i].enderecoFinal = dados.endereco;
                resultados[i].bairroFinal = dados.bairro || '';
                resultados[i].pontoRef = dados.pontoRef;
            } else {
                endEl.className = 'td-end td-erro';
                endEl.textContent = 'não encontrado';
            }
        }
    }

    // ─────────────────────────────────────────────
    // PROCESSAR
    // ─────────────────────────────────────────────
    document.getElementById('olt-processar').addEventListener('click', async () => {
        const textoStatus = document.getElementById('olt-status').value.trim();
        const textoDesc = document.getElementById('olt-desc').value.trim();

        if (!textoStatus || !textoDesc) {
            mostrarAlerta('Cole os dois outputs do PuTTY antes de processar.');
            return;
        }
        esconderAlerta();
        document.getElementById('olt-log-panel').style.display = 'block'; // já existe no DOM fixo

        const statusMap = parseStatus(textoStatus);
        const descMap = parseDesc(textoDesc);

        const inativos = Object.values(statusMap).filter(o => o.operStatus === 'Inactive');
        const ativos = Object.values(statusMap).filter(o => o.operStatus === 'Active');

        document.getElementById('olt-cnt-inativos').textContent = `${inativos.length} inativos`;
        document.getElementById('olt-cnt-ativos').textContent = `${ativos.length} ativos`;
        document.getElementById('olt-stats').style.display = 'flex';

        resultados = inativos.map(onu => {
            const desc = descMap[onu.num] || {};
            return { ...onu, ...(desc), nomeAda: null, enderecoFinal: '', bairroFinal: '', pontoRef: '' };
        });

        renderTabela();

        if (resultados.length === 0) return;

        // Buscar dados no Ada com progresso
        const progEl = document.getElementById('olt-progress');
        const progTxt = document.getElementById('olt-progress-txt');
        const progFill = document.getElementById('olt-progress-fill');
        progEl.style.display = 'block';

        const btn = document.getElementById('olt-processar');
        btn.disabled = true;

        for (let i = 0; i < resultados.length; i++) {
            const r = resultados[i];
            const pct = Math.round(((i + 1) / resultados.length) * 100);
            progTxt.textContent = `Buscando no Ada: contrato ${r.contrato || '—'} (${i + 1}/${resultados.length})`;
            progFill.style.width = pct + '%';

            if (!r.contrato) {
                atualizarLinha(i, {});
                continue;
            }

            try {
                const { idCliente, nomeAda } = await buscarIdCliente(r.contrato);
                if (nomeAda) resultados[i].nomeAda = nomeAda;

                // atualizar nome na tabela
                const nomeEl = document.querySelector(`#olt-row-${i} .td-nome`);
                if (nomeEl && nomeAda) nomeEl.textContent = nomeAda;

                if (idCliente) {
                    resultados[i].idCliente = idCliente;
                    const dados = await buscarDadosCliente(idCliente);
                    atualizarLinha(i, dados);
                } else {
                    atualizarLinha(i, { endereco: 'contrato não encontrado' });
                }
            } catch (e) {
                atualizarLinha(i, { endereco: 'erro' });
            }

            // pequena pausa pra não sobrecarregar
            await new Promise(res => setTimeout(res, 150));
        }

        progTxt.textContent = '✓ Concluído!';
        setTimeout(() => { progEl.style.display = 'none'; }, 2000);
        btn.disabled = false;
    });

    // ─────────────────────────────────────────────
    // LIMPAR
    // ─────────────────────────────────────────────
    document.getElementById('olt-limpar').addEventListener('click', () => {
        document.getElementById('olt-status').value = '';
        document.getElementById('olt-desc').value = '';
        document.getElementById('olt-stats').style.display = 'none';
        document.getElementById('olt-progress').style.display = 'none';
        document.getElementById('olt-log-panel').style.display = 'none';
        document.getElementById('olt-log-content').innerHTML = '';
        oltLogs.length = 0;
        document.getElementById('olt-result-area').innerHTML = `<div class="olt-empty">📡 Cole os dados do PuTTY e clique em PROCESSAR</div>`;
        resultados = [];
        esconderAlerta();
    });

    // ─────────────────────────────────────────────
    // EXPORTAR PDF
    // ─────────────────────────────────────────────
    window.oltExportarPDF = function () {
        if (resultados.length === 0) return;

        const data = new Date().toLocaleDateString('pt-BR');
        const hora = new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});

        const linhas = resultados.map((r, i) => {
            const status = r.motivo || 'Inactive';
            const contrato = r.contrato || '—';
            const nome = r.nomeAda || r.nome || '—';
            const end = r.enderecoFinal || '—';
            const bairro = r.bairroFinal || '';
            const ref = r.pontoRef || '';
            const endCompleto = [end, bairro].filter(Boolean).join(' — ');
            const refLinha = ref ? `<div style="font-size:11px;color:#888;margin-top:2px">Ref: ${ref}</div>` : '';
            const statusCor = status.includes('DGI') ? '#c0392b' : '#e67e22';
            return `
                <tr style="background:${i % 2 === 0 ? '#fff' : '#f9f9f9'};">
                    <td style="padding:10px 12px;border-bottom:1px solid #eee;font-family:monospace;font-size:12px;color:#666;white-space:nowrap">ONU ${r.num}</td>
                    <td style="padding:10px 12px;border-bottom:1px solid #eee;white-space:nowrap">
                        <span style="background:${statusCor};color:#fff;font-size:10px;padding:2px 7px;border-radius:3px;font-family:monospace">${status}</span>
                    </td>
                    <td style="padding:10px 12px;border-bottom:1px solid #eee;font-weight:700;color:#1a6b3a;font-size:15px;white-space:nowrap">${contrato}</td>
                    <td style="padding:10px 12px;border-bottom:1px solid #eee;font-weight:600;color:#222">${nome}</td>
                    <td style="padding:10px 12px;border-bottom:1px solid #eee;color:#444">
                        ${endCompleto}
                        ${refLinha}
                    </td>
                </tr>`;
        }).join('');

        const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>ONUs Inativas — ${data}</title>
<style>
    @page { size: A4 landscape; margin: 12mm; }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background:#fff; color:#222; padding:32px; }
    @media print { body { padding: 0; } .no-print { display:none !important; } }
    .fab-print {
        position: fixed; bottom: 24px; right: 24px; z-index: 9999;
        display: flex; gap: 8px;
    }
    .fab-print button {
        background: #1a6b3a; color: #fff; border: none; padding: 12px 24px;
        font-size: 14px; font-family: sans-serif; font-weight: 600;
        cursor: pointer; border-radius: 6px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.25);
        transition: background 0.15s;
    }
    .fab-print button:hover { background: #22893d; }
</style>
</head>
<body>
<div class="no-print fab-print">
    <button onclick="window.print()">Salvar PDF / Imprimir</button>
</div>
<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:28px;padding-bottom:16px;border-bottom:3px solid #1a6b3a">
    <div>
        <div style="font-size:11px;color:#888;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">Relatório de Campo</div>
        <h1 style="font-size:22px;color:#1a6b3a;font-weight:700">ONUs Inativas — Intervenção Necessária</h1>
    </div>
    <div style="text-align:right;font-size:12px;color:#888;line-height:1.6">
        <div>Gerado em ${data} às ${hora}</div>
        <div style="margin-top:4px"><strong style="color:#c0392b">${resultados.length} cliente${resultados.length !== 1 ? 's' : ''}</strong> sem sinal</div>
    </div>
</div>

<table style="width:100%;border-collapse:collapse">
    <thead>
        <tr style="background:#1a6b3a;color:#fff">
            <th style="padding:10px 12px;text-align:left;font-size:11px;letter-spacing:1px;font-weight:600;white-space:nowrap">ONU</th>
            <th style="padding:10px 12px;text-align:left;font-size:11px;letter-spacing:1px;font-weight:600">STATUS</th>
            <th style="padding:10px 12px;text-align:left;font-size:11px;letter-spacing:1px;font-weight:600">CONTRATO</th>
            <th style="padding:10px 12px;text-align:left;font-size:11px;letter-spacing:1px;font-weight:600">NOME</th>
            <th style="padding:10px 12px;text-align:left;font-size:11px;letter-spacing:1px;font-weight:600">ENDEREÇO</th>
        </tr>
    </thead>
    <tbody>${linhas}</tbody>
</table>

<div style="margin-top:24px;padding-top:16px;border-top:1px solid #eee;font-size:11px;color:#aaa;display:flex;justify-content:space-between">
    <span>OLT Monitor — ISP Field Tool</span>
    <span>${resultados.filter(r=>r.motivo && r.motivo.includes('DGI')).length} DGI · ${resultados.filter(r=>r.motivo && (r.motivo.includes('LOAMI') || r.motivo.includes('LOFI'))).length} LOAMI/LOFI</span>
</div>

</body>
</html>`;

        const popup = window.open('', '_blank');
        popup.document.write(html);
        popup.document.close();
    };

    window.oltExportarCSV = function () {
        if (resultados.length === 0) return;
        const header = ['ONU', 'Serial', 'Status', 'Contrato', 'Nome', 'Endereço', 'Bairro', 'Referência'];
        const rows = resultados.map(r => [
            `ONU ${r.num}`, r.serial, r.motivo,
            r.contrato || '',
            r.nomeAda || r.nome || '',
            r.enderecoFinal || '',
            r.bairroFinal || '',
            r.pontoRef || ''
        ]);
        const csv = [header, ...rows].map(row => row.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `onus_inativas_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
    };

    // ─────────────────────────────────────────────
    // COPIAR CONTRATO
    // ─────────────────────────────────────────────
    // Cópia compatível com HTTP (navigator.clipboard só funciona em HTTPS)
    function copiarTexto(texto) {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(texto).catch(() => copiarLegado(texto));
            } else {
                copiarLegado(texto);
            }
        } catch(e) { copiarLegado(texto); }
    }
    function copiarLegado(texto) {
        const el = document.createElement('textarea');
        el.value = texto;
        el.style.cssText = 'position:fixed;top:-9999px;left:-9999px';
        document.body.appendChild(el);
        el.focus();
        el.select();
        try { document.execCommand('copy'); } catch(e) {}
        document.body.removeChild(el);
    }

    window.oltCopiarLog = function () {
        const txt = (window.oltLogs || []).map(l => l.linha).join('\n');
        copiarTexto(txt);
        const btn = document.querySelector('[onclick="oltCopiarLog()"]');
        if (btn) { const o = btn.textContent; btn.textContent = '✓ copiado'; setTimeout(() => btn.textContent = o, 1500); }
    };

    window.oltCopiar = function (texto, btn) {
        copiarTexto(texto);
        if (btn) {
            const orig = btn.textContent;
            btn.textContent = '✓ copiado';
            btn.classList.add('ok');
            setTimeout(() => { btn.textContent = orig; btn.classList.remove('ok'); }, 1600);
        }
    };

    // ─────────────────────────────────────────────
    // UTILITÁRIOS
    // ─────────────────────────────────────────────
    function mostrarAlerta(msg) {
        const el = document.getElementById('olt-alert');
        el.textContent = '⚠ ' + msg;
        el.style.display = 'block';
    }
    function esconderAlerta() {
        document.getElementById('olt-alert').style.display = 'none';
    }

})();
