import JSZip from "jszip";

/**
 * Extracción de texto de PPTX sin dependencias extra: un `.pptx` es un zip OOXML donde cada
 * slide vive en `ppt/slides/slideN.xml` y sus notas del orador (si hay) en
 * `ppt/notesSlides/notesSlideN.xml`. El texto visible está en los runs `<a:t>…</a:t>`, agrupados
 * por párrafo en `<a:p>…</a:p>`. `jszip` ya venía como dependencia transitiva de `mammoth`; se
 * declara directo en package.json para no depender de eso.
 *
 * No se usa un parser XML: para sacar texto plano basta con una regex sobre `<a:p>`/`<a:t>`, y
 * así se evita otra dependencia más en el bundle MCPB. Se pierden tablas/SmartArt como
 * estructura, pero su texto sigue saliendo porque también usa `<a:t>`.
 *
 * Las notas se asocian a su slide por la relación `ppt/slides/_rels/slideN.xml.rels` (el número
 * de `notesSlideM.xml` no necesariamente coincide con el de la slide).
 */
export interface PptxSlide {
  index: number;
  text: string;
  notes: string;
}

const XML_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decodeXml(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const n = code[1]?.toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : match;
    }
    return XML_ENTITIES[code] ?? match;
  });
}

function extractParagraphs(xml: string): string {
  const paragraphs: string[] = [];
  for (const [, body] of xml.matchAll(/<a:p\b[^>]*>([\s\S]*?)<\/a:p>/g)) {
    const runs = [...(body ?? "").matchAll(/<a:t\b[^>]*>([\s\S]*?)<\/a:t>/g)].map(([, t]) => decodeXml(t ?? ""));
    const line = runs.join("").trim();
    if (line) paragraphs.push(line);
  }
  return paragraphs.join("\n");
}

function slideNumber(path: string): number {
  return Number(/(\d+)\.xml$/.exec(path)?.[1] ?? 0);
}

export async function extractPptxSlides(buffer: Buffer): Promise<PptxSlide[]> {
  const zip = await JSZip.loadAsync(buffer);
  const slidePaths = Object.keys(zip.files)
    .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
    .sort((a, b) => slideNumber(a) - slideNumber(b));

  return Promise.all(
    slidePaths.map(async (path) => {
      const n = slideNumber(path);
      const text = extractParagraphs(await zip.file(path)!.async("string"));

      let notes = "";
      const rels = await zip.file(`ppt/slides/_rels/slide${n}.xml.rels`)?.async("string");
      const notesTarget = rels && /Target="\.\.\/notesSlides\/([^"]+)"/.exec(rels)?.[1];
      if (notesTarget) {
        const notesXml = await zip.file(`ppt/notesSlides/${notesTarget}`)?.async("string");
        // Las notas incluyen el placeholder con el número de slide como párrafo propio; se descarta.
        const raw = notesXml ? extractParagraphs(notesXml) : "";
        notes = raw
          .split("\n")
          .filter((line) => line !== String(n))
          .join("\n");
      }

      return { index: n, text, notes };
    }),
  );
}

export function formatPptxSlides(fileName: string, slides: PptxSlide[]): string {
  const body = slides
    .map((s) => {
      let out = `--- Slide ${s.index} ---\n${s.text || "(sin texto)"}`;
      if (s.notes) out += `\n\nNotas: ${s.notes}`;
      return out;
    })
    .join("\n\n");
  return `[${fileName}, ${slides.length} slide(s)]\n\n${body}`;
}
