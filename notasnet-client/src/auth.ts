/**
 * Autenticación de Notasnet.
 *
 * Mecanismo real, confirmado probando un login de punta a punta contra el backend real
 * (ver README, sección "Autenticación" — esto corrige una hipótesis anterior de esta misma
 * librería, que asumía que el header `apikey` era la credencial de sesión):
 *
 * - `POST /login/signin` responde con `Set-Cookie: ntauth=...; HttpOnly; Secure;
 *   SameSite=Strict; Path=/notasnet`. Esa cookie —no el header `apikey`— es la que autoriza
 *   las peticiones posteriores: se confirmó llamando a `GET /alumnos` solo con la cookie
 *   (sin `apikey`) y funcionó igual.
 * - Por ser `HttpOnly`, esta cookie nunca aparece en un `Cookie` de request capturado por
 *   herramientas basadas en JS/DevTools de forma consistente, y las exportaciones a HAR
 *   usadas para el análisis original tampoco mostraron el `Set-Cookie` de la respuesta —de
 *   ahí que las dos capturas HAR anteriores no permitieran verlo. Solo apareció al inspeccionar
 *   los headers de la respuesta real con `fetch`/`curl`, no en un HAR exportado desde Chrome.
 * - El header `apikey` sigue siendo obligatorio en la petición de `signIn` (probarlo con un
 *   valor generado al azar devuelve 401), pero es un valor **fijo/estático**, no una
 *   credencial de sesión: el mismo valor exacto se observó en dos capturas hechas en momentos
 *   distintos. Todo indica que es una clave de aplicación embebida en el bundle JS del
 *   frontend (visible para cualquiera que abra las herramientas de desarrollador en la página
 *   de login), no algo que el cliente deba generar. Por eso `signIn` la recibe como parámetro
 *   obligatorio en vez de generarla — hay que obtenerla una vez inspeccionando el tráfico de
 *   red de `https://syscol.com/notasnet/login?colegio=<slug>` (header `apikey` en cualquier
 *   petición) y configurarla como constante.
 *
 * No confirmado:
 * - Si el valor de `apikey` es el mismo para todos los colegios de syscol.com o es
 *   específico por colegio (las dos capturas disponibles son del mismo colegio).
 * - Expiración/renovación de la cookie `ntauth` más allá de la fecha `expires` que el propio
 *   backend envía (~3 años en las pruebas hechas).
 * - Si `apikey` importa para algo más allá de la petición de `signIn` en sí (las pruebas
 *   hechas muestran que `GET /alumnos` funciona con o sin ese header una vez que se tiene la
 *   cookie `ntauth`).
 */

/**
 * Extrae el par `name=value` de la cookie de sesión (`ntauth`) del header `Set-Cookie` de la
 * respuesta de `POST /login/signin`. Ignora atributos (`Path`, `Expires`, `HttpOnly`, etc.).
 *
 * Usa `Headers.getSetCookie()` cuando está disponible (Node 18.20+, Workers) para manejar
 * correctamente el caso de múltiples `Set-Cookie`; si no está disponible, cae a
 * `Headers.get("set-cookie")`, que en este backend basta porque solo se observó una cookie.
 */
export function extractSessionCookie(response: Response): { name: string; value: string } | null {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  const raw = typeof headers.getSetCookie === "function" ? headers.getSetCookie()[0] : headers.get("set-cookie");
  if (!raw) return null;

  const pair = raw.split(";")[0];
  const eq = pair?.indexOf("=") ?? -1;
  if (!pair || eq === -1) return null;

  return { name: pair.slice(0, eq).trim(), value: pair.slice(eq + 1).trim() };
}

/** Formatea `{ name, value }` (de `extractSessionCookie`) como header `Cookie` listo para enviar. */
export function formatCookieHeader(cookie: { name: string; value: string }): string {
  return `${cookie.name}=${cookie.value}`;
}
