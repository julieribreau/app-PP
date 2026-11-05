import { Module } from "@nestjs/common";
import { ExampleController } from "./controllers/example.controller";
import { ExampleService } from "./services/example.service";
import { ExampleRepository } from "./repositories/example.repository";

/**
 * Module EXEMPLE — gabarit d'un module autonome (à dupliquer/renommer par domaine).
 * Découpage fin imposé : controllers / services / repositories / dto / tokens (cf architecture-reference).
 * Remplacer "example" par le domaine réel (account, inscription, facturation…).
 */
@Module({
  controllers: [ExampleController],
  providers: [ExampleService, ExampleRepository],
  exports: [ExampleService], // interface publique du module (les autres modules passent par là)
})
export class ExampleModule {}
