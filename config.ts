export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://daykeeper-api.onrender.com"
    : "http://localhost:3001")
