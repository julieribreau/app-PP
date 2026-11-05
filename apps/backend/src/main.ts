import "./load-env";
import "./instrument";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { apiReference } from "@scalar/nestjs-api-reference";
import { Logger } from "nestjs-pino";
import { cleanupOpenApiDoc } from "nestjs-zod";

import { AppModule } from "./app.module";
import { configureApp } from "./bootstrap";
import { loadEnv } from "./config/env";

// Bootstrap backend NutrionApp : NestJS dédié (jamais le back dans Next).
async function bootstrap() {
  const env = loadEnv(); // valide l'env au boot (fail-fast)
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });
  app.useLogger(app.get(Logger)); // logs structurés Pino (socle observabilité)
  configureApp(app);
  // SIGTERM (redéploiement) : Nest appelle les onModuleDestroy, connexions fermées proprement.
  app.enableShutdownHooks();

  // Doc d'API OBLIGATOIRE : OpenAPI auto-généré (schémas dérivés des DTO zod via nestjs-zod),
  // rendu avec Scalar. Toujours à jour car dérivé du code. (cf socle §Doc d'API)
  // Better Auth (/v1/auth/*) n'y figure pas : sa référence est celle de Better Auth.
  if (env.EXPOSE_API_DOCS === "true") {
    const openapi = cleanupOpenApiDoc(
      SwaggerModule.createDocument(
        app,
        new DocumentBuilder()
          .setTitle("NutrionApp API")
          .setDescription(
            "Contrat : docs/architecture/api-contract.md. Authentification : Better Auth sous /v1/auth/*.",
          )
          .setVersion("1.0")
          .addCookieAuth("nutrion.session_token")
          .build(),
      ),
    );
    //   /swagger       Swagger UI
    //   /openapi.json  le contrat brut, téléchargeable
    //   /docs          Scalar, la référence lisible
    SwaggerModule.setup("swagger", app, openapi, {
      raw: ["json"],
      jsonDocumentUrl: "openapi.json",
    });
    app.use("/docs", apiReference({ content: openapi }));
  }

  await app.listen(env.PORT);
}
void bootstrap();
