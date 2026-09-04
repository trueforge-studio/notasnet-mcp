import { describe, expect, it } from "vitest";
import { NotasnetClient } from "../src/client.js";
import { jsonFetch } from "./testUtils.js";
import fixtures from "./fixtures/asiste.json" with { type: "json" };

const BASE_URL = "https://syscol.example/notasnet";

describe("NotasnetClient — asiste", () => {
  it("getAttendanceBySubject(studentId) maps studentId to `alu`", async () => {
    const fetchMock = jsonFetch(fixtures.getAttendanceBySubject);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.getAttendanceBySubject(9000001);

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/asiste/Clases?alu=9000001`, expect.anything());
    expect(result).toHaveLength(1);
  });

  it("getAttendanceTotals(studentId) maps studentId to `alu`", async () => {
    const fetchMock = jsonFetch(fixtures.getAttendanceTotals);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.getAttendanceTotals(9000001);

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/asiste/Clases/total?alu=9000001`, expect.anything());
    expect(result.Clases).toBe(100);
  });

  it("getMonthlyAttendance(studentId) maps studentId to `idAlu`", async () => {
    const fetchMock = jsonFetch(fixtures.getMonthlyAttendance);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.getMonthlyAttendance(9000001);

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/asiste/asistencia?idAlu=9000001`, expect.anything());
    expect(result.asis).toHaveLength(2);
  });

  it("getTardiness(studentId, subjectId) maps to `alu` and `asi`", async () => {
    const fetchMock = jsonFetch(fixtures.getTardiness);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.getTardiness(9000001, 400003);

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/asiste/atrasos?alu=9000001&asi=400003`,
      expect.anything(),
    );
    expect(result.Items).toHaveLength(2);
  });
});
