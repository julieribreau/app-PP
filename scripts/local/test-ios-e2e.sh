#!/usr/bin/env bash
# Rejoue la suite Maestro de l'app mobile (apps/mobile/e2e/maestro) sur un ou plusieurs
# simulateurs iOS, contre la stack locale montée par scripts/local/test-ios.sh (API :3001,
# site :3000, Mailpit :8025, Metro :8081, app installée sur les simulateurs).
#
#   scripts/local/test-ios-e2e.sh                     # simulateur(s) démarré(s)
#   scripts/local/test-ios-e2e.sh <udid> [<udid>…]    # simulateurs choisis (démarrés au besoin)
#   ONLY="02-shop.yaml 03-product.yaml" scripts/local/test-ios-e2e.sh   # quelques parcours
#   SKIP_BIOMETRIC=1 / SKIP_CAPTURES=1                 # sans Face ID / sans les captures
#
# Avant chaque appareil : Camille et les comptes jetables de la suite sont remis à l'état du seed.
# Sortie : .local-test/maestro/<appareil>/ (rapport JUnit, captures, journaux Maestro).
set -euo pipefail
cd "$(dirname "$0")/../.."
ROOT=$PWD
SUITE=apps/mobile/e2e/maestro
OUT=$ROOT/.local-test/maestro
APP_ID=io.bullify.nutrion-app
mkdir -p "$OUT"

step() { echo; echo "==> $*"; }
fail() { echo "ÉCHEC : $*" >&2; exit 1; }

step "Prérequis"
# Java 17+ pour Maestro : celui du système, sinon un openjdk de Homebrew (jamais installé ici).
if ! java -version >/dev/null 2>&1; then
  for jdk in /opt/homebrew/opt/openjdk@21 /opt/homebrew/opt/openjdk@17 /opt/homebrew/opt/openjdk; do
    if [ -x "$jdk/bin/java" ]; then
      export JAVA_HOME="$jdk/libexec/openjdk.jdk/Contents/Home" PATH="$jdk/bin:$PATH"
      break
    fi
  done
fi
java -version >/dev/null 2>&1 || fail "Java 17+ manque (brew install openjdk@21)."
export PATH="$HOME/.maestro/bin:$PATH"
command -v maestro >/dev/null || fail 'Maestro manque : curl -fsSL "https://get.maestro.mobile.dev" | bash'
export MAESTRO_CLI_NO_ANALYTICS=1 MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true
# Au démarrage, Maestro sonde les ports d'émulateur Android (5555-5585) en IPv4 et attend sans
# fin une réponse ADB : un autre service du Mac qui écoute là (NTKDaemon sur 5563…) le bloque.
# Préférer IPv6 pour « localhost » évite ces services, qui n'écoutent qu'en IPv4.
export MAESTRO_OPTS="${MAESTRO_OPTS:-} -Djava.net.preferIPv6Addresses=true"
for url in http://localhost:3001/v1/health http://localhost:8025/api/v1/info http://localhost:8081/status; do
  curl -sf -m 5 "$url" >/dev/null || fail "$url ne répond pas : lance d'abord scripts/local/test-ios.sh."
done
java -version 2>&1 | head -1
maestro --version 2>/dev/null | tail -1

# Simulateurs : ceux donnés, sinon ceux démarrés.
DEVICES=("$@")
if [ ${#DEVICES[@]} -eq 0 ]; then
  while IFS= read -r udid; do DEVICES+=("$udid"); done < <(xcrun simctl list devices booted | sed -n 's/.*(\([0-9A-F-]\{36\}\)) (Booted).*/\1/p')
fi
[ ${#DEVICES[@]} -gt 0 ] || fail "aucun simulateur démarré."

DB_NAME=$(sed -n 's#^DATABASE_URL=.*/\([^/?]*\).*#\1#p' .env 2>/dev/null | head -1)
reset_data() {
  # Remet Camille à l'état du seed (le seed ne recrée que ce qui manque) et retire les comptes
  # jetables des passages précédents. Base locale du compose uniquement.
  docker compose exec -T db psql -U postgres -d "${DB_NAME:-nutrion-app}" -v ON_ERROR_STOP=1 -q -c \
    "DELETE FROM \"user\" WHERE email = 'camille.martin@exemple.fr' OR email LIKE 'qa-e2e+%@exemple.test';"
  make seed >/dev/null
}

# Capteur Face ID simulé, tenu sur « reconnu » (match) ou « non reconnu » (nomatch) tant que le
# parcours tourne : la feuille Face ID peut s'ouvrir à tout moment.
FACE_PID=
face() {
  local udid=$1 result=$2
  (while true; do
    xcrun simctl spawn "$udid" notifyutil -p "com.apple.BiometricKit_Sim.pearl.$result" >/dev/null 2>&1
    sleep 2
  done) &
  FACE_PID=$!
}
face_stop() { [ -n "$FACE_PID" ] && kill "$FACE_PID" 2>/dev/null; FACE_PID=; }
trap face_stop EXIT

run() { # run <udid> <nom> <dossier> <fichiers…>
  local udid=$1 name=$2 tag=$3
  shift 3
  # Garde-fou : un parcours bloqué ne bloque pas la suite entière (1 h par lot).
  perl -e 'alarm 3600; exec @ARGV' maestro --device "$udid" test \
    --format junit --output "$OUT/$name/report-$tag.xml" \
    --test-output-dir "$OUT/$name" \
    -e DEVICE="$name" -e LOCALE=en -e THEME=light \
    "$@"
}

STATUS=0
for udid in "${DEVICES[@]}"; do
  label=$(xcrun simctl list devices | sed -n "s/^ *\(.*\) ($udid).*/\1/p" | head -1)
  name=$(echo "${label:-$udid}" | tr ' ' '-' | tr -cd '[:alnum:]-')
  step "$label ($udid) → $OUT/$name"
  xcrun simctl boot "$udid" 2>/dev/null || true
  xcrun simctl bootstatus "$udid" -b >/dev/null
  xcrun simctl get_app_container "$udid" "$APP_ID" >/dev/null 2>&1 ||
    fail "l'app n'est pas installée sur $label (xcrun simctl install $udid <NutrionApp.app>)."
  rm -rf "${OUT:?}/$name" && mkdir -p "$OUT/$name"
  # Simulateur en anglais (langue de départ de la suite), photo pour l'avatar, Face ID enrôlé.
  xcrun simctl spawn "$udid" defaults write -g AppleLanguages -array en-US fr-FR
  xcrun simctl addmedia "$udid" "$SUITE/assets/avatar-qa.png"
  xcrun simctl spawn "$udid" notifyutil -s com.apple.BiometricKit.enrollmentChanged 1
  xcrun simctl spawn "$udid" notifyutil -p com.apple.BiometricKit.enrollmentChanged

  reset_data
  if [ -n "${ONLY:-}" ]; then
    # shellcheck disable=SC2086
    (cd "$SUITE" && run "$udid" "$name" only $ONLY) || STATUS=1
  else
    flows=()
    for f in "$SUITE"/[0-9][0-9]-*.yaml; do
      [[ $f == *captures* ]] || flows+=("$(basename "$f")")
    done
    (cd "$SUITE" && run "$udid" "$name" suite "${flows[@]}") || STATUS=1
    if [ "${SKIP_CAPTURES:-}" != 1 ]; then
      reset_data
      (cd "$SUITE" && run "$udid" "$name" captures 11-captures.yaml) || STATUS=1
    fi
  fi

  if [ "${SKIP_BIOMETRIC:-}" != 1 ] && [ -z "${ONLY:-}" ]; then
    reset_data
    face "$udid" match
    (cd "$SUITE" && run "$udid" "$name" face-enable biometric/enable.yaml) || STATUS=1
    (cd "$SUITE" && run "$udid" "$name" face-match biometric/unlock-match.yaml) || STATUS=1
    face_stop
    face "$udid" nomatch
    (cd "$SUITE" && run "$udid" "$name" face-nomatch biometric/unlock-nomatch.yaml) || STATUS=1
    face_stop
  fi
done

step "Rapports"
for report in "$OUT"/*/report-*.xml; do
  [ -f "$report" ] || continue
  tests=$(sed -n 's/.*<testsuite [^>]*tests="\([0-9]*\)".*/\1/p' "$report" | head -1)
  failures=$(sed -n 's/.*<testsuite [^>]*failures="\([0-9]*\)".*/\1/p' "$report" | head -1)
  echo "${report#"$ROOT"/} : ${tests:-?} parcours, ${failures:-?} en échec"
done
[ "$STATUS" -eq 0 ] && echo "Tout est vert." || echo "Des parcours échouent : voir $OUT."
exit "$STATUS"
