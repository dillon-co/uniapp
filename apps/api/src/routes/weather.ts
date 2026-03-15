import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/auth.js";

const CONDITIONS = [
  "Sunny",
  "Partly Cloudy",
  "Mostly Cloudy",
  "Overcast",
  "Light Rain",
  "Moderate Rain",
  "Thunderstorms",
  "Snow",
  "Fog",
  "Windy",
] as const;

function generateWeatherForDate(lat: number, lng: number, date: Date) {
  // Deterministic mock based on lat/lng/date seed
  const seed = Math.abs(Math.sin(lat + lng + date.getMonth()) * 100) % 100;
  const month = date.getMonth(); // 0-11
  const isWinter = month < 3 || month > 10;
  const isSummer = month >= 5 && month <= 8;

  const baseTemp = isWinter ? 35 : isSummer ? 78 : 58;
  const tempVariation = (seed % 20) - 10;
  const temperatureF = Math.round(baseTemp + tempVariation);
  const temperatureC = Math.round((temperatureF - 32) * (5 / 9));

  const conditionIndex = Math.floor(seed % CONDITIONS.length);
  const condition = CONDITIONS[conditionIndex]!;

  const precipitationChance =
    condition.includes("Rain") ? 70 + Math.round(seed % 20)
    : condition === "Thunderstorms" ? 90
    : condition === "Snow" ? 80
    : Math.round(seed % 30);

  const windMph = Math.round(5 + (seed % 25));
  const humidity = Math.round(40 + (seed % 45));
  const uvIndex = condition === "Sunny" ? Math.round(5 + (seed % 6)) : Math.round(seed % 4);
  const visibilityMiles = condition === "Fog" ? Math.round(1 + (seed % 3)) : 10;

  return {
    date: date.toISOString().split("T")[0],
    temperature: {
      fahrenheit: temperatureF,
      celsius: temperatureC,
    },
    condition,
    precipitationChance,
    precipitationType:
      condition === "Snow" ? "snow"
      : condition.includes("Rain") || condition === "Thunderstorms" ? "rain"
      : null,
    wind: {
      speedMph: windMph,
      direction: ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.floor(seed % 8)],
      gustMph: Math.round(windMph * 1.5),
    },
    humidity,
    uvIndex,
    visibilityMiles,
    sunrise: `${6 + Math.floor(seed % 2)}:${String(Math.floor(seed % 60)).padStart(2, "0")} AM`,
    sunset: `${7 + Math.floor(seed % 2)}:${String(Math.floor(seed % 60)).padStart(2, "0")} PM`,
    eventRisk:
      condition === "Thunderstorms" ? "high"
      : condition.includes("Rain") || condition === "Snow" ? "moderate"
      : condition === "Fog" ? "low"
      : "minimal",
  };
}

export const weatherRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/v1/weather?lat=&lng=&date=
  app.get("/", { onRequest: [authenticate] }, async (request) => {
    const { lat, lng, date } = z
      .object({
        lat: z.coerce.number().min(-90).max(90),
        lng: z.coerce.number().min(-180).max(180),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
      })
      .parse(request.query);

    const targetDate = new Date(date + "T12:00:00Z");
    const weather = generateWeatherForDate(lat, lng, targetDate);

    // Also return 7-day forecast
    const forecast = Array.from({ length: 7 }, (_, i) => {
      const forecastDate = new Date(targetDate);
      forecastDate.setDate(forecastDate.getDate() + i);
      return generateWeatherForDate(lat, lng, forecastDate);
    });

    return {
      data: {
        location: { lat, lng },
        current: weather,
        forecast,
        source: "uniapp-mock-weather-service",
        generatedAt: new Date().toISOString(),
      },
    };
  });
};
