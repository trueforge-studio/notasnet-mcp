import { describe, expect, it, vi } from "vitest";
import {
  buildAttachmentUrl,
  downloadAttachment,
  downloadFolderFile,
  downloadStaticResource,
} from "../src/attachments.js";

const BASE_URL = "https://syscol.example/notasnet";

describe("attachments", () => {
  it("buildAttachmentUrl joins baseUrl and Path without extra encoding", () => {
    const url = buildAttachmentUrl(BASE_URL, { Path: "cole/agenda/1000001_archivo_ejemplo.pdf" });
    expect(url).toBe(`${BASE_URL}/cole/agenda/1000001_archivo_ejemplo.pdf`);
  });

  it("buildAttachmentUrl normalizes a trailing slash on baseUrl and a leading slash on Path", () => {
    const url = buildAttachmentUrl(`${BASE_URL}/`, { Path: "/cole/agenda/1000001_archivo.pdf" });
    expect(url).toBe(`${BASE_URL}/cole/agenda/1000001_archivo.pdf`);
  });

  it("downloadAttachment does a plain GET and returns the raw Response (200 case)", async () => {
    const fetchMock = vi.fn(async () => new Response(new ArrayBuffer(8), { status: 200 }));

    const response = await downloadAttachment(
      BASE_URL,
      { Path: "cole/agenda/1000001_archivo.pdf" },
      fetchMock as unknown as typeof fetch,
    );

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/cole/agenda/1000001_archivo.pdf`);
    expect(response.status).toBe(200);
  });

  it("downloadAttachment propagates a 403 without trying to parse JSON", async () => {
    const fetchMock = vi.fn(async () => new Response("", { status: 403 }));

    const response = await downloadAttachment(
      BASE_URL,
      { Path: "cole/fotos/some-id.jpg" },
      fetchMock as unknown as typeof fetch,
    );

    expect(response.status).toBe(403);
    expect(response.ok).toBe(false);
  });

  it("downloadStaticResource propagates whatever status the static resource returns", async () => {
    const fetchMock = vi.fn(async () => new Response("", { status: 403 }));

    const response = await downloadStaticResource(BASE_URL, "cole/fotos/some-id.jpg", fetchMock as unknown as typeof fetch);

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/cole/fotos/some-id.jpg`);
    expect(response.status).toBe(403);
  });

  it("downloadFolderFile throws instead of guessing an unconfirmed URL pattern", () => {
    expect(() => downloadFolderFile(BASE_URL, "900001_guia_de_ejemplo.pdf")).toThrow(/no confirmado/i);
  });
});
