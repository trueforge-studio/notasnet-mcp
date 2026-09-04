/**
 * Esquemas zod para validar la forma de las respuestas de la API en el borde del cliente.
 *
 * La API de Notasnet es antigua y no versionada (ver README / análisis HAR). Estos esquemas
 * existen para detectar cuanto antes cuando el backend cambia la forma de una respuesta,
 * en vez de dejar que un campo faltante o renombrado rompa silenciosamente código más arriba
 * (ej. un futuro sync). Por eso casi todos los objetos usan `.passthrough()`: solo se valida
 * que los campos que la librería sí usa existan con el tipo esperado, sin rechazar campos
 * adicionales que el backend pueda agregar con el tiempo.
 */
import { z } from "zod";

const nullableString = z.string().nullable();
const nullableNumber = z.number().nullable();

export const embeddedAttachmentSchema = z
  .object({
    FileName: z.string(),
    Path: z.string(),
  })
  .passthrough();

const nullableAttachments = z.array(embeddedAttachmentSchema).nullable();

// --- Alumnos ---------------------------------------------------------------

export const studentListItemSchema = z
  .object({
    idAlumno: z.number(),
    Anno: z.number(),
    MatEstado: z.string(),
    NombreApellido: z.string(),
    Rut: z.string(),
    Curso: z.number(),
    NCurso: z.string(),
    NotasnetAcceso: z.boolean(),
    IsApode: z.number(),
    IsSoste: z.number(),
    IsPadre: z.number(),
    EstadoAdmAnno: z.string(),
    PrematNivel: z.string(),
  })
  .passthrough();
export const studentListSchema = z.array(studentListItemSchema);

const gradeRangeDistributionSchema = z
  .object({
    Rango: z.string(),
    TotAlus: z.number(),
    Color: z.string(),
  })
  .passthrough();

export const studentSummarySchema = z
  .object({
    LastEntre: nullableString,
    NotaFinal: z.string(),
    Notas: z.array(gradeRangeDistributionSchema),
    AsiPorFinal: z.number(),
    InasiFinal: z.number(),
    Atrasos: z.number(),
    Edad: z.number(),
    Rut: z.string(),
    NombreApellido: z.string(),
    NCurso: z.string(),
    NombreApellidos: z.string(),
    NCCurso: z.string(),
    Direccion: z.string(),
    FechaMatricula: z.string(),
    NMatEstado: z.string(),
  })
  .passthrough();

export const studentSubjectSchema = z
  .object({
    Pos: nullableNumber,
    Tipo: z.string(),
    Nom: z.string(),
    Ico: z.string(),
    Color: z.number(),
    PNom: z.string(),
    PRut: z.string(),
  })
  .passthrough();
export const studentSubjectListSchema = z.array(studentSubjectSchema);

export const studentGuardianSchema = z
  .object({
    Id: z.number(),
    Nom: z.string(),
    Rut: z.string(),
    Email: z.string(),
    Movil: z.string(),
    Relacion: z.string(),
  })
  .passthrough();
export const studentGuardianListSchema = z.array(studentGuardianSchema);

export const guardianPermissionsSchema = z
  .object({
    infpar: z.boolean(),
    inflib: z.boolean(),
  })
  .passthrough();

export const studentInfoSummarySchema = z
  .object({
    idAlumno: z.number(),
    Curso: z.number(),
    Inicio: z.string(),
    Termino: z.string(),
    Dia: z.number(),
    Rojos: z.number(),
    NotaFinal: z.string(),
    PCurso: z.string(),
    AsiPorFinal: z.number(),
    InasiFinal: z.number(),
    Atrasos: z.number(),
    Anno: z.number(),
    Rut: z.string(),
    NombreApellido: z.string(),
    NCurso: z.string(),
    NombreApellidos: z.string(),
  })
  .passthrough();

// --- Agenda ------------------------------------------------------------------

export const agendaDayEventSchema = z
  .object({
    Color: z.number(),
    Icono: z.string(),
    SubTitle: z.string(),
    FechaInicio: z.string(),
    FechaTermino: z.string(),
    Titulo: z.string(),
    Detalle: nullableString,
    TipoCodigo: z.string(),
    TipoNombre: z.string(),
    Sujeto: z.string(),
  })
  .passthrough();
export const agendaDayEventListSchema = z.array(agendaDayEventSchema);

export const agendaRangeEventSchema = z
  .object({
    date: z.string(),
    TipoCodigo: z.string(),
    title: z.string(),
    content: z.string(),
    Tipo: z.string(),
    Sujeto: z.string(),
    AccTipo: z.string(),
    AccNombre: z.string(),
    curso: z.string(),
    TipoNombre: z.string(),
  })
  .passthrough();
export const agendaRangeEventListSchema = z.array(agendaRangeEventSchema);

export const agendaEventDetailSchema = z
  .object({
    idEventData: z.number(),
    NTipo: z.string(),
    Fecha: z.string(),
    Titulo: z.string(),
    Detalle: z.string(),
    Archivo: nullableAttachments,
    SubTitulo: z.string(),
  })
  .passthrough();

// --- Comunicaciones ------------------------------------------------------------

export const communicationListItemSchema = z
  .object({
    idEventData: z.number(),
    Fecha: z.string(),
  })
  .passthrough();
export const communicationListSchema = z.array(communicationListItemSchema);

export const communicationDetailSchema = z
  .object({
    TipoCodigo: z.string(),
    Id: z.number(),
    Fecha: z.string(),
    Titulo: nullableString,
    Detalle: z.string(),
    Archivo: nullableAttachments,
    UsRut: z.string(),
    UsNombre: z.string(),
    ComAlumnos: z.boolean(),
    ComApoderados: z.boolean(),
    ComPadres: z.boolean(),
    ComSostenedores: z.boolean(),
    Comentario: z.number(),
    Unread: z.number(),
    Sujeto: z.string(),
  })
  .passthrough();

const channelLastMessageSchema = z
  .object({
    Fecha: z.string(),
    Titulo: z.string(),
    Detalle: z.string(),
  })
  .passthrough();

export const communicationChannelSchema = z
  .object({
    Id: z.number(),
    Tipo: z.string(),
    Nombre: z.string(),
    Codigo: nullableString,
    Foto: nullableString,
    Ultima: channelLastMessageSchema,
    Total: z.number(),
    Unread: z.number(),
  })
  .passthrough();
export const communicationChannelListSchema = z.array(communicationChannelSchema);

export const communicationChannelStatusSchema = communicationChannelSchema.and(
  z.object({ active: z.number() }).passthrough(),
);

export const communicationNotificationListItemSchema = z
  .object({
    idNotifica: z.number(),
    Fecha: z.string(),
  })
  .passthrough();
export const communicationNotificationListSchema = z.array(communicationNotificationListItemSchema);

export const communicationNotificationDetailSchema = z
  .object({
    TipoCodigo: z.string(),
    Id: z.number(),
    Fecha: z.string(),
    Tipo: z.string(),
    Titulo: z.string(),
    Detalle: z.string(),
    Sujeto: z.string(),
    Archivo: nullableAttachments,
    UsRut: nullableString,
    UsNombre: nullableString,
    Comentario: z.number(),
    Unread: z.number(),
    Alumno: nullableNumber,
    SujetoCodigo: z.string(),
  })
  .passthrough();

// --- Notificaciones (notifica/*) ------------------------------------------------

export const latestNotificationSchema = z
  .object({
    Alu: nullableString,
    idNotifica: z.number(),
    Titulo: z.string(),
    Detalle: z.string(),
    Fecha: z.string(),
    TipoCodigo: z.string(),
    TipoNombre: z.string(),
    Sujeto: z.string(),
    Visto: z.number(),
    Alumno: nullableNumber,
  })
  .passthrough();
export const latestNotificationListSchema = z.array(latestNotificationSchema);

const notificationEventInnerDetailSchema = z
  .object({
    Tipo: z.string(),
    TipoN: z.string(),
    Id: z.number(),
    Fecha: z.string(),
    Titulo: z.string(),
    Detalle: z.string(),
    Archivo: nullableAttachments,
    SubTitulo: z.string(),
    Color: z.number(),
    ColPath: z.string(),
  })
  .passthrough();

export const notificationEventDetailSchema = z
  .object({
    Detalle: notificationEventInnerDetailSchema,
    Visto: z.number(),
    Sujeto: z.string(),
  })
  .passthrough();

export const unreadCountSchema = z.object({ Total: z.number() }).passthrough();

export const menuNotificationCountSchema = z.object({ total: z.number(), view: z.string() }).passthrough();
export const menuNotificationCountListSchema = z.array(menuNotificationCountSchema);

export const markNotificationSeenResponseSchema = z.object({ ok: z.boolean() }).passthrough();

// --- Notas / evaluaciones ---------------------------------------------------

const gradesConfigSchema = z
  .object({
    califica: z.string(),
    PerNom: z.string(),
    ColPer: z.number(),
  })
  .passthrough();

const subjectGradesSchema = z
  .object({
    TotOwner: z.number(),
    idSubsector: z.number(),
    idNota: z.number(),
    SubNombre: z.string(),
    ProNombre: z.string(),
    PRut: z.string(),
    SubColor: z.number(),
    SubIcono: z.string(),
    PCurso: z.string(),
    Nota0: z.string(),
    NotaFinal: z.string(),
  })
  .passthrough();

export const gradesResponseSchema = z
  .object({
    config: gradesConfigSchema,
    calif: z.array(subjectGradesSchema),
  })
  .passthrough();

/** La lista vino vacía en el HAR — se valida solo que sea un arreglo de objetos. */
export const gradeObservationListSchema = z.array(z.record(z.string(), z.unknown()));

export const gradePeriodSchema = z
  .object({
    key: z.string(),
    caption: z.string(),
    icon: z.string(),
    enabled: z.string(),
  })
  .passthrough();
export const gradePeriodListSchema = z.array(gradePeriodSchema);

// --- Asistencia --------------------------------------------------------------

export const attendanceBySubjectItemSchema = z
  .object({
    SubColor: z.number(),
    SubIcono: z.string(),
    ProfNombreApellido: z.string(),
    SubNombre: z.string(),
    idSubsector: z.number(),
    Presente: z.number(),
    Ausente: z.number(),
    Online: z.number(),
    PrePor: z.number(),
    OnlPor: z.number(),
    AusPor: z.number(),
    Clases: z.number(),
    RProfesor: z.string(),
  })
  .passthrough();
export const attendanceBySubjectListSchema = z.array(attendanceBySubjectItemSchema);

export const attendanceTotalsSchema = z
  .object({
    AusPor: z.number(),
    PrePor: z.number(),
    OnlPor: z.number(),
    Clases: z.number(),
  })
  .passthrough();

const monthlyAttendanceConfigSchema = z
  .object({
    TipoAsis: z.string(),
    pmes: z.number(),
    asiste: z.string(),
    DefaultYear: z.number(),
    AsiAcle: z.string(),
    PerNom: z.string(),
    ColPer: z.number(),
  })
  .passthrough();

const monthlyAttendanceItemSchema = z
  .object({
    idAsistencia: z.string(),
    Tipo: z.string(),
    Mes: z.string(),
    Asistencia: z.string(),
    Periodo: z.number(),
    Porcentaje: z.string(),
    Atrasos: z.string(),
    MMes: z.string(),
    Total: z.string(),
    Nombre: z.string(),
  })
  .passthrough();

export const monthlyAttendanceResponseSchema = z
  .object({
    config: monthlyAttendanceConfigSchema,
    asis: z.array(monthlyAttendanceItemSchema),
  })
  .passthrough();

const tardinessItemSchema = z
  .object({
    id: z.number(),
    Tipo: z.string(),
    Fecha: z.string(),
  })
  .passthrough();

export const tardinessResponseSchema = z
  .object({
    Fecha: z.string(),
    Items: z.array(tardinessItemSchema),
  })
  .passthrough();

// --- Observaciones, horario, carpetas ------------------------------------------

const observationAcademicSubtitleSchema = z
  .object({
    PerRut: z.string(),
    PerNom: z.string(),
    PerCar: z.string(),
    Asig: z.string(),
  })
  .passthrough();

export const observationItemSchema = z
  .object({
    GeneralCurso: z.number(),
    Fecha: z.string(),
    Titulo: z.string(),
    Detalle: z.string(),
    SubTitulo: z.union([observationAcademicSubtitleSchema, z.string()]),
    NTipo: z.string(),
    Color: z.number(),
    Sujeto: z.string(),
  })
  .passthrough();
export const observationListSchema = z.array(observationItemSchema);

export const scheduleItemSchema = z
  .object({
    Prof: z.string(),
    ProRut: z.string(),
    Dia: z.number(),
    Inicio: z.string(),
    Termino: z.string(),
    Duracion: z.number(),
    SubNombreInterno: z.string(),
    SubColor: z.number(),
  })
  .passthrough();
export const scheduleListSchema = z.array(scheduleItemSchema);

export const folderSubjectSchema = z
  .object({
    Id: z.number(),
    Curso: z.number(),
    Nombre: z.string(),
    NProfesor: z.string(),
    Color: z.number(),
  })
  .passthrough();
export const folderSubjectListSchema = z.array(folderSubjectSchema);

export const folderCategorySchema = z
  .object({
    Id: z.number(),
    Nombre: z.string(),
    Tipo: z.string(),
  })
  .passthrough();
export const folderCategoryListSchema = z.array(folderCategorySchema);

export const folderFileItemSchema = z
  .object({
    Archivo: z.string(),
    Fecha: z.string(),
  })
  .passthrough();
export const folderFileListSchema = z.array(folderFileItemSchema);

// --- Cuenta / certificados / datos personales -----------------------------------

export const accountPaymentStatusSchema = z
  .object({
    Estado: z.string(),
    BtnPago: z.boolean(),
    Preferencia: z.string(),
  })
  .passthrough();

export const accountInstallmentSchema = z
  .object({
    Anno: z.number(),
    FechaVence: z.string(),
    ValorNeto: z.number(),
    ValorPendiente: z.number(),
    Estado: z.string(),
    LastPag: nullableString,
  })
  .passthrough();
export const accountInstallmentListSchema = z.array(accountInstallmentSchema);

export const accountPaymentRecordSchema = z
  .object({
    NDoc: z.string(),
    Anno: z.number(),
    DTE: z.number(),
    PDF: z.boolean(),
    Fecha: z.string(),
    FechaHora: z.string(),
    Tipo: z.string(),
    Nulo: z.boolean(),
    Monto: z.number(),
    SosNombre: z.string(),
  })
  .passthrough();
export const accountPaymentListSchema = z.array(accountPaymentRecordSchema);

export const accountPayNowStatusSchema = z
  .object({
    tot: nullableNumber,
    tit: z.string(),
    enabled: z.boolean(),
  })
  .passthrough();

const certificateSignatureSchema = z.object({ FechaFirma: z.string(), Cargo: z.string() }).passthrough();
const certificateAvailableSchema = z
  .object({ idCertificado: z.number(), CertNombre: z.string(), Show: z.number() })
  .passthrough();
const certificateSignedSchema = z
  .object({
    idCertificado: z.number(),
    CertNombre: z.string(),
    Tipo: z.string(),
    SujetoId: z.number(),
    Alumno: z.number(),
    Firmas: z.array(certificateSignatureSchema),
  })
  .passthrough();

export const certificateListItemSchema = z
  .object({
    Tipo: z.string(),
    id: z.number(),
    NombreApellido: z.string(),
    NCurso: z.string(),
    Anno: z.number(),
    Rut: z.string(),
    Condicion: z.number(),
    MatEstado: z.string(),
    NMatEstado: z.string(),
    Cert: z.array(certificateAvailableSchema),
    CertFirma: z.array(certificateSignedSchema),
  })
  .passthrough();
export const certificateListSchema = z.array(certificateListItemSchema);

const modifySchemaFieldSchema = z
  .object({
    name: z.string(),
    title: z.string(),
    type: z.string(),
    grupo: z.string(),
    max: z.number(),
    reference: nullableString,
  })
  .passthrough();
export const modifySchemaResponseSchema = z.object({ fields: z.array(modifySchemaFieldSchema) }).passthrough();

const modifyInfoDataSchema = z
  .object({
    ApellidoPaterno: z.string(),
    ApellidoMaterno: z.string(),
    Nombres: z.string(),
    FechaNacimiento: z.string(),
  })
  .passthrough();
export const modifyInfoResponseSchema = z.object({ mdat: modifyInfoDataSchema }).passthrough();

export const modifyReferenceResponseSchema = z.record(z.string(), z.unknown());

export const modifySelectorItemSchema = z
  .object({
    IdAlu: nullableNumber,
    Id: z.number(),
    Rut: z.string(),
    NombreApellido: z.string(),
    NCurso: z.string(),
    Tipo: z.string(),
    Edit: z.number(),
    Direccion: z.string(),
    Comuna: z.string(),
    Email: nullableString,
    Movil: nullableString,
  })
  .passthrough();
export const modifySelectorListSchema = z.array(modifySelectorItemSchema);

/** La lista vino vacía en el HAR — se valida solo que sea un arreglo de objetos. */
export const modifyDocumentListSchema = z.array(z.record(z.string(), z.unknown()));

// --- Institucional / arranque ------------------------------------------------

export const isAuthResponseSchema = z.object({ auth: z.boolean() }).passthrough();
export const pinStatusResponseSchema = z.object({ Estado: z.number() }).passthrough();

export const menuItemSchema = z
  .object({
    view: z.string(),
    icon: z.string(),
    label: z.string(),
    elements: z.array(z.unknown()),
  })
  .passthrough();
export const menuListSchema = z.array(menuItemSchema);

export const colConfigResponseSchema = z.object({ Valor: nullableString }).passthrough();

export const publicNewsListItemSchema = z
  .object({
    idPublica: z.number(),
    Fecha: z.string(),
    Titulo: z.string(),
    Contenido: z.string(),
    UserNombre: z.string(),
    UserFoto: z.string(),
    Colegio: nullableString,
    Imagen: z.string(),
  })
  .passthrough();
export const publicNewsListSchema = z.array(publicNewsListItemSchema);
export const publicNewsDetailSchema = publicNewsListItemSchema;

export const prematConfigResponseSchema = z
  .object({
    FecInicio: nullableString,
    FecTermino: nullableString,
    Mensaje: nullableString,
    Title: nullableString,
    Activo: z.number(),
    Anno: z.number(),
  })
  .passthrough();

export const convivenciaConfigResponseSchema = z.object({ ano: z.number(), form: z.number() }).passthrough();

// --- Selección de colegio ----------------------------------------------------

// `colegio/region`, `colegio/comuna` y `colegio/list` devuelven `{ schema: [], rows: [...] }`
// (confirmado por HAR) en vez de un array plano — de ahí el wrapper `rows` en estos esquemas.

export const regionSchema = z.object({ Codigo: z.number(), Nombre: z.string() }).passthrough();
export const regionRowsSchema = z.object({ rows: z.array(regionSchema) }).passthrough();

export const comunaSchema = z.object({ Codigo: z.number(), Nombre: z.string() }).passthrough();
export const comunaRowsSchema = z.object({ rows: z.array(comunaSchema) }).passthrough();

export const schoolListItemSchema = z
  .object({ Codigo: z.string().nullable(), Nombre: z.string() })
  .passthrough();
export const schoolRowsSchema = z.object({ rows: z.array(schoolListItemSchema) }).passthrough();

export const schoolDetailSchema = z
  .object({
    Insignia: nullableString,
    Membrete: nullableString,
    Premat: z.string(),
    Acles: z.string(),
    Id: z.number(),
    DefaultYear: z.number(),
    Codigo: z.string(),
    FechaVence: z.string(),
    Nombre: z.string(),
    Slogan: z.string(),
    PrimerMes: z.number(),
    ui: z.record(z.string(), z.unknown()),
  })
  .passthrough();

// --- Login -------------------------------------------------------------------

export const signInColegioSchema = z
  .object({
    idColegio: z.number(),
    Premat: z.string(),
    Admision: z.string(),
    Acles: z.string(),
    Id: z.number(),
    DefaultYear: z.number(),
    Codigo: z.string(),
    Nombre: z.string(),
    Slogan: z.string(),
    LicenciaVencida: z.number(),
    ColegioRetirado: z.number(),
  })
  .passthrough();

export const signInResponseSchema = z
  .object({
    id: z.number(),
    colegio: signInColegioSchema,
    rut: z.string(),
    tipo: z.string(),
    ColegioId: z.number(),
    nombre: z.string(),
    titulo: z.string(),
    foto: z.string(),
    proyecto: z.string(),
    usreset: z.boolean(),
    usuario: z.string(),
  })
  .passthrough();

export const recoverPasswordResponseSchema = z.object({ ok: z.boolean() }).passthrough();
