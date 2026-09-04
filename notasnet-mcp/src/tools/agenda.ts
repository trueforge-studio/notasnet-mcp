import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { client } from "../session.js";
import { runTool } from "../toolHelper.js";

export function registerAgendaTools(server: McpServer): void {
  server.registerTool(
    "notasnet_get_agenda_by_date",
    {
      description: "Eventos de agenda de un día puntual (GET /agenda/{fecha}).",
      inputSchema: { date: z.string().describe('Fecha en formato "YYYY-MM-DD".') },
    },
    async ({ date }) => runTool(true, () => client.getAgendaByDate(date)),
  );

  server.registerTool(
    "notasnet_get_agenda_events",
    {
      description:
        "Eventos de agenda dentro de un rango de fechas (GET /agenda/eventos). Forma de respuesta distinta a " +
        "notasnet_get_agenda_by_date.",
      inputSchema: {
        from: z.string().describe("Inicio del rango, string ISO datetime. Mapea a fec1."),
        to: z.string().describe("Fin del rango, string ISO datetime. Mapea a fec2."),
        includeClasses: z.boolean().optional().describe("Si se deben incluir clases regulares además de eventos."),
      },
    },
    async ({ from, to, includeClasses }) => runTool(true, () => client.getAgendaEvents({ from, to, includeClasses })),
  );

  server.registerTool(
    "notasnet_get_agenda_event_detail",
    {
      description: "Detalle de un evento de agenda puntual, incluyendo adjuntos (GET /agenda/evento/{id}).",
      inputSchema: { eventId: z.number() },
    },
    async ({ eventId }) => runTool(true, () => client.getAgendaEventDetail(eventId)),
  );
}
