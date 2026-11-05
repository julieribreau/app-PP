import "./instrument";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { apiReference } from "@scalar/nestjs-api-reference";
import { Logger } from "nestjs-pino";
import { cleanupOpenApiDoc } from "nestjs-zod";
import { AppModule } from "./app.module";
import { loadEnv } from "./config/env";
import { HttpExceptionFilter } from "./common/http-exception.filter";

// Bootstrap backend NutrionApp — NestJS dédié (jamais le back dans Next).
async function bootstrap() {
  const env = loadEnv(); // valide l'env au boot (fail-fast)
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger)); // logs structurés Pino (socle observabilité)
  app.setGlobalPrefix("v1"); // API versionnée
  app.useGlobalFilters(new HttpExceptionFilter()); // problem+json ; 5xx vers Sentry
  // SIGTERM (redéploiement) : Nest appelle les onModuleDestroy, connexions fermées proprement.
  app.enableShutdownHooks();
  app.enableCors({ origin: env.CORS_ORIGINS.split(",").filter(Boolean) });
  // Rate limiting : ThrottlerModule importé dans app.module + ThrottlerGuard global.

  // Doc d'API OBLIGATOIRE : OpenAPI auto-généré (schémas dérivés des DTO zod via nestjs-zod),
  // rendu avec Scalar. Toujours à jour car dérivé du code. (cf socle §Doc d'API)
  // cleanupOpenApiDoc est requis par nestjs-zod 5 : il remplace les schémas bruts des DTO par
  // leur JSON Schema et lève « Found multiple schemas with name X » sur un nom en double.
  // Une DTO construite directement sur un schéma zod porteur d'un id (.meta({ id }) ou
  // registre) prend ce nom et le double : la construire sur schema.clone().
  if (env.EXPOSE_API_DOCS === "true") {
    const openapi = cleanupOpenApiDoc(
      SwaggerModule.createDocument(
        app,
        new DocumentBuilder().setTitle("NutrionApp API").setVersion("1.0").build(),
      ),
    );
    // Trois adresses, les mêmes dans tous les projets Bullify :
    //   /swagger       Swagger UI
    //   /openapi.json  le contrat brut, téléchargeable (clients générés, Postman, intégrateurs)
    //   /docs          Scalar, la référence lisible, avec son bouton de téléchargement
    SwaggerModule.setup("swagger", app, openapi, {
      raw: ["json"],
      jsonDocumentUrl: "openapi.json",
    });
    app.use("/docs", apiReference({ content: openapi }));
  }

  await app.listen(env.PORT);
}
void bootstrap();
