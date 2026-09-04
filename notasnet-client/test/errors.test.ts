import { describe, expect, it } from "vitest";
import { NotasnetClient } from "../src/client.js";
import { NotasnetApiError, NotasnetShapeError } from "../src/errors.js";
import { errorFetch, jsonFetch, textFetch } from "./testUtils.js";

const BASE_URL = "https://syscol.example/notasnet";

describe("NotasnetClient — manejo de errores", () => {
  it("throws NotasnetApiError with status/url on a 404 with a JSON error body", async () => {
    const fetchMock = errorFetch(404, JSON.stringify({ message: "No encontrado" }));
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    await expect(client.getStudentSummary(9999999)).rejects.toMatchObject({
      name: "NotasnetApiError",
      status: 404,
      url: `${BASE_URL}/api/alumno/9999999`,
    });
  });

  it("throws NotasnetApiError with status 403 and an empty/non-JSON body without crashing", async () => {
    const fetchMock = errorFetch(403, "");
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    let caught: unknown;
    try {
      await client.listStudents();
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(NotasnetApiError);
    const err = caught as NotasnetApiError;
    expect(err.status).toBe(403);
    expect(err.rawBody).toBe("");
    expect(err.parsedBody).toBeUndefined();
  });

  it("throws NotasnetApiError when a successful (2xx) response body is not valid JSON", async () => {
    const fetchMock = textFetch("<html>esto no es JSON</html>", 200);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    await expect(client.listStudents()).rejects.toBeInstanceOf(NotasnetApiError);
  });

  it("throws NotasnetShapeError when a 2xx JSON response doesn't match the expected shape", async () => {
    // el backend "cambió" y ahora devuelve algo sin los campos esperados por el esquema
    const fetchMock = jsonFetch({ unexpected: "shape" });
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    await expect(client.getGuardianPermissions()).rejects.toBeInstanceOf(NotasnetShapeError);
  });
});
