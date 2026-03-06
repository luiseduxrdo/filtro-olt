# Filtro OLT - Progresso do Projeto

## Situacao Atual

Status geral: versao web funcional e validada em ambiente hospedado.

Fluxo atualmente aprovado:
- painel em `index.html` hospedado no GitHub Pages ou Vercel
- proxy local em `servidor.ps1`
- busca no Ada funcionando
- exportacao CSV funcionando
- exportacao PDF funcionando

## Estrutura Definitiva

| Arquivo | Descricao | Status |
|---|---|---|
| `index.html` | Painel web principal | Ativo |
| `servidor.ps1` | Proxy local oficial em PowerShell | Ativo |
| `CODEX.md` | Documentacao tecnica do projeto | Atualizado |

## Funcionalidades Confirmadas

- [x] Colar outputs do PuTTY
- [x] Filtrar ONUs inativas
- [x] Extrair contrato pela descricao
- [x] Buscar contrato e nome no gateway do Ada
- [x] Buscar endereco completo no cadastro do Ada
- [x] Exibir log de diagnostico
- [x] Exportar CSV
- [x] Exportar PDF
- [x] Configurar URL do proxy
- [x] Testar conexao com o proxy
- [x] Rodar com painel hospedado e proxy local

## Problemas Resolvidos

| Problema | Solucao |
|---|---|
| CORS ao usar painel hospedado | Proxy local na porta 8080 |
| Dependencia de Node.js | Proxy reescrito em PowerShell |
| `navigator.clipboard` indisponivel em alguns contextos HTTP | Fallback com `document.execCommand('copy')` |
| `sSearch_0` ignorado pelo DataTables legado | Uso de `sSearch` global com limite alto |
| Regex do contrato nao capturava prefixos | Ajuste para `/_(\\d{4})/` |
| GitHub Pages usava a URL do site como proxy | Painel passou a assumir `http://localhost:8080` fora de localhost |
| Proxy PowerShell caia na tela de login do Ada | Proxy deixou de seguir redirect automatico e passou a reaproveitar o corpo da resposta do Ada |

## Proximos Passos

- [ ] Exportacao como imagem
- [ ] Painel unificado com outras ferramentas do ISP

## Observacao

Arquivos legados do proxy Node.js e do iniciador `.bat` foram removidos do projeto. O caminho oficial agora e somente `index.html` + `servidor.ps1`.
