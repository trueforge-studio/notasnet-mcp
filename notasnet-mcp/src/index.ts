#!/usr/bin/env node
/**
 * Servidor MCP local (stdio) que envuelve `notasnet-client` y expone sus métodos como
 * herramientas MCP. Ver README.md de este paquete para configuración y tabla de herramientas.
 *
 * El log de versión de Node de acá abajo va DELIBERADAMENTE antes de cualquier `import` de
 * este proyecto, y esos imports son dinámicos (`await import(...)`) en vez de estáticos. En
 * ES modules, todo `import` estático se resuelve ANTES de que el cuerpo del módulo corra —
 * si una dependencia revienta al cargarse (exactamente lo que pasó con pdf-parse@2 bajo el
 * Node embebido de Claude Desktop: crasheaba en el require de un binario nativo antes de que
 * cualquier código propio llegara a ejecutarse), un log puesto después de imports estáticos
 * NUNCA se imprime, y en los logs de Desktop solo se ve "process exiting early" sin más pistas.
 * Poniendo el log primero y cargando todo lo demás después, de forma dinámica, se garantiza
 * que la versión de Node quede en el log pase lo que pase después — justo el caso que importa
 * si esto vuelve a fallar bajo un Node embebido distinto al de esta máquina.
 */
console.error(
  `[notasnet-mcp] Node ${process.version} (${process.platform}/${process.arch}), ` +
    `NODE_MODULE_VERSION=${process.versions.modules}, pid=${process.pid}`,
);

async function main(): Promise<void> {
  const { initSession } = await import("./session.js");
  const { createServer } = await import("./server.js");
  const { StdioServerTransport } = await import("@modelcontextprotocol/sdk/server/stdio.js");

  await initSession();

  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[notasnet-mcp] Servidor MCP corriendo por stdio.");
}

main().catch((err) => {
  console.error("[notasnet-mcp] Error fatal al arrancar:", err);
  process.exit(1);
});
