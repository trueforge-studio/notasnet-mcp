import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { client } from "../session.js";
import { runTool } from "../toolHelper.js";

export function registerCalificaTools(server: McpServer): void {
  server.registerTool(
    "notasnet_get_grades",
    {
      description:
        "Notas por asignatura del periodo vigente para un alumno (GET /califica/asig?idAlu=). El parámetro " +
        "periodId está aceptado por compatibilidad con la librería pero el backend real aún no confirma cómo " +
        "pedir un periodo distinto al vigente, así que hoy no tiene efecto.",
      inputSchema: {
        studentId: z.number(),
        periodId: z.string().optional().describe("No confirmado por el backend — actualmente sin efecto."),
      },
    },
    async ({ studentId, periodId }) => runTool(true, () => client.getGrades(studentId, periodId)),
  );

  server.registerTool(
    "notasnet_get_grade_observations",
    {
      description: "Observaciones asociadas a calificaciones de un alumno (GET /califica/obs?idAlu=).",
      inputSchema: { studentId: z.number() },
    },
    async ({ studentId }) => runTool(true, () => client.getGradeObservations(studentId)),
  );

  server.registerTool(
    "notasnet_list_grade_periods",
    {
      description: "Periodos de evaluación disponibles del colegio/año escolar (GET /califica/report/periodos).",
      inputSchema: {},
    },
    async () => runTool(true, () => client.listGradePeriods()),
  );
}
