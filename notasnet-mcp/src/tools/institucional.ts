import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { client } from "../session.js";
import { runTool } from "../toolHelper.js";

export function registerInstitucionalTools(server: McpServer): void {
  server.registerTool(
    "notasnet_is_authenticated",
    {
      description:
        "Llama directamente a GET /login/isauth para verificar si la sesión sigue autenticada en el backend. " +
        "Para chequear si el servidor MCP tiene una cookie de sesión cargada sin llamada de red, usa " +
        "notasnet_session_status.",
      inputSchema: {},
    },
    async () => runTool(true, () => client.isAuthenticated()),
  );

  server.registerTool(
    "notasnet_get_pin_status",
    {
      description:
        "Estado de un PIN de seguridad adicional (GET /login/pinstatus). Propósito exacto no confirmado por el " +
        "backend.",
      inputSchema: {},
    },
    async () => runTool(true, () => client.getPinStatus()),
  );

  server.registerTool(
    "notasnet_get_menu",
    {
      description: "Estructura del menú principal de la app, secciones habilitadas (GET /login/menu).",
      inputSchema: {},
    },
    async () => runTool(true, () => client.getMenu()),
  );

  server.registerTool(
    "notasnet_get_col_config",
    {
      description: "Parámetro de configuración del colegio por clave (GET /colconfig?key=).",
      inputSchema: { key: z.string() },
    },
    async ({ key }) => runTool(true, () => client.getColConfig(key)),
  );

  server.registerTool(
    "notasnet_list_public_news",
    {
      description: "Publicaciones/noticias del colegio (GET /publicas?top=).",
      inputSchema: { top: z.boolean().optional().describe("Si es true, filtra solo las destacadas.") },
    },
    async ({ top }) => runTool(true, () => client.listPublicNews(top)),
  );

  server.registerTool(
    "notasnet_get_public_news_detail",
    {
      description: "Detalle de una publicación/noticia (GET /publicas/{id}).",
      inputSchema: { id: z.number() },
    },
    async ({ id }) => runTool(true, () => client.getPublicNewsDetail(id)),
  );

  server.registerTool(
    "notasnet_get_premat_config",
    {
      description: "Configuración del proceso de prematrícula del colegio (GET /premat/config).",
      inputSchema: {},
    },
    async () => runTool(true, () => client.getPrematConfig()),
  );

  server.registerTool(
    "notasnet_get_convivencia_denuncia_config",
    {
      description: "Configuración del formulario de convivencia escolar (GET /convivencia/denuncia/config).",
      inputSchema: {},
    },
    async () => runTool(true, () => client.getConvivenciaDenunciaConfig()),
  );
}
