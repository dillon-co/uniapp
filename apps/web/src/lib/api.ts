const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface ApiOptions extends RequestInit {
  token?: string;
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { token, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...Object.fromEntries(
      Object.entries(customHeaders ?? {}).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string"
      )
    ),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({
      title: "Request failed",
      detail: res.statusText,
      status: res.status,
    }));
    throw new ApiError(error.title, error.status, error.detail);
  }

  return res.json();
}

export class ApiError extends Error {
  constructor(
    public title: string,
    public status: number,
    public detail: string,
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<{ data: AuthResponse }>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (data: { email: string; password: string; name: string; cityId?: string }) =>
    apiFetch<{ data: AuthResponse }>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  refresh: (refreshToken: string) =>
    apiFetch<{ data: { accessToken: string; refreshToken: string; expiresIn: number } }>(
      "/api/v1/auth/refresh",
      { method: "POST", body: JSON.stringify({ refreshToken }) },
    ),

  forgotPassword: (email: string) =>
    apiFetch<{ data: { message: string } }>("/api/v1/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, password: string) =>
    apiFetch<{ data: { message: string } }>("/api/v1/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    }),

  me: (token: string) =>
    apiFetch<{ data: UserProfile }>("/api/v1/auth/me", { token }),
};

interface AuthResponse {
  user: { id: string; email: string; name: string; roles: string[] };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  roles: string[];
  cityId: string | null;
  trustScore: number | null;
  createdAt: string;
}
