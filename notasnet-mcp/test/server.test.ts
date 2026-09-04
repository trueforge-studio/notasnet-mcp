import { describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/**
 * Mockea `globalThis.fetch` ANTES de importar `../src/server.js` (que importa `../src/session.js`,
 * que construye el `NotasnetClient` compartido capturando `fetch` en el constructor). No se hace
 * ninguna llamada de red real en este archivo.
 */
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

const FAKE_STUDENTS = [
  {
    idAlumno: 1000001,
    Anno: 2026,
    MatEstado: "REG",
    NombreApellido: "Nombre Apellido Ejemplo",
    Rut: "11.111.111-1",
    Curso: 101,
    NCurso: "1EBA",
    NotasnetAcceso: true,
    IsApode: 1,
    IsSoste: 0,
    IsPadre: 0,
    EstadoAdmAnno: "REG",
    PrematNivel: "",
  },
];

const fetchMock = vi.fn(async (input: string | URL | Request) => {
  const url = typeof input === "string" ? input : input.toString();
  if (url.includes("/api/alumnos")) {
    return jsonResponse(FAKE_STUDENTS);
  }
  if (url.includes("/api/login/isauth")) {
    return jsonResponse({ auth: true });
  }
  if (url.includes("/api/colegio/region")) {
    return jsonResponse({ schema: [], rows: [{ Codigo: 13, Nombre: "Región Ejemplo" }] });
  }
  return jsonResponse({}, 404);
});

vi.stubGlobal("fetch", fetchMock);

// Importado dinámicamente después de stubGlobal para que `NotasnetClient` capture el mock.
const { createServer } = await import("../src/server.js");

async function connectedClient() {
  const client = new Client({ name: "test-client", version: "0.0.0" });
  const server = createServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
  return client;
}

describe("notasnet-mcp server", () => {
  it("lists tools with the expected count and representative names", async () => {
    const client = await connectedClient();
    const { tools } = await client.listTools();

    // ~55 métodos de lectura envueltos 1:1 + notasnet_login/session_status/recover_password +
    // 2 helpers de URL de adjuntos. No se fija un número exacto: se verifica un piso razonable
    // y la presencia de nombres representativos de cada dominio.
    expect(tools.length).toBeGreaterThanOrEqual(50);

    const names = tools.map((t) => t.name);
    expect(names).toContain("notasnet_login");
    expect(names).toContain("notasnet_session_status");
    expect(names).toContain("notasnet_recover_password");
    expect(names).toContain("notasnet_list_students");
    expect(names).toContain("notasnet_get_grades");
    expect(names).toContain("notasnet_get_agenda_by_date");
    expect(names).toContain("notasnet_mark_notification_seen");
    expect(names).toContain("notasnet_get_attachment_url");
    expect(names).toContain("notasnet_list_regions");

    // signInWithQr lanza NotImplementedError en la librería — no debe existir como tool.
    expect(names).not.toContain("notasnet_sign_in_with_qr");
    expect(names).not.toContain("notasnet_download_folder_file");

    // Nombres únicos.
    expect(new Set(names).size).toBe(names.length);
  });

  it("every tool has a well-formed description and input schema", async () => {
    const client = await connectedClient();
    const { tools } = await client.listTools();

    for (const tool of tools) {
      expect(tool.description, `${tool.name} debería tener descripción`).toBeTruthy();
      expect(tool.description!.length).toBeGreaterThan(10);
      expect(tool.inputSchema).toBeTruthy();
      expect(tool.inputSchema.type).toBe("object");
    }
  });

  it("notasnet_session_status reports 'not logged in' without a network call when there's no session", async () => {
    const client = await connectedClient();
    const callsBefore = fetchMock.mock.calls.length;
    const result = (await client.callTool({ name: "notasnet_session_status", arguments: {} })) as CallToolResult;

    expect(result.isError).toBeFalsy();
    const text = (result.content[0] as { type: "text"; text: string }).text;
    const parsed = JSON.parse(text) as { authenticated: boolean };
    expect(parsed.authenticated).toBe(false);
    expect(fetchMock.mock.calls.length).toBe(callsBefore); // sin llamada de red
  });

  it("notasnet_list_students without a session returns a clear auth error instead of hitting the API", async () => {
    const client = await connectedClient();
    const result = (await client.callTool({ name: "notasnet_list_students", arguments: {} })) as CallToolResult;

    expect(result.isError).toBe(true);
    const text = (result.content[0] as { type: "text"; text: string }).text;
    expect(text).toMatch(/notasnet_login/);
  });

  it("notasnet_list_regions (public, no auth) returns mocked data shaped as expected", async () => {
    const client = await connectedClient();
    const result = (await client.callTool({ name: "notasnet_list_regions", arguments: {} })) as CallToolResult;

    expect(result.isError).toBeFalsy();
    const text = (result.content[0] as { type: "text"; text: string }).text;
    const parsed = JSON.parse(text) as unknown;
    expect(Array.isArray(parsed)).toBe(true);
  });
});
