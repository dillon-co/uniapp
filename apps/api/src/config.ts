/**
 * Centralized configuration for UniApp API
 * Reads from environment variables with sensible defaults for development.
 * In production, required variables are validated at startup.
 */

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function getEnvInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  if (isNaN(n)) throw new Error(`Environment variable ${key} must be an integer, got: ${raw}`);
  return n;
}

const isProduction = process.env.NODE_ENV === "production";

function validateProductionConfig() {
  const required: string[] = [
    "DATABASE_URL",
    "ANTHROPIC_API_KEY",
    "JWT_SECRET",
    "REDIS_URL",
    "NATS_URL",
  ];

  const missing: string[] = [];
  for (const key of required) {
    if (!process.env[key]) missing.push(key);
  }

  // JWT secret must be strong in production
  const jwtSecret = process.env.JWT_SECRET ?? "";
  if (jwtSecret.length < 32) {
    missing.push("JWT_SECRET (must be at least 32 characters)");
  }

  if (missing.length > 0) {
    throw new Error(
      `Production startup failed — missing or invalid environment variables:\n  ${missing.join("\n  ")}`,
    );
  }
}

export function buildConfig() {
  if (isProduction) {
    validateProductionConfig();
  }

  return {
    server: {
      host: getEnv("HOST", "0.0.0.0"),
      port: getEnvInt("PORT", 3001),
      logLevel: getEnv("LOG_LEVEL", isProduction ? "info" : "debug"),
      nodeEnv: getEnv("NODE_ENV", "development"),
    },

    db: {
      url: isProduction
        ? requireEnv("DATABASE_URL")
        : getEnv("DATABASE_URL", "postgres://uniapp:uniapp_dev@localhost:5432/uniapp"),
      poolSize: getEnvInt("DB_POOL_SIZE", isProduction ? 20 : 5),
    },

    redis: {
      url: getEnv("REDIS_URL", "redis://localhost:6379"),
    },

    nats: {
      url: getEnv("NATS_URL", "nats://localhost:4222"),
    },

    auth: {
      jwtSecret: getEnv("JWT_SECRET", "dev-secret-change-me-in-production-32chars"),
      tokenExpiry: getEnv("JWT_EXPIRES_IN", "15m"),
      refreshExpiry: getEnv("JWT_REFRESH_EXPIRES_IN", "7d"),
    },

    ai: {
      apiKey: isProduction ? requireEnv("ANTHROPIC_API_KEY") : getEnv("ANTHROPIC_API_KEY", ""),
      model: getEnv("AI_MODEL", "claude-opus-4-6"),
      maxBudgetUsd: parseFloat(getEnv("AI_MAX_BUDGET_USD", "5.00")),
      maxBudgetHardCapUsd: parseFloat(getEnv("AI_MAX_BUDGET_HARD_CAP_USD", "50.00")),
    },

    rateLimit: {
      max: getEnvInt("RATE_LIMIT_MAX", 1000),
      windowMs: getEnvInt("RATE_LIMIT_WINDOW_MS", 60_000),
    },

    cors: {
      allowedOrigins: getEnv(
        "ALLOWED_ORIGINS",
        isProduction ? "https://uniapp.dev" : "http://localhost:3000",
      )
        .split(",")
        .map((o) => o.trim()),
    },
  } as const;
}

export type AppConfig = ReturnType<typeof buildConfig>;

// Singleton config — built once at module load (catches errors early)
let _config: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!_config) {
    _config = buildConfig();
  }
  return _config;
}
