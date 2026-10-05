const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api").replace(/\/+$/, "");
export const API_UNAUTHORIZED_EVENT = "auditchain:api-unauthorized";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function extractMessage(payload: unknown, status: number) {
  if (typeof payload === "string" && payload.trim()) return payload;

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    for (const key of ["error", "message", "detail"]) {
      if (typeof record[key] === "string" && record[key].trim()) return record[key];
    }
  }

  return `Request gagal (${status}).`;
}

async function readResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return null;

  const text = await response.text();
  if (!text) return null;

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  return text;
}

export async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/${path.replace(/^\/+/, "")}`, {
      ...options,
      cache: options.method?.toUpperCase() === "GET" || !options.method ? "no-store" : options.cache,
      headers,
    });
  } catch (error) {
    throw new ApiError("Backend tidak dapat dihubungi.", 0, error);
  }

  const payload = await readResponseBody(response);
  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new Event(API_UNAUTHORIZED_EVENT));
    }
    throw new ApiError(extractMessage(payload, response.status), response.status, payload);
  }

  return payload as T;
}

export const apiClient = {
  get<T>(path: string, token?: string) {
    return request<T>(path, { method: "GET" }, token);
  },
  post<T>(path: string, body: unknown, token?: string) {
    return request<T>(path, { method: "POST", body: JSON.stringify(body) }, token);
  },
  put<T>(path: string, body: unknown, token?: string) {
    return request<T>(path, { method: "PUT", body: JSON.stringify(body) }, token);
  },
};
