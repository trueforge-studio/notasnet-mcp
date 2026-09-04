import { defineConfig } from "tsup";

/**
 * Build separado para empaquetar como MCPB (`npm run build:mcpb`, ver README).
 *
 * A diferencia de `tsup.config.ts` (usado para dev/test, donde `notasnet-client` se resuelve
 * vía `node_modules` gracias a la dependencia `file:../notasnet-client`), acá se embeben TODAS
 * las dependencias (`@modelcontextprotocol/sdk`, `zod`, `notasnet-client`, `pdf-parse`,
 * `mammoth`) en un solo archivo. Un `.mcpb` es un zip que se instala y se mueve a otra
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
 * `pdf-parse` queda EXTERNAL a propósito (no se bundlea): envuelve `pdfjs-dist`, que trae
 * rutas de código para renderizado por canvas (`getScreenshot`/`getImage`) que referencian
 * globals de navegador (`DOMMatrix`, `ImageData`, `Path2D`) — código que ni siquiera usamos
 * (solo se llama `getText()`), pero que esbuild igual bundlea al no poder hacer tree-shaking
 * limpio de un paquete CJS con ese nivel de detección de entorno en runtime. Bundleado,
 * revienta al arrancar con `ReferenceError: DOMMatrix is not defined`. La solución es dejarlo
 * como una dependencia real, resuelta por Node de forma normal — exactamente como ya funciona
 * en dev/test — en vez de pelear con el bundler. Ver `scripts/vendor-mcpb-deps.mjs`, que
 * instala `pdf-parse` (y su árbol de dependencias) dentro de `mcpb/server/node_modules/`
 * como paso separado del build (`npm run build:mcpb-vendor`), antes de empaquetar con `mcpb pack`.
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
  external: ["pdf-parse"],
  splitting: false,
  minify: false,
  // El `external` de tsup no basta acá: con `noExternal: [/.*/]` igual termina bundleando
  // "pdf-parse" (visto empíricamente — el output seguía incluyendo su código inline). Forzarlo
  // directo en las opciones de esbuild sí funciona.
  esbuildOptions(options) {
    options.external = [...(options.external ?? []), "pdf-parse"];
  },
});
