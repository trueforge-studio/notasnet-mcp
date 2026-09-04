import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: false,
  sourcemap: true,
  clean: true,
  target: "es2022",
  platform: "node",
  // src/index.ts usa `await import(...)` a propósito (para loguear la versión de Node antes
  // de cargar nada más — ver el comentario ahí). Sin esto, tsup/esbuild parte esos imports
  // dinámicos en chunks separados (dist/server-*.js, dist/session-*.js, ...) en vez de dejar
  // todo en un solo dist/index.js — funciona igual, pero es innecesario para un bin/CLI.
  splitting: false,
});
