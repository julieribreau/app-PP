// Adresse du backend. Sur un téléphone physique, `localhost` est le téléphone : poser
// EXPO_PUBLIC_API_URL=http://<IP du poste>:3001 dans apps/mobile/.env.local.
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001").replace(/\/$/, "");
export const API_V1 = `${API_URL}/v1`;
export const AUTH_BASE_PATH = "/v1/auth";
