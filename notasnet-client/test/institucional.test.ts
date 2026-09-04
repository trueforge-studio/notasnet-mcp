import { describe, expect, it } from "vitest";
import { NotasnetClient } from "../src/client.js";
import { jsonFetch } from "./testUtils.js";
import fixtures from "./fixtures/institucional.json" with { type: "json" };

const BASE_URL = "https://syscol.example/notasnet";

describe("NotasnetClient — institucional / arranque", () => {
  it("isAuthenticated() calls GET /api/login/isauth", async () => {
    const fetchMock = jsonFetch(fixtures.isAuthenticated);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.isAuthenticated();

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/login/isauth`, expect.anything());
    expect(result.auth).toBe(true);
  });

  it("getPinStatus() calls GET /api/login/pinstatus", async () => {
    const fetchMock = jsonFetch(fixtures.getPinStatus);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.getPinStatus();

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/login/pinstatus`, expect.anything());
    expect(result.Estado).toBe(0);
  });

  it("getMenu() calls GET /api/login/menu", async () => {
    const fetchMock = jsonFetch(fixtures.getMenu);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.getMenu();

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/login/menu`, expect.anything());
    expect(result).toHaveLength(2);
  });

  it("getColConfig(key) calls GET /api/colconfig", async () => {
    const fetchMock = jsonFetch(fixtures.getColConfig);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.getColConfig("notasnet.ganalytics");

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/colconfig?key=notasnet.ganalytics`,
      expect.anything(),
    );
    expect(result.Valor).toBeNull();
  });

  it("listPublicNews(top) maps to the `top` query param", async () => {
    const fetchMock = jsonFetch(fixtures.listPublicNews);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.listPublicNews(true);

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/publicas?top=true`, expect.anything());
    expect(result).toHaveLength(1);
  });

  it("getPublicNewsDetail(id) calls GET /api/publicas/{id}", async () => {
    const fetchMock = jsonFetch(fixtures.getPublicNewsDetail);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.getPublicNewsDetail(100001);

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/publicas/100001`, expect.anything());
    expect(result.idPublica).toBe(100001);
  });

  it("getPrematConfig() calls GET /api/premat/config", async () => {
    const fetchMock = jsonFetch(fixtures.getPrematConfig);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.getPrematConfig();

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/premat/config`, expect.anything());
    expect(result.FecInicio).toBeNull();
  });

  it("getConvivenciaDenunciaConfig() calls GET /api/convivencia/denuncia/config", async () => {
    const fetchMock = jsonFetch(fixtures.getConvivenciaDenunciaConfig);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.getConvivenciaDenunciaConfig();

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/convivencia/denuncia/config`,
      expect.anything(),
    );
    expect(result.ano).toBe(2026);
  });
});
