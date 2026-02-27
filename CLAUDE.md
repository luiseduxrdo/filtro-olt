# OLT Monitor — ISP Field Tool

## Contexto do Projeto

Ferramenta criada para um provedor de internet (ISP) localizado em Pernambuco. O objetivo é **automatizar o processo de identificação de clientes sem sinal** após eventos externos (ex: troca de postes pela concessionária de energia quebrando cabos drop de fibra óptica).

### Fluxo manual original (o que existia antes)

1. Abrir PuTTY → login na OLT Intelbras → comando `onu status gpon X` → copiar output
2. Comando `onu description show gpon X` → copiar output
3. Cruzar manualmente os dois outputs para identificar ONUs inativas
4. Entrar no sistema Ada (legado PHP) contrato por contrato para buscar nome e endereço
5. Montar planilha manualmente para enviar à equipe de campo

### Fluxo automatizado atual

1. Abrir painel → colar os dois outputs do PuTTY → clicar PROCESSAR
2. O sistema filtra os inativos, cruza os dados e busca automaticamente nome + endereço no Ada
3. Exportar CSV ou PDF para a equipe

---

## Infraestrutura

### OLT
- **Equipamento:** Intelbras OLT
- **Acesso:** PuTTY → SSH/Telnet
- **Comandos usados:**
  - `onu status gpon X` — retorna status de todas as ONUs de uma GPON
  - `onu description show gpon X` — retorna descrição/nome de cada ONU

### Sistema Ada (CRM legado)
- **Tecnologia:** PHP legado (sistema "AdaProvider")
- **URL interna:** `http://192.168.111.245/ISP/AdaProvider/`
- **Acesso:** somente pela rede interna, HTTP (sem HTTPS)
- **Sem acesso ao código-fonte** — não é possível editar nada no Ada
- **Endpoints relevantes:**
  - `GET gateway/Clientes.dataprovider.php` — busca clientes (DataTables server-side)
    - Parâmetro: `sSearch` (busca global em todos os campos)
    - Retorna: `{ aaData: [[contrato, nome, cpf, plano, grupo, html_acoes], ...], iTotalRecords, ... }`
    - O `IdCliente` real é extraído do HTML da última coluna via regex: `data-id="(\d+)"`
  - `POST controller/ClienteController.php` — dados completos do cliente
    - Parâmetro: `call=carregarClienteAction&IdCliente=X`
    - Retorna JSON com campos: `EnderecoInst`, `NumeroInst`, `BairroInst`, `CidadeInst`, `PontoRefInst`, `GrupoAutenticacao`, `TelefonePrincipal`, `TelefoneAlternativo`, etc.

### Formato das descrições de ONU
As descrições seguem o padrão `PREFIXO_NNNNnome`, onde:
- `PREFIXO` pode ser: `ONU`, `PPPoE`, `CMDT`, `ONTZTE`, `ONT`, `6666`, etc.
- `NNNN` são **sempre 4 dígitos** — esse é o número do contrato no Ada
- `nome` é o primeiro nome do cliente (sem espaços, minúsculas geralmente)

**Exemplos:**
```
ONU_6692manoel     → contrato 6692, cliente Manoel
PPPoE_2939antonio  → contrato 2939, cliente Antonio
CMDT_7537cicera    → contrato 7537, cliente Cicera
```

**Regex para extrair o contrato:** `/_(\d{4})/`

---

## Arquivos do Projeto

### `OLT_Ada_Panel.user.js` — Userscript Tampermonkey (versão atual em produção)
Script que roda **dentro do Ada** via Tampermonkey. Como está no mesmo domínio, não há problemas de CORS.

**Funcionalidades:**
- Botão 📡 flutuante no **canto inferior esquerdo** (direito está ocupado por outra extensão)
- Painel flutuante com dois textareas para colar os outputs do PuTTY
- Filtragem automática de ONUs inativas (status: `Inactive`, motivos: `DGI`, `LOAMI`, `LOFI`, `LOSI`, podem haver outros)
- Busca automática no Ada contrato por contrato
- Tabela de resultados com: ONU, Status, Contrato, Nome, Endereço + Bairro, Referência
- Exportação CSV (com colunas: ONU, Serial, Status, Contrato, Nome, Endereço, Bairro, Referência)
- Exportação PDF (abre HTML formatado → usuário usa Ctrl+P → Salvar como PDF)
- Botão copiar contrato (compatível com HTTP — usa `document.execCommand` como fallback)
- Painel de log de diagnóstico (visível durante o processamento)

**Observações importantes:**
- O Ada roda em HTTP puro — `navigator.clipboard` não funciona. Usar sempre `copiarTexto()` que tem fallback via `document.execCommand('copy')`
- A busca usa `sSearch` global (não `sSearch_0`) pois essa versão do DataTables não suporta filtro por coluna via parâmetro
- O limite é `iDisplayLength: 100` para garantir que o contrato apareça no resultado mesmo com muitos falsos positivos
- A comparação de contrato é exata: `String(row[0]).trim() === String(numeroContrato).trim()`

### `olt-proxy.php` — Proxy PHP (alternativa, se Ada estiver acessível no mesmo servidor)
> **Não usar** — não é possível colocar arquivos no servidor do Ada.

### `olt-proxy/proxy.js` — Proxy Node.js local (para versão web)
Proxy que roda em uma máquina da rede interna. Resolve o problema de CORS quando o painel estiver hospedado externamente (ex: Vercel).

- Porta padrão: `8080`
- Rota health check: `GET /health`
- Rota clientes: `GET /?_endpoint=clientes&sSearch=...`
- Rota cadastro: `POST /?_endpoint=cadastro` (body: `call=carregarClienteAction&IdCliente=X`)
- Gerenciamento de processo: PM2 (`pm2 start proxy.js --name olt-proxy`)

### `painel-olt.html` — Versão webpage (em desenvolvimento)
Versão standalone do painel para hospedar na Vercel. Em construção — parou no meio da geração.
**TODO:** Concluir esta versão com proxy URL configurável na interface.

---

## Backlog / Próximas Tarefas

### Em aberto
- [ ] **Concluir `painel-olt.html`** — versão webpage para Vercel + proxy Node.js local
  - Campo na interface para configurar URL do proxy local
  - Botão "Testar conexão" com o proxy
  - Toda a lógica de busca deve usar a URL do proxy dinamicamente
  - Sem dependência do Tampermonkey
- [ ] **Exportação como imagem** — além de CSV e PDF já existentes
- [ ] **Futuramente:** painel unificado com outras ferramentas do ISP (gerador QR WiFi, conferência de pagamento, etc.)

### Resolvidos (histórico de problemas)
- ✅ Regex do contrato não capturava por causa do prefixo (`ONU_`, `PPPoE_`) — corrigido para `/_(\d{4})/`
- ✅ `sSearch_0` ignorado pelo DataTables legado — revertido para `sSearch` global com limite alto
- ✅ `navigator.clipboard` undefined em HTTP — substituído por função `copiarTexto()` com fallback `execCommand`
- ✅ `olt-log-panel` não existia no DOM ao processar — movido para HTML fixo do painel
- ✅ `oltLogs` não acessível pelo `onclick` — exposto via `window.oltLogs`

---

## Estrutura de Dados

### ONU inativa (objeto interno)
```js
{
  num: "1",                          // número da ONU na porta GPON
  serial: "5B1AAE32",               // serial number
  operStatus: "Inactive",
  motivo: "DGI",                     // DGI | LOAMI+LOFI+LOSI | Inactive
  descricao: "ONU_6692manoel",       // descrição original da ONU
  contrato: "6692",                  // 4 dígitos extraídos da descrição
  nome: "manoel",                    // nome extraído da descrição
  nomeAda: "MANOEL CARLOS LEITE PESSOA - FTTH", // nome completo vindo do Ada
  idCliente: "5688",                 // IdCliente interno do Ada
  enderecoFinal: "LOT NSA SRA CARMO, PROJETO",
  bairroFinal: "PROJETO",
  pontoRef: "VIZINHO CASA NANDO"
}
```

### Output do PuTTY — `onu status gpon X`
```
ONU  Serial    OperStatus  ...  GPON ONU Status
1    5B1AAE32  Inactive    ...  DGI
2    5F89609F  Active      ...
32   2C3BCB00  Inactive    ...  LOAMI+LOFI+LOSI
```

### Output do PuTTY — `onu description show gpon X`
```
gpon 4 onu 1    ONU_6692manoel
gpon 4 onu 2    ONU_7305
gpon 4 onu 32   ONU_5540Veronica
```

---

## Decisões de Design

- **Tampermonkey como solução principal** — evita qualquer necessidade de alterar o Ada ou criar infraestrutura adicional
- **Sem campo de telefone** — o Ada armazena o telefone mas a busca via API retornou inconsistências; removido para não gerar confusão
- **Sem link Google Maps** — removido a pedido do usuário
- **Botão no canto esquerdo** — canto direito está ocupado por outra extensão do Tampermonkey
- **Log de diagnóstico sempre visível durante o processamento** — essencial para depurar problemas de busca no Ada
- **PDF via HTML + window.print()** — mais simples e confiável que gerar PDF direto no browser; usuário usa Ctrl+P → Salvar como PDF
