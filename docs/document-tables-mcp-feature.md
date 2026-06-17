# Document Tables MCP Feature

## Todo

- [x] Create a minimal NestJS project that runs as an MCP server.
- [x] Add one MCP tool for converting documents into table data.
- [x] Use AI to normalize extracted document text into structured tables.
- [x] Always write the generated tables into one JSON file.
- [x] Document this feature in a single feature doc.

## Purpose

This feature exposes one MCP tool, `extract_document_tables`, for AI clients that need table data from local documents. The tool reads a supported file, extracts text, sends the text to an AI provider, and writes the complete result to one JSON file.

Supported input types:

- PDF: `.pdf`
- Word: `.docx`
- Text: `.txt`
- Markdown: `.md`, `.markdown`
- CSV: `.csv`
- JSON: `.json`
- HTML: `.html`, `.htm`

## Runtime

The project is intentionally minimal:

- NestJS is used for dependency injection and application lifecycle.
- MCP can run over stdio or Streamable HTTP through `@modelcontextprotocol/sdk`.
- The HTTP endpoint is `/mcp`.
- The AI call uses an OpenAI-compatible chat completions endpoint.

Required environment variables:

```bash
AI_API_KEY=your-provider-key
```

Optional environment variables:

```bash
AI_BASE_URL=https://openrouter.ai/api/v1
AI_MAX_CHUNK_CHARACTERS=40000
DEFAULT_TABLE_OUTPUT_PATH=output/document-tables.json
HTTP_HOST=127.0.0.1
HTTP_PORT=3000
HTTP_ALLOWED_ORIGIN=*
```

The document-table extraction action currently hardcodes this OpenRouter model:

```text
anthropic/claude-3-haiku
```

## Tool Contract

Tool name:

```text
extract_document_tables
```

Input:

```json
{
  "sourcePath": "/absolute/or/relative/path/to/document.pdf",
  "outputPath": "output/document-tables.json",
  "documentId": "optional-document-id",
  "maxChunkCharacters": 40000
}
```

`sourcePath` is required. All other fields are optional.

Output returned to the MCP client:

```json
{
  "outputPath": "/absolute/path/to/output/document-tables.json",
  "tableCount": 3,
  "sourcePath": "/absolute/path/to/document.pdf"
}
```

## Generated JSON Shape

The tool always writes one JSON file with this shape:

```json
{
  "schemaVersion": "1.0",
  "generatedAt": "2026-06-09T00:00:00.000Z",
  "documentId": "example-document",
  "source": {
    "path": "/absolute/path/to/document.pdf",
    "fileName": "document.pdf",
    "type": "pdf",
    "sizeBytes": 12345,
    "pageCount": 4
  },
  "ai": {
    "model": "anthropic/claude-3-haiku",
    "chunkCount": 1
  },
  "tables": [
    {
      "id": "table_001",
      "title": "Revenue by Quarter",
      "page": 2,
      "columns": ["Quarter", "Revenue"],
      "rows": [
        {
          "Quarter": "Q1",
          "Revenue": 120000
        }
      ],
      "confidence": 0.92,
      "notes": null
    }
  ]
}
```

## Local Commands

Install dependencies:

```bash
npm install
```

Build:

```bash
npm run build
```

Run the MCP server:

```bash
npm start
```

Run the HTTP MCP server:

```bash
npm run start:http
```

Run during development:

```bash
npm run start:dev
```

## MCP Client Configuration

After building, configure a stdio MCP client to launch:

```bash
node /absolute/path/to/spec-forge-mcp/dist/main.js
```

For HTTP MCP clients, start the server and connect to:

```text
http://127.0.0.1:3000/mcp
```
