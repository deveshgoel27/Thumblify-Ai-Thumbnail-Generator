import axios from "axios";

// In production the API is proxied through this same domain (see vercel.json),
// so relative URLs are the default there. Locally, client/.env points
// VITE_BASE_URL at the Express server on port 3000.
const baseURL = import.meta.env.VITE_BASE_URL || (import.meta.env.DEV ? "http://localhost:3000" : "/");

const api = axios.create({
    baseURL,
    withCredentials: true
})

export default api;
