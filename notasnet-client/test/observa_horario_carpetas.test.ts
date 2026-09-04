import { describe, expect, it } from "vitest";
import { NotasnetClient } from "../src/client.js";
import { jsonFetch } from "./testUtils.js";
import fixtures from "./fixtures/observa_horario_carpetas.json" with { type: "json" };

const BASE_URL = "https://syscol.example/notasnet";

describe("NotasnetClient — observa / horario / carpetas", () => {
  it("getObservations(studentId) handles both a structured and a string SubTitulo", async () => {
    const fetchMock = jsonFetch(fixtures.getObservations);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.getObservations(9000001);

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/observa/list?idAlu=9000001`, expect.anything());
    expect(typeof result[0]?.SubTitulo).toBe("object");
    expect(typeof result[1]?.SubTitulo).toBe("string");
  });

  it("getSchedule(studentId) calls GET /api/horario", async () => {
    const fetchMock = jsonFetch(fixtures.getSchedule);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.getSchedule(9000001);

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/horario?idAlu=9000001`, expect.anything());
    expect(result).toHaveLength(2);
  });

  it("listFolderSubjects(studentId) calls GET /api/carpetas/asignaturas", async () => {
    const fetchMock = jsonFetch(fixtures.listFolderSubjects);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.listFolderSubjects(9000001);

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/carpetas/asignaturas?idAlu=9000001`, expect.anything());
    expect(result).toHaveLength(2);
  });

  it("listFolderCategories(studentIds) repeats the `alu` param once per student", async () => {
    const fetchMock = jsonFetch(fixtures.listFolderCategories);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.listFolderCategories([9000001, 9000002]);

    const calledUrl = new URL((fetchMock as unknown as { mock: { calls: [string, unknown][] } }).mock.calls[0]![0]);
    expect(calledUrl.pathname).toBe("/notasnet/api/Carpetas/acles");
    expect(calledUrl.searchParams.getAll("alu")).toEqual(["9000001", "9000002"]);
    expect(result).toHaveLength(2);
  });

  it("listFolderFiles({folderRef}) maps folderRef to `p` (not a page number)", async () => {
    const fetchMock = jsonFetch(fixtures.listFolderFiles);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.listFolderFiles({ folderRef: "cur" });

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/carpetas/archivos?p=cur`, expect.anything());
    expect(result).toHaveLength(2);
  });

  it("listFolderFiles({folderRef, id}) includes the optional id param", async () => {
    const fetchMock = jsonFetch(fixtures.listFolderFiles);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    await client.listFolderFiles({ folderRef: 0, id: 9000001 });

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/carpetas/archivos?p=0&id=9000001`, expect.anything());
  });
});
