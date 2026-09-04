/**
 * Construcción del `McpServer` y registro de todas las herramientas. Separado de `index.ts`
 * (el entrypoint ejecutable) para poder importarlo desde tests sin arrancar el transporte
 * stdio real.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerStudentTools } from "./tools/students.js";
import { registerAgendaTools } from "./tools/agenda.js";
import { registerComunicaTools } from "./tools/comunica.js";
import { registerNotificaTools } from "./tools/notifica.js";
import { registerCalificaTools } from "./tools/califica.js";
import { registerAsisteTools } from "./tools/asiste.js";
import { registerObservaHorarioCarpetasTools } from "./tools/observaHorarioCarpetas.js";
import { registerCuentaCertificaModifyTools } from "./tools/cuentaCertificaModify.js";
import { registerInstitucionalTools } from "./tools/institucional.js";
import { registerColegioTools } from "./tools/colegio.js";
import { registerAttachmentTools } from "./tools/attachments.js";
import { registerLoginTools } from "./tools/login.js";

export function createServer(): McpServer {
  const server = new McpServer({ name: "notasnet-mcp", version: "0.1.0" });

  registerLoginTools(server);
  registerStudentTools(server);
  registerAgendaTools(server);
  registerComunicaTools(server);
  registerNotificaTools(server);
  registerCalificaTools(server);
  registerAsisteTools(server);
  registerObservaHorarioCarpetasTools(server);
  registerCuentaCertificaModifyTools(server);
  registerInstitucionalTools(server);
  registerColegioTools(server);
  registerAttachmentTools(server);

  return server;
}
