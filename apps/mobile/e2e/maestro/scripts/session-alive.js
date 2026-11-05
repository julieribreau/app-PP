// La session COOKIE est-elle encore valable ? Sortie : output.alive ("true" | "false").
var res = http.get("http://localhost:3001/v1/auth/get-session", { headers: { cookie: COOKIE } });
var body = res.body ? json(res.body) : null;
output.alive = String(Boolean(body && body.session));
