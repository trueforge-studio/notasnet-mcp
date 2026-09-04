/**
 * Errores propios del cliente de Notasnet.
 *
 * El backend real (IIS / API antigua, ver análisis HAR) no mostró tener un formato de
 * error estructurado consistente en las respuestas capturadas. Por eso `NotasnetApiError`
 * no asume ninguna forma de cuerpo de error: guarda el cuerpo crudo como texto y, si pudo
 * parsearse como JSON, también lo expone parseado.
 */

/**
 * Error lanzado por `NotasnetClient` cuando una respuesta HTTP no es exitosa (status fuera
 * del rango 2xx), o cuando el cuerpo esperado como JSON no pudo parsearse.
 */
export class NotasnetApiError extends Error {
  /** Código de estado HTTP de la respuesta. */
  readonly status: number;
  /** URL completa solicitada (incluye query string). */
  readonly url: string;
  /** Método HTTP usado. */
  readonly method: string;
  /** Cuerpo crudo de la respuesta como texto, tal cual llegó (puede ser vacío o no-JSON). */
  readonly rawBody: string;
  /** Cuerpo parseado como JSON, si `rawBody` era JSON válido; `undefined` en caso contrario. */
  readonly parsedBody?: unknown;

  constructor(params: {
    message: string;
    status: number;
    url: string;
    method: string;
    rawBody: string;
    parsedBody?: unknown;
  }) {
    super(params.message);
    this.name = "NotasnetApiError";
    this.status = params.status;
    this.url = params.url;
    this.method = params.method;
    this.rawBody = params.rawBody;
    this.parsedBody = params.parsedBody;
  }
}

/**
 * Error lanzado cuando la respuesta de un endpoint no pasa la validación de forma esperada
 * (ver validación con zod en `src/client.ts`). Distinto de `NotasnetApiError`: la petición
 * HTTP fue "exitosa" (status 2xx) pero el cuerpo no tiene la forma que la librería espera,
 * lo que sugiere que el backend cambió algo.
 */
export class NotasnetShapeError extends Error {
  readonly url: string;
  /** Issues de zod (`ZodError.issues`): path, código y expected/received por cada campo que no calzó. */
  readonly issues: unknown;
  /** Cuerpo ya parseado como JSON que falló la validación, para poder inspeccionarlo sin repetir la llamada. */
  readonly receivedBody: unknown;

  constructor(params: { message: string; url: string; issues: unknown; receivedBody: unknown }) {
    super(params.message);
    this.name = "NotasnetShapeError";
    this.url = params.url;
    this.issues = params.issues;
    this.receivedBody = params.receivedBody;
  }
}

/**
 * Lanzado por métodos que aún no están implementados a propósito (ej. login real).
 * Ver README para el detalle de por qué no se implementan todavía.
 */
export class NotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotImplementedError";
  }
}
