import { describe, expect, it } from "vitest";
import { NotasnetClient } from "../src/client.js";
import { jsonFetch } from "./testUtils.js";
import fixtures from "./fixtures/agenda.json" with { type: "json" };

const BASE_URL = "https://syscol.example/notasnet";

describe("NotasnetClient — agenda", () => {
  it("getAgendaByDate(date) calls GET /api/agenda/{fecha}", async () => {
    const fetchMock = jsonFetch(fixtures.getAgendaByDate);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.getAgendaByDate("2026-08-28");

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/agenda/2026-08-28`, expect.anything());
    expect(result).toHaveLength(2);
    expect(result[0]?.TipoCodigo).toBe("EVE");
  });

  it("getAgendaEvents(range) maps to fec1/fec2/clases and returns the (different) range shape", async () => {
    const fetchMock = jsonFetch(fixtures.getAgendaEvents);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.getAgendaEvents({
      from: "2026-07-27T00:00:00",
      to: "2026-09-06T01:00:00",
      includeClasses: false,
    });

    const calledUrl = new URL((fetchMock as unknown as { mock: { calls: [string, unknown][] } }).mock.calls[0]![0]);
    expect(calledUrl.pathname).toBe("/notasnet/api/agenda/eventos");
    expect(calledUrl.searchParams.get("fec1")).toBe("2026-07-27T00:00:00");
    expect(calledUrl.searchParams.get("fec2")).toBe("2026-09-06T01:00:00");
    expect(calledUrl.searchParams.get("clases")).toBe("false");
    // forma distinta a AgendaDayEvent: usa `title`/`content`/`date` en vez de Titulo/Detalle/FechaInicio
    expect(result[0]).toHaveProperty("title");
    expect(result[0]).toHaveProperty("date");
  });

  it("getAgendaEventDetail(id) calls GET /api/agenda/evento/{id} and includes attachments", async () => {
    const fetchMock = jsonFetch(fixtures.getAgendaEventDetail);
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: fetchMock });

    const result = await client.getAgendaEventDetail(1000001);

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/agenda/evento/1000001`, expect.anything());
    expect(result.Archivo).toHaveLength(2);
  });
});
