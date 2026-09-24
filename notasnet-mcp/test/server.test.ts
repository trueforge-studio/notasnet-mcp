import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import JSZip from "jszip";

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
// PDF real (generado con `cupsfilter` a partir de texto plano) — contenido genérico, sin datos
// personales. Sirve para probar la extracción real vía pdf-parse, no solo el manejo de errores.
const SAMPLE_PDF = readFileSync(join(FIXTURES_DIR, "sample.pdf"));

/**
 * PPTX mínimo armado en memoria con jszip: solo las partes que lee `src/pptx.ts` (slides, sus
 * rels y una notesSlide). Incluye slide10 para verificar orden numérico (no lexicográfico),
 * entidades XML y que las notas se asocian por rels aunque el número de notesSlide no calce.
 */
const slideXml = (paragraphs: string[]) =>
  `<p:sld xmlns:a="a" xmlns:p="p"><p:cSld><p:spTree>${paragraphs
    .map((p) => `<a:p><a:r><a:t>${p}</a:t></a:r></a:p>`)
    .join("")}</p:spTree></p:cSld></p:sld>`;
const samplePptxZip = new JSZip();
samplePptxZip.file("ppt/slides/slide1.xml", slideXml(["Reunión de apoderados", "Fecha: 12 &amp; 13 de marzo"]));
samplePptxZip.file("ppt/slides/slide2.xml", slideXml(["Segunda slide"]));
samplePptxZip.file("ppt/slides/slide10.xml", slideXml(["Décima slide"]));
samplePptxZip.file(
  "ppt/slides/_rels/slide2.xml.rels",
  '<Relationships><Relationship Id="rId2" Target="../notesSlides/notesSlide7.xml"/></Relationships>',
);
samplePptxZip.file("ppt/notesSlides/notesSlide7.xml", slideXml(["Traer libreta", "2"]));
const SAMPLE_PPTX = await samplePptxZip.generateAsync({ type: "nodebuffer" });

/**
 * `src/session.ts` persiste la sesión en `~/.notasnet-mcp/session.json` (ruta calculada una
 * vez, vía `homedir()`, al importar el módulo). Para probar herramientas autenticadas sin
 * tocar el `~/.notasnet-mcp` real de quien corre los tests, se redirige `HOME`/`USERPROFILE`
 * a un directorio temporal ANTES de la primera importación de `../src/server.js` (que importa
 * `../src/session.js` transitivamente).
 */
const FAKE_HOME = mkdtempSync(join(tmpdir(), "notasnet-mcp-test-"));
process.env.HOME = FAKE_HOME;
process.env.USERPROFILE = FAKE_HOME;

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

const FAKE_STUDENT_ID = 7109341;

// Notificaciones "nt" (nota nueva) usadas para probar notasnet_get_recent_grades: una que
// calza con una asignatura conocida (idNota 73510984, cruzable contra FAKE_GRADES_RESPONSE) y
// otra cuya asignatura solo se puede recuperar parseando el Detalle (idNota desconocido en
// calific, simula una asignatura que ya no aparece en el periodo vigente).
const FAKE_GRADE_NOTIFICATIONS = [
  {
    Alu: "Antonia Núñez",
    idNotifica: 1,
    Titulo: "Calificación Antonia Núñez",
    Detalle: "El alumno obtuvo un 7.0 en la asignatura de ARTES VISUALES.",
    Fecha: "2026-09-04T11:52:02.89",
    TipoCodigo: "nt",
    TipoNombre: "Notas",
    Sujeto: "nt:73510984|6",
    Visto: 0,
    Alumno: FAKE_STUDENT_ID,
  },
  {
    Alu: "Antonia Núñez",
    idNotifica: 2,
    Titulo: "Calificación Antonia Núñez",
    Detalle: "El alumno obtuvo un 5.5 en la asignatura de HISTORIA.",
    Fecha: "2026-08-20T09:00:00",
    TipoCodigo: "nt",
    TipoNombre: "Notas",
    Sujeto: "nt:99999999|3",
    Visto: 0,
    Alumno: FAKE_STUDENT_ID,
  },
  // Otro alumno: debe quedar filtrada.
  {
    Alu: "Otro Alumno",
    idNotifica: 3,
    Titulo: "Calificación Otro Alumno",
    Detalle: "El alumno obtuvo un 6.0 en la asignatura de MATEMÁTICA.",
    Fecha: "2026-08-21T09:00:00",
    TipoCodigo: "nt",
    TipoNombre: "Notas",
    Sujeto: "nt:11111111|1",
    Visto: 0,
    Alumno: 1000001,
  },
  // Otro tipo de notificación: debe quedar filtrada.
  {
    Alu: "Antonia Núñez",
    idNotifica: 4,
    Titulo: "Inasistencia",
    Detalle: "Inasistencia registrada.",
    Fecha: "2026-08-22T09:00:00",
    TipoCodigo: "as",
    TipoNombre: "Asistencia",
    Sujeto: "as:123",
    Visto: 0,
    Alumno: FAKE_STUDENT_ID,
  },
];

const FAKE_GRADES_RESPONSE = {
  config: { califica: "TRUE", PerNom: "1° Semestre", ColPer: 1 },
  calif: [
    {
      TotOwner: 1,
      idSubsector: 1,
      idNota: 73510984,
      SubNombre: "Artes Visuales",
      ProNombre: "Prof. Ejemplo",
      PRut: "11.111.111-1",
      SubColor: 1,
      SubIcono: "icon",
      PCurso: "70",
      Nota0: "7.0",
      NotaFinal: null,
    },
  ],
};

// PNG 1x1 transparente — la imagen más pequeña posible con una firma PNG válida.
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

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
  if (url.includes("/api/notifica/latest")) {
    return jsonResponse(FAKE_GRADE_NOTIFICATIONS);
  }
  if (url.includes("/api/califica/asig")) {
    return jsonResponse(FAKE_GRADES_RESPONSE);
  }
  if (url.includes("cole/comunica/foto_ejemplo.png")) {
    return new Response(Buffer.from(TINY_PNG_BASE64, "base64"), {
      status: 200,
      headers: { "content-type": "image/png" },
    });
  }
  if (url.includes("cole/comunica/archivo_ejemplo.xyz")) {
    return new Response("contenido sin formato soportado", { status: 200 });
  }
  if (url.includes("cole/comunica/presentacion_ejemplo.pptx")) {
    return new Response(SAMPLE_PPTX, { status: 200 });
  }
  if (url.includes("cole/comunica/documento_ejemplo.pdf")) {
    return new Response(SAMPLE_PDF, { status: 200, headers: { "content-type": "application/pdf" } });
  }
  return jsonResponse({}, 404);
});

vi.stubGlobal("fetch", fetchMock);

// Importado dinámicamente después de stubGlobal para que `NotasnetClient` capture el mock.
const { createServer } = await import("../src/server.js");
const { setSession, clearSession } = await import("../src/session.js");

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
    expect(names).toContain("notasnet_get_attachment_content");
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

  it("notasnet_get_attachment_content returns an image content block for a PNG", async () => {
    const client = await connectedClient();
    const result = (await client.callTool({
      name: "notasnet_get_attachment_content",
      arguments: { fileName: "foto_ejemplo.png", path: "cole/comunica/foto_ejemplo.png" },
    })) as CallToolResult;

    expect(result.isError).toBeFalsy();
    expect(result.content).toHaveLength(1);
    const block = result.content[0] as { type: string; data: string; mimeType: string };
    expect(block.type).toBe("image");
    expect(block.mimeType).toBe("image/png");
    expect(block.data).toBe(TINY_PNG_BASE64);
  });

  it("notasnet_get_attachment_content extracts real text from a PDF via pdf-parse", async () => {
    const client = await connectedClient();
    const result = (await client.callTool({
      name: "notasnet_get_attachment_content",
      arguments: { fileName: "documento_ejemplo.pdf", path: "cole/comunica/documento_ejemplo.pdf" },
    })) as CallToolResult;

    expect(result.isError).toBeFalsy();
    const text = (result.content[0] as { type: "text"; text: string }).text;
    expect(text).toMatch(/documento_ejemplo\.pdf/);
    expect(text).toMatch(/Documento de prueba/);
  });

  it("notasnet_get_attachment_content extracts slide text and speaker notes from a PPTX", async () => {
    const client = await connectedClient();
    const result = (await client.callTool({
      name: "notasnet_get_attachment_content",
      arguments: { fileName: "presentacion_ejemplo.pptx", path: "cole/comunica/presentacion_ejemplo.pptx" },
    })) as CallToolResult;

    expect(result.isError).toBeFalsy();
    const text = (result.content[0] as { type: "text"; text: string }).text;
    expect(text).toBe(
      "[presentacion_ejemplo.pptx, 3 slide(s)]\n\n" +
        "--- Slide 1 ---\nReunión de apoderados\nFecha: 12 & 13 de marzo\n\n" +
        "--- Slide 2 ---\nSegunda slide\n\nNotas: Traer libreta\n\n" +
        "--- Slide 10 ---\nDécima slide",
    );
  });

  it("notasnet_get_attachment_content returns a plain-text notice for an unsupported extension", async () => {
    const client = await connectedClient();
    const result = (await client.callTool({
      name: "notasnet_get_attachment_content",
      arguments: { fileName: "archivo_ejemplo.xyz", path: "cole/comunica/archivo_ejemplo.xyz" },
    })) as CallToolResult;

    expect(result.isError).toBeFalsy();
    const text = (result.content[0] as { type: "text"; text: string }).text;
    expect(text).toMatch(/no soportado/);
  });

  it("notasnet_get_recent_grades cruza notifica/latest (tipo nt) con califica/asig, filtra por alumno y ordena desc", async () => {
    setSession("colegio-ejemplo", { name: "ntauth", value: "fake-cookie" });
    try {
      const client = await connectedClient();
      const result = (await client.callTool({
        name: "notasnet_get_recent_grades",
        arguments: { studentId: FAKE_STUDENT_ID },
      })) as CallToolResult;

      expect(result.isError).toBeFalsy();
      const grades = JSON.parse((result.content[0] as { type: "text"; text: string }).text) as Array<{
        fecha: string;
        idNota: number | null;
        asignatura: string | null;
        nota: string | null;
        detalle: string | null;
      }>;

      // Solo las 2 notificaciones "nt" del alumno correcto (se descartan otro alumno y otro TipoCodigo).
      expect(grades).toHaveLength(2);
      // Orden descendente por fecha.
      expect(grades[0].fecha).toBe("2026-09-04T11:52:02.89");
      expect(grades[1].fecha).toBe("2026-08-20T09:00:00");
      // idNota 73510984 calza contra calific: nombre normalizado desde SubNombre, no desde el Detalle.
      expect(grades[0]).toMatchObject({ idNota: 73510984, asignatura: "Artes Visuales", nota: "7.0" });
      // idNota 99999999 no está en calific: se recurre al nombre de asignatura parseado del Detalle.
      expect(grades[1]).toMatchObject({ idNota: 99999999, asignatura: "HISTORIA", nota: "5.5" });
    } finally {
      clearSession();
    }
  });

  it("notasnet_get_recent_grades respeta `limit` tras ordenar", async () => {
    setSession("colegio-ejemplo", { name: "ntauth", value: "fake-cookie" });
    try {
      const client = await connectedClient();
      const result = (await client.callTool({
        name: "notasnet_get_recent_grades",
        arguments: { studentId: FAKE_STUDENT_ID, limit: 1 },
      })) as CallToolResult;

      expect(result.isError).toBeFalsy();
      const grades = JSON.parse((result.content[0] as { type: "text"; text: string }).text) as unknown[];
      expect(grades).toHaveLength(1);
    } finally {
      clearSession();
    }
  });
});
