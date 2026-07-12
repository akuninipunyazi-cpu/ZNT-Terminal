const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type ApiErrorPayload = {
  detail?: string | any[];
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
    let errorMessage = "Request failed";
    
    if (payload.detail) {
      if (typeof payload.detail === "string") {
        errorMessage = payload.detail;
      } else if (Array.isArray(payload.detail)) {
        errorMessage = payload.detail
          .map((err) => `${err.loc[err.loc.length - 1]}: ${err.msg}`)
          .join(", ");
      } else {
        errorMessage = JSON.stringify(payload.detail);
      }
    } else if (payload.message) {
      errorMessage = payload.message;
    }
    
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}
