import { Injectable } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { DocumentTablesService } from '../features/document-tables/document-tables.service.js';

@Injectable()
export class McpServerService {
  constructor(private readonly documentTablesService: DocumentTablesService) {}

  createServer(): McpServer {
    const server = new McpServer({
      name: 'spec-forge-mcp',
      version: '0.1.0',
    });

    this.registerDocumentTableTools(server);

    return server;
  }

  async start(): Promise<void> {
    const server = this.createServer();
    const transport = new StdioServerTransport();

    await server.connect(transport);
  }

  private registerDocumentTableTools(server: McpServer): void {
    server.registerTool(
      'extract_document_tables',
      {
        title: 'Extract Document Tables',
        description:
          'Convert a PDF, DOCX, text, markdown, CSV, JSON, or HTML document into table data and write one JSON output file. The source can be a local file path or an HTTP/HTTPS URL.',
        inputSchema: {
          sourcePath: z.string().min(1).describe('Path to the source document on the local filesystem, or an HTTP/HTTPS URL (e.g. a raw GitHub link to a .md or .txt file).'),
          outputPath: z
            .string()
            .min(1)
            .optional()
            .describe('Optional path for the single generated JSON file.'),
          documentId: z
            .string()
            .min(1)
            .optional()
            .describe('Optional stable identifier for the document in the generated JSON.'),
          maxChunkCharacters: z
            .number()
            .int()
            .positive()
            .max(120000)
            .optional()
            .describe('Optional maximum characters sent to the AI model per chunk.'),
        },
        outputSchema: {
          outputPath: z.string(),
          tableCount: z.number().int().nonnegative(),
          sourcePath: z.string(),
        },
      },
      async (input) => {
        try {
          const output = await this.documentTablesService.extractTables(input);

          return {
            content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
            structuredContent: output,
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);

          return {
            content: [{ type: 'text', text: `Failed to extract document tables: ${message}` }],
            isError: true,
          };
        }
      },
    );
  }
}
