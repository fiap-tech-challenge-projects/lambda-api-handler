# Lambda API Handler

AWS Lambda functions para autenticacao do FIAP Tech Challenge - Fase 3.

## Visao Geral

Este repositorio contem as Lambda functions para autenticacao da aplicacao, incluindo:

- **Login por Email/Senha**: Autenticacao tradicional com validacao de credenciais
- **Login por CPF**: Identificacao rapida por CPF (sem senha)
- **JWT Authorizer**: Validacao de tokens para API Gateway
- **Refresh Token**: Renovacao de tokens de acesso

### Arquitetura

```
                                    +-------------------+
                                    |   API Gateway     |
                                    |   (HTTP API)      |
                                    +--------+----------+
                                             |
                    +------------------------+------------------------+
                    |                        |                        |
            +-------v-------+        +-------v-------+        +-------v-------+
            |  /auth/login  |        | /auth/login/  |        |  /auth/       |
            |  (POST)       |        |    cpf (POST) |        | refresh (POST)|
            +-------+-------+        +-------+-------+        +-------+-------+
                    |                        |                        |
                    +------------------------+------------------------+
                                             |
                                    +--------v----------+
                                    |   Auth Handler    |
                                    |   Lambda          |
                                    +--------+----------+
                                             |
                    +------------------------+------------------------+
                    |                        |                        |
            +-------v-------+        +-------v-------+        +-------v-------+
            |    RDS        |        |   Secrets     |        |  JWT Service  |
            |  PostgreSQL   |        |   Manager     |        |               |
            +---------------+        +---------------+        +---------------+
```

## Endpoints

| Metodo | Endpoint | Descricao | Auth |
|--------|----------|-----------|------|
| POST | `/auth/login` | Login com email/senha | Nao |
| POST | `/auth/login/cpf` | Login com CPF | Nao |
| POST | `/auth/refresh` | Renovar access token | Nao |
| POST | `/auth/logout` | Invalidar refresh token | Nao |

### Exemplos de Request

#### Login com Email/Senha

```bash
curl -X POST https://xxx.execute-api.us-east-1.amazonaws.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@exemplo.com",
    "password": "senha123"
  }'
```

#### Login com CPF

```bash
curl -X POST https://xxx.execute-api.us-east-1.amazonaws.com/v1/auth/login/cpf \
  -H "Content-Type: application/json" \
  -d '{
    "cpf": "123.456.789-00"
  }'
```

#### Refresh Token

```bash
curl -X POST https://xxx.execute-api.us-east-1.amazonaws.com/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

### Response de Sucesso

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "tokenType": "Bearer",
  "user": {
    "id": "uuid",
    "email": "usuario@exemplo.com",
    "name": "Nome do Usuario",
    "role": "USER",
    "clientId": "uuid (opcional)"
  }
}
```

## Tecnologias

| Tecnologia | Versao | Descricao |
|------------|--------|-----------|
| Node.js | 20.x | Runtime |
| TypeScript | 5.x | Linguagem |
| AWS Lambda | - | Serverless compute |
| API Gateway | HTTP API | API management |
| PostgreSQL | 15.x | Database (RDS) |
| JWT | - | Autenticacao |

## Pre-requisitos

1. **Node.js** >= 20.0.0
2. **AWS CLI** configurada
3. **Terraform** >= 1.5.0
4. Infraestrutura base (VPC, RDS) ja provisionada

## Desenvolvimento Local

### Instalar dependencias

```bash
npm install
```

### Build

```bash
npm run build
```

### Testes

```bash
npm test
npm run test:coverage
```

### Lint

```bash
npm run lint
npm run lint:fix
```

## Deploy

### Via CI/CD (Recomendado)

O deploy automatico ocorre via GitHub Actions quando:
- Push na branch `main` ou `develop`
- Mudancas nos arquivos `src/**`, `terraform/**`, ou `package.json`

### Deploy Manual

```bash
# 1. Build e package
npm run build
npm run package

# 2. Terraform
cd terraform
terraform init
terraform plan
terraform apply

# 3. Update Lambda code
aws lambda update-function-code \
  --function-name fiap-tech-challenge-development-auth-handler \
  --zip-file fileb://lambda.zip
```

## Estrutura de Diretorios

```
lambda-api-handler/
├── src/
│   ├── handlers/
│   │   ├── auth.handler.ts      # Handler de autenticacao
│   │   └── authorizer.handler.ts # Lambda authorizer
│   ├── services/
│   │   └── auth.service.ts      # Logica de autenticacao
│   ├── utils/
│   │   ├── database.ts          # Conexao com PostgreSQL
│   │   ├── jwt.ts               # Geracao/validacao JWT
│   │   ├── secrets.ts           # AWS Secrets Manager
│   │   └── validation.ts        # Validacao de inputs
│   ├── types/
│   │   └── index.ts             # TypeScript types
│   └── index.ts                 # Entry point
├── terraform/
│   ├── main.tf                  # Provider e backend
│   ├── variables.tf             # Variaveis
│   ├── lambda.tf                # Lambda functions
│   ├── api-gateway.tf           # API Gateway HTTP API
│   ├── iam.tf                   # IAM roles e policies
│   ├── outputs.tf               # Outputs
│   └── terraform.tfvars         # Valores
├── tests/
│   └── ...                      # Testes unitarios
├── .github/
│   └── workflows/
│       └── deploy.yml           # CI/CD pipeline
├── package.json
├── tsconfig.json
└── README.md
```

## Variaveis de Ambiente (Lambda)

| Variavel | Descricao |
|----------|-----------|
| `NODE_ENV` | Ambiente (development/staging/production) |
| `AWS_REGION` | Regiao AWS |
| `DATABASE_SECRET_NAME` | Nome do secret com credenciais do DB |
| `AUTH_SECRET_NAME` | Nome do secret com configuracao JWT |

## Secrets Manager

### Database Credentials

Secret: `fiap-tech-challenge/development/database/credentials`

```json
{
  "DATABASE_URL": "postgresql://user:pass@host:5432/db",
  "DB_HOST": "...",
  "DB_PORT": "5432",
  "DB_NAME": "fiap_tech_challenge",
  "DB_USER": "...",
  "DB_PASSWORD": "..."
}
```

### Auth Config

Secret: `fiap-tech-challenge/development/auth/config`

```json
{
  "JWT_SECRET": "...",
  "JWT_ACCESS_EXPIRY": "15m",
  "JWT_REFRESH_EXPIRY": "7d"
}
```

## JWT Token

### Access Token Payload

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "name": "User Name",
  "role": "USER",
  "clientId": "client-uuid (opcional)",
  "iat": 1234567890,
  "exp": 1234568790
}
```

## Integracao com API Gateway Authorizer

Para proteger endpoints no EKS com o authorizer:

```yaml
# No API Gateway, configure o authorizer
authorizerId: !Ref JwtAuthorizer
authorizationType: CUSTOM
```

O authorizer retorna um context com informacoes do usuario:

```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "name": "User Name",
  "role": "USER",
  "clientId": "uuid"
}
```

## Troubleshooting

### Erro de conexao com RDS

```bash
# Verificar security groups
aws ec2 describe-security-groups --group-ids <sg-id>

# Verificar se Lambda esta na VPC correta
aws lambda get-function-configuration --function-name <function-name>
```

### Erro ao obter secrets

```bash
# Verificar se secret existe
aws secretsmanager list-secrets --region us-east-1

# Verificar permissoes da Lambda
aws iam get-role-policy --role-name <lambda-role> --policy-name <policy>
```

### Logs

```bash
# Ver logs da Lambda
aws logs tail /aws/lambda/fiap-tech-challenge-development-auth-handler --follow

# Ver logs do API Gateway
aws logs tail /aws/apigateway/fiap-tech-challenge-development-api --follow
```

## Links Relacionados

- [FIAP Tech Challenge - Plano Fase 3](../PHASE-3-PLAN.md)
- [Database Infrastructure](../database-managed-infra)
- [Kubernetes Infrastructure](../kubernetes-core-infra)
- [K8s Main Service](../k8s-main-service)

## Equipe

- Ana Shurman
- Franklin Campos
- Rafael Lima (Finha)
- Bruna Euzane

---

**FIAP Pos-Graduacao em Arquitetura de Software - Tech Challenge Fase 3**
