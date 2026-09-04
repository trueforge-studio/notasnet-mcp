#!/usr/bin/env node
/**
 * Smoke test manual contra el backend REAL de Notasnet (no vitest, no fixtures).
 *
 * Hace login de verdad, lista los alumnos de la cuenta y muestra la agenda de mañana.
 * No es parte de la suite de tests (que sigue siendo 100% contra fixtures, sin red) —
 * es solo para confirmar a mano que la librería funciona contra la API real.
 *
 * Uso (las credenciales NUNCA van en el código ni en la conversación, solo por env vars):
 *
 *   npm run build
 *   env NOTASNET_COLEGIO=<slug> NOTASNET_USUARIO=<rut o usuario> NOTASNET_PASSWORD=<clave> \
 *       NOTASNET_APIKEY=<clave fija de la app> \
 *     node scripts/smoke-test.mjs
 *
 * `env VAR=val ... comando` funciona igual en bash/zsh/fish (es el binario `env`, no sintaxis
 * de shell). Si no sabes el slug de tu colegio, corre primero:
 *
 *   node -e "import('../dist/index.js').then(async ({NotasnetClient}) => { \
 *     const c = new NotasnetClient(); \
 *     console.log(await c.listSchools(<codigoDeComuna>)); })"
 *
 * usando `listRegions()` / `listComunas(regionCode)` para llegar al código de comuna.
 *
 * NOTASNET_APIKEY: es un valor FIJO de la aplicación (no una credencial tuya ni algo secreto
 * por usuario — ver README, sección "Autenticación"), embebido en el bundle JS del frontend.
 * Se obtiene abriendo las herramientas de desarrollador (pestaña Red/Network) en
 * https://syscol.com/notasnet/login?colegio=<tu-colegio> e inspeccionando el header `apikey`
 * de cualquier petición a `/notasnet/api/...` — es el mismo valor en todas.
 */

import { NotasnetClient, formatCookieHeader, NotasnetApiError } from "../dist/index.js";

const colegio = process.env.NOTASNET_COLEGIO;
const usuario = process.env.NOTASNET_USUARIO;
const password = process.env.NOTASNET_PASSWORD;
const appApiKey = process.env.NOTASNET_APIKEY;

if (!colegio || !usuario || !password || !appApiKey) {
  console.error(
    "Faltan variables de entorno. Define NOTASNET_COLEGIO, NOTASNET_USUARIO, NOTASNET_PASSWORD\n" +
      "y NOTASNET_APIKEY. Ver el comentario al inicio de este archivo para el formato exacto.",
  );
  process.exit(1);
}

function tomorrowInSantiago() {
  // America/Santiago, para que "mañana" sea correcto sin depender de la zona horaria
  // de la máquina que corre el script.
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type) => parts.find((p) => p.type === type).value;
  const todayInSantiago = new Date(Date.UTC(Number(get("year")), Number(get("month")) - 1, Number(get("day"))));
  todayInSantiago.setUTCDate(todayInSantiago.getUTCDate() + 1);
  return todayInSantiago.toISOString().slice(0, 10); // YYYY-MM-DD
}

async function main() {
  let sessionCookie = null;
  const client = new NotasnetClient({
    getAuthHeaders: () => (sessionCookie ? { cookie: formatCookieHeader(sessionCookie) } : {}),
  });

  console.log(`Iniciando sesión en colegio "${colegio}"...`);
  const { profile, sessionCookie: cookie } = await client.signIn({ colegio, usuario, password }, appApiKey);
  if (!cookie) {
    throw new Error("signIn() no devolvió sessionCookie (el backend no mandó Set-Cookie) — ver README.");
  }
  sessionCookie = cookie;
  console.log(`Sesión iniciada como: ${profile.titulo} (colegio: ${profile.colegio.Nombre})\n`);

  const students = await client.listStudents();
  console.log(`Alumnos encontrados: ${students.length}`);
  for (const s of students) {
    console.log(`  - ${s.NombreApellido} (${s.NCurso})`);
  }
  if (students.length !== 2) {
    console.log(`  (se esperaban 2 alumnos, se encontraron ${students.length} — revisa si es lo esperado)`);
  }

  const date = tomorrowInSantiago();
  console.log(`\nAgenda de mañana (${date}) — ojo: este endpoint es de la cuenta completa, no`);
  console.log(`viene separado por alumno (ver README, no hay campo de alumno en AgendaDayEvent):\n`);

  const events = await client.getAgendaByDate(date);
  if (events.length === 0) {
    console.log("  (sin eventos para mañana)");
  } else {
    for (const e of events) {
      const hora = e.FechaInicio?.slice(11, 16) ?? "";
      console.log(`  - [${e.TipoNombre}] ${hora} ${e.Titulo}${e.Detalle ? " — " + e.Detalle : ""}`);
    }
  }
}

main().catch((err) => {
  if (err instanceof NotasnetApiError) {
    console.error(`\nError de la API de Notasnet: status ${err.status} en ${err.method} ${err.url}`);
    console.error(err.parsedBody ?? err.rawBody);
  } else {
    console.error("\nError inesperado:", err);
  }
  process.exit(1);
});
