/**
 * Helpers de adjuntos de Notasnet.
 *
 * Hallazgos del análisis HAR relevantes acá (ver README para más detalle):
 *
 * 1. Los adjuntos embebidos en un comunicado, evento de agenda o notificación traen
 *    `{ FileName, Path }`. `Path` se resuelve directamente contra el mismo origen de la app
 *    (`${baseUrl}/${Path}`) como un GET simple a un recurso estático. No se detectó token de
 *    descarga, URL firmada, ni expiración — es un GET estático plano, sin llamada de API
 *    separada para "descargar".
 *
 * 2. El módulo "Carpetas" (`/api/carpetas/archivos`) NO trae ningún campo de ruta de
 *    descarga en las respuestas observadas (ni `Path` ni `Ruta`), solo `{ Archivo, Fecha }`
 *    con el nombre de archivo prefijado por un id numérico. No está confirmada la convención
 *    real de URL de descarga para este módulo específico — ver `downloadFolderFile` abajo,
 *    que lanza en vez de adivinar.
 *
 * 3. Las fotos de alumnos (`cole/fotos/...`) tuvieron respuestas 200 y 403 mezcladas sin
 *    patrón claro en el HAR. El helper de descarga de este módulo no asume que el recurso
 *    siempre esté disponible: simplemente propaga el status code al llamador.
 */

import type { EmbeddedAttachment } from "./types.js";

/** Firma mínima de `fetch` que usan estos helpers (compatible con `globalThis.fetch`). */
export type FetchLike = typeof fetch;

/**
 * Construye la URL absoluta de descarga de un adjunto embebido (`{ FileName, Path }`) tal
 * como viene en comunicados, eventos de agenda o notificaciones.
 *
 * No se aplica ningún encoding adicional a `Path`: en el HAR las rutas relativas ya venían
 * en una forma directamente usable como parte de una URL (sin espacios ni caracteres que
 * requirieran escapar más allá de lo que el propio backend ya entrega).
 */
export function buildAttachmentUrl(baseUrl: string, attachment: Pick<EmbeddedAttachment, "Path">): string {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const normalizedPath = attachment.Path.replace(/^\/+/, "");
  return `${normalizedBase}/${normalizedPath}`;
}

/**
 * Descarga un adjunto embebido (comunicado / evento de agenda / notificación) y devuelve la
 * `Response` cruda — sin intentar parsear JSON, ya que estos recursos son binarios/estáticos
 * y pueden devolver 403 sin cuerpo JSON (ver punto 3 arriba, aplicable también a otros
 * recursos estáticos del mismo dominio). El llamador decide qué hacer con el status code y,
 * si quiere los bytes, puede llamar `response.arrayBuffer()`.
 */
export async function downloadAttachment(
  baseUrl: string,
  attachment: Pick<EmbeddedAttachment, "Path">,
  fetchImpl: FetchLike = fetch,
): Promise<Response> {
  const url = buildAttachmentUrl(baseUrl, attachment);
  return fetchImpl(url);
}

/**
 * Descarga un adjunto ya resuelto a partir de una ruta relativa cruda (por ejemplo, una foto
 * de alumno en `cole/fotos/...`). Mismo comportamiento que `downloadAttachment`: propaga el
 * status code (200 o 403 observados en el HAR sin un patrón claro) sin intentar parsear JSON.
 */
export async function downloadStaticResource(
  baseUrl: string,
  relativePath: string,
  fetchImpl: FetchLike = fetch,
): Promise<Response> {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const normalizedPath = relativePath.replace(/^\/+/, "");
  const url = `${normalizedBase}/${normalizedPath}`;
  return fetchImpl(url);
}

/**
 * TODO: patrón de URL no confirmado, revisar con una captura nueva.
 *
 * El listado de `carpetas/archivos` (ver `NotasnetClient.listFolderFiles`) no trae ningún
 * campo de ruta de descarga en las respuestas observadas en el HAR — solo `{ Archivo, Fecha }`.
 * No hay evidencia suficiente para construir una URL de descarga sin adivinar (podría ser
 * `cole/carpetas/{id}_{nombre}` por analogía con `cole/agenda/...`, o podría requerir una
 * llamada de API separada). Esta función existe para dejar el punto de extensión explícito
 * en la interfaz pública, pero lanza en vez de construir una URL que podría estar mal.
 *
 * Cuando se confirme el patrón real (idealmente capturando una descarga real desde el
 * módulo Carpetas), reemplazar el cuerpo de esta función.
 */
export function downloadFolderFile(_baseUrl: string, _fileName: string, _fetchImpl: FetchLike = fetch): never {
  throw new Error(
    "downloadFolderFile: patrón de URL de descarga no confirmado para el módulo Carpetas " +
      "(el campo de ruta vino ausente/null en todas las respuestas observadas en el HAR). " +
      "Ver TODO en src/attachments.ts y la sección de incertidumbres del README.",
  );
}
