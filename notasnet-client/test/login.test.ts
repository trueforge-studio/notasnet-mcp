import { describe, expect, it, vi } from "vitest";
import { NotasnetClient } from "../src/client.js";
import { extractSessionCookie, formatCookieHeader } from "../src/auth.js";
import { jsonFetch } from "./testUtils.js";
import fixtures from "./fixtures/login.json" with { type: "json" };

const BASE_URL = "https://syscol.example/notasnet";

describe("NotasnetClient — selección de colegio", () => {
  it("listRegions() calls GET /api/colegio/region and unwraps `rows`", async () => {
    const fetchMock = jsonFetch(fixtures.listRegions);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.listRegions();

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/colegio/region`, expect.anything());
    expect(result).toEqual(fixtures.listRegions.rows);
  });

  it("listComunas(regionCode) maps to the `reg` query param and unwraps `rows`", async () => {
    const fetchMock = jsonFetch(fixtures.listComunas);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.listComunas(5);

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/colegio/comuna?reg=5`, expect.anything());
    expect(result).toEqual(fixtures.listComunas.rows);
  });

  it("listSchools(communeCode) maps to the `com` query param and unwraps `rows`", async () => {
    const fetchMock = jsonFetch(fixtures.listSchools);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.listSchools(5804);

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/colegio/list?com=5804`, expect.anything());
    expect(result).toEqual(fixtures.listSchools.rows);
    expect(result[1].Codigo).toBeNull();
  });

  it("getSchoolDetail(schoolCode) calls GET /api/colegio/{codigo}", async () => {
    const fetchMock = jsonFetch(fixtures.getSchoolDetail);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.getSchoolDetail("colegioejemplo");

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/colegio/colegioejemplo`, expect.anything());
    expect(result.Nombre).toBe("Colegio Ejemplo");
  });
});

describe("NotasnetClient — login", () => {
  it("recoverPassword(email) posts multipart/form-data with an `email` field", async () => {
    const fetchMock = jsonFetch(fixtures.recoverPassword);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.recoverPassword("correo@ejemplo.cl");

    expect(result.ok).toBe(true);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    const body = init.body as FormData;
    expect(body.get("email")).toBe("correo@ejemplo.cl");
  });

  it("signIn() sends the apiKey as an `apikey` header on the login request itself (not via getAuthHeaders), and extracts the ntauth session cookie", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify(fixtures.signIn), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "set-cookie": "ntauth=FAKE-SESSION-COOKIE-FOR-TESTS; expires=Thu, 31 May 2029 00:00:00 GMT; path=/notasnet; secure; samesite=strict; httponly",
        },
      });
    });
    const getAuthHeaders = vi.fn(() => ({}));
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock, getAuthHeaders });

    const apiKey = "FAKE-API-KEY-FOR-TESTS";
    const result = await client.signIn(
      { colegio: "colegioejemplo", usuario: "11.111.111-1", password: "FAKE-PASSWORD-FOR-TESTS" },
      apiKey,
    );

    expect(result.apiKey).toBe(apiKey);
    expect(result.profile).toEqual(fixtures.signIn);
    expect(result.sessionCookie).toEqual({ name: "ntauth", value: "FAKE-SESSION-COOKIE-FOR-TESTS" });
    // signIn no debe depender de getAuthHeaders: es la operación que establece la sesión.
    expect(getAuthHeaders).not.toHaveBeenCalled();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
    expect(url).toBe(`${BASE_URL}/api/login/signin`);
    expect(init.method).toBe("POST");
    expect(init.headers.apikey).toBe(apiKey);
    const body = init.body as FormData;
    expect(body.get("colegio")).toBe("colegioejemplo");
    expect(body.get("usuario")).toBe("11.111.111-1");
    expect(body.get("password")).toBe("FAKE-PASSWORD-FOR-TESTS");
  });

  it("signIn() returns sessionCookie: null when the response has no Set-Cookie", async () => {
    const fetchMock = jsonFetch(fixtures.signIn);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.signIn(
      { colegio: "colegioejemplo", usuario: "11.111.111-1", password: "FAKE-PASSWORD-FOR-TESTS" },
      "FAKE-API-KEY-FOR-TESTS",
    );

    expect(result.sessionCookie).toBeNull();
  });

  it("signInWithQr() throws NotImplementedError (QR flow was never captured)", async () => {
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: jsonFetch({}) });
    await expect(client.signInWithQr()).rejects.toThrow(/QR/);
  });
});

describe("extractSessionCookie() / formatCookieHeader()", () => {
  it("parses the name=value pair out of a Set-Cookie header, ignoring attributes", () => {
    const response = new Response(null, {
      headers: {
        "set-cookie": "ntauth=abc123; expires=Thu, 31 May 2029 00:00:00 GMT; path=/notasnet; secure; samesite=strict; httponly",
      },
    });

    expect(extractSessionCookie(response)).toEqual({ name: "ntauth", value: "abc123" });
  });

  it("returns null when there is no Set-Cookie header", () => {
    expect(extractSessionCookie(new Response(null))).toBeNull();
  });

  it("formatCookieHeader() formats {name, value} as a `Cookie` header value", () => {
    expect(formatCookieHeader({ name: "ntauth", value: "abc123" })).toBe("ntauth=abc123");
  });
});
