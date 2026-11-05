#!/bin/bash
# Double-clic dans le Finder : lance la stack complète et l app iOS sur le simulateur.
cd "$(dirname "$0")/../.." && ./scripts/local/test-ios.sh
echo; echo "Terminé (code $?). Journaux : .local-test/"; read -r -p "Entrée pour fermer"
