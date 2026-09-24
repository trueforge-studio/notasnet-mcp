import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult, ImageContent, TextContent } from "@modelcontextprotocol/sdk/types.js";
import { buildAttachmentUrl, downloadAttachment } from "@trueforge-studio/notasnet-client";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import * as mammoth from "mammoth";
import { extractPptxSlides, formatPptxSlides } from "../pptx.js";
import { client, getAuthHeaders } from "../session.js";
import { errorResult, formatError, runTool } from "../toolHelper.js";

/**
 * `pdf-parse@1`'s propio `index.js` hace `let isDebugMode = !module.parent` para decidir si
 * corre un auto-test que lee un PDF de ejemplo hardcodeado del paquete (`test/data/...pdf`).
 * Confirmado en runtime real: con cualquier `import` ESM — o bundleado, da lo mismo —
 * `module.parent` nunca queda seteado como ese chequeo espera, así que el auto-test SIEMPRE se
 * dispara y revienta con `ENOENT`. `lib/pdf-parse.js` es la implementación real sin ese
 * wrapper, así que se importa esa ruta directamente para evitarlo del todo.
 *
 * IMPORTANTE: tiene que ser un `import` estático (como acá), no un `require(...)` dinámico ni
 * vía variable — esbuild solo bundlea/inlinea llamadas literales a `require`/`import` que
 * puede analizar en tiempo de build; un `require` obtenido de una variable (ej.
 * `createRequire(...)`, o `require` reasignado) queda como una llamada real en runtime que
 * intenta resolver el módulo por el algoritmo normal de Node — y como el bundle MCPB no
 * incluye ningún `node_modules` real, esa resolución falla con `MODULE_NOT_FOUND` en la
 * ubicación de instalación real. Confirmado probando el `.mcpb` empaquetado desde un directorio
 * aislado (sin `node_modules` en ningún directorio padre) — un intento anterior con
 * `createRequire` pasaba las pruebas locales SOLO porque corría dentro del árbol del proyecto,
 * donde Node encontraba igual el `node_modules/pdf-parse` real subiendo directorios.
 *
 * Ver `src/types/pdf-parse-lib.d.ts` para la declaración de tipos de este subpath (no cubierto
 * por `@types/pdf-parse`, que solo tipa el paquete raíz).
 */

/**
 * Herramientas de adjuntos. El backend no expone tokens de descarga ni URLs firmadas: un
 * adjunto embebido se resuelve como `${baseUrl}/${Path}`, un GET estático plano contra el
 * mismo origen (ver notasnet-client/README.md, sección "Adjuntos").
 *
 * `notasnet_get_attachment_url` solo resuelve la URL, sin traer contenido — útil cuando el
 * llamador quiere descargarlo por su cuenta. `notasnet_get_attachment_content` (más abajo) sí
 * trae los bytes y devuelve un content block MCP: un bloque `image` (base64 + mimeType) para
 * imágenes, o texto extraído para PDF/DOCX/PPTX — el SDK de MCP soporta content blocks de tipo
 * `image`, así que esto no requiere "descargar y luego avisar la URL", el contenido llega
 * directo en la respuesta del tool.
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
        "notificación ({FileName, Path}). Solo devuelve la URL, sin traer contenido — para eso usa " +
        "notasnet_get_attachment_content. Sin token/firma: GET estático plano.",
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

  server.registerTool(
    "notasnet_get_attachment_content",
    {
      description:
        "Descarga un adjunto embebido ({FileName, Path}) y devuelve su contenido directamente en la respuesta " +
        "del tool: texto extraído para PDF, DOCX y PPTX (por slide, con notas del orador), o un content block " +
        "de imagen (base64 + mimeType) para PNG/JPG/JPEG. A diferencia de notasnet_get_attachment_url, esta herramienta sí trae los bytes — usa la " +
        "cookie de sesión activa (misma que el resto de las herramientas) para la descarga. Otros formatos " +
        "devuelven un mensaje indicando que no están soportados, en vez de un error.",
      inputSchema: {
        fileName: z.string().describe("EmbeddedAttachment.FileName — se usa para decidir el tipo de extracción."),
        path: z.string().describe("EmbeddedAttachment.Path, ruta relativa al origen de la app."),
      },
    },
    async ({ fileName, path }): Promise<CallToolResult> => {
      const authedFetch: typeof fetch = (input, init) =>
        fetch(input, { ...init, headers: { ...getAuthHeaders(), ...(init?.headers ?? {}) } });

      let response: Response;
      try {
        response = await downloadAttachment(client.baseUrl, { Path: path }, authedFetch);
      } catch (err) {
        return errorResult(formatError(err));
      }

      if (!response.ok) {
        return errorResult(
          `No se pudo descargar el adjunto (status ${response.status}) en ` +
            `${buildAttachmentUrl(client.baseUrl, { Path: path })}.`,
        );
      }

      const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
      const buffer = Buffer.from(await response.arrayBuffer());

      try {
        if (ext === "pdf") {
          const result = await pdfParse(buffer);
          const text: TextContent = {
            type: "text",
            text: `[${fileName}, ${result.numpages} página(s)]\n\n${result.text}`,
          };
          return { content: [text] };
        }

        if (ext === "docx") {
          const { value } = await mammoth.extractRawText({ buffer });
          const text: TextContent = { type: "text", text: `[${fileName}]\n\n${value}` };
          return { content: [text] };
        }

        if (ext === "pptx") {
          const slides = await extractPptxSlides(buffer);
          const text: TextContent = { type: "text", text: formatPptxSlides(fileName, slides) };
          return { content: [text] };
        }

        if (ext === "png" || ext === "jpg" || ext === "jpeg") {
          const image: ImageContent = {
            type: "image",
            data: buffer.toString("base64"),
            mimeType: `image/${ext === "jpg" ? "jpeg" : ext}`,
          };
          return { content: [image] };
        }

        const text: TextContent = { type: "text", text: `Formato no soportado para extracción de contenido: .${ext}` };
        return { content: [text] };
      } catch (err) {
        return errorResult(formatError(err));
      }
    },
  );
}
