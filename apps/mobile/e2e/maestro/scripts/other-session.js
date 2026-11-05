// Ouvre une autre session (« Windows ») pour EMAIL / PASSWORD, comme depuis un ordinateur.
// Sortie : output.cookie, pour vérifier ensuite qu'elle a bien été révoquée.
var API = "http://localhost:3001/v1/auth";
var res = http.post(API + "/sign-in/email", {
  headers: {
    "content-type": "application/json",
    origin: "http://localhost:3000",
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
  },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
if (!res.ok) throw new Error("Connexion refusée : " + res.status + " " + res.body);
var setCookie = res.headers["set-cookie"] || res.headers["Set-Cookie"];
var raw = Array.isArray(setCookie) ? setCookie.join(";") : String(setCookie);
output.cookie = raw.match(/nutrion\.session_token=[^;]+/)[0];
