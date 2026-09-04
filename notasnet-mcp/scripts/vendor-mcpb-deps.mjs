#!/usr/bin/env node
/**
 * Paso del build:mcpb (ver README, sección "Empaquetado como MCPB") que instala `pdf-parse`
 * como una dependencia real dentro de `mcpb/server/node_modules/`, en vez de bundlearla junto
 * al resto del servidor.
 *
 * Por qué: `pdf-parse` envuelve `pdfjs-dist`, que tiene rutas de código de renderizado por
 * canvas que referencian globals de navegador (`DOMMatrix`, `ImageData`, `Path2D`). esbuild no
 * logra hacer tree-shaking limpio de esas rutas al bundlear (aunque esta librería solo llama
 * `getText()`), y el bundle resultante revienta al arrancar con `DOMMatrix is not defined`.
 * La solución es dejar que Node resuelva `require("pdf-parse")` de la forma normal, con su
 * propio árbol de dependencias intacto — exactamente como ya funciona en dev/test — en vez de
 * pelear con el bundler. Ver el comentario en `tsup.mcpb.config.ts` (`external: ["pdf-parse"]`).
 *
 * Corre `npm install --omit=dev` en un `package.json` mínimo dentro de `mcpb/server/`, fijando
 * la misma versión de `pdf-parse` que usa este paquete (leída de `package.json` acá), así el
 * bundle empaquetado usa exactamente la versión que se probó en dev/test.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const serverDir = join(rootDir, "mcpb", "server");

const ownPackageJson = JSON.parse(readFileSync(join(rootDir, "package.json"), "utf8"));
const pdfParseRange = ownPackageJson.dependencies?.["pdf-parse"];
if (!pdfParseRange) {
  throw new Error("No se encontró 'pdf-parse' en las dependencies de package.json — build:mcpb-vendor no puede continuar.");
}

mkdirSync(serverDir, { recursive: true });

const vendorPackageJson = {
  name: "notasnet-mcp-server-vendor",
  private: true,
  description: "package.json generado por scripts/vendor-mcpb-deps.mjs — no editar a mano.",
  dependencies: { "pdf-parse": pdfParseRange },
};
writeFileSync(join(serverDir, "package.json"), `${JSON.stringify(vendorPackageJson, null, 2)}\n`, "utf8");

console.log(`[vendor-mcpb-deps] Instalando pdf-parse@${pdfParseRange} en ${serverDir} ...`);
execFileSync("npm", ["install", "--omit=dev", "--no-audit", "--no-fund"], {
  cwd: serverDir,
  stdio: "inherit",
});
console.log("[vendor-mcpb-deps] Listo.");
