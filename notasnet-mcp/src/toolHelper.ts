/**
 * Helper compartido para envolver una llamada al `NotasnetClient` como resultado de una
 * herramienta MCP: valida sesión cuando corresponde, ejecuta la llamada, y da forma al
 * resultado de éxito/error según la convención del SDK (`{ content, isError? }`).
 */

import { NotasnetApiError, NotasnetShapeError } from "@trueforge-studio/notasnet-client";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { hasSession } from "./session.js";

export function textResult(data: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

export function errorResult(message: string): CallToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

export function formatError(err: unknown): string {
  if (err instanceof NotasnetApiError) {
    const bodyNote = err.parsedBody !== undefined ? `\nCuerpo de respuesta: ${JSON.stringify(err.parsedBody)}` : "";
    return (
      `Notasnet API respondió con error (status ${err.status}) para ${err.method} ${err.url}.\n` +
      `${err.message}${bodyNote}`
    );
  }
  if (err instanceof NotasnetShapeError) {
    const issuesText = JSON.stringify(err.issues, null, 2);
    const bodyText = JSON.stringify(err.receivedBody, null, 2);
    const truncatedBody = bodyText.length > 4000 ? `${bodyText.slice(0, 4000)}\n... (truncado)` : bodyText;
    return (
      `La respuesta de Notasnet para ${err.url} no tuvo la forma esperada (posible cambio del ` +
      `backend). ${err.message}\n\nCampos que no calzaron (zod issues):\n${issuesText}\n\n` +
      `Cuerpo recibido:\n${truncatedBody}`
    );
  }
  if (err instanceof Error) return `Error inesperado: ${err.message}`;
  return `Error inesperado: ${String(err)}`;
}

const NO_SESSION_MESSAGE =
  "No hay una sesión activa de Notasnet. Usa la herramienta `notasnet_login` primero (o " +
  "configura NOTASNET_COLEGIO/NOTASNET_APIKEY/NOTASNET_USUARIO/NOTASNET_PASSWORD como " +
  "variables de entorno para que el servidor inicie sesión automáticamente).";

/**
 * Ejecuta `fn` y da forma al resultado como `CallToolResult`.
 * Si `requiresAuth` es true y no hay sesión activa, ni siquiera intenta la llamada de red:
 * devuelve un error claro en vez de dejar que el backend responda un 401 confuso.
 */
export async function runTool(requiresAuth: boolean, fn: () => Promise<unknown>): Promise<CallToolResult> {
  if (requiresAuth && !hasSession()) {
    return errorResult(NO_SESSION_MESSAGE);
  }
  try {
    const data = await fn();
    return textResult(data);
  } catch (err) {
    return errorResult(formatError(err));
  }
}
