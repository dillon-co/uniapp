export const ROLES = [
  "platform_admin",
  "city_admin",
  "organizer",
  "venue_manager",
  "vendor",
  "volunteer",
  "attendee",
] as const;

export type Role = (typeof ROLES)[number];

export interface JwtPayload {
  userId: string;
  email: string;
  roles: Role[];
  cityId: string | null;
}

export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
}
