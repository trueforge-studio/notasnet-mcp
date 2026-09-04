import { describe, expect, it } from "vitest";
import { NotasnetClient } from "../src/client.js";
import { jsonFetch } from "./testUtils.js";
import fixtures from "./fixtures/califica.json" with { type: "json" };

const BASE_URL = "https://syscol.example/notasnet";

describe("NotasnetClient — califica", () => {
  it("getGrades(studentId) maps studentId to idAlu", async () => {
    const fetchMock = jsonFetch(fixtures.getGrades);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.getGrades(9000001);

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/califica/asig?idAlu=9000001`, expect.anything());
    expect(result.calif).toHaveLength(3);
    // PCurso/Nota0/NotaFinal pueden venir null para una asignatura sin notas registradas aún
    // (confirmado contra el backend real, ej. "Orientación" antes de la primera evaluación).
    expect(result.calif[2].NotaFinal).toBeNull();
  });

  it("getGrades(studentId, periodId) accepts an optional periodId without using it yet", async () => {
    const fetchMock = jsonFetch(fixtures.getGrades);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    await client.getGrades(9000001, "1");

    // periodId no confirmado: no se envía ningún query param adicional por ahora
    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/califica/asig?idAlu=9000001`, expect.anything());
  });

  it("getGradeObservations(studentId) returns an empty list (as observed in the HAR)", async () => {
    const fetchMock = jsonFetch(fixtures.getGradeObservations);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.getGradeObservations(9000001);

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/califica/obs?idAlu=9000001`, expect.anything());
    expect(result).toEqual([]);
  });

  it("listGradePeriods() calls GET /api/califica/report/periodos", async () => {
    const fetchMock = jsonFetch(fixtures.listGradePeriods);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.listGradePeriods();

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/califica/report/periodos`, expect.anything());
    expect(result).toHaveLength(2);
  });
});
