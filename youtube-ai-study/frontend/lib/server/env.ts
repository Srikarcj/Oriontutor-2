export function readRequired(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function readOptional(name: string): string | undefined {
  const value = process.env[name];
  if (value == null || value === "") return undefined;
  return value;
}

export const serverEnv = {
  backendUrl: process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000",
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
};
