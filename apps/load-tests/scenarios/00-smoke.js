// Smoke : 1 VU, tout répond. À lancer avant tout autre scénario (skill load-testing §2) ; un
// échec ici rend inutile la suite. Sondes de santé du backend : vivant, puis prêt (base, Redis).
import { check, sleep } from "k6";
import http from "k6/http";

import { config } from "../helpers/config.js";

export const options = {
  vus: 1,
  duration: config.smokeDuration,
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<3000"],
    checks: ["rate>0.99"],
  },
  tags: { test_type: "smoke", run_id: config.runId },
};

const SONDES = ["/v1/health", "/v1/health/ready"];

export default function () {
  for (const path of SONDES) {
    const res = http.get(`${config.backendUrl}${path}`, { tags: { endpoint: path } });
    check(res, {
      [`${path} 200`]: (r) => r.status === 200,
      [`${path} status ok`]: (r) => r.json("status") === "ok",
    });
  }
  sleep(1);
}
