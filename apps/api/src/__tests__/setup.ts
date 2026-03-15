// Test setup: load environment variables for test runs
import "dotenv/config";

process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://uniapp:uniapp_dev@localhost:5432/uniapp_test";
process.env.JWT_SECRET = "test-secret-32-chars-minimum-len";
process.env.NODE_ENV = "test";
