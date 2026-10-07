# LocalMotors 🚗

Marketplace moderno de compra e venda de veículos com foco regional (Pau dos Ferros e região do Alto Oeste Potiguar). O sistema integra consulta à Tabela FIPE oficial para avaliação justa e comparativa de preços, gerenciamento de anúncios e perfis de vendedores, construído com React 19, TypeScript e Tailwind CSS v4.

---

## 🚀 Como Rodar o Projeto

### Pré-requisitos
- **Node.js** (versão 18+ recomendada)
- **npm** (ou yarn/pnpm)

### Instalação e Execução

1. Acesse o diretório do projeto:
   ```bash
   cd LocalMotors
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
   O app estará acessível em `http://localhost:5173/`.

4. Para validação de tipagem, linter e build:
   ```bash
   npx tsc -b
   npm run lint
   npm run build
   ```

---

## ⚙️ Variáveis de Ambiente

O projeto suporta autenticação local simulada (`mock`) e integração com **AWS Cognito + Google Identity Provider** (`cognito`).

Crie um arquivo `.env.local` na pasta `LocalMotors/` (baseado no `.env.example`):

```env
# Modo de autenticação: 'mock' (offline para dev) ou 'cognito' (AWS Cognito)
VITE_AUTH_MODE=mock

# Configurações do AWS Cognito User Pool (obrigatórias quando VITE_AUTH_MODE=cognito)
VITE_COGNITO_USER_POOL_ID=
VITE_COGNITO_CLIENT_ID=
VITE_COGNITO_DOMAIN=
VITE_COGNITO_REDIRECT_SIGN_IN=http://localhost:5173/
VITE_COGNITO_REDIRECT_SIGN_OUT=http://localhost:5173/
```

---

## 🔐 Configurando Cognito + Google (Passo a Passo)

Siga este roteiro para vincular a aplicação a um User Pool real da AWS com autenticação federada via Google:

### 1. Criar o User Pool no Amazon Cognito
1. No Console AWS, navegue até **Amazon Cognito** > **User Pools** > **Create user pool**.
2. **Authentication providers**: selecione **Cognito user pool** e marque **Google** como provedor federado (ou configure-o na etapa 4).
3. **Cognito user pool sign-in options**: marque **Email**.
4. **Required attributes**: certifique-se de marcar como obrigatórios os atributos:
   - `email`
   - `name`
5. Prossiga pelas opções de segurança (política de senha, MFA opcional para dev).
6. **App Client**:
   - Tipo de aplicação: **Public client** (Single-Page Application).
   - Nome do cliente: ex. `localmotors-web-client`.
   - **Client secret**: selecione **Don't generate a client secret** (aplicações SPA frontend não podem guardar segredos com segurança).

### 2. Configurar o Domínio do Hosted UI
1. Dentro do seu User Pool no Cognito, vá até a aba **App integration**.
2. Na seção **Domain**, clique em **Actions** > **Create Cognito domain** (ou **Add custom domain**).
3. Escolha um prefixo exclusivo, por exemplo: `localmotors-auth-dev`.
4. O domínio resultante terá o formato:
   `localmotors-auth-dev.auth.<sua-regiao>.amazoncognito.com` (guarde esse valor sem o prefixo `https://`).

### 3. Criar Credenciais OAuth no Google Cloud Console
1. Acesse o [Google Cloud Console](https://console.cloud.google.com/) e selecione ou crie um projeto.
2. Navegue até **APIs e Serviços** > **Tela de consentimento OAuth** (OAuth consent screen):
   - Tipo de usuário: **Externo**.
   - Preencha o nome do app, e-mail de suporte e dados de contato.
   - Escopos necessários: `.../auth/userinfo.email`, `.../auth/userinfo.profile`, `openid`.
3. Navegue até **APIs e Serviços** > **Credenciais** > **Criar Credenciais** > **ID do cliente OAuth**:
   - Tipo de aplicativo: **Aplicativo da Web** (Web application).
   - Nome: ex. `LocalMotors Cognito Client`.
   - **Origens JavaScript autorizadas**: adicione `https://<SEU_COGNITO_DOMAIN>` e `http://localhost:5173`.
   - **URIs de redirecionamento autorizados**: insira exatamente:
     ```
     https://<SEU_COGNITO_DOMAIN>/oauth2/idpresponse
     ```
     *(Substitua `<SEU_COGNITO_DOMAIN>` pelo domínio configurado no passo 2, ex: `localmotors-auth-dev.auth.sa-east-1.amazoncognito.com`)*.
4. Salve e copie o **ID do cliente** (Client ID) e a **Chave secreta do cliente** (Client Secret) gerados pelo Google.

### 4. Adicionar o Google como Identity Provider no Cognito
1. No Cognito, vá para a aba **Sign-in experience** > **Identity providers** > **Add identity provider**.
2. Selecione **Google**.
3. Insira o **Client ID** e o **Client Secret** copiados do Google Cloud Console.
4. Escopos autorizados: `openid profile email`.
5. **Attribute mapping** (Mapeamento de Atributos):
   - Atributo do Google `email` ➔ Atributo do User Pool `Email`.
   - Atributo do Google `name` ➔ Atributo do User Pool `Name`.
   - Atributo do Google `picture` ➔ Atributo do User Pool `picture`.
6. Salve as configurações do provedor.

### 5. Configurar o App Client no Cognito
1. Na aba **App integration**, desça até a lista de **App clients** e clique no client criado.
2. Na seção **Hosted UI**, clique em **Edit**:
   - **Identity providers**: marque **Google** e **Cognito user pool**.
   - **Callback URLs** (Allowed callback URLs):
     ```
     http://localhost:5173/
     ```
     *(Adicione também a URL do seu domínio de produção se já houver)*.
   - **Sign-out URLs** (Allowed sign-out URLs):
     ```
     http://localhost:5173/
     ```
   - **OAuth 2.0 grant types**: marque **Authorization code grant**.
   - **OpenID Connect scopes**: selecione `OpenID`, `Email` e `Profile`.
3. Salve as alterações.

### 6. Preencher as Variáveis de Ambiente no Front
1. No diretório `LocalMotors/`, crie ou edite o arquivo `.env.local`:
   ```env
   VITE_AUTH_MODE=cognito
   VITE_COGNITO_USER_POOL_ID=sa-east-1_xxxxxxxxx
   VITE_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
   VITE_COGNITO_DOMAIN=localmotors-auth-dev.auth.sa-east-1.amazoncognito.com
   VITE_COGNITO_REDIRECT_SIGN_IN=http://localhost:5173/
   VITE_COGNITO_REDIRECT_SIGN_OUT=http://localhost:5173/
   ```
2. Reinicie o servidor (`npm run dev`).
3. Ao clicar em **"Continuar com Google"**, você será redirecionado para a tela de autenticação do Google via Cognito Hosted UI e retornará autenticado à página inicial.

---

## 📁 Estrutura de Pastas

```
web-2026-2-YTALO/
├── .gitignore               # Arquivos ignorados pelo Git na raiz
├── README.md                # Documentação do repositório
└── LocalMotors/             # Código-fonte da aplicação
    ├── index.html           # Ponto de entrada HTML do Vite
    ├── package.json         # Dependências e scripts do projeto
    ├── tsconfig.json        # Configurações TypeScript
    ├── vite.config.ts       # Configurações do Vite
    ├── .env.example         # Template com variáveis de ambiente
    ├── public/              # Arquivos públicos e estáticos
    └── src/
        ├── App.tsx          # Componente raiz e gerenciador de telas (sem router)
        ├── main.tsx         # Ponto de entrada React com AuthProvider
        ├── config/
        │   └── cognito.ts   # Configuração e validação do AWS Cognito / Amplify
        ├── context/
        │   └── AuthContext.tsx # Contexto e hook useAuth com suporte a Cognito e Mock
        ├── data/            # Mocks e dados estáticos (veículos, etc.)
        ├── services/        # Camada de serviços (Auth, FIPE, Veículos)
        │   ├── auth/
        │   │   ├── types.ts              # Interfaces AuthService e AuthUser
        │   │   ├── cognitoAuthService.ts # Implementação AWS Cognito (Amplify v6)
        │   │   ├── mockAuthService.ts    # Implementação Mock offline
        │   │   ├── getAccessToken.ts     # Recuperação de JWT para API Gateway
        │   │   └── index.ts              # Exportador dinâmico por VITE_AUTH_MODE
        │   ├── fipeService.ts            # Consulta à Tabela FIPE
        │   ├── noSqlAuthService.ts       # Armazenamento NoSQL simulado de contas
        │   └── noSqlVehicleService.ts    # Operações de CRUD de anúncios
        ├── types/           # Definições de tipos TypeScript
        └── components/
            ├── icons/       # Componentes de ícones SVG
            ├── layout/      # Layout compartilhado (Header, Footer)
            └── screens/     # Telas da aplicação
                ├── HomeScreen.tsx
                ├── SearchScreen.tsx
                ├── DetailScreen.tsx
                ├── PublishScreen.tsx
                ├── SellerProfileScreen.tsx
                ├── FavoritesScreen.tsx
                ├── LoginScreen.tsx
                └── RegisterScreen.tsx
```
