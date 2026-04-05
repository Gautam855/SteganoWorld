// Load API base from environment config, fallback to empty to avoid forced localhost in prod
const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
export const API_BASE_URL = baseUrl ? `${baseUrl}/api` : "/api";
