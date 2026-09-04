import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { client } from "../session.js";
import { runTool } from "../toolHelper.js";

export function registerNotificaTools(server: McpServer): void {
  server.registerTool(
    "notasnet_get_latest_notifications",
    {
      description: "Últimas N notificaciones, usado para el centro de notificaciones/badge (GET /notifica/latest).",
      inputSchema: { last: z.number().describe("Cantidad de notificaciones a traer. Mapea a last.") },
    },
    async ({ last }) => runTool(true, () => client.getLatestNotifications(last)),
  );

  server.registerTool(
    "notasnet_get_notification_event_detail",
    {
      description: "Detalle de una notificación ligada a un evento de agenda (GET /notifica/evento?noti=).",
      inputSchema: { notificationId: z.number().describe("Mapea a noti.") },
    },
    async ({ notificationId }) => runTool(true, () => client.getNotificationEventDetail(notificationId)),
  );

  server.registerTool(
    "notasnet_mark_notification_seen",
    {
      description:
        'Marca una notificación como vista (POST /notifica/visto). "subject" es el valor completo del campo ' +
        'Sujeto/SujetoCodigo:Id del registro (formato "<prefijo>:<id>", ej. "ag:1234567" para un evento de ' +
        'agenda). Solo se confirmó el prefijo "ag:" contra el backend real.',
      inputSchema: { subject: z.string() },
    },
    async ({ subject }) => runTool(true, () => client.markNotificationSeen(subject)),
  );

  server.registerTool(
    "notasnet_get_unread_count",
    {
      description: "Contador total de notificaciones sin leer (GET /notisinleer).",
      inputSchema: {},
    },
    async () => runTool(true, () => client.getUnreadCount()),
  );

  server.registerTool(
    "notasnet_get_menu_notification_counts",
    {
      description: "Contadores de notificaciones por ítem del menú principal (GET /login/menu/notifica).",
      inputSchema: {},
    },
    async () => runTool(true, () => client.getMenuNotificationCounts()),
  );
}
