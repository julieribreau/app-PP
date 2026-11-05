#!/usr/bin/env bash
# Monte toute la stack NutrionApp sur ce Mac et lance l'app sur le simulateur iOS :
# infra docker (postgres, redis, s3mock, mailpit), migrations, seed, API :3001, site :3000,
# puis l'app Expo en build de développement sur un iPhone simulé.
# Journaux : .local-test/*.log  ·  Arrêt : scripts/local/stop.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
LOG=.local-test
mkdir -p "$LOG"
exec > >(tee "$LOG/test-ios.log") 2>&1

need() { command -v "$1" >/dev/null 2>&1 || { echo "MANQUE : $1. $2"; exit 1; }; }
step() { echo; echo "==> $*"; }

step "Prérequis"
need node "Installe Node 24 : brew install node@24"
need docker "Ouvre Docker Desktop"
need xcrun "Installe Xcode et ses outils en ligne de commande : xcode-select --install"
need pod "Installe CocoaPods : brew install cocoapods"
# pnpm à la version du dépôt (packageManager) ; répare un téléchargement corrompu de pnpm.
PNPM_VERSION=$(node -p "require('./package.json').packageManager.split('@')[1]")
if ! pnpm -v >/dev/null 2>&1; then
  echo "pnpm $PNPM_VERSION indisponible : nettoyage du cache et nouvel essai"
  rm -rf "$HOME/Library/pnpm/.tools/pnpm/$PNPM_VERSION"
fi
if ! pnpm -v >/dev/null 2>&1; then
  npm install -g "pnpm@$PNPM_VERSION"
  hash -r
fi
pnpm -v >/dev/null 2>&1 || { echo "MANQUE : pnpm $PNPM_VERSION ne démarre pas (essaie : npm install -g pnpm@$PNPM_VERSION)."; exit 1; }
docker info >/dev/null 2>&1 || { echo "MANQUE : Docker Desktop n'est pas démarré."; exit 1; }
node -v; pnpm -v; xcodebuild -version 2>/dev/null | sed -n 1p || true; pod --version || true

step "Dépendances"
[ -f .env ] || cp .env.example .env
pnpm install

step "Infra docker, migrations, seed"
docker compose up -d
for i in $(seq 1 30); do docker compose exec -T db pg_isready -U postgres >/dev/null 2>&1 && break; sleep 2; done
make db-migrate
make seed

step "API (:3001) et site (:3000)"
pkill -f "nest start" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
nohup make backend > "$LOG/backend.log" 2>&1 &
echo $! > "$LOG/backend.pid"
for i in $(seq 1 90); do curl -sf http://localhost:3001/v1/health >/dev/null && break; sleep 2; done
curl -sf http://localhost:3001/v1/health >/dev/null || { echo "L'API ne répond pas : voir $LOG/backend.log"; exit 1; }
echo "API OK"
nohup make web > "$LOG/web.log" 2>&1 &
echo $! > "$LOG/web.pid"

step "App iOS sur le simulateur"
# Le simulateur partage le réseau du Mac : localhost suffit (API et images S3).
echo "EXPO_PUBLIC_API_URL=http://localhost:3001" > apps/mobile/.env.local
cd apps/mobile
npx expo run:ios 2>&1 | tee "../../$LOG/ios.log"
