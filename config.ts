export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://daykeeper-api.onrender.com"
    : "http://localhost:3001")

// Google Identity Services Web client ID (used to obtain an ID token in-browser
// which is then verified by the backend via POST /auth/google).
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""
