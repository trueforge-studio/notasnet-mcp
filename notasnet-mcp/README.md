# notasnet-mcp

Servidor MCP (Model Context Protocol) local, sobre stdio, que envuelve
[`notasnet-client`](../notasnet-client) (la librería TypeScript de acceso a la API de Notasnet,
`syscol.com/notasnet`) y expone sus métodos como herramientas MCP para un cliente compatible
(Claude Desktop, Claude Code, u otro host MCP).

Este paquete **no** reimplementa nada de la capa de API: para cada método público de
`NotasnetClient` registra una herramienta MCP con el mismo nombre en `snake_case` prefijado
`notasnet_`, valida el input con zod replicando la firma exacta del método, llama al cliente, y
da forma al resultado según la convención de contenido/errores del SDK de MCP. La lógica de
sesión (login, cookie, persistencia) es nueva de este paquete — no existía en `notasnet-client`.

## Cómo se relaciona con `notasnet-client`

- Depende de `notasnet-client` vía `file:../notasnet-client` (workspace local, no publicado a
  npm) e importa desde su `dist/` ya compilado — hay que correr `npm run build` en
  `notasnet-client` al menos una vez antes de instalar/compilar este paquete.
- Toda la validación de forma de respuesta, mapeo de `studentId`→query param real, y manejo de
  errores (`NotasnetApiError`, `NotasnetShapeError`) vive en `notasnet-client`; este paquete solo
  agrega sesión + la capa MCP encima.
- A diferencia de `notasnet-client` (compatible con Cloudflare Workers, sin módulos de Node),
  este paquete es un proceso Node local y usa `fs`/`os`/`path` sin restricción.

## Herramientas expuestas

Convención de nombres: `notasnet_<snake_case del método>`. Todas las herramientas de solo
lectura requieren sesión activa salvo las marcadas "sin sesión" (directorio público de colegios
y helpers de URL de adjuntos). Si no hay sesión, la herramienta devuelve un error claro pidiendo
usar `notasnet_login`, en vez de dejar que el backend responda un 401 confuso.

### Sesión / login

| Herramienta | Método de `NotasnetClient` | Descripción |
|---|---|---|
| `notasnet_login` | `signIn` | Inicia sesión y persiste la cookie de sesión resultante. Devuelve el perfil, nunca la contraseña ni la cookie cruda. |
| `notasnet_session_status` | `isAuthenticated` (condicional) | Estado de la sesión del servidor MCP. Sin sesión cargada, no hace ninguna llamada de red. |
| `notasnet_recover_password` | `recoverPassword` | Solicita recuperación de contraseña por email. Sin sesión. |

`notasnet_sign_in_with_qr` **no existe a propósito**: `signInWithQr()` en `notasnet-client`
lanza `NotImplementedError` porque el flujo de login por QR nunca fue capturado — no tiene
sentido envolver una llamada garantizada a fallar.

### Alumnos

| Herramienta | Método | Descripción |
|---|---|---|
| `notasnet_list_students` | `listStudents` | Alumnos de la cuenta. |
| `notasnet_get_student_summary` | `getStudentSummary` | Ficha resumen (promedios, asistencia, atrasos, datos médicos). |
| `notasnet_get_student_subjects` | `getStudentSubjects` | Asignaturas del alumno. |
| `notasnet_get_student_guardians` | `getStudentGuardians` | Apoderados/padres del alumno. |
| `notasnet_get_guardian_permissions` | `getGuardianPermissions` | Permisos del apoderado autenticado. |
| `notasnet_get_student_info` | `getStudentInfo` | Resumen ampliable por módulo (`nt`,`as`,`pe`,`ho`,`pre`). |

### Agenda

| Herramienta | Método | Descripción |
|---|---|---|
| `notasnet_get_agenda_by_date` | `getAgendaByDate` | Eventos de un día puntual. |
| `notasnet_get_agenda_events` | `getAgendaEvents` | Eventos dentro de un rango de fechas (forma de respuesta distinta a la anterior). |
| `notasnet_get_agenda_event_detail` | `getAgendaEventDetail` | Detalle de un evento, incluyendo adjuntos. |

### Comunicaciones y notificaciones

| Herramienta | Método | Descripción |
|---|---|---|
| `notasnet_list_communications` | `listCommunications` | Comunicados de un canal (`Colegio`\|`Curso`\|`Subsector`). |
| `notasnet_get_communication` | `getCommunication` | Detalle de un comunicado. |
| `notasnet_list_communication_channels` | `listCommunicationChannels` | Canales disponibles con contador de no leídos. |
| `notasnet_get_communication_channel_status` | `getCommunicationChannelStatus` | Estado de un canal puntual. |
| `notasnet_list_communication_notifications` | `listCommunicationNotifications` | Historial de notificaciones de comunicaciones (sin paginación confirmada). |
| `notasnet_get_communication_notification` | `getCommunicationNotification` | Detalle de una notificación de comunicación. |
| `notasnet_get_latest_notifications` | `getLatestNotifications` | Últimas N notificaciones. |
| `notasnet_get_notification_event_detail` | `getNotificationEventDetail` | Detalle de notificación ligada a un evento de agenda. |
| `notasnet_mark_notification_seen` | `markNotificationSeen` | Marca una notificación como vista (`subject` = campo `Sujeto`, ej. `"ag:1234567"`). |
| `notasnet_get_unread_count` | `getUnreadCount` | Contador total de no leídas. |
| `notasnet_get_menu_notification_counts` | `getMenuNotificationCounts` | Contadores por ítem de menú. |

### Notas / evaluaciones

| Herramienta | Método | Descripción |
|---|---|---|
| `notasnet_get_grades` | `getGrades` | Notas por asignatura del periodo vigente. |
| `notasnet_get_grade_observations` | `getGradeObservations` | Observaciones asociadas a calificaciones. |
| `notasnet_list_grade_periods` | `listGradePeriods` | Periodos de evaluación disponibles. |

### Asistencia

| Herramienta | Método | Descripción |
|---|---|---|
| `notasnet_get_attendance_by_subject` | `getAttendanceBySubject` | Asistencia agregada por asignatura. |
| `notasnet_get_attendance_totals` | `getAttendanceTotals` | Totales agregados. |
| `notasnet_get_monthly_attendance` | `getMonthlyAttendance` | Asistencia mensual detallada. |
| `notasnet_get_tardiness` | `getTardiness` | Atrasos por asignatura. |

### Observaciones, horario, carpetas

| Herramienta | Método | Descripción |
|---|---|---|
| `notasnet_get_observations` | `getObservations` | Observaciones (conducta/anotaciones). |
| `notasnet_get_schedule` | `getSchedule` | Horario semanal de clases. |
| `notasnet_list_folder_subjects` | `listFolderSubjects` | Asignaturas/categorías como carpetas de archivos. |
| `notasnet_list_folder_categories` | `listFolderCategories` | Carpetas/categorías para uno o más alumnos. |
| `notasnet_list_folder_files` | `listFolderFiles` | Archivos dentro de una carpeta/categoría. |

No hay una herramienta `notasnet_download_folder_file`: la librería no confirma el patrón de
URL de descarga real del módulo Carpetas y lanza a propósito (`downloadFolderFile`) en vez de
adivinarlo — ver `notasnet-client/README.md`, incertidumbre #3. Envolverla aquí solo propagaría
ese mismo error, así que se deja sin envolver.

### Cuenta / certificados / datos personales

| Herramienta | Método | Descripción |
|---|---|---|
| `notasnet_get_account_payment_status` | `getAccountPaymentStatus` | Estado resumido de pagos. |
| `notasnet_get_account_installments` | `getAccountInstallments` | Cuotas/aranceles. |
| `notasnet_get_account_payments` | `getAccountPayments` | Historial de pagos y documentos tributarios. |
| `notasnet_get_account_pay_now_status` | `getAccountPayNowStatus` | Disponibilidad de pago en línea. |
| `notasnet_list_certificates` | `listCertificates` | Certificados disponibles y su estado de firma. |
| `notasnet_get_modify_schema` | `getModifySchema` | Definición de campos editables. |
| `notasnet_get_modify_info` | `getModifyInfo` | Datos actuales de una ficha editable. |
| `notasnet_get_modify_reference` | `getModifyReference` | Catálogos de referencia (alergias, enfermedades, etc.). |
| `notasnet_get_modify_selector` | `getModifySelector` | Datos de contacto/dirección editables. |
| `notasnet_get_modify_documents` | `getModifyDocuments` | Documentos adjuntos a una ficha editable. |

### Institucional / arranque

| Herramienta | Método | Descripción |
|---|---|---|
| `notasnet_is_authenticated` | `isAuthenticated` | Llamada directa a `GET /login/isauth`. |
| `notasnet_get_pin_status` | `getPinStatus` | Estado de un PIN de seguridad (propósito no confirmado). |
| `notasnet_get_menu` | `getMenu` | Estructura del menú principal. |
| `notasnet_get_col_config` | `getColConfig` | Parámetro de configuración del colegio por clave. |
| `notasnet_list_public_news` | `listPublicNews` | Publicaciones/noticias del colegio. |
| `notasnet_get_public_news_detail` | `getPublicNewsDetail` | Detalle de una publicación. |
| `notasnet_get_premat_config` | `getPrematConfig` | Configuración de prematrícula. |
| `notasnet_get_convivencia_denuncia_config` | `getConvivenciaDenunciaConfig` | Configuración del formulario de convivencia escolar. |

### Directorio público de colegios (sin sesión)

| Herramienta | Método | Descripción |
|---|---|---|
| `notasnet_list_regions` | `listRegions` | Regiones de Chile. |
| `notasnet_list_comunas` | `listComunas` | Comunas de una región. |
| `notasnet_list_schools` | `listSchools` | Colegios con Notasnet en una comuna. |
| `notasnet_get_school_detail` | `getSchoolDetail` | Detalle público de un colegio. |

Útil para encontrar el slug `colegio` que exige `notasnet_login`.

### Adjuntos

| Herramienta | Sesión | Descripción |
|---|---|---|
| `notasnet_get_attachment_url` | Sin sesión | Resuelve la URL absoluta de un adjunto embebido (`{FileName, Path}`), sin descargar contenido. |
| `notasnet_get_static_resource_url` | Sin sesión | Resuelve la URL absoluta de un recurso estático (ej. foto de alumno) a partir de su ruta relativa. |
| `notasnet_get_attachment_content` | Usa la cookie de sesión si hay una activa | Descarga un adjunto embebido y devuelve su contenido en la propia respuesta del tool. |

`notasnet_get_attachment_url`/`notasnet_get_static_resource_url` no descargan nada — solo
resuelven la URL para que el llamador decida cómo obtenerla (el backend no usa tokens de
descarga ni URLs firmadas: es un `GET` estático plano).

`notasnet_get_attachment_content` sí trae los bytes y los devuelve directo en la respuesta:

- PDF → texto extraído con [`pdf-parse`](https://www.npmjs.com/package/pdf-parse) **v1**
  (`pdf(buffer).then(data => data.text)`), con el número de páginas al inicio. A propósito NO
  se usa la v2 (API por clases, `new PDFParse(...).getText()`): v2 envuelve `pdfjs-dist`, que
  trae una dependencia nativa obligatoria (`@napi-rs/canvas`, un binario precompilado) para
  rutas de renderizado por canvas que ni siquiera se usan acá (solo se llama texto). Esa
  dependencia nativa se compila contra una versión de Node específica (ABI/`NODE_MODULE_VERSION`)
  y falló en producción: funcionaba con el Node del sistema pero crasheaba en silencio al
  arrancar bajo el Node embebido de Claude Desktop (versión distinta), matando el proceso antes
  de poder responder el handshake MCP. v1 es JS puro (sin dependencias nativas, solo `debug` y
  `node-ensure`) — exactamente el paquete simple que hace falta para esto.
- DOCX → texto extraído con [`mammoth`](https://www.npmjs.com/package/mammoth)
  (`extractRawText`).
- PNG/JPG/JPEG → un content block MCP de tipo `image` (`{ type: "image", data: <base64>,
  mimeType }`) — el SDK de MCP soporta contenido de imagen nativamente, así que esto llega
  "visible" en la respuesta del tool sin pasar por una URL intermedia.
- Cualquier otra extensión → un content block de texto avisando que el formato no está
  soportado, no un error.

La descarga usa la misma cookie de sesión (`getAuthHeaders` de `src/session.ts`) que el resto
de las herramientas — no se confirmó si estos recursos realmente la exigen (ver
`notasnet-client/README.md`, sección "Adjuntos"), pero se envía igual por si acaso.

## Instalación y build

```bash
# 1. Construir la librería cliente primero (si dist/ no existe aún)
cd ../notasnet-client && npm install && npm run build

# 2. Instalar y construir este paquete
cd ../notasnet-mcp
npm install
npm run build      # tsup → dist/index.js (ESM, ejecutable con shebang)
npm run typecheck  # tsc --noEmit
npm test           # vitest run, sin red real (fetch mockeado)
```

## Configuración

Variables de entorno leídas al arrancar:

| Variable | Requerida | Descripción |
|---|---|---|
| `NOTASNET_BASE_URL` | No | Default: el default de `notasnet-client` (`https://syscol.com/notasnet`). |
| `NOTASNET_COLEGIO` | No | Slug del colegio (ver `notasnet_list_schools`). Permite omitir `colegio` en `notasnet_login`. |
| `NOTASNET_APIKEY` | No | Clave fija de la app (ver más abajo). Permite omitir `apiKey` en `notasnet_login`. |
| `NOTASNET_USUARIO` / `NOTASNET_PASSWORD` | No | Si **ambas** están seteadas junto con `NOTASNET_COLEGIO` y `NOTASNET_APIKEY`, el servidor intenta un login automático al arrancar. |

**`NOTASNET_APIKEY` es un valor fijo de la aplicación, no una credencial por usuario.** Es la
misma clave que exige `POST /login/signin` como header `apikey` (un valor generado al azar es
rechazado con 401) — está embebida en el bundle JS del frontend de Notasnet, visible para
cualquiera que abra las herramientas de desarrollador en la página de login
(`https://syscol.com/notasnet/login?colegio=<slug>`). Hay que obtenerla una vez inspeccionando
ese tráfico de red; **no hay ningún valor real en este repo ni en su documentación** — sería
incorrecto fabricar o adivinar uno.

## Configurar como servidor MCP

Ejemplo de entrada para la configuración de un cliente MCP (Claude Desktop
`claude_desktop_config.json`, el equivalente de Claude Code, o el `config.toml` de Codex),
usando el paquete publicado en npm (`@trueforge-studio/notasnet-mcp`):

```json
{
  "mcpServers": {
    "notasnet": {
      "command": "npx",
      "args": ["-y", "@trueforge-studio/notasnet-mcp"],
      "env": {
        "NOTASNET_COLEGIO": "slug-del-colegio",
        "NOTASNET_APIKEY": "valor-fijo-obtenido-del-bundle-del-frontend"
      }
    }
  }
}
```

También se puede correr desde un checkout local del repo (útil en desarrollo), apuntando
directo al build:

```json
{
  "mcpServers": {
    "notasnet": {
      "command": "node",
      "args": ["/ruta/absoluta/a/notasnet-mcp/notasnet-mcp/dist/index.js"],
      "env": {
        "NOTASNET_COLEGIO": "slug-del-colegio",
        "NOTASNET_APIKEY": "valor-fijo-obtenido-del-bundle-del-frontend"
      }
    }
  }
}
```

Con solo `NOTASNET_COLEGIO`/`NOTASNET_APIKEY` configurados (sin usuario/contraseña), inicia sin
sesión y hay que llamar a la herramienta `notasnet_login` una vez desde el cliente MCP para
autenticarse; la sesión resultante queda persistida en disco (ver más abajo), así que reinicios
posteriores del servidor no piden login de nuevo.

**Auto-login opcional** (agregando `NOTASNET_USUARIO`/`NOTASNET_PASSWORD` al bloque `env`):

```json
      "env": {
        "NOTASNET_COLEGIO": "slug-del-colegio",
        "NOTASNET_APIKEY": "valor-fijo-obtenido-del-bundle-del-frontend",
        "NOTASNET_USUARIO": "11.111.111-1",
        "NOTASNET_PASSWORD": "..."
      }
```

`NOTASNET_USUARIO` (y el parámetro `usuario` de `notasnet_login`) se envían tal cual al backend,
sin validar ni normalizar formato — el `11.111.111-1` de arriba es solo un placeholder ilustrativo.
Usa el mismo formato de RUT/usuario con el que inicias sesión normalmente en Notasnet (con o sin
puntos y guion, según lo que acepte tu colegio).

**Advertencia**: poner la contraseña real en este archivo de configuración significa que queda
en texto plano en disco (el archivo de configuración del cliente MCP no está cifrado). Preferir
usar `notasnet_login` de forma interactiva desde el cliente MCP la primera vez, y dejar que la
sesión persistida (`~/.notasnet-mcp/session.json`) se reutilice automáticamente en adelante —
así la contraseña nunca se guarda en ningún archivo, ni siquiera en memoria del proceso después
del login.

## Empaquetado como MCPB (`.mcpb`)

Además de correr directo con `node dist/index.js` (o vía `npx`/`bin` en el futuro — ver nota
abajo), este paquete se puede empaquetar como un archivo [MCPB](https://github.com/modelcontextprotocol/mcpb)
(`.mcpb`, el formato de instalación de un clic para servidores MCP locales en Claude Desktop —
similar a una extensión `.vsix`/`.crx`). Esto es **una forma adicional de distribuir el mismo
servidor**, no un reemplazo: `dist/index.js` (build normal, con `notasnet-client` resuelto vía
`node_modules`) sigue siendo la forma de correrlo en desarrollo, en tests, o eventualmente vía
`npx` — ese camino no se toca acá.

```bash
npm run build:mcpb
```

Esto corre tres pasos (ver `package.json`):

1. `build:mcpb-server` — un build de `tsup` **separado** (`tsup.mcpb.config.ts`, no el
   `tsup.config.ts` normal) que empaqueta el servidor en un único archivo autocontenido
   `mcpb/server/index.cjs`, con **todas** las dependencias embebidas (`@modelcontextprotocol/sdk`,
   `zod`, `notasnet-client`, `pdf-parse`, `mammoth`). Es necesario porque un `.mcpb` es un zip
   que se instala y se mueve a la carpeta de extensiones de Claude Desktop — un `node_modules`
   con el symlink que crea `file:../notasnet-client` no sobreviviría ese traslado, así que en
   vez de copiar `node_modules` se embebe todo en un solo archivo. Formato CJS (no ESM) por el
   mismo motivo que se explica en el comentario de `tsup.mcpb.config.ts` (interop de `require()`
   con `mammoth`).
2. `mcpb:validate` — valida `mcpb/manifest.json` contra el schema de MCPB (usa el CLI
   `@anthropic-ai/mcpb`, instalado como devDependency).
3. `mcpb:pack` — empaqueta `mcpb/` (el manifest + el `server/index.cjs` recién generado) en
   `dist/notasnet-mcp.mcpb`.

`mcpb/manifest.json` es el único archivo de este flujo que se trackea en git — declara los
mismos tools que expone el servidor (el cliente MCP los descubre en runtime vía `tools/list`,
así que el manifest no necesita listarlos uno por uno) y un bloque `user_config` con los mismos
5 valores de configuración que ya acepta por variables de entorno (`baseUrl`, `colegio`,
`apiKey`, `usuario`, `password`) — Claude Desktop le pide estos valores al usuario en una UI de
configuración al instalar la extensión y los inyecta como las mismas variables de entorno
(`NOTASNET_BASE_URL`, etc.) al arrancar el proceso. `apiKey` y `password` están marcados
`"sensitive": true` para que el host los guarde en su almacén de secretos del sistema operativo
en vez de en texto plano.

`mcpb/server/` (el bundle generado) y `dist/*.mcpb` (el archivo empaquetado) están en
`.gitignore` — son artefactos de build, igual que `dist/index.js`. Solo el `manifest.json`
fuente se commitea.

Para instalar el `.mcpb` resultante: abrir Claude Desktop → Configuración → Extensiones →
instalar desde archivo, y apuntar a `dist/notasnet-mcp.mcpb`. La UI de configuración de la
extensión pedirá los mismos valores descritos en "Configurar como servidor MCP" arriba.

## Persistencia de sesión

- El servidor guarda la sesión activa en `~/.notasnet-mcp/session.json` (fuera de este repo, en
  el home del usuario) con el formato `{ colegio, sessionCookie: { name, value }, savedAt }`.
- **Nunca** se guarda la contraseña en ningún archivo — ni siquiera transitoriamente. Solo se
  persiste la cookie de sesión resultante de un login exitoso.
- El archivo se crea con permisos `0o600` (solo lectura/escritura para el dueño) y su directorio
  con `0o700`.
- Al arrancar: si las 4 variables de auto-login están seteadas, intenta `signIn()`; si no, o si
  falla, intenta cargar este archivo. Si tampoco existe, el servidor arranca sin sesión y
  cualquier herramienta que la requiera devuelve un error pidiendo usar `notasnet_login`.
- Este archivo vive bajo el home del usuario, nunca dentro del repo — no hace falta ignorarlo en
  el `.gitignore` del proyecto, pero de todas formas nada en este paquete escribe datos de sesión
  dentro del árbol del repo.
- La cookie observada dura ~3 años (`Expires` que manda el propio backend) — no se implementa
  renovación automática porque no hay evidencia de que haga falta (ver incertidumbres en
  `notasnet-client/README.md`).

## Manejo de errores

Cada herramienta captura `NotasnetApiError` (status HTTP no-2xx, con status/URL/método/cuerpo)
y `NotasnetShapeError` (2xx pero forma de respuesta inesperada — señal de que el backend
cambió algo) de `notasnet-client`, y las devuelve como `isError: true` con un mensaje legible en
vez de dejar que el proceso truene o quede una promesa rechazada sin manejar.

## Testing

`test/server.test.ts` levanta el servidor real (con todas sus herramientas registradas) contra
un `Client` de `@modelcontextprotocol/sdk` sobre un transporte en memoria (`InMemoryTransport`),
mockeando `fetch` antes de importar el módulo de sesión — cero llamadas de red reales. Cubre:

- `tools/list` devuelve la cantidad esperada de herramientas y nombres representativos de cada
  dominio (alumnos, agenda, notas, adjuntos, login, etc.), todos con nombre único.
- Cada herramienta tiene descripción no vacía y un `inputSchema` bien formado.
- `notasnet_session_status` sin sesión reporta "no autenticado" sin hacer ninguna llamada de red.
- Una herramienta autenticada (`notasnet_list_students`) sin sesión devuelve un error claro
  pidiendo `notasnet_login`, en vez de golpear la API.
- Una herramienta pública (`notasnet_list_regions`) funciona contra un `fetch` mockeado.

No se fixturea cada una de las ~59 herramientas individualmente — la capa de API ya está cubierta
por los tests de `notasnet-client`; aquí el objetivo es verificar que el servidor arranca, que el
cableado MCP (schema/nombres/errores/sesión) es correcto, y un par de casos representativos.
