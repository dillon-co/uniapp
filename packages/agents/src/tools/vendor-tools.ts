import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import type { Database } from "@uniapp/db";
import { vendors } from "@uniapp/db";
import type { ToolDefinition } from "./venue-tools.js";

export function createVendorTools(db: Database): ToolDefinition<z.ZodObject<z.ZodRawShape>>[] {
  return [
    {
      name: "search_vendors",
      description: "Search for vendors by category and service area.",
      inputSchema: z.object({
        category: z.string().optional().describe("Vendor category (food, AV, security, staffing, photography, etc.)"),
        citySlugOrId: z.string().optional().describe("City name or ID for filtering service area"),
        limit: z.number().int().min(1).max(20).default(10).describe("Max results"),
      }),
      run: async (input) => {
        const conditions = [];
        if (input.category) {
          conditions.push(sql`${vendors.categories} @> ARRAY[${input.category}]::text[]`);
        }

        const results = await db.query.vendors.findMany({
          where: conditions.length > 0 ? and(...conditions) : undefined,
          columns: {
            id: true, name: true, categories: true, serviceArea: true,
            pricingRange: true, trustScore: true, verifiedAt: true,
          },
          limit: input.limit,
        });

        if (results.length === 0) return "No vendors found matching the criteria.";

        return results.map((v) => {
          const pricing = v.pricingRange as { minCents?: number; maxCents?: number; unit?: string };
          const priceStr = pricing.minCents
            ? `$${(pricing.minCents / 100).toLocaleString()}–$${((pricing.maxCents ?? 0) / 100).toLocaleString()}/${pricing.unit ?? "event"}`
            : "Price on request";
          return `ID: ${v.id}\nName: ${v.name}\nCategories: ${v.categories.join(", ")}\nService Area: ${v.serviceArea.join(", ")}\nPrice: ${priceStr}\nTrust: ${v.trustScore ?? 50}/100${v.verifiedAt ? " ✓ Verified" : ""}`;
        }).join("\n\n---\n\n");
      },
    },

    {
      name: "get_vendor_details",
      description: "Get full profile of a specific vendor including portfolio and certifications.",
      inputSchema: z.object({
        vendorId: z.string().uuid().describe("The vendor ID"),
      }),
      run: async (input) => {
        const vendor = await db.query.vendors.findFirst({
          where: eq(vendors.id, input.vendorId),
        });
        if (!vendor) return `Vendor ${input.vendorId} not found.`;

        return JSON.stringify({
          id: vendor.id,
          name: vendor.name,
          categories: vendor.categories,
          serviceArea: vendor.serviceArea,
          pricingRange: vendor.pricingRange,
          portfolio: vendor.portfolio,
          trustScore: vendor.trustScore,
          verified: !!vendor.verifiedAt,
        }, null, 2);
      },
    },
  ];
}
