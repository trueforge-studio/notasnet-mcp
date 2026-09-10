# notasnet-mcp

Unofficial tooling for the [Notasnet](https://syscol.com/notasnet) school portal
(`syscol.com/notasnet`), split into two packages:

| Package | Description |
|---|---|
| [`notasnet-client`](notasnet-client) | TypeScript client library for the Notasnet API: types, HTTP client, endpoint mapping, attachment helpers. No auth flow, no MCP logic — just the API access layer. |
| [`notasnet-mcp`](notasnet-mcp) | Local [MCP](https://modelcontextprotocol.io) server, over stdio, that wraps `notasnet-client` and exposes it as tools for an MCP-compatible host (Claude Desktop, Claude Code, Codex, etc.). |

`notasnet-mcp` depends on `notasnet-client`; see each package's own README for
installation, configuration, and the full list of available tools/methods.

Neither package is affiliated with or endorsed by Notasnet/Syscol — this is a
reverse-engineered client built from observed API traffic.

## Installation

Both packages are published on npm under the `@trueforge-studio` scope:

```bash
npm install @trueforge-studio/notasnet-client   # library
npm install -g @trueforge-studio/notasnet-mcp   # MCP server CLI
```

See each package's own README for configuration (env vars, MCP host setup) and
the full list of available tools/methods.

## License

UNLICENSED — see individual package manifests.
