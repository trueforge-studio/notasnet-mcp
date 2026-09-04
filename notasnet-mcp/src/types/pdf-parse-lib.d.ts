/**
 * `pdf-parse/lib/pdf-parse.js` — la implementación real de `pdf-parse@1`, sin el wrapper
 * `index.js` que rompe bajo cualquier `import` ESM/bundle (ver comentario en
 * `src/tools/attachments.ts`). `@types/pdf-parse` no tipa este subpath, así que se declara acá
 * a mano, con solo los campos que usa esta librería.
 */
declare module "pdf-parse/lib/pdf-parse.js" {
  interface PdfParseResult {
    text: string;
    numpages: number;
  }

  function pdfParse(buffer: Buffer): Promise<PdfParseResult>;
  export default pdfParse;
}
