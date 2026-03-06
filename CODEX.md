# Filtro OLT - ISP Field Tool

## Estado Atual

Projeto web definitivo para operacao interna de ISP.

Arquitetura atual:
- `index.html`: painel web estatico para uso no navegador
- `servidor.ps1`: proxy local em PowerShell na porta `8080`

Fluxo validado:
1. Abrir o painel hospedado no GitHub Pages ou Vercel
2. Iniciar o proxy local com PowerShell
3. Colar os outputs de `onu status gpon X` e `onu description show gpon X`
4. Processar os dados
5. Buscar contrato, nome e endereco no Ada
6. Exportar CSV ou PDF para a equipe de campo

## Objetivo

Automatizar a identificacao de clientes sem sinal apos incidentes de rede, principalmente quando ha rompimento de drops de fibra ou outras ocorrencias de campo.

Antes da ferramenta, o processo era manual:
1. Tirar output da OLT no PuTTY
2. Cruzar status e descricao manualmente
3. Abrir o Ada contrato por contrato
4. Montar a lista manual para a equipe externa

Hoje o painel faz esse fluxo quase inteiro.

## Infraestrutura

### OLT
- Equipamento: Intelbras OLT
- Comandos usados:
  - `onu status gpon X`
  - `onu description show gpon X`

### Ada
- Sistema legado PHP
- URL interna: `http://192.168.111.245/ISP/AdaProvider/`
- Acesso apenas pela rede interna
- Sem acesso ao codigo-fonte do Ada

Endpoints usados:
- `GET gateway/Clientes.dataprovider.php`
  - parametro principal: `sSearch`
  - retorna dados no formato DataTables
- `POST controller/ClienteController.php`
  - body: `call=carregarClienteAction&IdCliente=X`
  - retorna dados completos do cliente em JSON

## Arquivos do Projeto

### `index.html`
Painel web principal.

Responsabilidades:
- onboarding com comando para iniciar o proxy local
- configuracao da URL do proxy com persistencia em `localStorage`
- parse dos outputs da OLT
- filtragem de ONUs inativas
- busca no Ada via proxy local
- log de diagnostico
- exportacao CSV
- exportacao PDF

Observacoes importantes:
- quando o painel estiver hospedado, o proxy continua sendo local em `http://localhost:8080`
- o painel detecta resposta HTML indevida e alerta quando a URL do proxy estiver errada
- copia de texto usa fallback compativel com contexto HTTP quando necessario

### `servidor.ps1`
Proxy local oficial do projeto.

Responsabilidades:
- expor `GET /health`
- expor `GET /clientes`
- expor `POST /cadastro`
- fazer a ponte entre o navegador e o Ada
- liberar CORS para o painel hospedado

Observacoes importantes:
- usa PowerShell nativo, sem Node.js nem npm
- desabilita proxy do Windows para falar direto com o Ada
- nao segue automaticamente o redirect do Ada, porque o sistema devolve JSON util no corpo da resposta `302`

## Regras de Negocio

### Descricao da ONU
Padrao esperado: `PREFIXO_1234nome`

Exemplos:
```text
ONU_6692manoel
PPPoE_2939antonio
CMDT_7537cicera
```

Regex de contrato:
```js
/_(\d{4})/
```

### Status considerados
- `Inactive`
- motivos tipicos: `DGI`, `LOAMI`, `LOFI`, `LOSI`

## Estrutura de Dados

Exemplo de objeto interno:

```js
{
  num: "1",
  serial: "5B1AAE32",
  operStatus: "Inactive",
  motivo: "DGI",
  descricao: "ONU_6692manoel",
  contrato: "6692",
  nome: "manoel",
  nomeAda: "MANOEL CARLOS LEITE PESSOA - FTTH",
  idCliente: "5688",
  enderecoFinal: "LOT NSA SRA CARMO, PROJETO",
  bairroFinal: "PROJETO",
  pontoRef: "VIZINHO CASA NANDO"
}
```

## Decisoes de Design

- solucao principal: painel web hospedado + proxy PowerShell local
- sem dependencia de Node.js
- sem dependencia de Tampermonkey
- sem alteracoes no Ada
- log de diagnostico visivel durante o processamento
- PDF gerado por HTML + `window.print()`
- comparacao de contrato feita de forma exata

## Pendencias Atuais

- exportacao como imagem
- painel unificado com outras ferramentas do ISP

## Historico Relevante

- a versao Tampermonkey foi descontinuada
- o proxy Node.js foi descontinuado
- o nome oficial da documentacao do projeto passou a ser `CODEX.md`
