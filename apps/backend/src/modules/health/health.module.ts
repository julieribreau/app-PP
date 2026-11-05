import {
  Controller,
  type DynamicModule,
  Get,
  Inject,
  Module,
  type OnModuleDestroy,
} from "@nestjs/common";
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorService,
  TerminusModule,
} from "@nestjs/terminus";
import { SkipThrottle } from "@nestjs/throttler";
import { Redis } from "ioredis";
import postgres from "postgres";

import { loadEnv } from "../../config/env";

// Santé OBLIGATOIRE (socle, brique sante-services-supervision).
// /v1/health        : vivant, sans dépendance, lu par le HEALTHCHECK Docker.
// /v1/health/ready  : une entrée par dépendance bloquante, 503 dès qu'une tombe, sondé par Gatus
//                     (tools/gatus) et par la sonde de cd.yml.
// Même contrat pour le process cron (HealthModule.forRoot({ service: "cron" }), sur son port).
// Routes publiques : jamais de version, de nom d'hôte ni de message d'erreur brut dans la réponse.
const DELAI_MS = 2_000;
const SERVICE = Symbol("HEALTH_SERVICE");

const env = loadEnv();
// ponytail: une connexion Postgres et une Redis réservées à la sonde. Passer par le client DRIZZLE
// et la connexion BullMQ du projet si l'on veut aussi voir l'épuisement de leur pool.
const sql = postgres(env.DATABASE_URL, {
  max: 1,
  idle_timeout: 30,
  connect_timeout: DELAI_MS / 1000,
});
const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  connectTimeout: DELAI_MS,
  commandTimeout: DELAI_MS, // sans lui, une commande sur un Redis figé n'échoue jamais
});
redis.on("error", () => undefined); // l'état se lit dans /ready, pas dans un flot d'erreurs au journal

function avantDelai(appel: PromiseLike<unknown>): Promise<unknown> {
  let minuteur: NodeJS.Timeout | undefined;
  const delai = new Promise((_, ko) => {
    minuteur = setTimeout(() => ko(new Error("timeout")), DELAI_MS);
  });
  return Promise.race([appel, delai]).finally(() => clearTimeout(minuteur));
}

@SkipThrottle()
@Controller("health")
class HealthController implements OnModuleDestroy {
  constructor(
    private readonly health: HealthCheckService,
    private readonly indicateurs: HealthIndicatorService,
    @Inject(SERVICE) private readonly service: string,
  ) {}

  @Get()
  liveness() {
    return { status: "ok", service: this.service };
  }

  @Get("ready")
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.sonder("db", () => sql`SELECT 1`),
      () => this.sonder("redis", () => redis.ping()),
      // + "storage" (HeadBucket S3) si le projet stocke des fichiers, et chaque fournisseur bloquant.
    ]);
  }

  private async sonder(cle: string, appel: () => PromiseLike<unknown>) {
    const indicateur = this.indicateurs.check(cle);
    try {
      await avantDelai(appel());
      return indicateur.up();
    } catch (err) {
      const delaiDepasse = err instanceof Error && /time(d)? ?out/i.test(err.message);
      return indicateur.down({ message: delaiDepasse ? "timeout" : "unreachable" });
    }
  }

  async onModuleDestroy() {
    redis.disconnect(); // quit() attendrait sans fin un Redis injoignable et bloquerait l'arrêt
    await sql.end({ timeout: 1 });
  }
}

@Module({})
export class HealthModule {
  /** `service` : nom rendu par la liveness (`api`, `cron`), pour savoir qui répond. */
  static forRoot(options: { service: string }): DynamicModule {
    return {
      module: HealthModule,
      imports: [TerminusModule],
      controllers: [HealthController],
      providers: [{ provide: SERVICE, useValue: options.service }],
    };
  }
}
