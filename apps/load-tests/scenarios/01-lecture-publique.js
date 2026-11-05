// Charge en lecture publique, sans session : la liste paginée de l'exemple (GET /v1/examples),
// à remplacer par la route chaude du projet. Rampe, plateau, descente ; seuils du skill
// load-testing §3 pour une lecture.
//
// Throttler : 100 requêtes par minute et par IP par défaut, et tous les VUs partagent une
// adresse. Le backend visé tourne avec THROTTLE_LIMIT relevé (local ou CI), sinon les 429
// font échouer `http_req_failed` : on mesurerait le limiteur, pas l'application.
import { check, sleep } from "k6";
import http from "k6/http";

import { config } from "../helpers/config.js";

export const options = {
  stages: [
    { duration: "30s", target: 20 },
    { duration: "1m", target: 20 },
    { duration: "15s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<1500"],
    http_req_failed: ["rate<0.01"],
    checks: ["rate>0.99"],
  },
  tags: { test_type: "load", run_id: config.runId },
};

export default function () {
  const page = 1 + (__ITER % 5);
  const res = http.get(`${config.backendUrl}/v1/examples?page=${page}&pageSize=20`, {
    tags: { endpoint: "/v1/examples" },
  });
  check(res, {
    "statut 200": (r) => r.status === 200,
    "pas de 429": (r) => r.status !== 429,
    "liste paginée": (r) => Array.isArray(r.json("items")) && r.json("page") === page,
  });
  sleep(0.5);
}
