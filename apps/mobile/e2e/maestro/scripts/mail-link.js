// Dernier lien http(s) de l'e-mail le plus récent reçu par EMAIL dans Mailpit (API HTTP).
// Entrée : EMAIL, et SUBJECT (facultatif, morceau du sujet). Sortie : output.link.
var MAILPIT = "http://localhost:8025/api/v1";
var query = encodeURIComponent(
  'to:"' + EMAIL + '"' + (typeof SUBJECT !== "undefined" ? ' subject:"' + SUBJECT + '"' : ""),
);
var found = json(http.get(MAILPIT + "/search?query=" + query).body).messages;
if (!found || found.length === 0) throw new Error("Aucun e-mail pour " + EMAIL);
var message = json(http.get(MAILPIT + "/message/" + found[0].ID).body);
var links = message.Text.match(/https?:\/\/[^\s)>\]]+/g);
if (!links) throw new Error("Pas de lien dans « " + message.Subject + " »");
output.link = links[0];
output.subject = message.Subject;
