import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { StudentInfoModule } from "notasnet-client";
import { client } from "../session.js";
import { runTool } from "../toolHelper.js";

const studentInfoModule = z.enum(["nt", "as", "pe", "ho", "pre"]);

export function registerStudentTools(server: McpServer): void {
  server.registerTool(
    "notasnet_list_students",
    {
      description: "Lista los alumnos asociados a la cuenta autenticada (GET /alumnos).",
      inputSchema: {},
    },
    async () => runTool(true, () => client.listStudents()),
  );

  server.registerTool(
    "notasnet_get_student_summary",
    {
      description:
        "Ficha resumen de un alumno: promedios, asistencia, atrasos y datos médicos (GET /alumno/{id}).",
      inputSchema: { studentId: z.number().describe("Id del alumno (idAlu/alu/id según endpoint).") },
    },
    async ({ studentId }) => runTool(true, () => client.getStudentSummary(studentId)),
  );

  server.registerTool(
    "notasnet_get_student_subjects",
    {
      description: "Asignaturas de un alumno con su profesor a cargo (GET /alumno/{id}/asignas).",
      inputSchema: { studentId: z.number() },
    },
    async ({ studentId }) => runTool(true, () => client.getStudentSubjects(studentId)),
  );

  server.registerTool(
    "notasnet_get_student_guardians",
    {
      description: "Apoderados/padres registrados para un alumno (GET /alumno/{id}/padres).",
      inputSchema: { studentId: z.number() },
    },
    async ({ studentId }) => runTool(true, () => client.getStudentGuardians(studentId)),
  );

  server.registerTool(
    "notasnet_get_guardian_permissions",
    {
      description:
        "Permisos del apoderado autenticado, ej. acceso a información de pagos/libreta (GET /alumno/permisos).",
      inputSchema: {},
    },
    async () => runTool(true, () => client.getGuardianPermissions()),
  );

  server.registerTool(
    "notasnet_get_student_info",
    {
      description:
        "Resumen ampliable de un alumno por módulo: notas (nt), asignaturas (as), periodo (pe), horario (ho), " +
        "prematrícula (pre) (GET /alumnos/{id}/info?op=...).",
      inputSchema: {
        studentId: z.number(),
        modules: z.array(studentInfoModule).min(1).describe("Módulos a incluir, ej. ['nt','as','pe','ho','pre']."),
      },
    },
    async ({ studentId, modules }) =>
      runTool(true, () => client.getStudentInfo(studentId, modules as StudentInfoModule[])),
  );
}
