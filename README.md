# Filtro Clientes ADA

Painel web interno para operacao de ISP. Centraliza cinco fluxos de trabalho: identificacao de ONUs inativas via OLT, consulta de enderecos por lista de contratos PPPoE, busca de clientes por telefone, busca por endereco e consulta de ficha completa do cliente.

## Arquitetura

- `index.html` — painel web estatico, roda no navegador
- `servidor.ps1` — proxy local em PowerShell na porta `8080`

O painel e hospedado (GitHub Pages, Vercel ou servidor local com `python -m http.server 3000`). O proxy roda na maquina do operador e faz a ponte com o Ada, que so e acessivel pela rede interna.

## Modos de Operacao

### Modo OLT / PuTTY

Identifica clientes sem sinal apos incidentes de rede.

Fluxo:
1. Colar output de `onu status gpon X` no campo STATUS
2. Colar output de `onu description show gpon X` no campo DESCRIPTION
3. Clicar em PROCESSAR
4. O painel cruza os dois outputs, filtra ONUs inativas e busca contrato, nome e endereco no Ada

### Modo Lista PPPoE

Consulta enderecos de uma lista de contratos conhecidos.

Fluxo:
1. Colar contratos no campo (um por linha, aceita numeros puros ou formato `PPPoE_2939nome`)
2. Clicar em PROCESSAR
3. O painel busca nome e endereco de cada contrato no Ada

### Modo Busca por Telefone

Localiza um cliente pelo numero de telefone (ou parte dele).

Fluxo:
1. Digitar ao menos 4 digitos no campo de telefone
2. Clicar em BUSCAR (ou pressionar Enter)
3. O painel faz uma varredura em duas fases:
   - **Fase 1** — coleta todos os IDs de clientes cadastrados no Ada (paginado, 200 por vez)
   - **Fase 2** — busca o cadastro completo de cada cliente em paralelo (8 requisicoes simultaneas) e filtra quem tem aquela sequencia em `TelefonePrincipal` ou `TelefoneAlternativo`
4. Resultados aparecem na tela conforme sao encontrados, com telefone e endereco
5. O botao vira PARAR durante a varredura — clicar cancela

> A busca por telefone nao usa o `sSearch` do Ada (que so indexa Nome e CPF). Ela acessa o cadastro individual de cada cliente, o mesmo endpoint usado para buscar o endereco nos outros modos.

### Modo Busca por Endereco

Localiza clientes por qualquer parte do endereco registrado: logradouro, numero, bairro, cidade, ponto de referencia ou CEP.

Fluxo:
1. Digitar ao menos 2 caracteres no campo (ex: `Casa Azul`, `Centro`, `69000-000`)
2. Clicar em BUSCAR (ou pressionar Enter)
3. O painel faz uma varredura identica a busca por telefone:
   - **Fase 1** — coleta todos os IDs de clientes cadastrados no Ada
   - **Fase 2** — busca o cadastro completo de cada cliente em paralelo e filtra quem tem o termo em qualquer campo de endereco
4. Resultados aparecem ao vivo com endereco, referencia e CEP
5. O botao vira PARAR durante a varredura — clicar cancela

Campos verificados na comparacao: `EnderecoInst`, `NumeroInst`, `BairroInst`, `CidadeInst`, `PontoRefInst`, `CepInst`. A busca e parcial e case-insensitive.

### Ficha do Cliente

Exibe todos os dados cadastrais de um cliente a partir do numero de contrato.

Fluxo:
1. Digitar o numero do contrato no campo
2. Clicar em BUSCAR (ou pressionar Enter)
3. O painel faz duas chamadas em sequencia:
   - `/clientes?sSearch=contrato` — localiza o `IdCliente`, nome e CPF
   - `/cadastro` com o `IdCliente` — traz o cadastro completo
4. Os dados sao exibidos em uma ficha organizada por secoes

Secoes da ficha:
- **Cabecalho** — nome, contrato, ID e badge de status (ATIVO / BLOQUEADO)
- **Identificacao** — contrato, CPF, ID Cliente
- **Acesso** — grupo de autenticacao, status
- **Endereco** — logradouro, bairro, cidade, CEP, referencia
- **Contato** — telefone principal, telefone alternativo
- **Outros dados do sistema** — todos os demais campos retornados pela API, exibidos dinamicamente

## Infraestrutura

### OLT
- Equipamento: Intelbras OLT
- Comandos: `onu status gpon X` e `onu description show gpon X`

### Ada
- Sistema legado PHP
- URL interna: `http://192.168.111.245/ISP/AdaProvider/`
- Sem acesso ao codigo-fonte
- Acesso apenas pela rede interna / VPN

## Endpoints do Proxy

| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/health` | Verifica se o proxy esta ativo |
| GET | `/clientes?sSearch=X&iDisplayStart=0&iDisplayLength=100` | Lista clientes via DataTables do Ada |
| POST | `/cadastro` | Carrega cadastro completo de um cliente por `IdCliente` |

O `/clientes` repassa `sSearch`, `iDisplayStart` e `iDisplayLength` para `gateway/Clientes.dataprovider.php`. O `/cadastro` repassa o body para `controller/ClienteController.php` com `call=carregarClienteAction`.

## Estrutura de Dados

Objeto interno por cliente:

```js
{
  num: "1",
  serial: "5B1AAE32",       // OLT apenas
  operStatus: "Inactive",   // OLT apenas
  motivo: "DGI",            // OLT apenas
  descricao: "ONU_6692manoel",
  contrato: "6692",
  nome: "manoel",
  nomeAda: "MANOEL CARLOS LEITE PESSOA - FTTH",
  idCliente: "5688",
  telefonePrincipal: "(81) 9357-2190",   // telefone e ficha apenas
  telefoneAlternativo: "",               // telefone e ficha apenas
  enderecoFinal: "LOT NSA SRA CARMO, PROJETO",
  bairroFinal: "PROJETO",
  pontoRef: "VIZINHO CASA NANDO",
  cep: "69000-000"                       // endereco e ficha apenas
}
```

## Regras de Negocio

### Descricao da ONU (modo OLT)

Padrao esperado: `PREFIXO_1234nome`

Exemplos:
```
ONU_6692manoel
PPPoE_2939antonio
CMDT_7537cicera
```

Regex de extracao do contrato: `/_(\d{4})/`

### Busca por telefone

- Stripa caracteres nao numericos antes de comparar (tanto na busca quanto nos campos do Ada)
- Compara com `String.includes()` — busca parcial em qualquer posicao
- Minimo de 4 digitos para evitar varredura com termo muito generico
- Concorrencia de 8 requisicoes simultaneas ao `/cadastro`

### Busca por endereco

- Concatena `EnderecoInst`, `NumeroInst`, `BairroInst`, `CidadeInst`, `PontoRefInst` e `CepInst` em uma string unica para comparacao
- Compara com `String.includes()` apos `.toLowerCase()` — busca parcial e case-insensitive
- Minimo de 2 caracteres
- Concorrencia de 8 requisicoes simultaneas ao `/cadastro`

### Status considerados inativos (modo OLT)

- `Inactive`
- Motivos tipicos: `DGI`, `LOAMI`, `LOFI`, `LOSI`

## Exportacao

Os modos OLT, PPPoE, Telefone e Endereco suportam:
- **CSV** — exporta os dados da tabela atual (inclui coluna CEP)
- **IMG** — gera PNG com layout de relatorio de campo
- **PDF** — abre janela com HTML formatado para impressao / salvar como PDF
- **Copiar contratos** — copia todos os numeros de contrato para a area de transferencia

O modo Ficha do Cliente nao tem exportacao — e uma consulta pontual de cadastro.

## Inicializacao

```powershell
# Iniciar o proxy (deixar janela aberta)
powershell -ExecutionPolicy Bypass -File servidor.ps1

# Servir o painel localmente (opcional)
python -m http.server 3000
```

Ou via comando de onboarding disponivel no proprio painel (botao "Como usar").

## Decisoes de Design

- Sem dependencia de Node.js, npm ou extensoes de navegador
- Proxy em PowerShell nativo usa `System.Net.HttpListener` e `HttpWebRequest`
- Proxy desabilita proxy do Windows (`$req.Proxy = $null`) para falar direto com o Ada
- Proxy nao segue redirects automaticamente (`AllowAutoRedirect = $false`) — o Ada retorna JSON util no corpo do `302`
- PDF gerado via `window.print()` em popup HTML, sem bibliotecas externas
- Imagem gerada via Canvas API no browser
- Comparacao de contrato no modo OLT e PPPoE e exata (campo `row[0]` do DataTables)
- Busca por telefone e parcial e case-insensitive por natureza (so digits)
- Busca por endereco concatena todos os campos de endereco e compara a string inteira — nao requer preenchimento completo
- Ficha do cliente exibe campos conhecidos em secoes fixas mais todos os campos extras retornados pela API dinamicamente, sem necessidade de mapear cada campo individualmente
