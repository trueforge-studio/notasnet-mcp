import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CommunicationChannelType } from "@trueforge-studio/notasnet-client";
import { client } from "../session.js";
import { runTool } from "../toolHelper.js";

const channelType = z.enum(["Colegio", "Curso", "Subsector"]);

export function registerComunicaTools(server: McpServer): void {
  server.registerTool(
    "notasnet_list_communications",
    {
      description: "Comunicados de un canal (colegio/curso/subsector) (GET /comunica).",
      inputSchema: {
        channelType: channelType.describe("Tipo de canal. Mapea a tipo."),
        channelId: z.number().describe("Id del canal. Mapea a id."),
        search: z.string().optional().describe("Texto de búsqueda. Mapea a buscar."),
      },
    },
    async ({ channelType: ct, channelId, search }) =>
      runTool(true, () =>
        client.listCommunications({ channelType: ct as CommunicationChannelType, channelId, search }),
      ),
  );

  server.registerTool(
    "notasnet_get_communication",
    {
      description: "Detalle completo de un comunicado (GET /comunica/{id}).",
      inputSchema: { id: z.number() },
    },
    async ({ id }) => runTool(true, () => client.getCommunication(id)),
  );

  server.registerTool(
    "notasnet_list_communication_channels",
    {
      description: "Canales de comunicación disponibles, con contador de no leídos (GET /comunica/contactos).",
      inputSchema: { search: z.string().optional() },
    },
    async ({ search }) => runTool(true, () => client.listCommunicationChannels(search)),
  );

  server.registerTool(
    "notasnet_get_communication_channel_status",
    {
      description: "Detalle/estado de un canal de contacto puntual (GET /comunica/contacto/notificacion).",
      inputSchema: { search: z.string().optional() },
    },
    async ({ search }) => runTool(true, () => client.getCommunicationChannelStatus(search)),
  );

  server.registerTool(
    "notasnet_list_communication_notifications",
    {
      description:
        "Historial de notificaciones de comunicaciones (GET /comunica/notificaciones). Sin paginación " +
        "confirmada por el backend: puede devolver el historial completo en una sola respuesta.",
      inputSchema: { search: z.string().optional() },
    },
    async ({ search }) => runTool(true, () => client.listCommunicationNotifications(search)),
  );

  server.registerTool(
    "notasnet_get_communication_notification",
    {
      description: "Detalle de una notificación de comunicación puntual (GET /comunica/notificacion/{id}).",
      inputSchema: { id: z.number() },
    },
    async ({ id }) => runTool(true, () => client.getCommunicationNotification(id)),
  );
}
