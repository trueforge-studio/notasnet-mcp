import { defineConfig } from "tsup";

/**
 * Build separado para empaquetar como MCPB (`npm run build:mcpb`, ver README).
 *
 * A diferencia de `tsup.config.ts` (usado para dev/test, donde `notasnet-client` se resuelve
 * vía `node_modules` gracias a la dependencia `file:../notasnet-client`), acá se embeben TODAS
 * las dependencias (`@modelcontextprotocol/sdk`, `zod`, `notasnet-client`) en un solo archivo.
 * Un `.mcpb` es un zip que se instala y se mueve a otra máquina/carpeta — un `node_modules`
 * con un symlink a `../notasnet-client` no sobreviviría ese traslado, así que empaquetar todo
 * en un único archivo autocontenido evita ese problema por completo.
 */
export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["esm"],
  outDir: "mcpb/server",
  // Extensión .mjs explícita: la carpeta `mcpb/` no tiene su propio package.json, así que esto
  // deja la interpretación como ESM sin ambigüedad para cualquier versión de Node.
  outExtension: () => ({ js: ".mjs" }),
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
