# Prompt para el agente: librería TypeScript cliente de la API de Notasnet (sin auth)

Copia y pega este prompt completo al agente (Claude Code u otro) que vaya a implementar la librería. Está escrito para que el agente no necesite más contexto que este documento y el HAR adjunto.

---

## Contexto

Notasnet es el portal de un colegio chileno (apoderados/padres) para ver agenda, comunicaciones, notas, asistencia, observaciones, horario, archivos y cuenta de un alumno. La app real es una SPA en `https://syscol.com/notasnet/` que consume una API JSON propia bajo `/notasnet/api/`.

Ya se hizo un análisis exploratorio de una captura HAR real de una sesión de navegación (`syscol.com.har`, 409 requests, ~5 minutos, cuenta de apoderado con dos alumnos). Ese análisis está adjunto como referencia (`Notasnet_Analisis_HAR.docx`) y el HAR crudo también está disponible. Tu tarea es construir, a partir de esa evidencia, una **librería cliente TypeScript** para consumir esa API. Este es un paso intermedio: más adelante esta librería se integrará en un servidor MCP corriendo en Cloudflare Workers + D1, multi-tenant (varias familias, cada una con su propio token). Diseña pensando en eso, pero **no implementes nada de eso todavía**.

## Objetivo de este encargo (alcance)

Construir **solo** la capa de acceso a la API de Notasnet: tipos, cliente HTTP, mapeo de endpoints, helpers de adjuntos, y tests contra fixtures. Explícitamente **fuera de alcance** en este encargo:

- El flujo real de login/autenticación (no se sabe aún cómo funciona la sesión — ver sección "Autenticación (aún no resuelta)" más abajo).
- Cualquier lógica de negocio de MCP, scheduling, base de datos, multi-tenancy, extracción de texto de adjuntos con LLM, etc. Eso vendrá después, en otro encargo, sobre esta librería.
- Escribir en la API (no hay endpoints de escritura confirmados salvo `notifica/visto`, que sí puedes incluir de forma tipada).

## Fuentes que debes usar

1. **El HAR real** (`syscol.com.har`) — es la fuente de verdad para nombres exactos de campos, formatos de fecha, valores de enums, y para generar fixtures de test. Léelo directamente (es JSON) en vez de confiar solo en este resumen.
2. **El informe de análisis** (`Notasnet_Analisis_HAR.docx`) — te da el catálogo de endpoints, entidades y las incertidumbres ya detectadas, para que no repitas ese trabajo de reversing desde cero.
3. El catálogo de endpoints resumido más abajo en este prompt, como checklist mínimo a cubrir.

## Requisitos técnicos

- **TypeScript**, target ESM, compatible con el runtime de **Cloudflare Workers** (Web APIs estándar: `fetch`, `URL`, `URLSearchParams`; nada de módulos de Node como `fs`, `http`, `path` dentro de `src/` — esos sí puedes usarlos en scripts de test/generación de fixtures, que corren en Node vía vitest).
- Sin dependencias pesadas. Se permite `zod` (o similar) para validar/parsear las respuestas en el borde (ver más abajo por qué importa acá especialmente).
- Testing con **vitest**, mockeando `fetch` (o inyectando un `fetch` custom en el cliente) — **cero llamadas de red reales** en los tests, todo contra fixtures.
- Gestor de paquetes y estructura: usa lo que ya use el repo si te lo indico como contexto adicional; si es un repo nuevo, `pnpm` + `tsup` para build está bien.

## Diseño del cliente

- Una clase `NotasnetClient` (o un factory `createNotasnetClient(config)`), con:
  - `baseUrl` configurable (default `https://syscol.com/notasnet`).
  - Un punto de inyección para headers de autenticación: algo como `getAuthHeaders?: () => Record<string,string> | Promise<Record<string,string>>`, que hoy puede no usarse (devolver `{}` o no pasarse), pero que el request builder ya invoque en cada llamada. **No hardcodees ningún valor real de `apikey` ni de sesión** — si necesitas un ejemplo para tests, usa un placeholder evidente tipo `"FAKE-API-KEY-FOR-TESTS"`.
  - Un `fetch` inyectable (para poder mockearlo en tests sin tocar `globalThis.fetch`).
  - Métodos agrupados por dominio funcional (ver catálogo abajo), no un único método genérico `request(path, params)` expuesto como API pública — aunque internamente sí puedes tener un helper privado común.
  - Normaliza en la API pública los parámetros inconsistentes del backend real: el backend mezcla `idAlu`, `alu` e `id` para referirse siempre al alumno según el endpoint. Tu librería debe exponer siempre `studentId: number` en su interfaz pública, y mapear internamente al nombre de query param correcto por endpoint (documenta ese mapeo en un comentario junto a cada método).
  - Devuelve tipos TypeScript fuertes (interfaces/tipos en `src/types.ts`), no `any`. Cuando un campo observado en el HAR es sistemáticamente `null` en los ejemplos vistos pero probablemente pueda traer datos (p. ej. datos médicos del alumno), tipa como `T | null` y anótalo con un comentario `// no confirmado con datos reales, solo se vio null en el HAR`.
  - Recomendado: valida las respuestas con `zod` en el borde del cliente (no en cada llamador). La API real es antigua e inconsistente (nombres de endpoint con distinta capitalización, mezcla de campos en español e inglés en la respuesta de agenda según el endpoint — ver más abajo) y no tiene versionado; una validación de forma en el borde va a hacer mucho más fácil detectar cuando el backend cambie algo, antes de que rompa silenciosamente un sync futuro.

## Manejo de adjuntos

Modela un helper independiente (`src/attachments.ts`) que, dado un objeto `{ FileName, Path }` (tal como viene embebido en comunicados/eventos de agenda/notificaciones), construya la URL absoluta de descarga (`${baseUrl}/${Path}`, sin encoding adicional necesario según lo visto en el HAR) y exponga una función `downloadAttachment(path, fetchImpl)` que haga el `GET` y devuelva el `ArrayBuffer`/`Response` crudo. Documenta explícitamente en el código y el README que:

- No se detectó token de descarga, URL firmada, ni expiración — es un GET estático plano.
- El módulo "Carpetas" (`/api/carpetas/archivos`) devuelve archivos cuyo campo `Ruta` vino `null` en todos los casos observados en el HAR, así que **no está confirmada** la convención real de URL de descarga para ese módulo específico. Implementa el tipo y el método de listado igual, pero marca la función de descarga para Carpetas como `// TODO: patrón de URL no confirmado, revisar con una captura nueva` en vez de adivinar una URL que podría estar mal.
- Las fotos de alumnos (`cole/fotos/...`) tuvieron respuestas 200 y 403 mezcladas sin patrón claro — no construyas lógica que asuma que siempre van a estar disponibles; el helper de descarga debe simplemente propagar el status code al llamador.

## Catálogo de endpoints a cubrir (nombres de método sugeridos entre paréntesis)

Todas relativas a `/notasnet/api`. Confirma los nombres de campo exactos leyendo el HAR — esta tabla es un resumen, no la fuente de verdad.

**Alumnos**
- `GET /alumnos` (`listStudents()`) — alumnos de la cuenta.
- `GET /alumno/{id}` (`getStudentSummary(studentId)`) — resumen (promedios, asistencia, atrasos, datos médicos).
- `GET /alumno/{id}/asignas` (`getStudentSubjects(studentId)`).
- `GET /alumno/{id}/padres` (`getStudentGuardians(studentId)`).
- `GET /alumno/permisos` (`getGuardianPermissions()`).
- `GET /alumnos/{id}/info?op=...` (`getStudentInfo(studentId, modules)`) — `modules` como array tipado (`'nt'|'as'|'pe'|'ho'|'pre'`) que tu cliente une con `|` al construir el query.

**Agenda / calendario**
- `GET /agenda/{fecha}` (`getAgendaByDate(date)`).
- `GET /agenda/eventos?fec1=&fec2=&clases=` (`getAgendaEvents(range)`) — nota: la forma de los objetos que devuelve este endpoint **no es la misma** que la de `getAgendaByDate` (campos en inglés/español mezclados, `title` vs `Titulo`). Modélalos como dos tipos distintos, no fuerces un tipo único.
- `GET /agenda/evento/{id}` (`getAgendaEventDetail(id)`).

**Comunicaciones y notificaciones**
- `GET /comunica?tipo=&id=&buscar=` (`listCommunications({channelType, channelId, search})`), `channelType` tipado como `'Colegio'|'Curso'|'Subsector'`.
- `GET /comunica/{id}` (`getCommunication(id)`).
- `GET /comunica/contactos?buscar=` (`listCommunicationChannels(search?)`).
- `GET /comunica/contacto/notificacion?buscar=` (`getCommunicationChannelStatus(search?)`).
- `GET /comunica/notificaciones?buscar=` (`listCommunicationNotifications(search?)`) — sin paginación confirmada, documenta esto en el JSDoc del método.
- `GET /comunica/notificacion/{id}` (`getCommunicationNotification(id)`).
- `GET /notifica/latest?last=` (`getLatestNotifications(last)`).
- `GET /notifica/evento?noti=` (`getNotificationEventDetail(notificationId)`).
- `POST /notifica/visto` (`markNotificationSeen(notificationId)`) — el body exacto no quedó capturado en el HAR; infiere la forma más razonable (`{ id: notificationId }` o similar) y márcalo como `// forma del body no confirmada por HAR, ajustar si falla en pruebas reales`.
- `GET /notisinleer` (`getUnreadCount()`).
- `GET /login/menu/notifica` (`getMenuNotificationCounts()`).

**Notas / evaluaciones**
- `GET /califica/asig?idAlu=` (`getGrades(studentId)`).
- `GET /califica/obs?idAlu=` (`getGradeObservations(studentId)`).
- `GET /califica/report/periodos` (`listGradePeriods()`) — nota: no se confirmó el parámetro para pedir notas de un periodo distinto al vigente; deja el método `getGrades` preparado para aceptar un `periodId?` opcional sin usarlo aún, y coméntalo.

**Asistencia**
- `GET /asiste/Clases?alu=` (`getAttendanceBySubject(studentId)`).
- `GET /asiste/Clases/total?alu=` (`getAttendanceTotals(studentId)`).
- `GET /asiste/asistencia?idAlu=` (`getMonthlyAttendance(studentId)`).
- `GET /asiste/atrasos?alu=&asi=` (`getTardiness(studentId, subjectId)`).

**Observaciones, horario, carpetas**
- `GET /observa/list?idAlu=` (`getObservations(studentId)`).
- `GET /horario?idAlu=` (`getSchedule(studentId)`).
- `GET /carpetas/asignaturas?idAlu=` (`listFolderSubjects(studentId)`).
- `GET /Carpetas/acles?alu=&alu=` (`listFolderCategories(studentIds)`) — repite el query param `alu` una vez por alumno; tu método debe aceptar `studentId[]`.
- `GET /carpetas/archivos?p=&id=` (`listFolderFiles({folderRef, id})`) — documenta que `p` no es un número de página, es un selector de carpeta/contexto (valores vistos: `0`, `2`, `"cur"`).

**Cuenta / certificados / datos personales** (prioridad baja, pero inclúyelos con el mismo estándar de tipado)
- `GET /cuenta/upag`, `GET /cuenta/cuotas`, `GET /cuenta/pagos`, `GET /cuenta/pagar`.
- `GET /certifica/list`.
- `GET /modify/schema?tipo=`, `GET /modify/info?tipo=&id=`, `GET /modify/reference?table=`, `GET /modify/selector?id=`, `GET /modify/documentos?tipo=&id=`.

**Institucional / arranque**
- `GET /login/isauth`, `GET /login/pinstatus`, `GET /login/menu`, `GET /colconfig?key=`.
- `GET /publicas?top=`, `GET /publicas/{id}`.
- `GET /premat/config`, `GET /convivencia/denuncia/config`.

## Autenticación (aún no resuelta — no la implementes, pero no la bloquees)

El HAR no permite confirmar el mecanismo real de sesión (no se capturaron cookies ni headers de autorización en las llamadas posteriores al login). Por eso:

- El cliente debe funcionar **sin asumir ningún mecanismo de auth específico**: todo request pasa por un único punto donde se agregan headers dinámicos (el `getAuthHeaders` mencionado arriba).
- No implementes `signIn()` real todavía. Puedes dejar el tipo de la respuesta de `/login/signin` modelado (para cuando se resuelva), pero el método puede lanzar `NotImplementedError` o simplemente no existir aún — prioriza dejar un comentario claro en el README de por qué falta.

## Fixtures y tests (importante: privacidad)

El HAR real contiene datos personales reales de menores de edad, apoderados y profesores (nombres, RUT, teléfonos, correos, fotos). **No copies esos valores reales a fixtures, tests, código ni al README.** Para cada fixture:

1. Toma la forma real (nombres de campo, tipos, anidamiento) de una respuesta del HAR.
2. Reemplaza todos los valores de datos personales por placeholders obviamente ficticios (`"Nombre Apellido Ejemplo"`, `"11.111.111-1"`, `"correo@ejemplo.cl"`, `"+56900000000"`), manteniendo IDs numéricos ficticios pero con el mismo formato/longitud que los reales.
3. Guarda los fixtures como JSON en `test/fixtures/`, uno por endpoint (o agrupados por dominio funcional), y escribe los tests contra esos fixtures mockeando `fetch`.
4. Si generas los fixtures con un script que lee el HAR real, ese script no debe commitear el HAR ni escribir valores reales en ningún archivo del repo — solo debe generar la versión anonimizada.

## Manejo de errores

- Modela un tipo de error propio (`NotasnetApiError`) que incluya `status`, `url` y el cuerpo crudo de la respuesta si no es JSON válido (el backend no mostró tener un formato de error estructurado consistente en el HAR — no lo asumas).
- Los recursos estáticos (fotos, algunos adjuntos) pueden devolver 403 sin cuerpo JSON — el helper de descarga de adjuntos no debe intentar parsear JSON de esas respuestas.

## Entregables esperados

1. `src/types.ts` — todas las interfaces/tipos, con comentarios señalando campos no confirmados o con forma inconsistente entre endpoints.
2. `src/client.ts` (o varios archivos por dominio bajo `src/resources/`) — la clase `NotasnetClient` con todos los métodos del catálogo.
3. `src/attachments.ts` — helpers de adjuntos descritos arriba.
4. `src/errors.ts` — `NotasnetApiError` y afines.
5. `test/fixtures/*.json` — anonimizados, uno o más por endpoint relevante.
6. `test/*.test.ts` — cobertura de cada método del catálogo contra sus fixtures, incluyendo al menos un caso de error (403/404/JSON inválido).
7. `README.md` — tabla de métodos → endpoint real, con las incertidumbres señaladas explícitamente (autenticación no resuelta, paginación no confirmada en `comunica/notificaciones`, URL de descarga no confirmada en Carpetas, body de `notifica/visto` no confirmado, parámetro de periodo en `califica` no confirmado).

## Qué NO hacer

- No inventes ni "completes" campos que no se vieron en el HAR presentándolos como confirmados; usa comentarios `// no confirmado` en vez de adivinar en silencio.
- No implementes el login real ni manejo de cookies/tokens reales.
- No agregues dependencias de Node incompatibles con Cloudflare Workers en `src/`.
- No incluyas ningún dato personal real (nombres, RUT, teléfonos, correos, fotos) en el repo, ni siquiera "de ejemplo" tomado literalmente del HAR.
