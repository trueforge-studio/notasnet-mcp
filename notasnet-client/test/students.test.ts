import { describe, expect, it } from "vitest";
import { NotasnetClient } from "../src/client.js";
import { jsonFetch } from "./testUtils.js";
import fixtures from "./fixtures/alumnos.json" with { type: "json" };

const BASE_URL = "https://syscol.example/notasnet";

describe("NotasnetClient — alumnos", () => {
  it("listStudents() calls GET /api/alumnos and returns the parsed list", async () => {
    const fetchMock = jsonFetch(fixtures.listStudents);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.listStudents();

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/alumnos`, expect.objectContaining({ method: "GET" }));
    expect(result).toEqual(fixtures.listStudents);
  });

  it("getStudentSummary(studentId) calls GET /api/alumno/{id}", async () => {
    const fetchMock = jsonFetch(fixtures.getStudentSummary);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.getStudentSummary(9000001);

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/alumno/9000001`, expect.anything());
    expect(result.NombreApellido).toBe(fixtures.getStudentSummary.NombreApellido);
    expect(result.InformacionMedica).toBeNull();
  });

  it("getStudentSubjects(studentId) calls GET /api/alumno/{id}/asignas", async () => {
    const fetchMock = jsonFetch(fixtures.getStudentSubjects);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.getStudentSubjects(9000001);

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/alumno/9000001/asignas`, expect.anything());
    expect(result).toHaveLength(3);
    // Ico viene null para academias extraprogramáticas (Tipo: "acle") — confirmado en producción.
    expect(result[2]?.Tipo).toBe("acle");
    expect(result[2]?.Ico).toBeNull();
  });

  it("getStudentGuardians(studentId) calls GET /api/alumno/{id}/padres", async () => {
    const fetchMock = jsonFetch(fixtures.getStudentGuardians);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.getStudentGuardians(9000001);

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/alumno/9000001/padres`, expect.anything());
    expect(result[0]?.Relacion).toBe("Padre");
    // Un "slot" de apoderado sin ficha completa cargada trae todo null salvo Relacion —
    // confirmado en producción.
    expect(result[2]?.Relacion).toBe("Madre");
    expect(result[2]?.Id).toBeNull();
    expect(result[2]?.Nom).toBeNull();
  });

  it("getGuardianPermissions() calls GET /api/alumno/permisos", async () => {
    const fetchMock = jsonFetch(fixtures.getGuardianPermissions);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.getGuardianPermissions();

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/alumno/permisos`, expect.anything());
    expect(result).toEqual({ infpar: true, inflib: false });
  });

  it("getStudentInfo(studentId, modules) joins modules with '|' into the op query param", async () => {
    const fetchMock = jsonFetch(fixtures.getStudentInfo);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.getStudentInfo(9000001, ["nt", "as", "pe", "ho", "pre"]);

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/alumnos/9000001/info?op=nt%7Cas%7Cpe%7Cho%7Cpre`,
      expect.anything(),
    );
    expect(result.idAlumno).toBe(9000001);
  });

  it("invokes getAuthHeaders on every call and forwards the resulting headers", async () => {
    const fetchMock = jsonFetch(fixtures.listStudents);
    const client = new NotasnetClient({
      baseUrl: BASE_URL,
      fetch: fetchMock,
      getAuthHeaders: () => ({ Authorization: "Bearer FAKE-API-KEY-FOR-TESTS" }),
    });

    await client.listStudents();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ headers: { Authorization: "Bearer FAKE-API-KEY-FOR-TESTS" } }),
    );
  });
});
