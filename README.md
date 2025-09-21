
# n8n Integration API — Documentação de Rotas (v1)

Base URLs:
- **Produção (Render):** `https://n8n-integration-api-hackaton.onrender.com`
- **Local:** `http://localhost:3333`

Prefixo de versão: **`/api/v1`**  
Todas as rotas abaixo exigem autenticação via **API Key**.

---

## Autenticação

Envie a chave de API por **header** ou **query string**:

- **Header**: `x-api-key: <SUA_CHAVE>`
- **Query string**: `?api_key=<SUA_CHAVE>`

> Valor padrão em desenvolvimento: `change-me` (altere em produção).

---

## 1) Disparar workflow do n8n
`POST /api/v1/n8n/trigger`

Encaminha o corpo recebido para o **Webhook** do n8n configurado na variável de ambiente `N8N_WEBHOOK_URL` (em desenvolvimento utilizamos a URL `webhook-test`).

### Requisição
- **Headers**:
  - `x-api-key: <SUA_CHAVE>`
  - `Content-Type: application/json` (recomendado)
- **Body**: JSON livre (o payload será repassado ao n8n).

### Respostas
- **200 OK**
  ```json
  { "message": "Workflow was started" }
  ```
- **4xx/5xx** (erro no n8n): retorno inclui campo `upstream` com a URL chamada.

### Exemplos
**cURL (produção):**
```bash
curl -i -X POST 'https://n8n-integration-api-hackaton.onrender.com/api/v1/n8n/trigger' \
  -H 'x-api-key: change-me' \
  -H 'Content-Type: application/json' \
  -d '{"id":1,"identificadorNavio":"IMO-0000001","tipoMovimentacao":"ATRACACAO"}'
```

---

## 2) Salvar/atualizar escala (upsert)
`POST /api/v1/n8n/save`

Recebe dados de escala e executa **upsert** no MongoDB. A chave composta é:  
**`identificador_navio` + `data_prevista_atracacao`**.

### Formatos aceitos de corpo
A API é tolerante e aceita **qualquer** dos formatos abaixo:
- **Objeto único**:
  ```json
  { "identificadorNavio": "...", "nomeArmador": "...", "dataPrevistaAtracacao": "2025-09-01T08:00:00", ... }
  ```
- **Array de objetos**:
  ```json
  [ { "identificadorNavio": "...", ... }, { "identificadorNavio": "...", ... } ]
  ```
- Envelopado em **`{ data: [...] }`**, **`{ items: [...] }`**
- Envelopado com **`{ body: { valores: { ... } } }`** (caso de agentes que não enviam `Content-Type`)
- Array de itens do n8n no padrão **`[{ json: {...} }]`** (o controller “desembrulha” `json` automaticamente)
- **String JSON** ou **Buffer** quando o `Content-Type` não for `application/json`

### Campos aceitos (camelCase)
- `identificadorNavio` **(string, obrigatório)**
- `nomeArmador` **(string, obrigatório)**
- `dataPrevistaAtracacao` **(string de data ISO, obrigatório)** — aceita com ou sem `Z`
- `dataRealAtracacao` *(string de data ISO | null, opcional)*
- `statusGrid` *(string | null, opcional)*
- `motivoAtraso` *(string | null, opcional)*

> Conversão de datas: o backend tenta `new Date(value)`; se inválido, tenta `value + "Z"`.

### Respostas
- **201 Created**
  ```json
  {
    "upserted": 1,
    "data": [
      {
        "_id": "...",
        "identificador_navio": "MSC-SANTOS-001",
        "nome_armador": "MSC",
        "data_prevista_atracacao": "2025-09-01T08:00:00.000Z",
        "data_real_atracacao": "2025-09-01T08:10:00.000Z",
        "status_grid": "Concluído",
        "motivo_atraso": "Manobra realizada com sucesso.",
        "created_at": "2025-09-21T09:00:00.000Z"
      }
    ]
  }
  ```
- **400 Bad Request** — payload vazio, campos obrigatórios ausentes, ou datas inválidas
- **502 Bad Gateway** — erro de banco (campo `detail` traz a mensagem)

### Exemplos
**cURL — objeto único:**
```bash
curl -i -X POST 'https://n8n-integration-api-hackaton.onrender.com/api/v1/n8n/save?api_key=change-me' \
  -H 'Content-Type: application/json' \
  -d '{
    "identificadorNavio":"MSC-SANTOS-001",
    "nomeArmador":"MSC",
    "dataPrevistaAtracacao":"2025-09-01T08:00:00",
    "dataRealAtracacao":"2025-09-01T08:10:00",
    "statusGrid":"Concluído",
    "motivoAtraso":"Manobra realizada com sucesso."
  }'
```

**cURL — envelope `body.valores` (agente sem Content-Type):**
```bash
curl -i -X POST 'https://n8n-integration-api-hackaton.onrender.com/api/v1/n8n/save?api_key=change-me' \
  -H 'Accept: application/json' \
  --data-binary '{"body":{"valores":{"identificadorNavio":"COSCO-AGUARDANDO-008","nomeArmador":"COSCO","dataPrevistaAtracacao":"2025-09-01T15:00:00","dataRealAtracacao":null,"statusGrid":"Pendente","motivoAtraso":"Janela de atracação ocupada"}}}'
```

**n8n — Code (JS) preparando um array “puro”:**
```js
const out = items.map(i => {
  const j = i.json || {};
  return {
    identificadorNavio: j.identificadorNavio,
    nomeArmador: j.nomeArmador,
    dataPrevistaAtracacao: j.dataPrevistaAtracacao,
    dataRealAtracacao: j.dataRealAtracacao,
    statusGrid: j.statusGrid,
    motivoAtraso: j.motivoIntercorrencia || j.observacoes || null,
  };
});
return [{ json: out }];
```
**n8n — HTTP Request**  
- Method: `POST`  
- URL: `https://n8n-integration-api-hackaton.onrender.com/api/v1/n8n/save`  
- Headers: `x-api-key: change-me`  
- Send: `JSON`  
- Body (Expression): `{{$json}}`  
- (Não marcar “Send All Items” — o `Code` acima já retorna o array inteiro em um único item)

---

## 3) Listar escalas (paginação e filtros)
`GET /api/v1/n8n/port-calls`

Lista documentos da coleção `port_calls`.

### Query params
- `page` *(int, default 1)*
- `limit` *(int, default 10)*
- `q` *(string, opcional)* — busca por **`identificador_navio`**, **`nome_armador`** ou **`status_grid`**
- `from` / `to` *(ISO datetime, opcional)* — filtro por intervalo de **`data_prevista_atracacao`**
- `sort` *(string, opcional; default `created_at`)*
- `dir` *(`asc` | `desc`, default `desc`)*

### Resposta
- **200 OK**
  ```json
  {
    "page": 1,
    "limit": 10,
    "total": 0,
    "items": []
  }
  ```

### Exemplos
```bash
curl -i 'https://n8n-integration-api-hackaton.onrender.com/api/v1/n8n/port-calls?limit=10&page=1&api_key=change-me'
```

---

## Modelo de Dados (MongoDB)

Coleção: **`port_calls`**

Campos (snake_case):
- `identificador_navio` *(string, PK parcial)*
- `nome_armador` *(string)*
- `data_prevista_atracacao` *(date, PK parcial)*
- `data_real_atracacao` *(date | null)*
- `status_grid` *(string | null)*
- `motivo_atraso` *(string | null)*
- `created_at` *(date)*

Índices principais:
- Único/composto: (`identificador_navio`, `data_prevista_atracacao`)
- Auxiliares: por data e por texto (dependendo da configuração do projeto)

---

## Variáveis de Ambiente

- `API_KEY` — chave para autenticação (ex.: `change-me`)
- `N8N_WEBHOOK_URL` — URL do webhook do n8n (ex.: `.../webhook/...` ou `.../webhook-test/...`)
- `N8N_TIMEOUT_MS` — timeout em ms para chamada ao n8n (ex.: `10000`)
- `MONGODB_URI` — string de conexão MongoDB Atlas
- `MONGODB_DB` — nome do banco (ex.: `hackaton`)
- `PORT` — porta do servidor (Render fornece automaticamente)

---

## Códigos de Erro

- **400** — payload vazio, campos obrigatórios ausentes, datas inválidas
- **401** — API key ausente/incorreta
- **404** — rota inexistente
- **502** — erro ao acessar MongoDB ou n8n (campo `detail`/`upstream` ajuda no diagnóstico)

---

## Logs e Rastreamento

Cada requisição recebe um `x-request-id` e são emitidos logs JSON:
- `req` / `res` no middleware (método, URL, status, duração)
- `save.raw` / `save.in` / `save.ok` no controller de **save**

Exemplo de início de request:
```json
{"t":"2025-09-21T09:14:05.086Z","level":"info","msg":"req","rid":"<uuid>","m":"POST","p":"/api/v1/n8n/save","ip":"::1"}
```

---

## Boas Práticas

- Em produção, use `N8N_WEBHOOK_URL` com **`/webhook/`** (não `webhook-test`) e mantenha o workflow **ativo**.
- Troque a `API_KEY` padrão e armazene segredos em variáveis de ambiente.
- Configure a **IP Access List** no MongoDB Atlas para permitir egress do seu provedor (Render).

---

## Exemplos Rápidos (resumo)

Salvar (objeto simples):
```bash
curl -i -X POST 'https://n8n-integration-api-hackaton.onrender.com/api/v1/n8n/save?api_key=change-me' \
  -H 'Content-Type: application/json' \
  -d '{"identificadorNavio":"MSC-SANTOS-001","nomeArmador":"MSC","dataPrevistaAtracacao":"2025-09-01T08:00:00"}'
```

Listar (página 1):
```bash
curl -i 'https://n8n-integration-api-hackaton.onrender.com/api/v1/n8n/port-calls?limit=10&page=1&api_key=change-me'
```

Disparar n8n:
```bash
curl -i -X POST 'https://n8n-integration-api-hackaton.onrender.com/api/v1/n8n/trigger' \
  -H 'x-api-key: change-me' \
  -H 'Content-Type: application/json' \
  -d '{"id":1,"identificadorNavio":"IMO-0000001","tipoMovimentacao":"ATRACACAO"}'
```
