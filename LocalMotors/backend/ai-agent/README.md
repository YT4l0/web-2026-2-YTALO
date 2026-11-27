# MotorLocal AI Agent

Agente de IA para o ChatWidget do MotorLocal, implementado com **Strands Agents SDK** (TypeScript) e **Google Gemini**.

## Funcionalidades

- 🤖 Responde dúvidas sobre o MotorLocal (veículos, anúncios, funcionamento)
- 🧠 Memória persistente por usuário + sessão (via DynamoDB + `SessionManager`)
- 📏 Limite de contexto: `SlidingWindowConversationManager` com windowSize=20
- 🕐 Ferramenta de horário do Brasil (NTP.br com fallback)
- 🔐 Autenticação via Access Token do Cognito (`tokenUse: 'access'`)
- 🛡️ Prompt resistente a injection; não revela prompt/tokens/credenciais
- ⚡ Preparado para AWS Lambda + API Gateway WebSocket

## Arquitetura

```
useChatSocket.ts (frontend)
  │  VITE_CHAT_WS_URL (Access Token no query string)
  ▼
API Gateway WebSocket (exclusivo do chat de IA)
  │  $connect / $disconnect / $default / sendMessage
  ▼
Lambda handler.mjs (bundle de src/handler.ts)
  ├── tokenVerifier.ts         — valida Access Token (tokenUse: 'access')
  ├── connectionRepository.ts  — salva/consulta/remove conexões no DynamoDB
  ├── agent.ts                 — cria Agent com GoogleModel + SessionManager
  │     ├── snapshotStorage.ts — persiste snapshots no DynamoDB
  │     └── SlidingWindowConversationManager (windowSize=20)
  └── websocketPublisher.ts    — envia { type, text } de volta ao cliente
```

O chat de IA usa `VITE_CHAT_WS_URL` e `accessToken`. O chat entre comprador e
vendedor usa `VITE_CONVERSATIONS_WEBSOCKET_URL` e `idToken`, com handler
separado (`backend/src/websocketHandler.mjs`). Os dois sistemas não compartilham
código nem tabelas.

## Protocolo WebSocket

| Direção          | Payload                                             |
| ---------------- | --------------------------------------------------- |
| Cliente → Lambda | `{ "message": "texto", "sessionId": "default" }`    |
| Lambda → Cliente | `{ "type": "answer" \| "error", "text": "..." }`    |

**`sessionId`:**
- Opcional; padrão `"default"`.
- Regex: `^[a-zA-Z0-9_-]+$`, máximo 100 caracteres.
- A memória é isolada por `userId#sessionId` (sub do Cognito + sessionId).
- O `ChatWidget`/`useChatSocket` atuais enviam apenas `message`; usam `"default"`.

## Tabelas DynamoDB necessárias

| Tabela                      | Chave                                  | GSI            |
| --------------------------- | -------------------------------------- | -------------- |
| `AI_CHAT_CONNECTIONS_TABLE` | PK: `connectionId` (String)            | `userId-index` |
| `AI_CHAT_SNAPSHOTS_TABLE`   | PK: `pk` (String), SK: `sk` (String)   | —              |

### Conexões
- Atributos: `connectionId`, `userId`, `connectedAt`, `expiresAt` (TTL)
- GSI `userId-index`: PK=`userId`
- TTL habilitado em `expiresAt`

### Snapshots
- PK: `SESSION#<userId>#<sessionId>#agent#<agentId>`
- SK: `latest` (snapshot mutável) | `<uuid-v7>` (imutável) | `manifest`
- Atributos: `data` (JSON do Snapshot), `updatedAt`, `ttl`
- TTL habilitado em `ttl` (30 dias por padrão)

## Variáveis de ambiente Lambda

```
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
COGNITO_APP_CLIENT_ID=XXXXXXXXXXXXXXXXXX
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL_ID=gemini-2.0-flash
AI_CHAT_CONNECTIONS_TABLE=nome-da-tabela-conexoes
AI_CHAT_SNAPSHOTS_TABLE=nome-da-tabela-snapshots
# Opcional: se ausente, o endpoint é derivado do próprio evento do API Gateway
AI_CHAT_WEBSOCKET_ENDPOINT=https://<id>.execute-api.<region>.amazonaws.com/<stage>
```

Nenhuma credencial é armazenada no código. A `GEMINI_API_KEY` deve ser
configurada na Lambda (ou em `.env.local`, que é ignorado pelo Git).

## Scripts

```bash
npm install          # Instala dependências
npm run typecheck    # Verifica tipos TypeScript
npm run build        # Gera dist/handler.mjs (ESM, Node 22)
npm test             # Executa os testes (vitest) — 38 testes
npm run package      # Gera lambda.zip com handler.mjs
```

> O script `package` usa `Compress-Archive` (Windows/PowerShell). Em outro
> sistema operacional, compacte `dist/handler.mjs` em `lambda.zip` manualmente.

## Deploy (AWS)

O handler empacotado é `handler.handler` e o arquivo é `handler.mjs`, então o
runtime Lambda o trata como ESM.

1. Criar a tabela de conexões com PK `connectionId`, GSI `userId-index`
   (PK=`userId`) e TTL em `expiresAt`.
2. Criar a tabela de snapshots com PK `pk`, SK `sk` e TTL em `ttl`.
3. Criar uma API Gateway WebSocket com as rotas `$connect`, `$disconnect` e
   `$default`, todas integradas à Lambda do agente.
4. Criar a Lambda com runtime Node.js 22.x, handler `handler.handler`,
   `lambda.zip` e as variáveis acima.
5. Permissões IAM mínimas da Lambda:
   - `dynamodb:PutItem`, `dynamodb:GetItem`, `dynamodb:DeleteItem`,
     `dynamodb:Query`, `dynamodb:Scan`, `dynamodb:BatchWriteItem` na tabela de
     conexões e seu índice, e na tabela de snapshots.
   - `execute-api:ManageConnections` em
     `<api-id>/<stage>/POST/@connections/*`.
6. Copiar a URL `wss://` da API para `VITE_CHAT_WS_URL` no frontend.

O `$connect` valida o Access Token antes de gravar a conexão; conexões sem token
válido recebem `401`. Nenhum deploy é feito por este repositório.

## Separação de responsabilidades

| Sistema            | WebSocket URL                        | Token usado    |
| ------------------ | ------------------------------------ | -------------- |
| Chat de IA         | `VITE_CHAT_WS_URL`                   | `accessToken`  |
| Conversas usuários | `VITE_CONVERSATIONS_WEBSOCKET_URL`   | `idToken`      |

## Limitações conhecidas

- **`deleteSession` usa Scan**: A tabela de snapshots não possui GSI por
  prefixo de PK (`SESSION#<userId>#...`). Converter para Query exigiria uma GSI
  adicional. O Scan atual tem retentativas limitadas (3×) para `UnprocessedItems`
  e é funcional para o volume esperado.
- **`lambda.zip` contém apenas `handler.mjs`**: O AWS SDK é externo (disponível
  no runtime Lambda Node 22.x).