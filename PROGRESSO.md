# Filtro OLT — Progresso do Projeto

## Situacao Atual

**Status geral:** Versao web funcional, pronta para deploy na Vercel.

O projeto passou de um userscript Tampermonkey para uma aplicacao web standalone com proxy PowerShell local. Nenhuma dependencia externa (Node.js, npm) e necessaria — apenas Windows 10/11 com PowerShell nativo.

---

## Arquivos do Projeto

| Arquivo | Descricao | Status |
|---|---|---|
| `index.html` | Painel web principal (interface completa) | Pronto |
| `servidor.ps1` | Proxy PowerShell local (HttpListener, porta 8080) | Pronto |
| `iniciar.bat` | Script de inicializacao local (usa Node.js, versao legada) | Legado |
| `olt-proxy/proxy.js` | Proxy Node.js (versao legada) | Legado |
| `CLAUDE.md` | Documentacao tecnica para IA/desenvolvimento | Atualizado |

---

## Funcionalidades Implementadas

- [x] Colar outputs do PuTTY (onu status + onu description)
- [x] Filtragem automatica de ONUs inativas (DGI, LOAMI, LOFI, LOSI)
- [x] Busca automatica no Ada (contrato, nome, endereco, bairro, referencia)
- [x] Exportacao CSV
- [x] Exportacao PDF (via HTML + window.print)
- [x] Botao copiar contrato (com fallback para HTTP)
- [x] Log de diagnostico visivel durante processamento
- [x] Tela de onboarding com tutorial de 3 passos
- [x] Proxy PowerShell puro (zero dependencias)
- [x] Comando copiavel para iniciar o servidor (irm | iex — sem bloqueio do Smart App Control)
- [x] Configuracao de proxy URL com persistencia em localStorage
- [x] Botao "Testar conexao" com indicador visual
- [x] Botao "Como usar" no header para reabrir o tutorial

## Pendente / Backlog

- [ ] Exportacao como imagem (alem de CSV e PDF)
- [ ] Painel unificado com outras ferramentas do ISP (QR WiFi, conferencia de pagamento)
- [ ] Remover arquivos legados (iniciar.bat, olt-proxy/) quando proxy PowerShell estiver validado em producao

---

## Historico de Evolucao

### Fase 1 — Userscript Tampermonkey
- Script rodava dentro do Ada via Tampermonkey
- Sem necessidade de proxy (mesmo dominio)
- Botao flutuante no canto inferior esquerdo
- **Removido** — substituido pela versao web

### Fase 2 — Versao Web + Proxy Node.js
- `painel-olt.html` como pagina standalone
- Proxy Node.js (`olt-proxy/proxy.js`) com Express na porta 8080
- Dependia de Node.js + npm install
- `iniciar.bat` para facilitar a execucao

### Fase 3 — Proxy PowerShell + Onboarding (atual)
- Proxy reescrito em PowerShell puro (`servidor.ps1`)
- Zero dependencias externas
- Tela de onboarding com tutorial integrado
- Comando `irm | iex` para iniciar o servidor sem baixar arquivos
- Contorna o bloqueio do Smart App Control do Windows 11
- Deploy via Vercel (index.html estatico)

---

## Problemas Resolvidos

| Problema | Solucao |
|---|---|
| CORS ao acessar Ada de outro dominio | Proxy local na porta 8080 |
| Node.js como dependencia obrigatoria | Proxy reescrito em PowerShell nativo |
| Smart App Control bloqueando .bat baixado | Comando `irm \| iex` executa em memoria |
| `navigator.clipboard` nao funciona em HTTP | Fallback via `document.execCommand('copy')` |
| `sSearch_0` ignorado pelo DataTables legado | Revertido para `sSearch` global com limite alto |
| Regex do contrato nao capturava prefixos | Corrigido para `/_(\d{4})/` |
| 404 no GitHub Pages / Vercel | Renomeado `painel-olt.html` para `index.html` |

---

## Deploy

**Vercel / GitHub Pages:**
- Repositorio: `https://github.com/luiseduxrdo/filtro-olt`
- Branch: `master`
- Arquivo raiz: `index.html`

**Servidor local (usuario final):**
```
powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/luiseduxrdo/filtro-olt/master/servidor.ps1 | iex"
```
