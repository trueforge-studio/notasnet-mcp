/**
 * Tipos de la API de Notasnet (https://syscol.com/notasnet/api/).
 *
 * Todos los tipos aquí están derivados de la observación directa de una captura HAR real
 * (sesión de apoderado con dos alumnos) y del análisis previo documentado en
 * `Notasnet_Analisis_HAR.docx`. La API es antigua, no versionada, y mezcla convenciones
 * (mayúsculas/minúsculas de rutas, nombres de query param inconsistentes entre endpoints,
 * campos en español e inglés según el módulo). Donde el HAR solo mostró `null` para un campo
 * que razonablemente podría traer datos en otras cuentas/alumnos, se tipa como `T | null` y
 * se anota explícitamente como no confirmado.
 *
 * IMPORTANTE (privacidad): ningún valor de ejemplo en este archivo, ni en comentarios,
 * corresponde a datos reales vistos en el HAR. Los ejemplos de formato (fechas, RUT, etc.)
 * usan placeholders evidentemente ficticios.
 */

// ---------------------------------------------------------------------------
// Primitivos y utilidades de tipo
// ---------------------------------------------------------------------------

/** Fecha/hora en formato ISO-8601 tal como la entrega el backend, ej. "2026-08-28T10:51:14.89". */
export type IsoDateTimeString = string;

/** Fecha (sin hora) en formato "YYYY-MM-DD", usada en la ruta de `agenda/{fecha}`. */
export type IsoDateString = string;

/** RUT chileno tal como lo entrega el backend, ej. "11.111.111-1" (formato de ejemplo). */
export type RutString = string;

/**
 * Código de tipo de dos o tres letras usado transversalmente por la API para clasificar
 * registros (comunicación, evento, atraso, asistencia, observación, nota, etc.).
 * No hay un enum cerrado confirmado — se ven al menos "COM", "ag", "cla", "EVE", "ina",
 * "ob", "ef", "asis", "inasis". Se deja como string abierto en vez de forzar un union
 * que podría quedar incompleto.
 */
export type TipoCodigo = string;

// ---------------------------------------------------------------------------
// Adjuntos
// ---------------------------------------------------------------------------

/**
 * Adjunto embebido en un comunicado, evento de agenda o notificación.
 * Ver `src/attachments.ts` para cómo se resuelve a una URL de descarga.
 */
export interface EmbeddedAttachment {
  FileName: string;
  /** Ruta relativa al origen de la app, ej. "cole/agenda/1234567_archivo.pdf". */
  Path: string;
}

// ---------------------------------------------------------------------------
// Alumnos
// ---------------------------------------------------------------------------

/** Un elemento de la lista `GET /alumnos`. */
export interface StudentListItem {
  idAlumno: number;
  Anno: number;
  MatEstado: string;
  NombreApellido: string;
  Rut: RutString;
  Curso: number;
  NCurso: string;
  NotasnetAcceso: boolean;
  IsApode: number;
  IsSoste: number;
  IsPadre: number;
  EstadoAdmAnno: string;
  PrematNivel: string;
}

/** Un rango de la distribución de notas del curso, visto en el resumen del alumno. */
export interface GradeRangeDistribution {
  Rango: string;
  TotAlus: number;
  Color: string;
}

/**
 * Respuesta de `GET /alumno/{id}` — ficha resumen del alumno.
 * Los campos médicos y de contacto de emergencia vinieron sistemáticamente `null` en el HAR
 * para los dos alumnos observados; se tipan como nullable pero no se puede confirmar su forma
 * real cuando sí traen datos (¿string libre?, ¿lista?, ¿objeto estructurado?).
 */
export interface StudentSummary {
  LastEntre: string | null;
  NotaFinal: string;
  Notas: GradeRangeDistribution[];
  AsiPorFinal: number;
  InasiFinal: number;
  Atrasos: number;
  Edad: number;
  /** no confirmado con datos reales, solo se vio null en el HAR */
  InformacionMedica: string | null;
  /** no confirmado con datos reales, solo se vio null en el HAR */
  Avisar1: string | null;
  /** no confirmado con datos reales, solo se vio null en el HAR */
  Telefonos1: string | null;
  /** no confirmado con datos reales, solo se vio null en el HAR */
  Avisar2: string | null;
  /** no confirmado con datos reales, solo se vio null en el HAR */
  Telefonos2: string | null;
  /** no confirmado con datos reales, solo se vio null en el HAR */
  Vacunas: string | null;
  /** no confirmado con datos reales, solo se vio null en el HAR */
  Alergias: string | null;
  /** no confirmado con datos reales, solo se vio null en el HAR */
  Enfermedades: string | null;
  /** no confirmado con datos reales, solo se vio null en el HAR */
  GrupoSangre: string | null;
  Rut: RutString;
  NombreApellido: string;
  NCurso: string;
  NombreApellidos: string;
  /** no confirmado con datos reales, solo se vio null en el HAR */
  NViveCon: string | null;
  /** no confirmado con datos reales, solo se vio null en el HAR */
  Email: string | null;
  /** no confirmado con datos reales, solo se vio null en el HAR */
  Movil: string | null;
  NCCurso: string;
  Direccion: string;
  FechaMatricula: IsoDateTimeString;
  NMatEstado: string;
}

/** Un elemento de `GET /alumno/{id}/asignas`. */
export interface StudentSubject {
  /** no confirmado con datos reales, solo se vio null en el HAR */
  Pos: number | null;
  Tipo: string;
  Nom: string;
  Ico: string;
  Color: number;
  /** Nombre del profesor a cargo. */
  PNom: string;
  /** RUT del profesor a cargo. */
  PRut: RutString;
}

/** Un elemento de `GET /alumno/{id}/padres`. */
export interface StudentGuardian {
  Id: number;
  Nom: string;
  Rut: RutString;
  Email: string;
  Movil: string;
  Relacion: string;
}

/** Respuesta de `GET /alumno/permisos`. */
export interface GuardianPermissions {
  /** Permiso de información de pagos/finanzas del apoderado (nombre exacto no confirmado). */
  infpar: boolean;
  /** Permiso de acceso a la libreta/información del alumno (nombre exacto no confirmado). */
  inflib: boolean;
}

/** Módulos que se pueden pedir con `getStudentInfo` (parámetro `op`, unidos con "|"). */
export type StudentInfoModule = "nt" | "as" | "pe" | "ho" | "pre";

/**
 * Respuesta de `GET /alumnos/{id}/info?op=...`. Es un resumen "aplanado" con datos de
 * notas, horario y asistencia mezclados en un solo objeto (independiente de qué módulos
 * se pidieron en `op` — el HAR solo mostró llamadas pidiendo todos los módulos a la vez).
 */
export interface StudentInfoSummary {
  idAlumno: number;
  Curso: number;
  Inicio: string;
  Termino: string;
  Dia: number;
  Rojos: number;
  Prom0: number;
  Prom1: number;
  Prom2: number;
  Prom3: number;
  NotaFinal: string;
  PCurso: string;
  AsiPor0: number;
  AsiPor1: number;
  AsiPor2: number;
  AsiPorFinal: number;
  Inasi0: number;
  Inasi1: number;
  Inasi2: number;
  InasiFinal: number;
  Atrasos: number;
  Anno: number;
  Rut: RutString;
  NombreApellido: string;
  NCurso: string;
  NombreApellidos: string;
}

// ---------------------------------------------------------------------------
// Agenda / calendario
// ---------------------------------------------------------------------------

/**
 * Un evento del día tal como lo entrega `GET /agenda/{fecha}`.
 * OJO: esta forma NO es la misma que `AgendaRangeEvent` (la de `agenda/eventos`) — mezcla
 * de campos en español, mientras que el endpoint de rango usa varios campos en inglés.
 * No fuerces un tipo único entre ambos.
 */
export interface AgendaDayEvent {
  Color: number;
  Icono: string;
  SubTitle: string;
  FechaInicio: IsoDateTimeString;
  FechaTermino: IsoDateTimeString;
  Titulo: string;
  Detalle: string | null;
  TipoCodigo: TipoCodigo;
  TipoNombre: string;
  /** Identificador tipo "ag:<id>" que referencia el registro (ver también notificaciones). */
  Sujeto: string;
  /** no confirmado con datos reales: solo se vieron `null`/`false` en el HAR */
  Online: boolean | null;
  /** no confirmado con datos reales, solo se vio null en el HAR */
  Link: string | null;
  /** Cantidad de archivos adjuntos, o null si no aplica/no hay. */
  Files: number | null;
}

/**
 * Un evento dentro de un rango, tal como lo entrega `GET /agenda/eventos?fec1=&fec2=&clases=`.
 * Forma distinta a `AgendaDayEvent` (ver comentario arriba): usa `date`/`title`/`content` en
 * inglés junto a otros campos en español.
 */
export interface AgendaRangeEvent {
  date: IsoDateTimeString;
  TipoCodigo: TipoCodigo;
  title: string;
  content: string;
  /** Código corto del tipo de sujeto referenciado (ej. "ag" = agenda). */
  Tipo: string;
  Sujeto: string;
  AccTipo: string;
  AccNombre: string;
  /** Nombre corto del curso, ej. "1EBA" (formato de ejemplo). */
  curso: string;
  TipoNombre: string;
}

/** Respuesta de `GET /agenda/evento/{id}` — detalle de un evento puntual. */
export interface AgendaEventDetail {
  idEventData: number;
  NTipo: string;
  Fecha: IsoDateTimeString;
  Titulo: string;
  Detalle: string;
  Archivo: EmbeddedAttachment[] | null;
  SubTitulo: string;
  /** no confirmado con datos reales, solo se vio null en el HAR */
  NotiVista: unknown | null;
}

// ---------------------------------------------------------------------------
// Comunicaciones
// ---------------------------------------------------------------------------

export type CommunicationChannelType = "Colegio" | "Curso" | "Subsector";

/** Un elemento resumido de `GET /comunica?tipo=&id=&buscar=`. */
export interface CommunicationListItem {
  idEventData: number;
  Fecha: IsoDateTimeString;
}

/** Respuesta de `GET /comunica/{id}` — detalle completo de un comunicado. */
export interface CommunicationDetail {
  TipoCodigo: TipoCodigo;
  Id: number;
  Fecha: IsoDateTimeString;
  Titulo: string | null;
  /** Cuerpo en HTML. */
  Detalle: string;
  Archivo: EmbeddedAttachment[] | null;
  /** RUT del autor/profesor emisor. */
  UsRut: RutString;
  /** Nombre del autor/profesor emisor. */
  UsNombre: string;
  ComAlumnos: boolean;
  ComApoderados: boolean;
  ComPadres: boolean;
  ComSostenedores: boolean;
  Comentario: number;
  Unread: number;
  Sujeto: string;
}

/** Resumen de la última comunicación de un canal, embebido en `contactos`/`contacto/notificacion`. */
export interface ChannelLastMessage {
  Fecha: IsoDateTimeString;
  Titulo: string;
  Detalle: string;
}

/** Un elemento de `GET /comunica/contactos?buscar=`. */
export interface CommunicationChannel {
  Id: number;
  Tipo: CommunicationChannelType | string;
  Nombre: string;
  /** Código corto del curso cuando `Tipo === "Curso"`, null en otros casos. */
  Codigo: string | null;
  /** Ruta relativa de la foto/insignia del canal, o null. */
  Foto: string | null;
  /** no confirmado con datos reales, solo se vio null en el HAR */
  Color: string | null;
  Ultima: ChannelLastMessage;
  Total: number;
  Unread: number;
}

/**
 * Respuesta de `GET /comunica/contacto/notificacion?buscar=`.
 * Misma forma que `CommunicationChannel` más un campo `active` no visto en el listado.
 */
export interface CommunicationChannelStatus extends CommunicationChannel {
  active: number;
}

/** Un elemento (muy resumido) de `GET /comunica/notificaciones?buscar=`. */
export interface CommunicationNotificationListItem {
  idNotifica: number;
  Fecha: IsoDateTimeString;
}

/** Respuesta de `GET /comunica/notificacion/{id}` — detalle de una notificación de comunicación. */
export interface CommunicationNotificationDetail {
  TipoCodigo: TipoCodigo;
  Id: number;
  Fecha: IsoDateTimeString;
  /** Tipo legible, ej. "Evento", "Comunicación", "Inasistencia" (no es un enum cerrado confirmado). */
  Tipo: string;
  Titulo: string;
  Detalle: string;
  /** Identificador tipo "<prefijo>:<id>" del registro referenciado, ej. "ag:1234567" (ejemplo). */
  Sujeto: string;
  Archivo: EmbeddedAttachment[] | null;
  /** no confirmado con datos reales: null cuando la notificación no tiene autor asociado */
  UsRut: RutString | null;
  /** no confirmado con datos reales: null cuando la notificación no tiene autor asociado */
  UsNombre: string | null;
  Comentario: number;
  Unread: number;
  /** id del alumno al que aplica, o null si es transversal (ej. comunicado de colegio). */
  Alumno: number | null;
  /** Prefijo del campo `Sujeto` aislado, ej. "ag", "ina" (código corto de tipo de sujeto). */
  SujetoCodigo: string;
}

// ---------------------------------------------------------------------------
// Notificaciones (notifica/*)
// ---------------------------------------------------------------------------

/** Un elemento de `GET /notifica/latest?last=`. */
export interface LatestNotification {
  /** no confirmado con datos reales: forma exacta cuando no es null */
  Alu: string | null;
  idNotifica: number;
  /** Puede venir null junto con Alu/Alumno null (visto en un evento de agenda sin alumno asociado). */
  Titulo: string | null;
  /** Puede venir null junto con Alu/Alumno null (visto en un evento de agenda sin alumno asociado). */
  Detalle: string | null;
  Fecha: IsoDateTimeString;
  TipoCodigo: TipoCodigo;
  TipoNombre: string;
  Sujeto: string;
  /** 0 o 1 (no se confirmó si el backend lo trata como boolean estricto). */
  Visto: number;
  Alumno: number | null;
}

/** Detalle embebido dentro de `NotificationEventDetail`. */
export interface NotificationEventInnerDetail {
  Tipo: TipoCodigo;
  TipoN: string;
  Id: number;
  Fecha: IsoDateTimeString;
  Titulo: string;
  Detalle: string;
  Archivo: EmbeddedAttachment[] | null;
  SubTitulo: string;
  Color: number;
  ColPath: string;
  /** no confirmado con datos reales, solo se vio null en el HAR */
  UsRut: RutString | null;
  /** no confirmado con datos reales, solo se vio null en el HAR */
  UsNom: string | null;
  /** no confirmado con datos reales, solo se vio null en el HAR */
  AluRut: RutString | null;
  /** no confirmado con datos reales, solo se vio null en el HAR */
  AluNom: string | null;
  /** no confirmado con datos reales, solo se vio null en el HAR */
  AluCur: string | null;
}

/** Respuesta de `GET /notifica/evento?noti=`. */
export interface NotificationEventDetail {
  Detalle: NotificationEventInnerDetail;
  Visto: number;
  Sujeto: string;
}

/** Respuesta de `GET /notisinleer`. */
export interface UnreadCount {
  Total: number;
}

/** Un elemento de `GET /login/menu/notifica`. */
export interface MenuNotificationCount {
  total: number;
  view: string;
}

// ---------------------------------------------------------------------------
// Notas / evaluaciones
// ---------------------------------------------------------------------------

/** Configuración embebida en la respuesta de `califica/asig`. */
export interface GradesConfig {
  califica: string;
  /** Nombres de los periodos disponibles, separados por coma, ej. "1° Semestre,2° Semestre". */
  PerNom: string;
  ColPer: number;
}

/** Un elemento de la lista `calif` dentro de `GET /califica/asig`. */
export interface SubjectGrades {
  TotOwner: number;
  idSubsector: number;
  /** no confirmado con datos reales, solo se vio null en el HAR */
  Owner: string | null;
  /** no confirmado con datos reales, solo se vio null en el HAR */
  Ponderacion: string | null;
  idNota: number;
  SubNombre: string;
  ProNombre: string;
  PRut: RutString;
  SubColor: number;
  SubIcono: string;
  /** Null visto para una asignatura sin notas registradas aún (ej. "Orientación"). */
  PCurso: string | null;
  /** Null visto para una asignatura sin notas registradas aún (ej. "Orientación"). */
  Nota0: string | null;
  /** no confirmado con datos reales, solo se vio null en el HAR */
  Nota1: string | null;
  /** Null visto para una asignatura sin notas registradas aún (ej. "Orientación"). */
  NotaFinal: string | null;
}

/** Respuesta de `GET /califica/asig?idAlu=`. */
export interface GradesResponse {
  config: GradesConfig;
  calif: SubjectGrades[];
}

/**
 * Elemento de `GET /califica/obs?idAlu=` (observaciones asociadas a calificaciones).
 * La lista vino vacía en el HAR — no se confirmó la forma real de cada elemento.
 * no confirmado con datos reales, solo se vio una lista vacía en el HAR
 */
export type GradeObservation = Record<string, unknown>;

/** Un elemento de `GET /califica/report/periodos`. */
export interface GradePeriod {
  key: string;
  caption: string;
  icon: string;
  /** no se confirmó su forma exacta más allá de string libre, ej. "permisos & ..." (ejemplo). */
  enabled: string;
}

// ---------------------------------------------------------------------------
// Asistencia
// ---------------------------------------------------------------------------

/** Un elemento de `GET /asiste/Clases?alu=`. */
export interface AttendanceBySubjectItem {
  SubColor: number;
  SubIcono: string;
  ProfNombreApellido: string;
  SubNombre: string;
  idSubsector: number;
  Presente: number;
  Ausente: number;
  Online: number;
  PrePor: number;
  OnlPor: number;
  AusPor: number;
  Clases: number;
  RProfesor: RutString;
}

/** Respuesta de `GET /asiste/Clases/total?alu=`. */
export interface AttendanceTotals {
  AusPor: number;
  PrePor: number;
  OnlPor: number;
  Clases: number;
}

/** Configuración embebida en `asiste/asistencia`. */
export interface MonthlyAttendanceConfig {
  TipoAsis: string;
  pmes: number;
  asiste: string;
  DefaultYear: number;
  AsiAcle: string;
  PerNom: string;
  ColPer: number;
}

/** Un elemento de la lista `asis` dentro de `GET /asiste/asistencia?idAlu=`. */
export interface MonthlyAttendanceItem {
  idAsistencia: string;
  Tipo: string;
  /** Nombre corto del mes en español, ej. "Mar" (formato visto, no un enum cerrado). */
  Mes: string;
  Asistencia: string;
  Periodo: number;
  /** Viene como string numérico, ej. "64". */
  Porcentaje: string;
  Atrasos: string;
  MMes: IsoDateTimeString;
  Total: string;
  Nombre: string;
}

/** Respuesta de `GET /asiste/asistencia?idAlu=`. */
export interface MonthlyAttendanceResponse {
  config: MonthlyAttendanceConfig;
  asis: MonthlyAttendanceItem[];
}

/** Un elemento de atraso dentro de `GET /asiste/atrasos?alu=&asi=`. */
export interface TardinessItem {
  id: number;
  Tipo: string;
  Fecha: IsoDateTimeString;
}

/** Respuesta de `GET /asiste/atrasos?alu=&asi=`. */
export interface TardinessResponse {
  Fecha: IsoDateTimeString;
  Items: TardinessItem[];
}

// ---------------------------------------------------------------------------
// Observaciones, horario, carpetas
// ---------------------------------------------------------------------------

/** Subtítulo estructurado de una observación académica (cuando aplica). */
export interface ObservationAcademicSubtitle {
  PerRut: RutString;
  PerNom: string;
  PerCar: string;
  Asig: string;
}

/**
 * Un elemento de `GET /observa/list?idAlu=`.
 * `SubTitulo` es inconsistente entre observaciones: a veces es un objeto estructurado
 * (observación académica, con datos del profesor/asignatura) y a veces un string simple
 * (ej. observaciones médicas/de enfermería). No se fuerza un tipo único.
 */
export interface ObservationItem {
  GeneralCurso: number;
  Fecha: IsoDateTimeString;
  Titulo: string;
  Detalle: string;
  SubTitulo: ObservationAcademicSubtitle | string;
  NTipo: string;
  Color: number;
  /** Código corto de tipo, ej. "ob" (observación), "ef" (enfermería) — no es un enum cerrado confirmado. */
  Sujeto: string;
}

/** Un elemento de `GET /horario?idAlu=`. */
export interface ScheduleItem {
  Prof: string;
  ProRut: RutString;
  /** Día de la semana, 1 = lunes (asumido por orden observado, no confirmado explícitamente). */
  Dia: number;
  Inicio: string;
  Termino: string;
  Duracion: number;
  SubNombreInterno: string;
  SubColor: number;
}

/** Un elemento de `GET /carpetas/asignaturas?idAlu=`. */
export interface FolderSubject {
  Id: number;
  Curso: number;
  Nombre: string;
  NProfesor: string;
  Color: number;
}

/** Un elemento de `GET /Carpetas/acles?alu=&alu=...`. */
export interface FolderCategory {
  Id: number;
  Nombre: string;
  Tipo: string;
}

/**
 * Un elemento de `GET /carpetas/archivos?p=&id=`.
 * El nombre del archivo trae como prefijo el id numérico del registro, ej. "123456_nombre.pdf".
 * El campo de ruta de descarga no aparece en absoluto en las respuestas observadas (a diferencia
 * de lo documentado para este endpoint en el análisis previo, que menciona un campo `Ruta` que
 * vino siempre null) — no está confirmado el patrón de descarga para este módulo.
 * Ver `src/attachments.ts` (`downloadFolderFile`).
 */
export interface FolderFileItem {
  Archivo: string;
  Fecha: IsoDateTimeString;
}

// ---------------------------------------------------------------------------
// Cuenta / certificados / datos personales
// ---------------------------------------------------------------------------

/** Respuesta de `GET /cuenta/upag`. */
export interface AccountPaymentStatus {
  Estado: string;
  BtnPago: boolean;
  Preferencia: string;
}

/** Un elemento de `GET /cuenta/cuotas`. */
export interface AccountInstallment {
  Anno: number;
  FechaVence: IsoDateTimeString;
  ValorNeto: number;
  ValorPendiente: number;
  Estado: string;
  /** no confirmado con datos reales: null cuando la cuota no ha sido pagada */
  LastPag: IsoDateTimeString | null;
}

/** Un elemento de `GET /cuenta/pagos`. */
export interface AccountPaymentRecord {
  /** no confirmado con datos reales, solo se vio null en el HAR */
  LinkFact: string | null;
  NDoc: string;
  Anno: number;
  DTE: number;
  PDF: boolean;
  Fecha: IsoDateTimeString;
  /** Fecha en formato "DD/MM/YYYY HH:mm", distinto al formato ISO de `Fecha`. */
  FechaHora: string;
  Tipo: string;
  Nulo: boolean;
  /** no confirmado con datos reales, solo se vio null en el HAR */
  Boleta: string | null;
  /** no confirmado con datos reales, solo se vio null en el HAR */
  NBoleta: string | null;
  Monto: number;
  /** no confirmado con datos reales, solo se vio null en el HAR */
  RowTextColor: string | null;
  SosNombre: string;
}

/** Respuesta de `GET /cuenta/pagar`. */
export interface AccountPayNowStatus {
  /** no confirmado con datos reales, solo se vio null en el HAR */
  tot: number | null;
  tit: string;
  enabled: boolean;
}

/** Firma individual de un certificado. */
export interface CertificateSignature {
  FechaFirma: IsoDateTimeString;
  Cargo: string;
}

/** Certificado disponible (sin firmar o pendiente) en `Cert`. */
export interface CertificateAvailable {
  idCertificado: number;
  CertNombre: string;
  Show: number;
}

/** Certificado ya firmado, en `CertFirma`. */
export interface CertificateSigned {
  idCertificado: number;
  CertNombre: string;
  Tipo: string;
  SujetoId: number;
  Alumno: number;
  Firmas: CertificateSignature[];
}

/** Un elemento de `GET /certifica/list`. */
export interface CertificateListItem {
  /** no confirmado con datos reales, solo se vio null en el HAR */
  Doc: unknown | null;
  Tipo: string;
  id: number;
  NombreApellido: string;
  NCurso: string;
  Anno: number;
  Rut: RutString;
  Condicion: number;
  MatEstado: string;
  NMatEstado: string;
  Cert: CertificateAvailable[];
  CertFirma: CertificateSigned[];
}

/** Un campo del esquema dinámico de `GET /modify/schema?tipo=`. */
export interface ModifySchemaField {
  name: string;
  title: string;
  type: string;
  grupo: string;
  max: number;
  /** Nombre de la tabla de referencia (ver `modify/reference`) cuando el campo es una lista, si no null. */
  reference: string | null;
}

/** Respuesta de `GET /modify/schema?tipo=`. */
export interface ModifySchemaResponse {
  fields: ModifySchemaField[];
}

/**
 * Ficha editable de datos personales, respuesta de `GET /modify/info?tipo=&id=`.
 * Todos los campos médicos/de contacto vinieron `null` para el alumno observado.
 */
export interface ModifyInfoData {
  /** no confirmado con datos reales, solo se vio null en el HAR */
  ChangeData: unknown | null;
  ApellidoPaterno: string;
  ApellidoMaterno: string;
  Nombres: string;
  FechaNacimiento: IsoDateTimeString;
  /** no confirmado con datos reales, solo se vio null en el HAR */
  Movil: string | null;
  /** no confirmado con datos reales, solo se vio null en el HAR */
  Email: string | null;
  /** no confirmado con datos reales, solo se vio null en el HAR */
  Avisar1: string | null;
  /** no confirmado con datos reales, solo se vio null en el HAR */
  Telefonos1: string | null;
  /** no confirmado con datos reales, solo se vio null en el HAR */
  Avisar2: string | null;
  /** no confirmado con datos reales, solo se vio null en el HAR */
  Telefonos2: string | null;
  /** no confirmado con datos reales, solo se vio null en el HAR */
  Alergias: string | null;
  /** no confirmado con datos reales, solo se vio null en el HAR */
  Enfermedades: string | null;
  /** no confirmado con datos reales, solo se vio null en el HAR */
  Medicamentos: string | null;
  /** no confirmado con datos reales, solo se vio null en el HAR */
  InformacionMedica: string | null;
}

/** Respuesta de `GET /modify/info?tipo=&id=`. */
export interface ModifyInfoResponse {
  mdat: ModifyInfoData;
}

/** Un elemento de catálogo de referencia (ej. alergias/enfermedades) en `modify/reference`. */
export interface ReferenceCatalogItem {
  [idField: string]: number | string;
}

/**
 * Respuesta de `GET /modify/reference?table=`. Las claves observadas fueron `_alergias` y
 * `_enfermedades`; el parámetro `table` acepta una lista de pares `campoId:tabla` separados
 * por coma, por lo que otras claves son posibles pero no se vieron en este HAR.
 */
export interface ModifyReferenceResponse {
  _alergias?: Array<{ idAlergia: number; Nombre: string }>;
  _enfermedades?: Array<{ idEnfermedad: number; Nombre: string }>;
  [table: string]: unknown;
}

/** Un elemento de `GET /modify/selector?id=`. */
export interface ModifySelectorItem {
  /** no confirmado con datos reales: null para el propio alumno, numérico para sus apoderados */
  IdAlu: number | null;
  Id: number;
  Rut: RutString;
  NombreApellido: string;
  NCurso: string;
  Tipo: string;
  Edit: number;
  Direccion: string;
  Comuna: string;
  /** no confirmado con datos reales, solo se vio null en el HAR */
  Email: string | null;
  /** no confirmado con datos reales, solo se vio null en el HAR */
  Movil: string | null;
}

/**
 * Elemento de `GET /modify/documentos?tipo=&id=`. La lista vino vacía en el HAR — no se
 * confirmó la forma real de cada elemento.
 * no confirmado con datos reales, solo se vio una lista vacía en el HAR
 */
export type ModifyDocumentItem = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Institucional / arranque
// ---------------------------------------------------------------------------

/** Respuesta de `GET /login/isauth`. */
export interface IsAuthResponse {
  auth: boolean;
}

/**
 * Respuesta de `GET /login/pinstatus`.
 * El propósito exacto del PIN no está confirmado (ver README, sección de incertidumbres).
 */
export interface PinStatusResponse {
  Estado: number;
}

/** Un elemento del árbol de menú de `GET /login/menu`. */
export interface MenuItem {
  view: string;
  icon: string;
  label: string;
  /** no confirmado con datos reales: siempre vino como arreglo vacío en el HAR observado */
  elements: unknown[];
}

/** Respuesta de `GET /colconfig?key=`. */
export interface ColConfigResponse {
  /** no confirmado con datos reales: solo se vio null para la clave consultada en el HAR */
  Valor: string | null;
}

/** Un elemento de `GET /publicas?top=`. */
export interface PublicNewsListItem {
  idPublica: number;
  Fecha: IsoDateTimeString;
  Titulo: string;
  Contenido: string;
  UserNombre: string;
  UserFoto: string;
  /** no confirmado con datos reales, solo se vio null en el HAR */
  Colegio: string | null;
  Imagen: string;
}

/** Respuesta de `GET /publicas/{id}` — misma forma que un elemento de la lista. */
export type PublicNewsDetail = PublicNewsListItem;

/** Respuesta de `GET /premat/config`. */
export interface PrematConfigResponse {
  /** no confirmado con datos reales, solo se vio null en el HAR */
  FecInicio: IsoDateTimeString | null;
  /** no confirmado con datos reales, solo se vio null en el HAR */
  FecTermino: IsoDateTimeString | null;
  /** no confirmado con datos reales, solo se vio null en el HAR */
  Mensaje: string | null;
  /** no confirmado con datos reales, solo se vio null en el HAR */
  Title: string | null;
  Activo: number;
  Anno: number;
}

/** Respuesta de `GET /convivencia/denuncia/config`. */
export interface ConvivenciaConfigResponse {
  ano: number;
  form: number;
}

// ---------------------------------------------------------------------------
// Selección de colegio (región → comuna → colegio)
// ---------------------------------------------------------------------------

/** Elemento de `GET /colegio/region`. `Codigo` es el código oficial de región de Chile. */
export interface Region {
  Codigo: number;
  Nombre: string;
}

/** Elemento de `GET /colegio/comuna?reg=`. `Codigo` es el código oficial de comuna. */
export interface Comuna {
  Codigo: number;
  Nombre: string;
}

/**
 * Elemento de `GET /colegio/list?com=`.
 * `Codigo` es el slug usado como `colegio` en `signIn()` y en la URL de la app
 * (ej. `/notasnet/login?colegio=altomonte`). Puede venir `null` — visto en el HAR para
 * colegios listados que aparentemente no tienen Notasnet habilitado.
 */
export interface SchoolListItem {
  Codigo: string | null;
  Nombre: string;
}

/** Respuesta de `GET /colegio/{codigo}` — detalle público de un colegio. */
export interface SchoolDetail {
  // no confirmado con datos reales: siempre vino null en el HAR observado
  Insignia: string | null;
  // no confirmado con datos reales: siempre vino null en el HAR observado
  Membrete: string | null;
  Premat: string;
  Acles: string;
  Id: number;
  DefaultYear: number;
  Codigo: string;
  FechaVence: string;
  Nombre: string;
  Slogan: string;
  PrimerMes: number;
  ui: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

/** Datos del colegio embebidos en la respuesta de login. */
export interface SignInColegio {
  idColegio: number;
  Premat: string;
  Admision: string;
  Acles: string;
  Id: number;
  DefaultYear: number;
  Codigo: string;
  Nombre: string;
  Slogan: string;
  LicenciaVencida: number;
  ColegioRetirado: number;
}

/**
 * Forma de la respuesta de `POST /login/signin`.
 * No trae ningún campo con forma de token — ver `SignInResult` y el README ("Autenticación")
 * para el mecanismo de sesión real, confirmado con una segunda captura HAR: el header
 * `apikey` enviado en la petición de login (generado por el cliente, no por el servidor)
 * es el que el backend asocia con la sesión autenticada. La respuesta de este endpoint es
 * solo el perfil del apoderado, no un token.
 */
export interface SignInResponse {
  id: number;
  colegio: SignInColegio;
  rut: RutString;
  /** Tipo de cuenta, ej. "apo" (apoderado) — no es un enum cerrado confirmado. */
  tipo: string;
  ColegioId: number;
  nombre: string;
  titulo: string;
  foto: string;
  proyecto: string;
  usreset: boolean;
  usuario: string;
}

/** Parámetros de `signIn()`. `colegio` es el slug visto en `SchoolListItem.Codigo`. */
export interface SignInParams {
  colegio: string;
  usuario: string;
  password: string;
}

/** Un cookie de sesión extraído del `Set-Cookie` de la respuesta de login (ver `SignInResult`). */
export interface SessionCookie {
  name: string;
  value: string;
}

/**
 * Resultado de `signIn()`.
 *
 * `sessionCookie` es lo que de verdad mantiene la sesión (ver README, sección
 * "Autenticación"): hay que guardarlo y devolverlo en `getAuthHeaders` como header `Cookie`
 * (usa `formatCookieHeader` de `src/auth.ts`) en toda petición futura. Puede venir `null` si
 * el backend no mandó `Set-Cookie` (no se observó ese caso en las pruebas hechas, pero no se
 * puede descartar).
 *
 * `apiKey` se devuelve tal cual se pasó a `signIn`, solo por comodidad — no es la credencial
 * de sesión (ver `src/auth.ts`).
 */
export interface SignInResult {
  apiKey: string;
  profile: SignInResponse;
  sessionCookie: SessionCookie | null;
}

/** Respuesta de `POST /login/recover` (recuperación de contraseña por email). */
export interface RecoverPasswordResponse {
  ok: boolean;
}

// ---------------------------------------------------------------------------
// Parámetros de entrada normalizados de la librería (no del backend)
// ---------------------------------------------------------------------------

export interface AgendaEventsRangeParams {
  /** Inicio del rango. Se serializa tal cual a `fec1` (string ISO datetime). */
  from: IsoDateTimeString;
  /** Fin del rango. Se serializa tal cual a `fec2` (string ISO datetime). */
  to: IsoDateTimeString;
  /** Si se deben incluir clases regulares además de eventos. Mapea a `clases`. */
  includeClasses?: boolean;
}

export interface ListCommunicationsParams {
  channelType: CommunicationChannelType;
  channelId: number;
  search?: string;
}

export interface ListFolderFilesParams {
  /**
   * Selector de carpeta/contexto. NO es un número de página a pesar del nombre del query
   * param real (`p`) — valores vistos en el HAR: 0, 2, "cur". Se deja como string|number
   * porque no se confirmó un enum cerrado de valores válidos.
   */
  folderRef: string | number;
  /** Id opcional de alumno o carpeta, según contexto (no confirmado con certeza). */
  id?: number;
}
