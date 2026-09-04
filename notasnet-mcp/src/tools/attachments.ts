import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { buildAttachmentUrl } from "notasnet-client";
import { client } from "../session.js";
import { runTool } from "../toolHelper.js";

/**
 * Herramientas de adjuntos. El backend no expone tokens de descarga ni URLs firmadas: un
 * adjunto embebido se resuelve como `${baseUrl}/${Path}`, un GET estático plano contra el
 * mismo origen (ver notasnet-client/README.md, sección "Adjuntos"). Un tool MCP no puede
 * devolver contenido binario de forma práctica, así que estas herramientas devuelven la URL
 * resuelta en vez de intentar traer los bytes — el llamador (o el usuario) decide cómo
 * descargarla.
 *
 * El módulo "Carpetas" (`carpetas/archivos`) queda deliberadamente sin una herramienta de
 * descarga: la librería no confirma el patrón de URL para ese módulo y lanza a propósito
 * (`downloadFolderFile`) en vez de adivinar uno. Ver notasnet-client/README.md, incertidumbre
 * #3, antes de intentar construir esa URL manualmente.
 */
export function registerAttachmentTools(server: McpServer): void {
  server.registerTool(
    "notasnet_get_attachment_url",
    {
      description:
        "Resuelve la URL de descarga absoluta de un adjunto embebido en un comunicado, evento de agenda o " +
        "notificación ({FileName, Path}). No descarga el contenido — devuelve solo la URL resuelta, ya que un " +
        "tool MCP no puede devolver contenido binario de forma práctica. Sin token/firma: GET estático plano.",
      inputSchema: {
        fileName: z.string().describe("EmbeddedAttachment.FileName, solo para referencia en la respuesta."),
        path: z.string().describe("EmbeddedAttachment.Path, ruta relativa al origen de la app."),
      },
    },
    async ({ fileName, path }) =>
      runTool(false, () =>
        Promise.resolve({ fileName, url: buildAttachmentUrl(client.baseUrl, { Path: path }) }),
      ),
  );

  server.registerTool(
    "notasnet_get_static_resource_url",
    {
      description:
        "Resuelve la URL absoluta de un recurso estático servido en el mismo origen que la app, ej. una foto de " +
        'alumno ("cole/fotos/..."). Solo devuelve la URL — el control de acceso real del recurso (200 vs 403) ' +
        "se decide al pedirla, no aquí; no se detectó un patrón consistente en las pruebas realizadas.",
      inputSchema: { relativePath: z.string().describe('Ruta relativa, ej. "cole/fotos/archivo.jpg".') },
    },
    async ({ relativePath }) =>
      runTool(false, () => {
        const normalizedBase = client.baseUrl.replace(/\/+$/, "");
        const normalizedPath = relativePath.replace(/^\/+/, "");
        return Promise.resolve({ url: `${normalizedBase}/${normalizedPath}` });
      }),
  );
}
