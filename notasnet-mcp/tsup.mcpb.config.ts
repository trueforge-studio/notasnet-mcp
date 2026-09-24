import { defineConfig } from "tsup";

/**
 * Build separado para empaquetar como MCPB (`npm run build:mcpb`, ver README).
 *
 * A diferencia de `tsup.config.ts` (usado para dev/test, donde `notasnet-client` se resuelve
 * vía `node_modules` gracias a la dependencia `file:../notasnet-client`), acá se embeben TODAS
 * las dependencias (`@modelcontextprotocol/sdk`, `zod`, `notasnet-client`, `pdf-parse`,
 * `mammoth`, `jszip`) en un solo archivo. Un `.mcpb` es un zip que se instala y se mueve a otra
 * máquina/carpeta — un `node_modules` con un symlink a `../notasnet-client` no sobreviviría
 * ese traslado, así que empaquetar todo en un único archivo autocontenido evita ese problema.
 *
 * Formato CJS, no ESM: `mammoth` (CJS) hace `require("fs")`/`require("path")` con literales
 * estáticos en su propio código. Al bundlear un output ESM, esbuild inserta un shim
 * `__require` para interoperar con código CJS bundleado, y ese shim no logra resolver
 * requires (ni siquiera a builtins de Node) en runtime — falla con "Dynamic require of 'fs'
 * is not supported". En un output CJS no hace falta ningún shim: `require()` es nativo del
 * runtime, así que el código de `mammoth` funciona tal cual. `src/index.ts` no usa top-level
 * await (todo el arranque async vive dentro de `main()`), así que el output CJS es válido.
 *
 * Nota sobre `pdf-parse`: se usa deliberadamente la v1 (no v2 — ver README, sección
 * "Adjuntos", para por qué: v2 depende de un binario nativo que crasheaba bajo el Node
 * embebido de Claude Desktop). La v1 tiene su propio landmine para bundlers: su `index.js`
 * hace `let isDebugMode = !module.parent` e intenta leer un PDF de prueba hardcodeado si es
 * "true" — comprobado que bajo el bundle de esbuild `module.parent` sigue siendo verdadero
 * (esbuild preserva la relación real de módulos en su wrapper CJS), así que no se activa. Se
 * deja esta nota por si una futura actualización de tsup/esbuild cambia ese comportamiento —
 * si el proceso empaquetado empieza a fallar por un ENOENT de
 * `test/data/05-versions-space.pdf`, es por esto.
 */
export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["cjs"],
  outDir: "mcpb/server",
  // Extensión .cjs explícita: la carpeta `mcpb/` no tiene su propio package.json, así que esto
  // deja la interpretación como CJS sin ambigüedad para cualquier versión de Node.
  outExtension: () => ({ js: ".cjs" }),
  dts: false,
  sourcemap: false,
  clean: true,
  target: "es2022",
  platform: "node",
  bundle: true,
  noExternal: [/.*/],
  splitting: false,
  minify: false,
});
