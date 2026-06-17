# Spec Forge MCP

Minimal NestJS MCP server for extracting tables from documents into one JSON file.

## Local Setup

Install dependencies and build the server:

```bash
npm install
npm run build
```

Create `.env` from `.env.example` and add your OpenRouter key:

```bash
AI_API_KEY=your-openrouter-api-key
AI_BASE_URL=https://openrouter.ai/api/v1
AI_MAX_CHUNK_CHARACTERS=40000
DEFAULT_TABLE_OUTPUT_PATH=output/document-tables.json
HTTP_HOST=127.0.0.1
HTTP_PORT=3000
HTTP_ALLOWED_ORIGIN=*
```

The document table tool currently uses this hardcoded OpenRouter model:

```text
anthropic/claude-3-haiku
```

## Run HTTP MCP

Start the local HTTP MCP server:

```bash
npm run start:http
```

The MCP endpoint will be:

```text
http://127.0.0.1:3000/mcp
```

Health check:

```bash
curl http://127.0.0.1:3000/health
```

## Connect Claude Desktop

Claude Desktop may not connect directly to local HTTP MCP URLs from `claude_desktop_config.json`. Use `mcp-remote` as the bridge: Claude Desktop talks stdio to `mcp-remote`, and `mcp-remote` talks HTTP to this server.

Keep this server running with:

```bash
npm run start:http
```

Then open Claude Desktop:

```text
Settings -> Developer -> Edit Config
```

On macOS, the config file is usually:

```text
~/Library/Application Support/Claude/claude_desktop_config.json
```

Add this server under `mcpServers`:

```json
{
  "mcpServers": {
    "spec-forge-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "http://127.0.0.1:3000/mcp",
        "--allow-http",
        "--transport",
        "http-first"
      ]
    }
  }
}
```

If your config already has other MCP servers, only add the `spec-forge-mcp` block inside the existing `mcpServers` object.

Fully quit and reopen Claude Desktop. After restart, Claude should show the `extract_document_tables` tool.

## Direct HTTP Clients

Clients that support Streamable HTTP MCP can connect directly to:

```text
http://127.0.0.1:3000/mcp
```

## Example Prompt

```text
Use extract_document_tables on /Users/faisal/Documents/example.pdf and save the JSON to /Users/faisal/Documents/tables.json
```

The tool will always generate one JSON file.

## Docker

Build the image locally:

```bash
docker build -t spec-forge-mcp .
```

Run the container (loads variables from `.env`):

```bash
docker run --env-file .env -p 3000:3000 --rm spec-forge-mcp
```

Or use Docker Compose:

```bash
docker compose up --build
```

Make sure `AI_API_KEY` (and any other AI_* vars) are present in your `.env` before starting.

