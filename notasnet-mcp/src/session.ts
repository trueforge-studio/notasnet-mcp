/**
 * Configuración, sesión en memoria y persistencia local del servidor MCP de Notasnet.
 *
 * Modelo de autenticación (ver README de `notasnet-client`): `signIn()` establece una
 * cookie de sesión (`ntauth`) que es la credencial real; el header `apikey` es un valor
 * fijo de la app, no una credencial de sesión. Este módulo:
 *
 * - Lee configuración de variables de entorno al arrancar.
 * - Mantiene la cookie de sesión actual en memoria, inyectada en `getAuthHeaders` del
 *   `NotasnetClient` compartido que exportan las herramientas.
 * - Persiste esa cookie (nunca la contraseña) en `~/.notasnet-mcp/session.json` para que un
 *   reinicio del proceso no obligue a un nuevo login (la cookie observada dura ~3 años).
 */

import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { NotasnetClient, formatCookieHeader } from "notasnet-client";
import type { SessionCookie } from "notasnet-client";

const SESSION_DIR = join(homedir(), ".notasnet-mcp");
const SESSION_FILE = join(SESSION_DIR, "session.json");

export interface PersistedSession {
  colegio: string;
  sessionCookie: SessionCookie;
  savedAt: string;
}

interface InMemorySession {
  colegio: string | null;
  sessionCookie: SessionCookie | null;
}

const session: InMemorySession = { colegio: null, sessionCookie: null };

/** Configuración leída de variables de entorno al arrancar el proceso. */
export const envConfig = {
  baseUrl: process.env.NOTASNET_BASE_URL || undefined,
  colegio: process.env.NOTASNET_COLEGIO || undefined,
  apiKey: process.env.NOTASNET_APIKEY || undefined,
  usuario: process.env.NOTASNET_USUARIO || undefined,
  password: process.env.NOTASNET_PASSWORD || undefined,
};

/**
 * Headers de autenticación de la sesión activa (cookie `ntauth`), o `{}` si no hay sesión.
 * Usado tanto por `client` (inyectado como `getAuthHeaders`) como por cualquier `fetch` manual
 * fuera de `NotasnetClient` que necesite la misma cookie — ej. la descarga de adjuntos en
 * `src/tools/attachments.ts`, que no pasa por los métodos de `NotasnetClient`.
 */
export function getAuthHeaders(): Record<string, string> {
  return session.sessionCookie ? { cookie: formatCookieHeader(session.sessionCookie) } : {};
}

/** Instancia compartida de `NotasnetClient` usada por todas las herramientas. */
export const client = new NotasnetClient({
  baseUrl: envConfig.baseUrl,
  getAuthHeaders,
});

/** True si hay una cookie de sesión cargada (en memoria), sin hacer ninguna llamada de red. */
export function hasSession(): boolean {
  return session.sessionCookie !== null;
}

export function getCurrentColegio(): string | null {
  return session.colegio;
}

/** Actualiza la sesión en memoria y la persiste en disco. Usado por `notasnet_login` y el arranque. */
export function setSession(colegio: string, sessionCookie: SessionCookie): void {
  session.colegio = colegio;
  session.sessionCookie = sessionCookie;
  persistSession({ colegio, sessionCookie, savedAt: new Date().toISOString() });
}

export function clearSession(): void {
  session.colegio = null;
  session.sessionCookie = null;
}

function persistSession(data: PersistedSession): void {
  try {
    mkdirSync(SESSION_DIR, { recursive: true, mode: 0o700 });
    writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2), "utf8");
    chmodSync(SESSION_FILE, 0o600);
  } catch (err) {
    console.error(`[notasnet-mcp] No se pudo guardar la sesión en ${SESSION_FILE}:`, (err as Error).message);
  }
}

function loadPersistedSession(): PersistedSession | null {
  try {
    if (!existsSync(SESSION_FILE)) return null;
    const raw = readFileSync(SESSION_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<PersistedSession>;
    if (
      !parsed ||
      typeof parsed.colegio !== "string" ||
      !parsed.sessionCookie ||
      typeof parsed.sessionCookie.name !== "string" ||
      typeof parsed.sessionCookie.value !== "string"
    ) {
      return null;
    }
    return parsed as PersistedSession;
  } catch (err) {
    console.error(`[notasnet-mcp] No se pudo leer la sesión persistida en ${SESSION_FILE}:`, (err as Error).message);
    return null;
  }
}

/**
 * Se llama una vez al arrancar el servidor:
 * 1. Si están las 4 variables de entorno de auto-login, intenta `signIn()`.
 * 2. Si no, o si el auto-login falla, intenta cargar la sesión persistida en disco.
 */
export async function initSession(): Promise<void> {
  const { colegio, apiKey, usuario, password } = envConfig;
  if (colegio && apiKey && usuario && password) {
    try {
      const result = await client.signIn({ colegio, usuario, password }, apiKey);
      if (result.sessionCookie) {
        setSession(colegio, result.sessionCookie);
        console.error(`[notasnet-mcp] Auto-login exitoso para colegio "${colegio}".`);
        return;
      }
      console.error("[notasnet-mcp] Auto-login: signIn() no devolvió una cookie de sesión.");
    } catch (err) {
      console.error("[notasnet-mcp] Auto-login falló:", (err as Error).message);
    }
  }

  const persisted = loadPersistedSession();
  if (persisted) {
    session.colegio = persisted.colegio;
    session.sessionCookie = persisted.sessionCookie;
    console.error(
      `[notasnet-mcp] Sesión restaurada desde ${SESSION_FILE} (colegio "${persisted.colegio}", guardada ${persisted.savedAt}).`,
    );
  } else {
    console.error(
      "[notasnet-mcp] Sin sesión activa. Usa la herramienta `notasnet_login`, o configura " +
        "NOTASNET_COLEGIO/NOTASNET_APIKEY/NOTASNET_USUARIO/NOTASNET_PASSWORD para auto-login.",
    );
  }
}
