import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { client } from "../session.js";
import { errorResult, runTool } from "../toolHelper.js";

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
    "notasnet_get_notification_content",
    {
      description:
        "Título, texto completo (HTML) y adjuntos de una notificación, dado su idNotifica y/o su Sujeto " +
        '("ag:<id>"). Prueba en orden GET /notifica/evento (la ruta que usa la web), GET /comunica/notificacion, ' +
        "GET /comunica/{id} y /agenda/evento/{id} con el id del Sujeto, y por último busca en los canales un " +
        "comunicado cercano en fecha cuyo texto coincida. Los adjuntos de `archivos` se leen con " +
        "notasnet_get_attachment_content (FileName + Path). Si `complete` es false, el backend ya no expone el " +
        "contenido (la web muestra \"Notificación Obsoleta\") y solo hay una vista previa de ~200 caracteres. " +
        "No marca la notificación como vista.",
      inputSchema: {
        notificationId: z.number().optional().describe("idNotifica (de notasnet_get_latest_notifications)."),
        subject: z.string().optional().describe('Sujeto, ej. "ag:2205484". Úsalo solo si no tienes idNotifica.'),
      },
    },
    async ({ notificationId, subject }) =>
      notificationId === undefined && !subject
        ? errorResult("Indica notificationId o subject.")
        : runTool(true, () => client.getNotificationContent({ notificationId, subject })),
  );

  server.registerTool(
    "notasnet_mark_notification_seen",
    {
      description:
        'Marca una notificación como vista (POST /notifica/visto). "subject" es el valor completo del campo ' +
        'Sujeto/SujetoCodigo:Id del registro (formato "<prefijo>:<id>", ej. "ag:1234567" para un evento de ' +
        'agenda, "nt:73510984|6" para una calificación). Confirmado contra el backend real para los prefijos ' +
        '"ag:" y "nt:".',
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
