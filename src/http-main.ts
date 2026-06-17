import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer, IncomingMessage, ServerResponse } from 'node:http';

import { AppModule } from './app.module.js';
import { McpServerService } from './mcp/mcp-server.service.js';

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 3000;

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const mcpServerService = app.get(McpServerService);
  const host = process.env.HTTP_HOST ?? DEFAULT_HOST;
  const port = Number(process.env.HTTP_PORT ?? DEFAULT_PORT);

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid HTTP_PORT value: ${process.env.HTTP_PORT}`);
  }

  const httpServer = createServer(async (req, res) => {
    applyCorsHeaders(res);

    try {
      const url = new URL(req.url ?? '/', `http://${req.headers.host ?? `${host}:${port}`}`);

      if (req.method === 'OPTIONS') {
        res.writeHead(204).end();
        return;
      }

      if (req.method === 'GET' && url.pathname === '/health') {
        writeJson(res, 200, {
          status: 'ok',
          service: 'spec-forge-mcp',
          transport: 'streamable-http',
        });
        return;
      }

      if (url.pathname !== '/mcp') {
        writeJson(res, 404, { error: 'Not found' });
        return;
      }

      if (req.method !== 'POST') {
        writeJsonRpcError(res, 405, -32000, 'Method not allowed.');
        return;
      }

      const parsedBody = await readJsonBody(req);
      const mcpServer = mcpServerService.createServer();
      const transport = new StreamableHTTPServerTransport({
        enableJsonResponse: true,
        sessionIdGenerator: undefined,
      });

      res.on('close', () => {
        void transport.close();
        void mcpServer.close();
      });

      await mcpServer.connect(transport);
      await transport.handleRequest(req, res, parsedBody);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (!res.headersSent) {
        writeJsonRpcError(res, 500, -32603, message);
      } else {
        res.end();
      }
    }
  });

  httpServer.on('error', (error: Error) => {
    console.error(`Failed to start HTTP server: ${error.message}`);
    void app.close().finally(() => process.exit(1));
  });

  httpServer.listen(port, host, () => {
    console.log(`Spec Forge MCP HTTP server listening at http://${host}:${port}/mcp`);
    console.log(`Health check available at http://${host}:${port}/health`);
  });

  const shutdown = async (): Promise<void> => {
    httpServer.close();
    await app.close();
  };

  process.on('SIGINT', () => {
    void shutdown().finally(() => process.exit(0));
  });

  process.on('SIGTERM', () => {
    void shutdown().finally(() => process.exit(0));
  });
}

function applyCorsHeaders(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', process.env.HTTP_ALLOWED_ORIGIN ?? '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Accept, Content-Type, Last-Event-ID, MCP-Protocol-Version, Mcp-Session-Id',
  );
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString('utf8').trim();

  if (!rawBody) {
    return undefined;
  }

  return JSON.parse(rawBody);
}

function writeJson(res: ServerResponse, statusCode: number, body: unknown): void {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' }).end(JSON.stringify(body));
}

function writeJsonRpcError(res: ServerResponse, statusCode: number, code: number, message: string): void {
  writeJson(res, statusCode, {
    jsonrpc: '2.0',
    error: {
      code,
      message,
    },
    id: null,
  });
}

bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
});
