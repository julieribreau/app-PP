// Compte jetable créé et confirmé par l'API (inscription, lien de Mailpit suivi).
// Entrée : PREFIX. Sortie : output.email, output.password.
var API = "http://localhost:3001/v1/auth";
var email = "qa-e2e+" + PREFIX + "-" + Date.now() + "@exemple.test";
var password = "Qa-E2e-" + Math.floor(Math.random() * 1e9) + "-2026";
var res = http.post(API + "/sign-up/email", {
  headers: { "content-type": "application/json", origin: "http://localhost:3000" },
  body: JSON.stringify({
    email: email,
    password: password,
    name: "Alex Jetable",
    firstName: "Alex",
    lastName: "Jetable",
    locale: "en",
  }),
});
if (!res.ok) throw new Error("Inscription refusée : " + res.status + " " + res.body);
var link = null;
for (var i = 0; i < 20 && !link; i++) {
  var found = json(
    http.get(
      "http://localhost:8025/api/v1/search?query=" + encodeURIComponent('to:"' + email + '"'),
    ).body,
  ).messages;
  if (found && found.length > 0) {
    var text = json(http.get("http://localhost:8025/api/v1/message/" + found[0].ID).body).Text;
    link = text.match(/https?:\/\/[^\s)>\]]+/)[0];
  }
}
if (!link) throw new Error("E-mail de confirmation introuvable pour " + email);
var verified = http.get(link);
if (verified.status >= 400) throw new Error("Confirmation refusée : " + verified.status);
output.email = email;
output.password = password;
