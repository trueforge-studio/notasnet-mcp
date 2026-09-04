import { describe, expect, it } from "vitest";
import { NotasnetClient } from "../src/client.js";
import { jsonFetch } from "./testUtils.js";
import fixtures from "./fixtures/cuenta_certifica_modify.json" with { type: "json" };

const BASE_URL = "https://syscol.example/notasnet";

describe("NotasnetClient — cuenta / certificados / modify", () => {
  it("getAccountPaymentStatus() calls GET /api/cuenta/upag", async () => {
    const fetchMock = jsonFetch(fixtures.getAccountPaymentStatus);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.getAccountPaymentStatus();

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/cuenta/upag`, expect.anything());
    expect(result.Estado).toBe("Al dia");
  });

  it("getAccountInstallments() calls GET /api/cuenta/cuotas", async () => {
    const fetchMock = jsonFetch(fixtures.getAccountInstallments);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.getAccountInstallments();

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/cuenta/cuotas`, expect.anything());
    expect(result).toHaveLength(2);
    expect(result[1]?.LastPag).toBeNull();
  });

  it("getAccountPayments() calls GET /api/cuenta/pagos", async () => {
    const fetchMock = jsonFetch(fixtures.getAccountPayments);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.getAccountPayments();

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/cuenta/pagos`, expect.anything());
    expect(result[0]?.SosNombre).toBe("Sostenedor Ejemplo Ltda");
  });

  it("getAccountPayNowStatus() calls GET /api/cuenta/pagar", async () => {
    const fetchMock = jsonFetch(fixtures.getAccountPayNowStatus);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.getAccountPayNowStatus();

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/cuenta/pagar`, expect.anything());
    expect(result.enabled).toBe(false);
  });

  it("listCertificates() calls GET /api/certifica/list", async () => {
    const fetchMock = jsonFetch(fixtures.listCertificates);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.listCertificates();

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/certifica/list`, expect.anything());
    expect(result[0]?.CertFirma[0]?.Firmas).toHaveLength(1);
  });

  it("getModifySchema(tipo) calls GET /api/modify/schema", async () => {
    const fetchMock = jsonFetch(fixtures.getModifySchema);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.getModifySchema("alu");

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/modify/schema?tipo=alu`, expect.anything());
    expect(result.fields).toHaveLength(2);
  });

  it("getModifyInfo(tipo, id) calls GET /api/modify/info with medical fields nullable", async () => {
    const fetchMock = jsonFetch(fixtures.getModifyInfo);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.getModifyInfo("alu", 9000001);

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/modify/info?tipo=alu&id=9000001`, expect.anything());
    expect(result.mdat.Alergias).toBeNull();
  });

  it("getModifyReference(tables) joins tables with commas", async () => {
    const fetchMock = jsonFetch(fixtures.getModifyReference);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.getModifyReference(["idAlergia:_alergias", "idEnfermedad:_enfermedades"]);

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/modify/reference?table=idAlergia%3A_alergias%2CidEnfermedad%3A_enfermedades`,
      expect.anything(),
    );
    expect(result._alergias).toHaveLength(2);
  });

  it("getModifySelector(id) calls GET /api/modify/selector", async () => {
    const fetchMock = jsonFetch(fixtures.getModifySelector);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.getModifySelector(9000001);

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/modify/selector?id=9000001`, expect.anything());
    expect(result[0]?.IdAlu).toBeNull();
  });

  it("getModifyDocuments(tipo, id) returns an empty list (as observed in the HAR)", async () => {
    const fetchMock = jsonFetch(fixtures.getModifyDocuments);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.getModifyDocuments("alu", 9000001);

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/modify/documentos?tipo=alu&id=9000001`,
      expect.anything(),
    );
    expect(result).toEqual([]);
  });
});
