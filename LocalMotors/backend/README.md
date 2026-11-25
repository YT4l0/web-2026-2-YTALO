# Backend do RF-02

Esta pasta contém o código local do CRUD de anúncios e uma proposta SAM. Nenhum recurso foi implantado.

## Modelo

- Tabela `ytalodias-vehicles-2026.2`, chave `vehicleId` (String).
- GSI `ownerId-createdAt-index`, partition key `ownerId` e sort key `createdAt`.
- `ownerId`, `status`, `createdAt`, `updatedAt` e `photoKeys` são controlados pelo backend.
- O bucket é privado. O DynamoDB guarda chaves `vehicles/{ownerId}/{vehicleId}/{uuid}.{ext}`; respostas geram URLs GET com validade de 15 minutos.

## Rotas

| Método | Caminho | Autenticação | Resultado |
| --- | --- | --- | --- |
| POST | `/vehicles` | Cognito JWT | Cria com `status=ativo` e `ownerId=claims.sub` |
| GET | `/vehicles` | Pública | Lista somente ativos e aplica filtros |
| GET | `/vehicles/{id}` | Pública | Retorna somente anúncio ativo |
| GET | `/me/vehicles` | Cognito JWT | Consulta o GSI pelo proprietário |
| PATCH | `/vehicles/{id}` | Cognito JWT | Atualização condicional pelo proprietário |
| DELETE | `/vehicles/{id}` | Cognito JWT | Exclusão condicional e limpeza dos objetos S3 |
| POST | `/vehicles/{id}/photo-uploads` | Cognito JWT | Gera URLs PUT pré-assinadas vinculadas ao anúncio |

Filtros de `GET /vehicles`: `vehicleType`, `city`, `brand`, `minPrice`, `maxPrice`, `minYear`, `maxYear`, `maxMileage`, `searchTerm`, `featured`, `ownerId` e `sort`.

## Variáveis da Lambda

- `VEHICLES_TABLE_NAME`
- `VEHICLES_OWNER_INDEX`
- `VEHICLES_BUCKET_NAME`
- `ALLOWED_ORIGIN`
- `MAX_PHOTOS` (padrão 10)
- `MAX_PHOTO_BYTES` (padrão 8388608)

## Permissões da role

A role precisa de `dynamodb:GetItem`, `PutItem`, `UpdateItem`, `DeleteItem`, `Scan` e `Query` na tabela e no GSI; e `s3:GetObject`, `PutObject` e `DeleteObject` no prefixo `vehicles/*` do bucket. A URL pré-assinada usa as permissões da role.

## CORS

Configure o HTTP API para `Authorization` e `Content-Type` e os métodos `GET, POST, PATCH, DELETE, OPTIONS`. No S3, permita `PUT` e `GET` para o domínio de produção e `http://localhost:5173`. Não habilite acesso público ao bucket.

## Empacotamento local

Execute `npm install` nesta pasta antes de empacotar a Lambda. `npm run check` valida a sintaxe sem acessar AWS. O arquivo `infrastructure.yaml` deve ser comparado com os recursos existentes antes de qualquer implantação no Learner Lab.
