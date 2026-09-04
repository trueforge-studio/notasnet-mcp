# notasnet-client

Librería TypeScript cliente de la API de Notasnet (`https://syscol.com/notasnet/api/`), el
portal de apoderados de un colegio chileno. Cubre **solo la capa de acceso a la API**: tipos,
cliente HTTP, mapeo de endpoints y helpers de adjuntos. No incluye login real, ni lógica de
negocio de MCP/sync/multi-tenancy — eso es un encargo posterior sobre esta librería.

Construida a partir del análisis de dos capturas HAR reales: una primera (409 requests, sesión
de apoderado con dos alumnos ya autenticada — ver `Notasnet_Analisis_HAR.docx` en el repo padre
para el informe completo) y una segunda (58 requests) que sí incluye el flujo de login real de
punta a punta (selección de colegio + usuario/contraseña), usada para confirmar el mecanismo de
autenticación (ver sección "Incertidumbres" más abajo).

**Privacidad**: ningún dato personal real (nombres, RUT, teléfonos, correos, fotos) visto en
esa captura fue copiado a este repo, ni al código, ni a los fixtures de test, ni a este README.
Todos los ejemplos usan placeholders evidentemente ficticios.

## Instalación / uso

```ts
import { NotasnetClient } from "notasnet-client";

const client = new NotasnetClient({
  baseUrl: "https://syscol.com/notasnet", // default
  // getAuthHeaders y fetch son opcionales — ver secciones abajo
});

const students = await client.listStudents();
```

### Compatible con Cloudflare Workers

`src/` no usa ningún módulo de Node (`fs`, `http`, `path`, etc.), solo Web APIs estándar
(`fetch`, `URL`, `URLSearchParams`, `FormData`). Los scripts de test corren en Node vía
vitest, pero eso no afecta el runtime del paquete publicado.

### Inyección de headers de autenticación

```ts
const sessionCookie = { name: "ntauth", value: "FAKE-SESSION-COOKIE-FOR-TESTS" }; // resultado de signIn()
const client = new NotasnetClient({
  getAuthHeaders: async () => ({ cookie: formatCookieHeader(sessionCookie) }),
});
```

`getAuthHeaders` se invoca en cada llamada, incluso si no se configura (por defecto devuelve
`{}`). El mecanismo real confirmado (ver sección "Incertidumbres" → "Autenticación") es una
cookie de sesión (`ntauth`) que devuelve `signIn()` — no el header `apikey`, que es un valor
fijo de la aplicación, no una credencial de sesión.

### `fetch` inyectable

El constructor acepta un `fetch` propio (usado en todos los tests, mockeado, sin llamadas de
red reales) — útil también para logging/retry/proxy en el futuro servidor MCP.

## Normalización de `studentId`

El backend real mezcla `idAlu`, `alu` e `id` para referirse siempre al alumno, según el
endpoint (inconsistencia propia de una API construida incrementalmente, no de esta librería).
Esta librería expone siempre `studentId: number` en su interfaz pública y mapea internamente
al nombre de query param correcto — el mapeo exacto está documentado en el JSDoc de cada
método y en la tabla de abajo.

## Tabla de métodos → endpoint real

| Método de `NotasnetClient` | Endpoint real | Mapeo de `studentId` / notas |
|---|---|---|
| `listStudents()` | `GET /alumnos` | — |
| `getStudentSummary(studentId)` | `GET /alumno/{id}` | `id` en la ruta |
| `getStudentSubjects(studentId)` | `GET /alumno/{id}/asignas` | `id` en la ruta |
| `getStudentGuardians(studentId)` | `GET /alumno/{id}/padres` | `id` en la ruta |
| `getGuardianPermissions()` | `GET /alumno/permisos` | — (aplica al apoderado autenticado) |
| `getStudentInfo(studentId, modules)` | `GET /alumnos/{id}/info?op=...` | `id` en la ruta; `modules` (`'nt'\|'as'\|'pe'\|'ho'\|'pre'`) se unen con `\|` en `op` — cada módulo filtra campos de verdad, ver incertidumbre #6 |
| `getAgendaByDate(date)` | `GET /agenda/{fecha}` | fecha en formato `YYYY-MM-DD` |
| `getAgendaEvents(range)` | `GET /agenda/eventos?fec1=&fec2=&clases=` | forma de respuesta **distinta** a `getAgendaByDate` (ver tipos `AgendaRangeEvent` vs `AgendaDayEvent`) |
| `getAgendaEventDetail(eventId)` | `GET /agenda/evento/{id}` | — |
| `listCommunications(params)` | `GET /comunica?tipo=&id=&buscar=` | `channelType`→`tipo`, `channelId`→`id`, `search`→`buscar` |
| `getCommunication(id)` | `GET /comunica/{id}` | — |
| `listCommunicationChannels(search?)` | `GET /comunica/contactos?buscar=` | — |
| `getCommunicationChannelStatus(search?)` | `GET /comunica/contacto/notificacion?buscar=` | — |
| `listCommunicationNotifications(search?)` | `GET /comunica/notificaciones?buscar=` | **sin paginación confirmada** — ver incertidumbres |
| `getCommunicationNotification(id)` | `GET /comunica/notificacion/{id}` | — |
| `getLatestNotifications(last)` | `GET /notifica/latest?last=` | — |
| `getNotificationEventDetail(notificationId)` | `GET /notifica/evento?noti=` | `notificationId`→`noti` |
| `markNotificationSeen(subject)` | `POST /notifica/visto` | body confirmado por HAR — ver incertidumbres |
| `getUnreadCount()` | `GET /notisinleer` | — |
| `getMenuNotificationCounts()` | `GET /login/menu/notifica` | — |
| `getGrades(studentId, periodId?)` | `GET /califica/asig?idAlu=` | `studentId`→`idAlu`; `periodId` **sin usar aún** — ver incertidumbres |
| `getGradeObservations(studentId)` | `GET /califica/obs?idAlu=` | `studentId`→`idAlu` |
| `listGradePeriods()` | `GET /califica/report/periodos` | — |
| `getAttendanceBySubject(studentId)` | `GET /asiste/Clases?alu=` | `studentId`→`alu` |
| `getAttendanceTotals(studentId)` | `GET /asiste/Clases/total?alu=` | `studentId`→`alu` |
| `getMonthlyAttendance(studentId)` | `GET /asiste/asistencia?idAlu=` | `studentId`→`idAlu` |
| `getTardiness(studentId, subjectId)` | `GET /asiste/atrasos?alu=&asi=` | `studentId`→`alu`, `subjectId`→`asi` |
| `getObservations(studentId)` | `GET /observa/list?idAlu=` | `studentId`→`idAlu` |
| `getSchedule(studentId)` | `GET /horario?idAlu=` | `studentId`→`idAlu` |
| `listFolderSubjects(studentId)` | `GET /carpetas/asignaturas?idAlu=` | `studentId`→`idAlu` |
| `listFolderCategories(studentIds)` | `GET /Carpetas/acles?alu=&alu=...` | `alu` repetido una vez por alumno (nota: ruta con `Carpetas` en mayúscula, inconsistente con las otras rutas `carpetas/*`) |
| `listFolderFiles({folderRef, id})` | `GET /carpetas/archivos?p=&id=` | `folderRef`→`p` (**no** es un número de página — ver incertidumbres), `id` opcional |
| `getAccountPaymentStatus()` | `GET /cuenta/upag` | — |
| `getAccountInstallments()` | `GET /cuenta/cuotas` | — |
| `getAccountPayments()` | `GET /cuenta/pagos` | — |
| `getAccountPayNowStatus()` | `GET /cuenta/pagar` | — |
| `listCertificates()` | `GET /certifica/list` | — |
| `getModifySchema(tipo)` | `GET /modify/schema?tipo=` | — |
| `getModifyInfo(tipo, id)` | `GET /modify/info?tipo=&id=` | — |
| `getModifyReference(tables)` | `GET /modify/reference?table=` | `tables` (ej. `["idAlergia:_alergias", ...]`) se unen con `,` |
| `getModifySelector(id)` | `GET /modify/selector?id=` | — |
| `getModifyDocuments(tipo, id)` | `GET /modify/documentos?tipo=&id=` | — |
| `isAuthenticated()` | `GET /login/isauth` | — |
| `getPinStatus()` | `GET /login/pinstatus` | — |
| `getMenu()` | `GET /login/menu` | — |
| `getColConfig(key)` | `GET /colconfig?key=` | — |
| `listPublicNews(top?)` | `GET /publicas?top=` | — |
| `getPublicNewsDetail(id)` | `GET /publicas/{id}` | — |
| `getPrematConfig()` | `GET /premat/config` | — |
| `getConvivenciaDenunciaConfig()` | `GET /convivencia/denuncia/config` | — |
| `listRegions()` | `GET /colegio/region` | sin sesión; desenvuelve `{ rows }` |
| `listComunas(regionCode)` | `GET /colegio/comuna?reg=` | sin sesión; desenvuelve `{ rows }` |
| `listSchools(communeCode)` | `GET /colegio/list?com=` | sin sesión; desenvuelve `{ rows }` |
| `getSchoolDetail(schoolCode)` | `GET /colegio/{codigo}` | sin sesión |
| `recoverPassword(email)` | `POST /login/recover` | sin sesión; `multipart/form-data` |
| `signIn(params, apiKey)` | `POST /login/signin` | ver sección Autenticación — `apiKey` es una clave fija de la app; la sesión real viene en `Set-Cookie` (`sessionCookie` en el resultado) |
| `signInWithQr()` | _(no capturado)_ | lanza `NotImplementedError` — ver sección Autenticación |

## Adjuntos (`src/attachments.ts`)

- `buildAttachmentUrl(baseUrl, { Path })` construye `${baseUrl}/${Path}` sin encoding
  adicional — así es como se resuelven los adjuntos embebidos en comunicados, eventos de
  agenda y notificaciones (`{ FileName, Path }`).
- `downloadAttachment(baseUrl, attachment, fetchImpl?)` hace el `GET` y devuelve la `Response`
  cruda (no intenta parsear JSON — ver más abajo).
- `downloadStaticResource(baseUrl, relativePath, fetchImpl?)` es lo mismo pero para una ruta
  relativa cruda (ej. una foto de alumno).
- `downloadFolderFile(...)` **lanza** intencionalmente — ver incertidumbres, "Carpetas".

Confirmado por el HAR:

- No se detectó token de descarga, URL firmada, ni expiración en los adjuntos embebidos — es
  un `GET` estático plano contra el mismo origen.
- Las fotos de alumnos (`cole/fotos/...`) tuvieron respuestas 200 y 403 mezcladas sin un
  patrón claro identificable solo con este HAR. El helper de descarga no asume disponibilidad:
  propaga el status code tal cual al llamador.

## Manejo de errores (`src/errors.ts`)

- `NotasnetApiError`: lanzado en cualquier respuesta no-2xx, o cuando un 2xx no trae JSON
  válido. Incluye `status`, `url`, `method`, `rawBody` (texto crudo) y `parsedBody` (si el
  cuerpo sí era JSON, aunque el status no fuera 2xx). El backend no mostró tener un formato de
  error estructurado consistente en el HAR, así que no se asume ninguna forma de cuerpo de
  error.
- `NotasnetShapeError`: lanzado cuando un 2xx sí es JSON válido pero no pasa la validación de
  forma esperada (zod, en `src/schemas.ts`). Señal explícita de que el backend cambió algo.
- Los helpers de adjuntos (`downloadAttachment`, `downloadStaticResource`) **no** lanzan ni
  intentan parsear JSON en ningún caso — devuelven la `Response` cruda para que el llamador
  decida (recursos estáticos pueden devolver 403 sin cuerpo JSON).

## Validación de forma con zod

Todas las respuestas se validan en el borde del cliente contra esquemas en `src/schemas.ts`
antes de devolverse al llamador. Los esquemas usan `.passthrough()`: solo validan los campos
que la librería declara usar, sin rechazar campos adicionales que el backend agregue con el
tiempo. Esto existe porque la API es antigua, no versionada, y mezcla convenciones — una
validación de forma en el borde detecta mucho antes cuando el backend cambia algo, en vez de
romper silenciosamente un futuro sync.

## Incertidumbres (léase antes de integrar contra el backend real)

### 1. Autenticación — confirmada probando un login real de punta a punta

Dos capturas HAR sucesivas no mostraron cookies ni headers de autorización de usuario en
ninguna llamada posterior al login, y llevaron a una hipótesis intermedia — descartada más
abajo — de que el header `apikey` era en sí mismo la credencial de sesión. Esa hipótesis se
probó y resultó **incorrecta**: se confirmó el mecanismo real ejecutando un login de verdad
contra el backend e inspeccionando la respuesta con `fetch`/`curl` directamente (no a través de
una exportación a HAR).

Lo confirmado:

- `POST /login/signin` responde con `Set-Cookie: ntauth=<valor>; Expires=...; Path=/notasnet;
  Secure; SameSite=Strict; HttpOnly`. Esa cookie —no el header `apikey`— es la que de verdad
  autoriza las peticiones posteriores: se probó `GET /alumnos` enviando **solo** la cookie
  `ntauth` (sin ningún header `apikey`) y devolvió los datos reales de la cuenta igual.
- La razón por la que ninguna de las dos capturas HAR mostró esto es que la cookie es
  `HttpOnly` + `SameSite=Strict`: las exportaciones a HAR hechas con Chrome DevTools usadas
  para el análisis omitieron el `Set-Cookie` de la respuesta de login. Esto confirma la
  hipótesis que ya planteaba el análisis original (`Notasnet_Analisis_HAR.docx`), que una
  hipótesis intermedia de esta librería había descartado erróneamente.
- El header `apikey` sí es obligatorio en la petición de `signIn` (un valor generado al azar
  devuelve 401), pero es un valor **fijo/estático**: el mismo valor exacto apareció en dos
  capturas hechas en momentos distintos. Todo indica que es una clave de aplicación embebida
  en el bundle JS del frontend (visible para cualquiera que abra las herramientas de
  desarrollador en la página de login), no una credencial de sesión ni algo que el cliente
  deba generar. Por eso `signIn` la recibe como parámetro obligatorio en vez de generarla.

Uso:

```ts
import { NotasnetClient, formatCookieHeader } from "notasnet-client";
import type { SessionCookie } from "notasnet-client";

// Obtener una vez inspeccionando el tráfico de red de
// https://syscol.com/notasnet/login?colegio=<slug> (header `apikey` en cualquier petición).
const APP_API_KEY = "..."; // valor fijo de la app, no una credencial de usuario

let sessionCookie: SessionCookie | null = null;
const client = new NotasnetClient({
  getAuthHeaders: () => (sessionCookie ? { cookie: formatCookieHeader(sessionCookie) } : {}),
});

const { profile, sessionCookie: cookie } = await client.signIn(
  { colegio: "altomonte", usuario: "11.111.111-1", password: "..." },
  APP_API_KEY,
);
sessionCookie = cookie; // guardar de forma persistente — ver nota abajo
// A partir de acá, cualquier llamada del mismo `client` ya está autenticada porque
// `getAuthHeaders` reenvía la cookie guardada.
```

Notas importantes:

- `signIn` **no** pasa por `getAuthHeaders` — es la operación que establece la sesión, no una
  que la consume. El `apiKey` (la clave fija de la app) se pasa explícitamente como segundo
  argumento.
- `SignInResult.sessionCookie` puede venir `null` si el backend no manda `Set-Cookie` — no se
  observó ese caso en las pruebas hechas, pero el tipo lo contempla.
- No confirmado: si el valor de `apikey` es el mismo para todos los colegios de syscol.com o
  específico por colegio (las capturas disponibles son todas del mismo colegio); expiración o
  renovación de la cookie `ntauth` más allá del `Expires` que manda el propio backend (~3 años
  en las pruebas hechas); si `apikey` importa para algo más allá de la petición de `signIn` en
  sí misma.
- El pensado multi-tenant a futuro (MCP + D1) encaja naturalmente con esto: la cookie de sesión
  por familia es lo que habría que persistir (cifrada) en D1 tras un `signIn()` exitoso, y
  reinyectar en `getAuthHeaders` en cada sesión futura sin volver a pedir usuario/contraseña.
- `POST /login/recover` (recuperación de contraseña por email) también está implementado
  (`recoverPassword(email)`) — confirmado por HAR, `multipart/form-data` con un campo `email`.
- Existe además un login por QR (abre la cámara del dispositivo) que **no** se investigó:
  se abrió y cerró la cámara sin escanear nada, así que no hay ninguna petición de red
  capturada para ese flujo. `signInWithQr()` existe como método explícito que lanza
  `NotImplementedError`, para dejar constancia de que el flujo existe y sigue sin resolverse,
  en vez de omitirlo en silencio.
- Se detectó además un endpoint `login/pinstatus` consultado repetidamente durante la sesión,
  de función no confirmada (¿PIN adicional de seguridad? ¿verificación de dispositivo?).
- El flujo de selección de colegio previo al login (región → comuna → colegio) es de
  directorio público, sin autenticación: `listRegions()`, `listComunas(regionCode)`,
  `listSchools(communeCode)` y `getSchoolDetail(schoolCode)`. `SchoolListItem.Codigo` es el
  slug que hay que pasar como `colegio` en `signIn()`.

### 2. Paginación de `comunica/notificaciones` — no confirmada

El HAR mostró 813 registros devueltos en una sola respuesta, sin ningún parámetro de
página/offset visible en la request. No se puede saber si eso es realmente "todo el
historial" sin límite, o si existe un tope no alcanzado en esa sesión. `listCommunicationNotifications`
solo expone `search` (mapea a `buscar`) — no hay parámetro de paginación implementado porque
no hay evidencia de cuál sería.

### 3. URL de descarga de "Carpetas" — no confirmada

`GET /carpetas/archivos` (`listFolderFiles`) no trae ningún campo de ruta de descarga en las
respuestas observadas en este HAR — solo `{ Archivo, Fecha }`, donde `Archivo` es un nombre de
archivo con un id numérico como prefijo. El análisis previo documentaba un campo `Ruta` que
vino siempre `null`; en los objetos efectivamente capturados en este HAR ese campo no aparece
en absoluto. En cualquier caso, no hay evidencia suficiente para construir una URL de descarga
sin adivinar. `downloadFolderFile()` en `src/attachments.ts` lanza explícitamente en vez de
adivinar un patrón — hay un comentario `// TODO: patrón de URL no confirmado, revisar con una
captura nueva` justo ahí. Se recomienda capturar una descarga real desde el módulo Carpetas en
una próxima sesión.

### 4. Body de `POST /notifica/visto` — SÍ confirmado por este HAR (corrige el análisis previo)

A diferencia de lo asumido en el encargo original de esta librería, el HAR sí capturó 4
llamadas reales a `POST /notifica/visto`. El body es `multipart/form-data` con un único campo:

```
suj = "ag:<idDeEvento>"
```

Es decir, el valor es el mismo campo `Sujeto` que traen `AgendaDayEvent`, `LatestNotification`,
`CommunicationNotificationDetail`, etc. (formato `"<prefijo>:<id>"`). Por eso
`markNotificationSeen(subject)` recibe ese string completo, no un id numérico suelto.

Lo que **no** está confirmado: las 4 llamadas capturadas usaron siempre el prefijo `"ag:"`
(eventos de agenda). No se observó ninguna llamada marcando como vista una notificación de
comunicación (prefijo distinto, si existe uno). Probar contra el backend real antes de asumir
que `suj` acepta cualquier prefijo de `Sujeto`/`SujetoCodigo`.

### 5. Parámetro de periodo en `califica/asig` — no confirmado

Existe un listado de periodos de evaluación (`listGradePeriods`, `GET
/califica/report/periodos`) pero no se capturó ninguna llamada a `califica/asig` pidiendo un
periodo distinto al vigente. `getGrades(studentId, periodId?)` deja el parámetro `periodId`
preparado en la firma pero **sin usarlo** — no se envía ningún query param adicional hasta que
se confirme el nombre real.

### 6. Mapeo de módulos de `getStudentInfo` — confirmado en producción

`GET /alumnos/{id}/info?op=...` sí filtra de verdad según los módulos pedidos en `op` (antes se
asumía, sin evidencia directa, que el backend siempre devolvía todos los campos posibles). Se
confirmó pidiendo cada módulo por separado contra el backend real — ver `StudentInfoModule` en
`src/types.ts` para el mapeo completo módulo→campos. Dos hallazgos no obvios:

- `as` NO es "asignaturas" — es asistencia (`AsiPor0-2`, `AsiPorFinal`, `Inasi0-2`,
  `InasiFinal`, `Atrasos`). Nombre engañoso a tener en cuenta al usar la librería.
- `pe` ("periodo") aporta los datos base del alumno/curso (`Anno`, `Rut`, `NombreApellido`,
  `NCurso`, `NombreApellidos`), no algo relacionado a periodos de evaluación.
- `pre` (prematrícula) no mostró aportar campos propios, pero el único caso probado fue un
  alumno ya matriculado (donde prematrícula no aplica) — no está descartado que aporte campos
  para un alumno efectivamente en proceso de prematrícula.

`getStudentInfo` arma el schema de validación dinámicamente según los `modules` pedidos en cada
llamada (`buildStudentInfoSchema` en `src/schemas.ts`), en vez de exigir siempre todos los
campos posibles — eso último causaba que pedir un subconjunto de módulos (ej. solo `["nt"]`)
reventara la validación al no traer campos de módulos ni pedidos.

### 7. Otros campos/comportamientos marcados como no confirmados en el código

Buscar el string `no confirmado` en `src/types.ts` y `src/attachments.ts` para el detalle
completo. En particular:

- Todos los campos médicos y de contacto de emergencia del alumno (`InformacionMedica`,
  `Alergias`, `Enfermedades`, `GrupoSangre`, `Avisar1/2`, `Telefonos1/2`, `Vacunas`, `Email`,
  `Movil`, `NViveCon` en `StudentSummary`; y sus equivalentes en `ModifyInfoData`) vinieron
  sistemáticamente `null` en el HAR analizado (dos alumnos observados). Se tipan como
  nullable, pero su forma real cuando sí traen datos no está confirmada (¿string libre?,
  ¿lista?, ¿objeto estructurado?).
- Control de acceso a fotos de alumnos (`cole/fotos/...`): mezcla de 200 y 403 sin patrón
  identificable en este HAR.
- El rol observado en toda la sesión es "apoderado" (`tipo: "apo"`); no hay evidencia de cómo
  se comporta la API para otros roles (profesor, sostenedor, alumno).
- No se observaron señales de rate limiting ni de versionado de API.

## Desarrollo

```bash
npm install
npm run typecheck   # tsc --noEmit
npm test            # vitest run, contra fixtures anonimizados, cero red real
npm run build        # tsup → dist/ (ESM + CJS + .d.ts)
```

Los fixtures en `test/fixtures/*.json` están anonimizados a mano a partir de la forma real
observada en el HAR (nombres de campo, tipos, anidamiento) — todo valor de dato personal fue
reemplazado por un placeholder evidentemente ficticio (`"Nombre Apellido Ejemplo"`,
`"11.111.111-1"`, `"correo@ejemplo.cl"`, `"+56900000000"`, etc.), manteniendo IDs numéricos
ficticios pero con el mismo formato/longitud aproximada que los reales. El HAR crudo no se
incluye ni se referencia desde este subdirectorio.
