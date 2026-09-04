/**
 * Cliente de la API de Notasnet (https://syscol.com/notasnet/api/).
 *
 * Cubre solo la capa de acceso a la API: no implementa login real, ni lógica de negocio de
 * MCP/sync/multi-tenant (eso vendrá en un encargo posterior sobre esta librería). Ver README
 * para la tabla completa de métodos → endpoint real y las incertidumbres detectadas.
 *
 * Diseño:
 * - `baseUrl` configurable (default `https://syscol.com/notasnet`).
 * - `getAuthHeaders` es un punto de inyección de headers dinámicos (hoy puede no usarse).
 *   No se hardcodea ningún valor real de sesión/apikey en la librería.
 * - `fetch` inyectable, para poder mockearlo en tests sin tocar `globalThis.fetch`.
 * - Métodos agrupados por dominio funcional (alumnos, agenda, comunica, notifica, califica,
 *   asiste, observa/horario/carpetas, cuenta/certifica/modify, institucional).
 * - El backend mezcla `idAlu`, `alu` e `id` para referirse siempre al alumno según el
 *   endpoint. La API pública de esta librería expone siempre `studentId: number`; el mapeo
 *   al nombre de query param real está documentado junto a cada método.
 * - Las respuestas se validan con zod en el borde (`src/schemas.ts`) para detectar cuanto
 *   antes cambios de forma del backend.
 */

import { extractSessionCookie } from "./auth.js";
import { NotasnetApiError, NotasnetShapeError, NotImplementedError } from "./errors.js";
import type {
  AccountInstallment,
  Comuna,
  RecoverPasswordResponse,
  Region,
  SchoolDetail,
  SchoolListItem,
  SignInParams,
  SignInResponse,
  SignInResult,
  AccountPayNowStatus,
  AccountPaymentRecord,
  AccountPaymentStatus,
  AgendaDayEvent,
  AgendaEventDetail,
  AgendaEventsRangeParams,
  AgendaRangeEvent,
  AttendanceBySubjectItem,
  AttendanceTotals,
  CertificateListItem,
  ColConfigResponse,
  CommunicationChannel,
  CommunicationChannelStatus,
  CommunicationChannelType,
  CommunicationDetail,
  CommunicationListItem,
  CommunicationNotificationDetail,
  CommunicationNotificationListItem,
  ConvivenciaConfigResponse,
  FolderCategory,
  FolderFileItem,
  FolderSubject,
  GradeObservation,
  GradePeriod,
  GradesResponse,
  GuardianPermissions,
  IsAuthResponse,
  LatestNotification,
  ListCommunicationsParams,
  ListFolderFilesParams,
  MenuItem,
  MenuNotificationCount,
  ModifyDocumentItem,
  ModifyInfoResponse,
  ModifyReferenceResponse,
  ModifySelectorItem,
  ModifySchemaResponse,
  MonthlyAttendanceResponse,
  NotificationEventDetail,
  ObservationItem,
  PinStatusResponse,
  PrematConfigResponse,
  PublicNewsDetail,
  PublicNewsListItem,
  ScheduleItem,
  StudentGuardian,
  StudentInfoModule,
  StudentInfoSummary,
  StudentListItem,
  StudentSubject,
  StudentSummary,
  TardinessResponse,
  UnreadCount,
} from "./types.js";
import {
  accountInstallmentListSchema,
  accountPayNowStatusSchema,
  accountPaymentListSchema,
  accountPaymentStatusSchema,
  agendaDayEventListSchema,
  agendaEventDetailSchema,
  agendaRangeEventListSchema,
  attendanceBySubjectListSchema,
  attendanceTotalsSchema,
  certificateListSchema,
  colConfigResponseSchema,
  communicationChannelListSchema,
  communicationChannelStatusSchema,
  communicationDetailSchema,
  communicationListSchema,
  communicationNotificationDetailSchema,
  communicationNotificationListSchema,
  convivenciaConfigResponseSchema,
  folderCategoryListSchema,
  folderFileListSchema,
  folderSubjectListSchema,
  gradeObservationListSchema,
  gradePeriodListSchema,
  gradesResponseSchema,
  guardianPermissionsSchema,
  isAuthResponseSchema,
  latestNotificationListSchema,
  markNotificationSeenResponseSchema,
  menuListSchema,
  menuNotificationCountListSchema,
  modifyDocumentListSchema,
  modifyInfoResponseSchema,
  modifyReferenceResponseSchema,
  modifySchemaResponseSchema,
  modifySelectorListSchema,
  monthlyAttendanceResponseSchema,
  notificationEventDetailSchema,
  observationListSchema,
  pinStatusResponseSchema,
  prematConfigResponseSchema,
  publicNewsDetailSchema,
  publicNewsListSchema,
  recoverPasswordResponseSchema,
  regionRowsSchema,
  comunaRowsSchema,
  schoolRowsSchema,
  schoolDetailSchema,
  signInResponseSchema,
  scheduleListSchema,
  studentGuardianListSchema,
  studentInfoSummarySchema,
  studentListSchema,
  studentSubjectListSchema,
  studentSummarySchema,
  tardinessResponseSchema,
  unreadCountSchema,
} from "./schemas.js";
import type { z } from "zod";

export type FetchLike = typeof fetch;

export interface NotasnetClientConfig {
  /** Default: "https://syscol.com/notasnet". Sin slash final. */
  baseUrl?: string;
  /**
   * Punto de inyección de headers de autenticación dinámicos. Hoy puede no usarse (el
   * mecanismo real de sesión no está resuelto — ver README). El request builder invoca
   * esta función en cada llamada, así que cuando se resuelva el mecanismo de auth solo
   * hace falta implementar esta función, sin tocar el resto del cliente.
   */
  getAuthHeaders?: () => Record<string, string> | Promise<Record<string, string>>;
  /** `fetch` inyectable, para poder mockearlo en tests sin tocar `globalThis.fetch`. */
  fetch?: FetchLike;
}

const DEFAULT_BASE_URL = "https://syscol.com/notasnet";

export class NotasnetClient {
  readonly baseUrl: string;
  private readonly apiBaseUrl: string;
  private readonly getAuthHeaders: () => Record<string, string> | Promise<Record<string, string>>;
  private readonly fetchImpl: FetchLike;

  constructor(config: NotasnetClientConfig = {}) {
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.apiBaseUrl = `${this.baseUrl}/api`;
    this.getAuthHeaders = config.getAuthHeaders ?? (() => ({}));
    this.fetchImpl = config.fetch ?? fetch;
  }

  // ---------------------------------------------------------------------
  // Helper privado común
  // ---------------------------------------------------------------------

  private buildUrl(path: string, query?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(`${this.apiBaseUrl}${path}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined) continue;
        url.searchParams.append(key, String(value));
      }
    }
    return url.toString();
  }

  /** Igual a `buildUrl`, pero permite repetir la misma clave de query varias veces (ej. `alu`). */
  private buildUrlWithRepeatedParam(
    path: string,
    repeatedKey: string,
    values: Array<string | number>,
    query?: Record<string, string | number | boolean | undefined>,
  ): string {
    const url = new URL(`${this.apiBaseUrl}${path}`);
    for (const value of values) {
      url.searchParams.append(repeatedKey, String(value));
    }
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined) continue;
        url.searchParams.append(key, String(value));
      }
    }
    return url.toString();
  }

  /**
   * `T` es el tipo público fuerte declarado en `types.ts` para este endpoint; `schema` valida
   * en runtime que la respuesta tenga (al menos) los campos que la librería declara usar.
   * Los esquemas usan `.passthrough()` así que no es necesario que describan el 100% de los
   * campos del tipo público — de ahí el cast final: la validación runtime es una red de
   * seguridad contra cambios de forma del backend, no una fuente de verdad para el tipo TS.
   */
  private async request<T>(
    method: "GET" | "POST",
    url: string,
    schema: z.ZodTypeAny,
    init?: { body?: FormData },
  ): Promise<T> {
    const authHeaders = await this.getAuthHeaders();
    const response = await this.fetchImpl(url, {
      method,
      headers: { ...authHeaders },
      body: init?.body,
    });
    return this.parseResponse<T>(method, url, response, schema);
  }

  /**
   * Parsea y valida la respuesta de una petición ya enviada. Separado de `request` para que
   * `signIn` (que no pasa por `getAuthHeaders`, ver más abajo) pueda reusar la misma lógica
   * de manejo de errores / validación de forma.
   */
  private async parseResponse<T>(
    method: "GET" | "POST",
    url: string,
    response: Response,
    schema: z.ZodTypeAny,
  ): Promise<T> {
    const rawBody = await response.text();

    if (!response.ok) {
      let parsedBody: unknown;
      try {
        parsedBody = rawBody ? JSON.parse(rawBody) : undefined;
      } catch {
        // el backend no garantiza cuerpo JSON en errores (ver análisis HAR); se deja sin parsear
      }
      throw new NotasnetApiError({
        message: `Notasnet API respondió ${response.status} para ${method} ${url}`,
        status: response.status,
        url,
        method,
        rawBody,
        parsedBody,
      });
    }

    let parsed: unknown;
    try {
      parsed = rawBody ? JSON.parse(rawBody) : undefined;
    } catch (err) {
      throw new NotasnetApiError({
        message: `Notasnet API devolvió un cuerpo no-JSON para ${method} ${url}: ${(err as Error).message}`,
        status: response.status,
        url,
        method,
        rawBody,
      });
    }

    const result = schema.safeParse(parsed);
    if (!result.success) {
      throw new NotasnetShapeError({
        message: `La respuesta de ${method} ${url} no tiene la forma esperada`,
        url,
        issues: result.error.issues,
      });
    }
    return result.data as T;
  }

  // =======================================================================
  // Alumnos
  // =======================================================================

  /** `GET /alumnos` — alumnos de la cuenta. */
  async listStudents(): Promise<StudentListItem[]> {
    const url = this.buildUrl("/alumnos");
    return this.request("GET", url, studentListSchema);
  }

  /** `GET /alumno/{id}` — resumen (promedios, asistencia, atrasos, datos médicos). */
  async getStudentSummary(studentId: number): Promise<StudentSummary> {
    const url = this.buildUrl(`/alumno/${studentId}`);
    return this.request("GET", url, studentSummarySchema);
  }

  /** `GET /alumno/{id}/asignas`. */
  async getStudentSubjects(studentId: number): Promise<StudentSubject[]> {
    const url = this.buildUrl(`/alumno/${studentId}/asignas`);
    return this.request("GET", url, studentSubjectListSchema);
  }

  /** `GET /alumno/{id}/padres`. */
  async getStudentGuardians(studentId: number): Promise<StudentGuardian[]> {
    const url = this.buildUrl(`/alumno/${studentId}/padres`);
    return this.request("GET", url, studentGuardianListSchema);
  }

  /** `GET /alumno/permisos` — no toma studentId, aplica a la cuenta/apoderado autenticado. */
  async getGuardianPermissions(): Promise<GuardianPermissions> {
    const url = this.buildUrl("/alumno/permisos");
    return this.request("GET", url, guardianPermissionsSchema);
  }

  /**
   * `GET /alumnos/{id}/info?op=...` — resumen ampliable por módulo.
   * `modules` se une con "|" al construir el query param `op`, tal como lo hace el frontend real
   * (visto en el HAR como `op=nt|as|pe|ho|pre`).
   */
  async getStudentInfo(studentId: number, modules: StudentInfoModule[]): Promise<StudentInfoSummary> {
    const url = this.buildUrl(`/alumnos/${studentId}/info`, { op: modules.join("|") });
    return this.request("GET", url, studentInfoSummarySchema);
  }

  // =======================================================================
  // Agenda / calendario
  // =======================================================================

  /** `GET /agenda/{fecha}` — eventos de un día puntual (fecha en formato "YYYY-MM-DD"). */
  async getAgendaByDate(date: string): Promise<AgendaDayEvent[]> {
    const url = this.buildUrl(`/agenda/${date}`);
    return this.request("GET", url, agendaDayEventListSchema);
  }

  /**
   * `GET /agenda/eventos?fec1=&fec2=&clases=` — eventos dentro de un rango de fechas.
   * OJO: la forma de los objetos que devuelve este endpoint no es la misma que la de
   * `getAgendaByDate` — ver `AgendaRangeEvent` vs `AgendaDayEvent` en types.ts.
   */
  async getAgendaEvents(range: AgendaEventsRangeParams): Promise<AgendaRangeEvent[]> {
    const url = this.buildUrl("/agenda/eventos", {
      fec1: range.from,
      fec2: range.to,
      clases: range.includeClasses ?? false,
    });
    return this.request("GET", url, agendaRangeEventListSchema);
  }

  /** `GET /agenda/evento/{id}` — detalle de un evento puntual, incluyendo adjuntos. */
  async getAgendaEventDetail(eventId: number): Promise<AgendaEventDetail> {
    const url = this.buildUrl(`/agenda/evento/${eventId}`);
    return this.request("GET", url, agendaEventDetailSchema);
  }

  // =======================================================================
  // Comunicaciones y notificaciones
  // =======================================================================

  /** `GET /comunica?tipo=&id=&buscar=` — listado de comunicados de un canal. */
  async listCommunications(params: ListCommunicationsParams): Promise<CommunicationListItem[]> {
    const url = this.buildUrl("/comunica", {
      tipo: params.channelType,
      id: params.channelId,
      buscar: params.search ?? "",
    });
    return this.request("GET", url, communicationListSchema);
  }

  /** `GET /comunica/{id}` — detalle de un comunicado. */
  async getCommunication(id: number): Promise<CommunicationDetail> {
    const url = this.buildUrl(`/comunica/${id}`);
    return this.request("GET", url, communicationDetailSchema);
  }

  /** `GET /comunica/contactos?buscar=` — canales de comunicación disponibles con contador de no leídos. */
  async listCommunicationChannels(search?: string): Promise<CommunicationChannel[]> {
    const url = this.buildUrl("/comunica/contactos", { buscar: search ?? "" });
    return this.request("GET", url, communicationChannelListSchema);
  }

  /** `GET /comunica/contacto/notificacion?buscar=` — detalle/estado de un canal de contacto puntual. */
  async getCommunicationChannelStatus(search?: string): Promise<CommunicationChannelStatus> {
    const url = this.buildUrl("/comunica/contacto/notificacion", { buscar: search ?? "" });
    return this.request("GET", url, communicationChannelStatusSchema);
  }

  /**
   * `GET /comunica/notificaciones?buscar=` — historial de notificaciones de comunicaciones.
   * No se observó paginación (813 registros devueltos en una sola respuesta en el HAR
   * analizado): no hay parámetro de página/offset confirmado. Si el historial real de una
   * cuenta es mucho mayor, no se sabe si el backend trunca la respuesta en algún tope.
   */
  async listCommunicationNotifications(search?: string): Promise<CommunicationNotificationListItem[]> {
    const url = this.buildUrl("/comunica/notificaciones", { buscar: search ?? "" });
    return this.request("GET", url, communicationNotificationListSchema);
  }

  /** `GET /comunica/notificacion/{id}` — detalle de una notificación de comunicación puntual. */
  async getCommunicationNotification(id: number): Promise<CommunicationNotificationDetail> {
    const url = this.buildUrl(`/comunica/notificacion/${id}`);
    return this.request("GET", url, communicationNotificationDetailSchema);
  }

  /** `GET /notifica/latest?last=` — últimas N notificaciones (centro de notificaciones / badge). */
  async getLatestNotifications(last: number): Promise<LatestNotification[]> {
    const url = this.buildUrl("/notifica/latest", { last });
    return this.request("GET", url, latestNotificationListSchema);
  }

  /** `GET /notifica/evento?noti=` — detalle de una notificación ligada a un evento de agenda. */
  async getNotificationEventDetail(notificationId: number): Promise<NotificationEventDetail> {
    const url = this.buildUrl("/notifica/evento", { noti: notificationId });
    return this.request("GET", url, notificationEventDetailSchema);
  }

  /**
   * `POST /notifica/visto` — marca una notificación como vista.
   *
   * Confirmado por el HAR (a diferencia de lo asumido inicialmente en el prompt de encargo):
   * el body es `multipart/form-data` con un único campo `suj` cuyo valor es el `Sujeto` del
   * registro referenciado, con el formato "<prefijo>:<id>" (ej. "ag:1234567" para un evento
   * de agenda — el prefijo visto en las 4 llamadas capturadas fue siempre "ag"). Por eso este
   * método recibe `subject` como el valor completo de `Sujeto`/`SujetoCodigo:Id`, no solo un
   * id numérico — mapea 1:1 al campo `Sujeto` que traen `AgendaDayEvent`, `LatestNotification`,
   * `CommunicationNotificationDetail`, etc.
   *
   * No se confirmó si `suj` acepta otros prefijos además de "ag:" (ej. notificaciones de
   * comunicación) — se recomienda probarlo contra el backend real antes de asumirlo.
   */
  async markNotificationSeen(subject: string): Promise<{ ok: boolean }> {
    const url = this.buildUrl("/notifica/visto");
    const body = new FormData();
    body.append("suj", subject);
    return this.request("POST", url, markNotificationSeenResponseSchema, { body });
  }

  /** `GET /notisinleer` — contador de notificaciones sin leer. */
  async getUnreadCount(): Promise<UnreadCount> {
    const url = this.buildUrl("/notisinleer");
    return this.request("GET", url, unreadCountSchema);
  }

  /** `GET /login/menu/notifica` — contadores de notificaciones para los ítems del menú. */
  async getMenuNotificationCounts(): Promise<MenuNotificationCount[]> {
    const url = this.buildUrl("/login/menu/notifica");
    return this.request("GET", url, menuNotificationCountListSchema);
  }

  // =======================================================================
  // Notas / evaluaciones
  // =======================================================================

  /**
   * `GET /califica/asig?idAlu=` — notas por asignatura del periodo vigente.
   * Mapeo de studentId: query param `idAlu`.
   *
   * `periodId` queda preparado pero SIN USAR: no se confirmó el parámetro para pedir notas de
   * un periodo distinto al vigente (ver `listGradePeriods`). Cuando se confirme, agregar el
   * query param correspondiente aquí.
   */
  async getGrades(studentId: number, periodId?: string): Promise<GradesResponse> {
    void periodId; // no confirmado por HAR, ver comentario del método
    const url = this.buildUrl("/califica/asig", { idAlu: studentId });
    return this.request("GET", url, gradesResponseSchema);
  }

  /** `GET /califica/obs?idAlu=` — observaciones asociadas a calificaciones (vacío en el HAR analizado). */
  async getGradeObservations(studentId: number): Promise<GradeObservation[]> {
    const url = this.buildUrl("/califica/obs", { idAlu: studentId });
    return this.request("GET", url, gradeObservationListSchema);
  }

  /**
   * `GET /califica/report/periodos` — periodos de evaluación disponibles.
   * No toma studentId; devuelve los periodos del colegio/año escolar.
   */
  async listGradePeriods(): Promise<GradePeriod[]> {
    const url = this.buildUrl("/califica/report/periodos");
    return this.request("GET", url, gradePeriodListSchema);
  }

  // =======================================================================
  // Asistencia
  // =======================================================================

  /** `GET /asiste/Clases?alu=` — asistencia agregada por asignatura. Mapeo de studentId: query param `alu`. */
  async getAttendanceBySubject(studentId: number): Promise<AttendanceBySubjectItem[]> {
    const url = this.buildUrl("/asiste/Clases", { alu: studentId });
    return this.request("GET", url, attendanceBySubjectListSchema);
  }

  /** `GET /asiste/Clases/total?alu=` — totales agregados de asistencia. Mapeo de studentId: query param `alu`. */
  async getAttendanceTotals(studentId: number): Promise<AttendanceTotals> {
    const url = this.buildUrl("/asiste/Clases/total", { alu: studentId });
    return this.request("GET", url, attendanceTotalsSchema);
  }

  /** `GET /asiste/asistencia?idAlu=` — asistencia mensual detallada. Mapeo de studentId: query param `idAlu`. */
  async getMonthlyAttendance(studentId: number): Promise<MonthlyAttendanceResponse> {
    const url = this.buildUrl("/asiste/asistencia", { idAlu: studentId });
    return this.request("GET", url, monthlyAttendanceResponseSchema);
  }

  /**
   * `GET /asiste/atrasos?alu=&asi=` — listado de atrasos por asignatura.
   * Mapeo de studentId: query param `alu`. `subjectId` mapea a `asi` (id de asignatura/subsector).
   */
  async getTardiness(studentId: number, subjectId: number): Promise<TardinessResponse> {
    const url = this.buildUrl("/asiste/atrasos", { alu: studentId, asi: subjectId });
    return this.request("GET", url, tardinessResponseSchema);
  }

  // =======================================================================
  // Observaciones, horario, carpetas
  // =======================================================================

  /** `GET /observa/list?idAlu=` — observaciones (conducta/anotaciones) del alumno. */
  async getObservations(studentId: number): Promise<ObservationItem[]> {
    const url = this.buildUrl("/observa/list", { idAlu: studentId });
    return this.request("GET", url, observationListSchema);
  }

  /** `GET /horario?idAlu=` — horario semanal de clases del alumno. */
  async getSchedule(studentId: number): Promise<ScheduleItem[]> {
    const url = this.buildUrl("/horario", { idAlu: studentId });
    return this.request("GET", url, scheduleListSchema);
  }

  /** `GET /carpetas/asignaturas?idAlu=` — asignaturas/categorías disponibles como carpetas de archivos. */
  async listFolderSubjects(studentId: number): Promise<FolderSubject[]> {
    const url = this.buildUrl("/carpetas/asignaturas", { idAlu: studentId });
    return this.request("GET", url, folderSubjectListSchema);
  }

  /**
   * `GET /Carpetas/acles?alu=&alu=...` — carpetas/categorías disponibles para uno o más alumnos.
   * Repite el query param `alu` una vez por alumno (visto en el HAR con los dos alumnos de la
   * cuenta). Nota de capitalización: la ruta real usa "Carpetas" con mayúscula inicial aquí, a
   * diferencia de "carpetas/archivos" y "carpetas/asignaturas" — inconsistencia propia del
   * backend, no un error de esta librería.
   */
  async listFolderCategories(studentIds: number[]): Promise<FolderCategory[]> {
    const url = this.buildUrlWithRepeatedParam("/Carpetas/acles", "alu", studentIds);
    return this.request("GET", url, folderCategoryListSchema);
  }

  /**
   * `GET /carpetas/archivos?p=&id=` — archivos dentro de una carpeta/categoría.
   * `p` NO es un número de página a pesar del nombre: es un selector de carpeta/contexto
   * (valores vistos en el HAR: 0, 2, "cur"). `id` es opcional (id de alumno o carpeta, según
   * contexto — no confirmado con certeza cuál).
   */
  async listFolderFiles(params: ListFolderFilesParams): Promise<FolderFileItem[]> {
    const url = this.buildUrl("/carpetas/archivos", { p: params.folderRef, id: params.id });
    return this.request("GET", url, folderFileListSchema);
  }

  // =======================================================================
  // Cuenta / certificados / datos personales
  // =======================================================================

  /** `GET /cuenta/upag` — estado resumido de pagos del alumno/familia. */
  async getAccountPaymentStatus(): Promise<AccountPaymentStatus> {
    const url = this.buildUrl("/cuenta/upag");
    return this.request("GET", url, accountPaymentStatusSchema);
  }

  /** `GET /cuenta/cuotas` — cuotas/aranceles con montos y estado. */
  async getAccountInstallments(): Promise<AccountInstallment[]> {
    const url = this.buildUrl("/cuenta/cuotas");
    return this.request("GET", url, accountInstallmentListSchema);
  }

  /** `GET /cuenta/pagos` — historial de pagos y documentos tributarios. */
  async getAccountPayments(): Promise<AccountPaymentRecord[]> {
    const url = this.buildUrl("/cuenta/pagos");
    return this.request("GET", url, accountPaymentListSchema);
  }

  /** `GET /cuenta/pagar` — estado de disponibilidad de pago en línea. */
  async getAccountPayNowStatus(): Promise<AccountPayNowStatus> {
    const url = this.buildUrl("/cuenta/pagar");
    return this.request("GET", url, accountPayNowStatusSchema);
  }

  /** `GET /certifica/list` — certificados disponibles por alumno, con estado de firma. */
  async listCertificates(): Promise<CertificateListItem[]> {
    const url = this.buildUrl("/certifica/list");
    return this.request("GET", url, certificateListSchema);
  }

  /** `GET /modify/schema?tipo=` — definición de campos editables de la ficha (formulario dinámico). */
  async getModifySchema(tipo: string): Promise<ModifySchemaResponse> {
    const url = this.buildUrl("/modify/schema", { tipo });
    return this.request("GET", url, modifySchemaResponseSchema);
  }

  /** `GET /modify/info?tipo=&id=` — datos actuales de la ficha editable del alumno/apoderado. */
  async getModifyInfo(tipo: string, id: number): Promise<ModifyInfoResponse> {
    const url = this.buildUrl("/modify/info", { tipo, id });
    return this.request("GET", url, modifyInfoResponseSchema);
  }

  /**
   * `GET /modify/reference?table=` — catálogos de referencia para listas desplegables
   * (ej. alergias, enfermedades). `tables` acepta el formato crudo visto en el HAR: una lista
   * de pares "campoId:tabla" (ej. ["idAlergia:_alergias", "idEnfermedad:_enfermedades"]), que
   * esta librería une con comas al construir el query param.
   */
  async getModifyReference(tables: string[]): Promise<ModifyReferenceResponse> {
    const url = this.buildUrl("/modify/reference", { table: tables.join(",") });
    return this.request("GET", url, modifyReferenceResponseSchema) as Promise<ModifyReferenceResponse>;
  }

  /** `GET /modify/selector?id=` — datos de contacto/dirección editables asociados a un id. */
  async getModifySelector(id: number): Promise<ModifySelectorItem[]> {
    const url = this.buildUrl("/modify/selector", { id });
    return this.request("GET", url, modifySelectorListSchema);
  }

  /** `GET /modify/documentos?tipo=&id=` — documentos adjuntos a la ficha editable (vacío en el HAR analizado). */
  async getModifyDocuments(tipo: string, id: number): Promise<ModifyDocumentItem[]> {
    const url = this.buildUrl("/modify/documentos", { tipo, id });
    return this.request("GET", url, modifyDocumentListSchema);
  }

  // =======================================================================
  // Institucional / arranque
  // =======================================================================

  /** `GET /login/isauth` — verifica si la sesión sigue autenticada. */
  async isAuthenticated(): Promise<IsAuthResponse> {
    const url = this.buildUrl("/login/isauth");
    return this.request("GET", url, isAuthResponseSchema);
  }

  /**
   * `GET /login/pinstatus` — estado de un PIN de seguridad.
   * Uso exacto no confirmado por el HAR (se repite periódicamente durante la sesión
   * observada) — ver README.
   */
  async getPinStatus(): Promise<PinStatusResponse> {
    const url = this.buildUrl("/login/pinstatus");
    return this.request("GET", url, pinStatusResponseSchema);
  }

  /** `GET /login/menu` — estructura del menú principal de la app (secciones habilitadas). */
  async getMenu(): Promise<MenuItem[]> {
    const url = this.buildUrl("/login/menu");
    return this.request("GET", url, menuListSchema);
  }

  /** `GET /colconfig?key=` — parámetro de configuración por colegio (clave-valor). */
  async getColConfig(key: string): Promise<ColConfigResponse> {
    const url = this.buildUrl("/colconfig", { key });
    return this.request("GET", url, colConfigResponseSchema);
  }

  /** `GET /publicas?top=` — publicaciones/noticias del colegio. `top` filtra solo las destacadas. */
  async listPublicNews(top?: boolean): Promise<PublicNewsListItem[]> {
    const url = this.buildUrl("/publicas", { top });
    return this.request("GET", url, publicNewsListSchema);
  }

  /** `GET /publicas/{id}` — detalle de una publicación. */
  async getPublicNewsDetail(id: number): Promise<PublicNewsDetail> {
    const url = this.buildUrl(`/publicas/${id}`);
    return this.request("GET", url, publicNewsDetailSchema);
  }

  /** `GET /premat/config` — configuración del proceso de prematrícula del colegio. */
  async getPrematConfig(): Promise<PrematConfigResponse> {
    const url = this.buildUrl("/premat/config");
    return this.request("GET", url, prematConfigResponseSchema);
  }

  /** `GET /convivencia/denuncia/config` — configuración del formulario de convivencia escolar. */
  async getConvivenciaDenunciaConfig(): Promise<ConvivenciaConfigResponse> {
    const url = this.buildUrl("/convivencia/denuncia/config");
    return this.request("GET", url, convivenciaConfigResponseSchema);
  }

  // =======================================================================
  // Selección de colegio (región → comuna → colegio)
  // =======================================================================
  //
  // Estos endpoints son de directorio público (no requieren sesión) y sirven para construir
  // el flujo previo al login: elegir región, luego comuna, luego colegio, y obtener el
  // `colegio` slug que exige `signIn()`.

  /** `GET /colegio/region` — regiones de Chile. */
  async listRegions(): Promise<Region[]> {
    const url = this.buildUrl("/colegio/region");
    const body = await this.request<{ rows: Region[] }>(
      "GET",
      url,
      regionRowsSchema,
    );
    return body.rows;
  }

  /** `GET /colegio/comuna?reg=` — comunas de una región (`regionCode`, ej. `Region.Codigo`). */
  async listComunas(regionCode: number): Promise<Comuna[]> {
    const url = this.buildUrl("/colegio/comuna", { reg: regionCode });
    const body = await this.request<{ rows: Comuna[] }>(
      "GET",
      url,
      comunaRowsSchema,
    );
    return body.rows;
  }

  /** `GET /colegio/list?com=` — colegios con Notasnet en una comuna (`communeCode`, ej. `Comuna.Codigo`). */
  async listSchools(communeCode: number): Promise<SchoolListItem[]> {
    const url = this.buildUrl("/colegio/list", { com: communeCode });
    const body = await this.request<{ rows: SchoolListItem[] }>(
      "GET",
      url,
      schoolRowsSchema,
    );
    return body.rows;
  }

  /** `GET /colegio/{codigo}` — detalle público de un colegio (`schoolCode`, el slug de `SchoolListItem.Codigo`). */
  async getSchoolDetail(schoolCode: string): Promise<SchoolDetail> {
    const url = this.buildUrl(`/colegio/${schoolCode}`);
    return this.request("GET", url, schoolDetailSchema);
  }

  // =======================================================================
  // Login
  // =======================================================================

  /**
   * `POST /login/recover` — solicita recuperación/envío de contraseña a un email.
   * Body: `multipart/form-data` con un único campo `email`, confirmado por HAR.
   */
  async recoverPassword(email: string): Promise<RecoverPasswordResponse> {
    const url = this.buildUrl("/login/recover");
    const body = new FormData();
    body.append("email", email);
    return this.request("POST", url, recoverPasswordResponseSchema, { body });
  }

  /**
   * `POST /login/signin` — inicia sesión.
   *
   * IMPORTANTE — mecanismo de sesión (ver README, "Autenticación", y `src/auth.ts`): a
   * diferencia del resto de los métodos de esta clase, `signIn` NO usa `getAuthHeaders` — es
   * la operación que establece la sesión, no una que la consume.
   *
   * - `apiKey` es un valor **fijo/estático** (una clave de aplicación embebida en el bundle
   *   JS del frontend, la misma para toda la app, no algo que el cliente deba generar) que
   *   hay que obtener una vez inspeccionando el tráfico de red de la página de login real y
   *   pasar aquí como configuración. Confirmado por prueba directa: un valor generado al azar
   *   hace que el backend responda 401 a esta misma petición.
   * - La credencial de sesión real es la cookie `ntauth` que el backend fija via `Set-Cookie`
   *   en la respuesta (`HttpOnly; Secure; SameSite=Strict` — por eso no aparecía en capturas
   *   HAR anteriores). Se devuelve en `SignInResult.sessionCookie`; el llamador debe guardarla
   *   y reenviarla como header `Cookie` en `getAuthHeaders` en toda petición futura. Confirmado
   *   probando `GET /alumnos` solo con esta cookie, sin `apikey`.
   *
   * Body de la petición: `multipart/form-data` con campos `colegio`, `usuario`, `password`
   * (confirmado por HAR).
   */
  async signIn(params: SignInParams, apiKey: string): Promise<SignInResult> {
    const url = this.buildUrl("/login/signin");
    const body = new FormData();
    body.append("colegio", params.colegio);
    body.append("usuario", params.usuario);
    body.append("password", params.password);

    const authHeaders = { apikey: apiKey };
    const response = await this.fetchImpl(url, {
      method: "POST",
      headers: authHeaders,
      body,
    });
    const sessionCookie = extractSessionCookie(response);
    const profile = await this.parseResponse<SignInResponse>("POST", url, response, signInResponseSchema);
    return { apiKey, profile, sessionCookie };
  }

  /**
   * La app también ofrece un login por QR (abre la cámara del dispositivo). No se investigó:
   * en la captura HAR se abrió y cerró la cámara sin escanear nada, así que no hay ninguna
   * petición de red capturada para este flujo. Se deja el método explícito (en vez de omitirlo
   * en silencio) para documentar que existe y que sigue sin resolverse.
   */
  async signInWithQr(): Promise<never> {
    throw new NotImplementedError(
      "El login por QR no fue capturado en el HAR (se abrió la cámara pero no se escaneó nada) — mecanismo desconocido.",
    );
  }
}

export function createNotasnetClient(config: NotasnetClientConfig = {}): NotasnetClient {
  return new NotasnetClient(config);
}
