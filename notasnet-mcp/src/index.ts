#!/usr/bin/env node
/**
 * Servidor MCP local (stdio) que envuelve `notasnet-client` y expone sus métodos como
 * herramientas MCP. Ver README.md de este paquete para configuración y tabla de herramientas.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { initSession } from "./session.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
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
