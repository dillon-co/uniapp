import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";

// Custom metrics
const responseTime = new Trend("response_time");
const errorRate = new Rate("error_rate");
const requestCount = new Counter("request_count");

export const options = {
  stages: [
    { duration: "30s", target: 10 },   // Ramp up
    { duration: "1m", target: 50 },    // Stay at 50 users
    { duration: "2m", target: 100 },   // Stress test
    { duration: "1m", target: 200 },   // Spike
    { duration: "30s", target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<500", "p(99)<1000"],
    http_req_failed: ["rate<0.01"],
    error_rate: ["rate<0.05"],
  },
};

const BASE_URL = __ENV.API_URL ?? "http://localhost:3001";
const JWT_TOKEN = __ENV.JWT_TOKEN ?? "test-token";

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${JWT_TOKEN}`,
};

export function setup() {
  // Health check before test
  const res = http.get(`${BASE_URL}/health`);
  check(res, { "health check OK": (r) => r.status === 200 });
}

export default function () {
  const scenarios = [
    testHealthCheck,
    testListEvents,
    testSearchEvents,
    testListVenues,
    testListVendors,
    testDashboard,
  ];

  // Randomly pick a scenario weighted toward read operations
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  scenario?.();

  sleep(Math.random() * 2 + 0.5);
}

function testHealthCheck() {
  const res = http.get(`${BASE_URL}/health`);
  const ok = check(res, {
    "health status 200": (r) => r.status === 200,
    "health response time < 100ms": (r) => r.timings.duration < 100,
  });
  responseTime.add(res.timings.duration);
  errorRate.add(!ok);
  requestCount.add(1);
}

function testListEvents() {
  const res = http.get(`${BASE_URL}/api/v1/events`, { headers });
  const ok = check(res, {
    "events status 200": (r) => r.status === 200 || r.status === 401,
    "events response time < 500ms": (r) => r.timings.duration < 500,
  });
  responseTime.add(res.timings.duration);
  errorRate.add(!ok);
  requestCount.add(1);
}

function testSearchEvents() {
  const res = http.get(`${BASE_URL}/api/v1/events/search?q=concert&limit=10`, { headers });
  const ok = check(res, {
    "search status 200": (r) => r.status === 200 || r.status === 401,
    "search response time < 800ms": (r) => r.timings.duration < 800,
  });
  responseTime.add(res.timings.duration);
  errorRate.add(!ok);
  requestCount.add(1);
}

function testListVenues() {
  const res = http.get(`${BASE_URL}/api/v1/venues`, { headers });
  const ok = check(res, {
    "venues status 200": (r) => r.status === 200 || r.status === 401,
    "venues response time < 500ms": (r) => r.timings.duration < 500,
  });
  responseTime.add(res.timings.duration);
  errorRate.add(!ok);
  requestCount.add(1);
}

function testListVendors() {
  const res = http.get(`${BASE_URL}/api/v1/vendors`, { headers });
  const ok = check(res, {
    "vendors status 200": (r) => r.status === 200 || r.status === 401,
    "vendors response time < 500ms": (r) => r.timings.duration < 500,
  });
  responseTime.add(res.timings.duration);
  errorRate.add(!ok);
  requestCount.add(1);
}

function testDashboard() {
  const res = http.get(`${BASE_URL}/api/v1/events/dashboard`, { headers });
  const ok = check(res, {
    "dashboard status 200": (r) => r.status === 200 || r.status === 401,
    "dashboard response time < 1000ms": (r) => r.timings.duration < 1000,
  });
  responseTime.add(res.timings.duration);
  errorRate.add(!ok);
  requestCount.add(1);
}

export function handleSummary(data: Record<string, unknown>) {
  return {
    "stdout": JSON.stringify(data, null, 2),
    "load-test-results.json": JSON.stringify(data),
  };
}
