import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ExampleService } from "../services/example.service";
import { CreateExampleDto, ListExampleQuery } from "../dto/example.dto";

/**
 * Controller — traduit HTTP <-> métier. Valide les DTO, appelle le service, mappe la réponse.
 * AUCUNE règle métier, AUCUN accès DB direct ici.
 */
@Controller("examples") // servi sous /v1/examples (préfixe global)
export class ExampleController {
  constructor(private readonly service: ExampleService) {}

  @Get()
  list(@Query() query: ListExampleQuery) {
    return this.service.list(query); // pagination/tri/filtre serveur (socle back-office)
  }

  @Post()
  create(@Body() dto: CreateExampleDto) {
    return this.service.create(dto);
  }
}
