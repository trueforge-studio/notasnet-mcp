import { describe, expect, it, vi } from "vitest";
import { NotasnetClient, type FetchLike } from "../src/client.js";
import { NotasnetNotFoundError } from "../src/errors.js";

const BASE_URL = "https://syscol.example/notasnet";
const API = `${BASE_URL}/api`;

/** fetch mock que responde según path+query (relativo a /api); 404 si no está definido. */
function routedFetch(routes: Record<string, unknown>): FetchLike {
  return vi.fn(async (url: string) => {
    const key = String(url).replace(`${API}`, "");
    if (!(key in routes)) return new Response("no route " + key, { status: 404 });
    return new Response(JSON.stringify(routes[key]), { status: 200 });
  }) as unknown as FetchLike;
}

// Cuerpos reales reportados para la notificación de agenda 246749524 (ag:2205484).
const realNotification = {
  TipoCodigo: "Noti",
  Id: 246749524,
  Fecha: "2026-11-18T10:20:55",
  Tipo: "Comunicación",
  Titulo: null,
  Detalle: "ppt de la reunión del día de ayer",
  Sujeto: "ag:2205484",
  Archivo: null,
  UsRut: null,
  UsNombre: null,
  Comentario: 0,
  Unread: 1,
  Alumno: null,
  SujetoCodigo: "ag",
};
const eventNotFound = { Detalle: { error: "Detalle no encontrado" }, Visto: 0, Sujeto: "ag:2205484" };

describe("notificación 'ag' cuyo evento ya no existe (cuerpos reales)", () => {
  it("getCommunicationNotification acepta Titulo null y Archivo null", async () => {
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: routedFetch({ "/comunica/notificacion/246749524": realNotification }) });
    const r = await client.getCommunicationNotification(246749524);
    expect(r.Titulo).toBeNull();
    expect(r.Archivo).toBeNull();
    expect(r.Sujeto).toBe("ag:2205484");
  });

  it("getCommunication lanza NotasnetNotFoundError cuando el backend devuelve []", async () => {
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: routedFetch({ "/comunica/2205484": [] }) });
    await expect(client.getCommunication(2205484)).rejects.toBeInstanceOf(NotasnetNotFoundError);
  });

  it("getAgendaEventDetail lanza NotasnetNotFoundError con {error:'Evento no encontrado'}", async () => {
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: routedFetch({ "/agenda/evento/2205484": { error: "Evento no encontrado" } }) });
    await expect(client.getAgendaEventDetail(2205484)).rejects.toThrow(/Evento no encontrado/);
  });

  it("getNotificationEventDetail lanza NotasnetNotFoundError con Detalle.error", async () => {
    const client = new NotasnetClient({ baseUrl: BASE_URL, fetch: routedFetch({ "/notifica/evento?noti=246749524": eventNotFound }) });
    await expect(client.getNotificationEventDetail(246749524)).rejects.toBeInstanceOf(NotasnetNotFoundError);
  });

  it("getNotificationContent devuelve la vista previa incompleta cuando nada resuelve", async () => {
    const client = new NotasnetClient({
      baseUrl: BASE_URL,
      fetch: routedFetch({
        "/notifica/evento?noti=246749524": eventNotFound,
        "/comunica/notificacion/246749524": realNotification,
        "/notifica/latest?last=100": [],
        "/comunica/2205484": [],
        "/agenda/evento/2205484": { error: "Evento no encontrado" },
        "/comunica/contactos?buscar=": [],
      }),
    });
    const r = await client.getNotificationContent({ notificationId: 246749524 });
    expect(r.complete).toBe(false);
    expect(r.source).toBe("notification-preview");
    expect(r.subject).toBe("ag:2205484");
    expect(r.detalleHtml).toBe("ppt de la reunión del día de ayer");
    expect(r.archivos).toEqual([]);
    expect(r.note).toMatch(/Notificación Obsoleta/);
  });

  it("getNotificationContent usa notifica/evento cuando sí responde (caso HAR)", async () => {
    const client = new NotasnetClient({
      baseUrl: BASE_URL,
      fetch: routedFetch({
        "/notifica/evento?noti=1": {
          Detalle: { Tipo: "COM", TipoN: "Comunicación", Id: 77, Fecha: "2026-08-28T10:51:14.89", Titulo: "T", Detalle: "<div>Hola</div>", Archivo: [{ FileName: "a.pptx", Path: "cole/agenda/77_a.pptx" }], SubTitulo: "x", Color: 1, ColPath: "p" },
          Visto: 0,
          Sujeto: "ag:77",
        },
      }),
    });
    const r = await client.getNotificationContent({ notificationId: 1 });
    expect(r).toMatchObject({ complete: true, source: "notifica/evento", resolvedId: 77, titulo: "T" });
    expect(r.archivos[0]!.FileName).toBe("a.pptx");
  });

  it("getNotificationContent encuentra un comunicado re-publicado por coincidencia de texto", async () => {
    const full = {
      TipoCodigo: "COM", Id: 2205999, Fecha: "2026-11-18T10:20:56.1", Titulo: "Reunión 5°B",
      Detalle: "<div>ppt de la reunión&nbsp;del día de ayer</div>",
      Archivo: [{ FileName: "reunion.pptx", Path: "cole/agenda/2205999_reunion.pptx" }],
      UsRut: null, UsNombre: null, ComAlumnos: true, ComApoderados: true, ComPadres: true, ComSostenedores: false,
      Comentario: 0, Unread: 1, Sujeto: "ag:2205999",
    };
    const client = new NotasnetClient({
      baseUrl: BASE_URL,
      fetch: routedFetch({
        "/notifica/evento?noti=246749524": eventNotFound,
        "/comunica/notificacion/246749524": { ...realNotification, Detalle: "ppt de la reunión del día de ayer, con material para quienes no pudieron asistir" },
        "/notifica/latest?last=100": [],
        "/comunica/2205484": [],
        "/agenda/evento/2205484": { error: "Evento no encontrado" },
        "/comunica/contactos?buscar=": [{ Id: 5, Tipo: "Curso", Nombre: "5B", Codigo: null, Foto: null, Color: null, Ultima: null, Total: 1, Unread: 0 }],
        "/comunica?tipo=Curso&id=5&buscar=": [{ idEventData: 2205999, Fecha: "2026-11-18T10:20:56.1" }, { idEventData: 1, Fecha: "2026-01-01T00:00:00" }],
        "/comunica/2205999": { ...full, Detalle: "<div>ppt de la reunión&nbsp;del día de ayer, con material para quienes no pudieron asistir</div>" },
      }),
    });
    const r = await client.getNotificationContent({ notificationId: 246749524 });
    expect(r).toMatchObject({ complete: true, source: "comunica-channel-search", resolvedId: 2205999 });
    expect(r.archivos[0]!.Path).toBe("cole/agenda/2205999_reunion.pptx");
  });
});
