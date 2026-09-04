import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { client } from "../session.js";
import { runTool } from "../toolHelper.js";

export function registerAsisteTools(server: McpServer): void {
  server.registerTool(
    "notasnet_get_attendance_by_subject",
    {
      description: "Asistencia agregada por asignatura de un alumno (GET /asiste/Clases?alu=).",
      inputSchema: { studentId: z.number() },
    },
    async ({ studentId }) => runTool(true, () => client.getAttendanceBySubject(studentId)),
  );

  server.registerTool(
    "notasnet_get_attendance_totals",
    {
      description: "Totales agregados de asistencia de un alumno (GET /asiste/Clases/total?alu=).",
      inputSchema: { studentId: z.number() },
    },
    async ({ studentId }) => runTool(true, () => client.getAttendanceTotals(studentId)),
  );

  server.registerTool(
    "notasnet_get_monthly_attendance",
    {
      description: "Asistencia mensual detallada de un alumno (GET /asiste/asistencia?idAlu=).",
      inputSchema: { studentId: z.number() },
    },
    async ({ studentId }) => runTool(true, () => client.getMonthlyAttendance(studentId)),
  );

  server.registerTool(
    "notasnet_get_tardiness",
    {
      description: "Listado de atrasos de un alumno en una asignatura (GET /asiste/atrasos?alu=&asi=).",
      inputSchema: {
        studentId: z.number().describe("Mapea a alu."),
        subjectId: z.number().describe("Id de asignatura/subsector. Mapea a asi."),
      },
    },
    async ({ studentId, subjectId }) => runTool(true, () => client.getTardiness(studentId, subjectId)),
  );
}
