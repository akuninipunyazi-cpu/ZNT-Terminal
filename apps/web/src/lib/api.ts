const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type ApiErrorPayload = {
  detail?: string;
  message?: string;
};

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token =
    typeof window !== "undefined" ? window.localStorage.getItem("znt_token") : null;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers
    }
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
    throw new Error(payload.detail ?? payload.message ?? "Request failed");
  }

  return response.json() as Promise<T>;
}
