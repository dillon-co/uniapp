import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    cityContext: { cityId: string | null; isMultiCityAdmin: boolean };
  }
}

/**
 * Multi-tenant middleware.
 * Validates that requests accessing city-scoped resources use the
 * correct cityId from the user's JWT payload.
 *
 * platform_admin has access to all cities.
 * city_admin is scoped to their assigned cityId.
 * All other roles are scoped to their profile cityId.
 */
const multiTenantPlugin: FastifyPluginAsync = async (app) => {
  app.decorateRequest("cityContext", { cityId: null, isMultiCityAdmin: false });

  app.addHook("preHandler", async (request) => {
    // Only applies to authenticated requests
    if (!request.jwtPayload?.userId) return;

    const { roles, cityId } = request.jwtPayload;
    const isMultiCityAdmin = roles.includes("platform_admin");

    request.cityContext = {
      cityId: isMultiCityAdmin ? null : cityId,
      isMultiCityAdmin,
    };
  });
};

export const multiTenant = fp(multiTenantPlugin, { name: "multi-tenant" });
