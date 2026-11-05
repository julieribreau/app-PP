// Metro : configuration Expo, enrichie par Sentry (identifiants de débogage dans le
// bundle, pour rattacher chaque erreur à ses sourcemaps).
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

module.exports = getSentryExpoConfig(__dirname);
