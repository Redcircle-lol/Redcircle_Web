// Authentication utility functions

export interface User {
  id: string;
  redditId: string;
  username: string;
  avatarUrl?: string;
  email?: string;
  points: number;
  walletAddress?: string;
}

// Store auth token
export function setAuthToken(token: string): void {
  localStorage.setItem("authToken", token);
}

// Get auth token
export function getAuthToken(): string | null {
  return localStorage.getItem("authToken");
}

// Remove auth token
export function removeAuthToken(): void {
  localStorage.removeItem("authToken");
  localStorage.removeItem("user");
}

// Store user data
export function setUser(user: User): void {
  localStorage.setItem("user", JSON.stringify(user));
}

// Get user data
export function getUser(): User | null {
  const userStr = localStorage.getItem("user");
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  return getAuthToken() !== null && getUser() !== null;
}

// Logout user
export function logout(): void {
  removeAuthToken();
  window.location.href = "/";
}

// Get API URL
export function getApiUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL;
  
  // In development, use localhost if not set
  if (!apiUrl && import.meta.env.DEV) {
    return "http://localhost:3000";
  }
  
  if (!apiUrl) {
    console.error('❌ VITE_API_URL is not set in environment variables');
    throw new Error('API URL not configured. Please set VITE_API_URL in .env');
  }
  
  return apiUrl;
}

// Fetch with auth token
export async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAuthToken();
  const apiUrl = getApiUrl();

  return fetch(`${apiUrl}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      ...(token && { Authorization: `Bearer ${token}` }),
      "Content-Type": "application/json",
    },
    credentials: "include",
  });
}

