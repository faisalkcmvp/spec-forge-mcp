import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { ExtractedDocumentText, GeneratedTable } from '../document-tables.types.js';

const aiTableSchema = z.object({
  tables: z.array(
    z.object({
      title: z.string().nullable().default(null),
      page: z.number().int().positive().nullable().default(null),
      columns: z.array(z.string()).default([]),
      rows: z.array(z.record(z.union([z.string(), z.number(), z.boolean(), z.null()]))).default([]),
      confidence: z.number().min(0).max(1).default(0.7),
      notes: z.string().nullable().default(null),
    }),
  ),
});

type AiTableResponse = z.infer<typeof aiTableSchema>;

const DOCUMENT_TABLES_MODEL = 'anthropic/claude-3-haiku';

@Injectable()
export class AiTableGeneratorService {
  async generateTables(document: ExtractedDocumentText, maxChunkCharacters?: number): Promise<{
    model: string;
    chunkCount: number;
    tables: GeneratedTable[];
  }> {
    const apiKey = process.env.AI_API_KEY;
    const model = DOCUMENT_TABLES_MODEL;

    if (!apiKey) {
      throw new Error('AI_API_KEY is required before the MCP tool can call the AI provider.');
    }

    const chunkSize = this.resolveChunkSize(maxChunkCharacters);
    const chunks = this.chunkText(document.text, chunkSize);
    const tables: GeneratedTable[] = [];

    for (const [index, chunk] of chunks.entries()) {
      const result = await this.callAiForChunk({
        apiKey,
        model,
        chunk,
        chunkIndex: index + 1,
        chunkCount: chunks.length,
        document,
      });

      for (const table of result.tables) {
        tables.push({
          id: `table_${String(tables.length + 1).padStart(3, '0')}`,
          title: table.title,
          page: table.page,
          columns: table.columns,
          rows: table.rows,
          confidence: table.confidence,
          notes: table.notes,
        });
      }
    }

    return {
      model,
      chunkCount: chunks.length,
      tables,
    };
  }

  private resolveChunkSize(maxChunkCharacters?: number): number {
    if (maxChunkCharacters) {
      return maxChunkCharacters;
    }

    const configured = Number(process.env.AI_MAX_CHUNK_CHARACTERS ?? 40000);
    return Number.isFinite(configured) && configured > 0 ? Math.min(configured, 120000) : 40000;
  }

  private chunkText(text: string, chunkSize: number): string[] {
    const normalized = text.replace(/\r\n/g, '\n').trim();
    const chunks: string[] = [];

    for (let offset = 0; offset < normalized.length; offset += chunkSize) {
      chunks.push(normalized.slice(offset, offset + chunkSize));
    }

    return chunks.length > 0 ? chunks : [''];
  }

  private async callAiForChunk(input: {
    apiKey: string;
    model: string;
    chunk: string;
    chunkIndex: number;
    chunkCount: number;
    document: ExtractedDocumentText;
  }): Promise<AiTableResponse> {
    const baseUrl = (process.env.AI_BASE_URL ?? 'https://openrouter.ai/api/v1').replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: input.model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You extract tables from document text. Return only valid JSON with a top-level "tables" array. Do not include markdown.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              task:
                'Find every table-like structure in this document chunk. Preserve column names. Convert each row into an object keyed by column name. If no tables are present, return {"tables":[]}.',
              outputShape: {
                tables: [
                  {
                    title: 'string or null',
                    page: 'number or null',
                    columns: ['column names as strings'],
                    rows: [{ columnName: 'cell value as string, number, boolean, or null', relationships:[ 'does this column any kind of relations with other columns that have depndency like users.id'] }],
                    confidence: 'number from 0 to 10',
                    notes: 'string or null',
                  },
                ],
              },
              source: {
                fileName: input.document.metadata.fileName,
                type: input.document.type,
                pageCount: input.document.metadata.pageCount ?? null,
              },
              chunk: {
                index: input.chunkIndex,
                count: input.chunkCount,
                text: input.chunk,
              },
            }),
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`AI provider returned ${response.status}: ${errorBody}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('AI provider returned an empty response.');
    }

    return aiTableSchema.parse(JSON.parse(content));
  }
}
