import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { client } from "../session.js";
import { runTool } from "../toolHelper.js";

/**
 * Directorio público de colegios (región → comuna → colegio). No requiere sesión — sirve
 * para encontrar el slug `colegio` que exige `notasnet_login`.
 */
export function registerColegioTools(server: McpServer): void {
  server.registerTool(
    "notasnet_list_regions",
    {
      description: "Regiones de Chile (directorio público, sin sesión) (GET /colegio/region).",
      inputSchema: {},
    },
    async () => runTool(false, () => client.listRegions()),
  );

  server.registerTool(
    "notasnet_list_comunas",
    {
      description: "Comunas de una región (directorio público, sin sesión) (GET /colegio/comuna?reg=).",
      inputSchema: { regionCode: z.number().describe("Código de región, ej. Region.Codigo.") },
    },
    async ({ regionCode }) => runTool(false, () => client.listComunas(regionCode)),
  );

  server.registerTool(
    "notasnet_list_schools",
    {
      description: "Colegios con Notasnet en una comuna (directorio público, sin sesión) (GET /colegio/list?com=).",
      inputSchema: { communeCode: z.number().describe("Código de comuna, ej. Comuna.Codigo.") },
    },
    async ({ communeCode }) => runTool(false, () => client.listSchools(communeCode)),
  );

  server.registerTool(
    "notasnet_get_school_detail",
    {
      description: "Detalle público de un colegio (directorio público, sin sesión) (GET /colegio/{codigo}).",
      inputSchema: { schoolCode: z.string().describe("Slug del colegio, ej. SchoolListItem.Codigo.") },
    },
    async ({ schoolCode }) => runTool(false, () => client.getSchoolDetail(schoolCode)),
  );
}
