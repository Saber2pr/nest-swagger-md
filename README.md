# @saber2pr/nest-swagger-md

> create nestjs api markdown docs.

```bash
yarn add @saber2pr/nest-swagger-md
```

### Usage

```ts
import createApiMarkdownDocs from '@saber2pr/nest-swagger-md'

async function bootstrap() {
  const app = await NestFactory.create(ApplicationModule, {});
  const options = new DocumentBuilder()
  const document = SwaggerModule.createDocument(app, options);
  // create ./api.md
  await createApiMarkdownDocs(document);
  await app.listen(3000);
}
```
