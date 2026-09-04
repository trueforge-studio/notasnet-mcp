import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { client } from "../session.js";
import { runTool } from "../toolHelper.js";

export function registerObservaHorarioCarpetasTools(server: McpServer): void {
  server.registerTool(
    "notasnet_get_observations",
    {
      description: "Observaciones (conducta/anotaciones) de un alumno (GET /observa/list?idAlu=).",
      inputSchema: { studentId: z.number() },
    },
    async ({ studentId }) => runTool(true, () => client.getObservations(studentId)),
  );

  server.registerTool(
    "notasnet_get_schedule",
    {
      description: "Horario semanal de clases de un alumno (GET /horario?idAlu=).",
      inputSchema: { studentId: z.number() },
    },
    async ({ studentId }) => runTool(true, () => client.getSchedule(studentId)),
  );

  server.registerTool(
    "notasnet_list_folder_subjects",
    {
      description: "Asignaturas/categorías disponibles como carpetas de archivos (GET /carpetas/asignaturas?idAlu=).",
      inputSchema: { studentId: z.number() },
    },
    async ({ studentId }) => runTool(true, () => client.listFolderSubjects(studentId)),
  );

  server.registerTool(
    "notasnet_list_folder_categories",
    {
      description:
        "Carpetas/categorías disponibles para uno o más alumnos (GET /Carpetas/acles?alu=&alu=...). Repite el " +
        "id de alumno una vez por cada elemento de studentIds.",
      inputSchema: { studentIds: z.array(z.number()).min(1) },
    },
    async ({ studentIds }) => runTool(true, () => client.listFolderCategories(studentIds)),
  );

  server.registerTool(
    "notasnet_list_folder_files",
    {
      description:
        "Archivos dentro de una carpeta/categoría (GET /carpetas/archivos?p=&id=). folderRef NO es un número de " +
        'página pese al nombre del query param real ("p") — valores vistos: 0, 2, "cur". No se expone una ' +
        "herramienta de descarga para este módulo: la librería no confirma el patrón de URL de descarga real, " +
        "ver notasnet-client/README.md.",
      inputSchema: {
        folderRef: z.union([z.string(), z.number()]).describe('Selector de carpeta/contexto, ej. 0, 2, "cur".'),
        id: z.number().optional().describe("Id opcional de alumno o carpeta según contexto."),
      },
    },
    async ({ folderRef, id }) => runTool(true, () => client.listFolderFiles({ folderRef, id })),
  );
}
