import { vi } from "vitest";
import type { FetchLike } from "../src/client.js";

/**
 * Crea un `fetch` mock (compatible con `FetchLike`) que responde con `body` serializado como
 * JSON y el `status` indicado, sin hacer ninguna llamada de red real.
 */
export function jsonFetch(body: unknown, status = 200): FetchLike {
  return vi.fn(async () => {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  }) as unknown as FetchLike;
}

/** Crea un `fetch` mock que responde con un cuerpo de texto crudo (no necesariamente JSON). */
export function textFetch(body: string, status = 200): FetchLike {
  return vi.fn(async () => {
    return new Response(body, { status });
  }) as unknown as FetchLike;
}

/** Crea un `fetch` mock que responde con un status de error y sin cuerpo JSON válido. */
export function errorFetch(status: number, rawBody = ""): FetchLike {
  return vi.fn(async () => {
    return new Response(rawBody, { status });
  }) as unknown as FetchLike;
}
