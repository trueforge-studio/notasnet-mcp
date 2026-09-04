import { describe, expect, it } from "vitest";
import { NotasnetClient } from "../src/client.js";
import { jsonFetch } from "./testUtils.js";
import fixtures from "./fixtures/comunica.json" with { type: "json" };

const BASE_URL = "https://syscol.example/notasnet";

describe("NotasnetClient — comunica", () => {
  it("listCommunications(params) maps channelType/channelId/search to tipo/id/buscar", async () => {
    const fetchMock = jsonFetch(fixtures.listCommunications);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.listCommunications({ channelType: "Colegio", channelId: 900, search: "" });

    const calledUrl = new URL((fetchMock as unknown as { mock: { calls: [string, unknown][] } }).mock.calls[0]![0]);
    expect(calledUrl.searchParams.get("tipo")).toBe("Colegio");
    expect(calledUrl.searchParams.get("id")).toBe("900");
    expect(calledUrl.searchParams.get("buscar")).toBe("");
    expect(result).toHaveLength(2);
  });

  it("getCommunication(id) returns the full detail including HTML body and attachments", async () => {
    const fetchMock = jsonFetch(fixtures.getCommunication);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.getCommunication(2000001);

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/comunica/2000001`, expect.anything());
    expect(result.Archivo).toHaveLength(1);
  });

  it("getCommunication(id) handles a null Archivo and null Titulo", async () => {
    const fetchMock = jsonFetch(fixtures.getCommunicationNoAttachment);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.getCommunication(2000002);

    expect(result.Archivo).toBeNull();
    expect(result.Titulo).toBeNull();
  });

  it("listCommunicationChannels(search) calls GET /api/comunica/contactos", async () => {
    const fetchMock = jsonFetch(fixtures.listCommunicationChannels);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.listCommunicationChannels();

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/comunica/contactos?buscar=`, expect.anything());
    expect(result).toHaveLength(2);
  });

  it("getCommunicationChannelStatus(search) calls GET /api/comunica/contacto/notificacion", async () => {
    const fetchMock = jsonFetch(fixtures.getCommunicationChannelStatus);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.getCommunicationChannelStatus("algo");

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/comunica/contacto/notificacion?buscar=algo`,
      expect.anything(),
    );
    expect(result.active).toBe(1);
  });

  it("listCommunicationNotifications(search) calls GET /api/comunica/notificaciones with no pagination params", async () => {
    const fetchMock = jsonFetch(fixtures.listCommunicationNotifications);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.listCommunicationNotifications();

    const calledUrl = new URL((fetchMock as unknown as { mock: { calls: [string, unknown][] } }).mock.calls[0]![0]);
    expect(calledUrl.pathname).toBe("/notasnet/api/comunica/notificaciones");
    expect([...calledUrl.searchParams.keys()]).toEqual(["buscar"]);
    expect(result).toHaveLength(2);
  });

  it("getCommunicationNotification(id) returns detail with SujetoCodigo", async () => {
    const fetchMock = jsonFetch(fixtures.getCommunicationNotification);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.getCommunicationNotification(3000001);

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/comunica/notificacion/3000001`, expect.anything());
    expect(result.SujetoCodigo).toBe("ag");
  });

  it("getCommunicationNotification(id) handles null UsRut/UsNombre/Alumno", async () => {
    const fetchMock = jsonFetch(fixtures.getCommunicationNotificationNoAuthor);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.getCommunicationNotification(3000003);

    expect(result.UsRut).toBeNull();
    expect(result.Alumno).toBeNull();
  });
});
