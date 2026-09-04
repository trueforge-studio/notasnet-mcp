import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { client, envConfig, getCurrentColegio, hasSession, setSession } from "../session.js";
import { errorResult, formatError, runTool, textResult } from "../toolHelper.js";

export function registerLoginTools(server: McpServer): void {
  server.registerTool(
    "notasnet_login",
    {
      description:
        "Inicia sesión contra Notasnet (POST /login/signin) y guarda la sesión resultante (en memoria y en " +
        "~/.notasnet-mcp/session.json) para las demás herramientas. colegio y apiKey son opcionales si ya están " +
        "configurados como NOTASNET_COLEGIO/NOTASNET_APIKEY. Nunca devuelve la contraseña ni el valor crudo de " +
        "la cookie de sesión — solo el perfil del apoderado como confirmación.",
      inputSchema: {
        usuario: z.string().describe("RUT o usuario de la cuenta."),
        password: z.string().describe("Contraseña de la cuenta. Nunca se devuelve ni se registra en logs."),
        colegio: z
          .string()
          .optional()
          .describe("Slug del colegio (ver notasnet_list_schools). Opcional si NOTASNET_COLEGIO está configurado."),
        apiKey: z
          .string()
          .optional()
          .describe(
            "Clave fija de la app (no es una credencial de usuario, ver notasnet-client/README.md). Opcional " +
              "si NOTASNET_APIKEY está configurado.",
          ),
      },
    },
    async ({ usuario, password, colegio, apiKey }) => {
      const resolvedColegio = colegio ?? envConfig.colegio;
      const resolvedApiKey = apiKey ?? envConfig.apiKey;
      if (!resolvedColegio) {
        return errorResult(
          "Falta `colegio`: pásalo explícitamente o configura la variable de entorno NOTASNET_COLEGIO.",
        );
      }
      if (!resolvedApiKey) {
        return errorResult(
          "Falta `apiKey`: pásala explícitamente o configura la variable de entorno NOTASNET_APIKEY. Es un " +
            "valor fijo de la app (no una credencial de usuario) — ver notasnet-client/README.md, sección " +
            "Autenticación, sobre cómo obtenerlo.",
        );
      }
      try {
        const result = await client.signIn({ colegio: resolvedColegio, usuario, password }, resolvedApiKey);
        if (!result.sessionCookie) {
          return errorResult(
            "El login respondió correctamente pero el backend no envió una cookie de sesión (Set-Cookie " +
              "ausente) — no se pudo establecer una sesión utilizable.",
          );
        }
        setSession(resolvedColegio, result.sessionCookie);
        return textResult({ ok: true, profile: result.profile });
      } catch (err) {
        return errorResult(formatError(err));
      }
    },
  );

  server.registerTool(
    "notasnet_session_status",
    {
      description:
        "Estado de la sesión actual del servidor MCP. Si no hay cookie de sesión cargada, lo reporta sin hacer " +
        "ninguna llamada de red. Si hay una cookie cargada, la valida contra el backend (GET /login/isauth).",
      inputSchema: {},
    },
    async () => {
      if (!hasSession()) {
        return textResult({ authenticated: false, message: "No hay sesión activa. Usa notasnet_login." });
      }
      return runTool(false, async () => {
        const result = await client.isAuthenticated();
        return { authenticated: result.auth, colegio: getCurrentColegio() };
      });
    },
  );

  server.registerTool(
    "notasnet_recover_password",
    {
      description: "Solicita el envío de recuperación de contraseña a un email (POST /login/recover). Sin sesión.",
      inputSchema: { email: z.string().describe("Email de la cuenta.") },
    },
    async ({ email }) => runTool(false, () => client.recoverPassword(email)),
  );
}
