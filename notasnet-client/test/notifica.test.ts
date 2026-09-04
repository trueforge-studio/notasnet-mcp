import { describe, expect, it } from "vitest";
import { NotasnetClient } from "../src/client.js";
import { jsonFetch } from "./testUtils.js";
import fixtures from "./fixtures/notifica.json" with { type: "json" };

const BASE_URL = "https://syscol.example/notasnet";

describe("NotasnetClient — notifica", () => {
  it("getLatestNotifications(last) maps to the `last` query param", async () => {
    const fetchMock = jsonFetch(fixtures.getLatestNotifications);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.getLatestNotifications(20);

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/notifica/latest?last=20`, expect.anything());
    expect(result).toHaveLength(3);
    // Titulo/Detalle pueden venir null junto con Alu/Alumno null (confirmado contra el backend real).
    expect(result[2].Titulo).toBeNull();
    expect(result[2].Detalle).toBeNull();
  });

  it("getNotificationEventDetail(notificationId) maps to the `noti` query param", async () => {
    const fetchMock = jsonFetch(fixtures.getNotificationEventDetail);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.getNotificationEventDetail(2000001);

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/notifica/evento?noti=2000001`, expect.anything());
    expect(result.Detalle.Tipo).toBe("COM");
  });

  it("markNotificationSeen(subject) POSTs a multipart/form-data body with a `suj` field", async () => {
    const fetchMock = jsonFetch(fixtures.markNotificationSeen);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.markNotificationSeen("ag:2000001");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = (fetchMock as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0]!;
    expect(url).toBe(`${BASE_URL}/api/notifica/visto`);
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get("suj")).toBe("ag:2000001");
    expect(result).toEqual({ ok: true });
  });

  it("getUnreadCount() calls GET /api/notisinleer", async () => {
    const fetchMock = jsonFetch(fixtures.getUnreadCount);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.getUnreadCount();

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/notisinleer`, expect.anything());
    expect(result.Total).toBe(5);
  });

  it("getMenuNotificationCounts() calls GET /api/login/menu/notifica", async () => {
    const fetchMock = jsonFetch(fixtures.getMenuNotificationCounts);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.getMenuNotificationCounts();

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/login/menu/notifica`, expect.anything());
    expect(result[0]?.view).toBe("notifica");
  });
});
