import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { client } from "../session.js";
import { runTool } from "../toolHelper.js";

/**
 * Notas individuales con fecha: NO es un endpoint propio del backend. `GET /califica/asig`
 * solo entrega promedios agregados por asignatura, así que cada calificación puntual se
 * reconstruye cruzando `GET /notifica/latest` (que emite una notificación `TipoCodigo: "nt"`
 * por cada nota nueva, con fecha) contra `GET /califica/asig` (para normalizar el nombre de
 * la asignatura vía `idNota`).
 *
 * El campo `Sujeto` de esas notificaciones tiene forma `"nt:<idNota>|<algo>"` — solo se
 * confirmó que `idNota` calza con `SubjectGrades.idNota`; no se confirmó qué representa la
 * parte después de `|`.
 */
const GRADE_NOTIFICATION_SUBJECT_PATTERN = /^nt:(\d+)(?:\|.*)?$/;
const GRADE_DETAIL_PATTERN = /obtuvo un ([\d.,]+) en la asignatura de (.+)\.\s*$/i;

interface RecentGrade {
  fecha: string;
  idNota: number | null;
  asignatura: string | null;
  nota: string | null;
  detalle: string | null;
}

async function getRecentGrades(studentId: number, last: number, limit?: number): Promise<RecentGrade[]> {
  const [notifications, grades] = await Promise.all([client.getLatestNotifications(last), client.getGrades(studentId)]);

  const subjectNameByIdNota = new Map<number, string>();
  for (const subject of grades.calif) subjectNameByIdNota.set(subject.idNota, subject.SubNombre);

  const items: RecentGrade[] = [];
  for (const notification of notifications) {
    if (notification.TipoCodigo !== "nt" || notification.Alumno !== studentId) continue;

    const subjectMatch = notification.Sujeto.match(GRADE_NOTIFICATION_SUBJECT_PATTERN);
    const idNota = subjectMatch ? Number(subjectMatch[1]) : null;
    const detailMatch = notification.Detalle?.match(GRADE_DETAIL_PATTERN);

    items.push({
      fecha: notification.Fecha,
      idNota,
      asignatura: (idNota !== null ? subjectNameByIdNota.get(idNota) : undefined) ?? detailMatch?.[2] ?? null,
      nota: detailMatch?.[1] ?? null,
      detalle: notification.Detalle,
    });
  }

  items.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
  return limit !== undefined ? items.slice(0, limit) : items;
}

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
    "notasnet_get_recent_grades",
    {
      description:
        "Calificaciones individuales recientes de un alumno, con fecha y asignatura (no es un endpoint propio: " +
        "cruza GET /notifica/latest, tipo 'nt', con GET /califica/asig para normalizar el nombre de la asignatura " +
        "vía idNota). Útil para ver las últimas notas sin pedir el feed completo de notificaciones. `nota` y " +
        "`asignatura` pueden venir null si el texto de la notificación no calzó con el patrón esperado — en ese " +
        "caso revisa `detalle` (el texto original de la notificación).",
      inputSchema: {
        studentId: z.number(),
        last: z
          .number()
          .optional()
          .describe("Cuántas notificaciones recientes revisar (mapea a `last` de notifica/latest). Default: 200."),
        limit: z.number().optional().describe("Máximo de notas a devolver tras filtrar y ordenar. Sin límite si se omite."),
      },
    },
    async ({ studentId, last, limit }) => runTool(true, () => getRecentGrades(studentId, last ?? 200, limit)),
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
