import { Injectable } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import {
  DocumentTablesJson,
  ExtractDocumentTablesInput,
  ExtractDocumentTablesOutput,
} from './document-tables.types.js';
import { AiTableGeneratorService } from './services/ai-table-generator.service.js';
import { DocumentTextExtractorService } from './services/document-text-extractor.service.js';

@Injectable()
export class DocumentTablesService {
  constructor(
    private readonly textExtractor: DocumentTextExtractorService,
    private readonly aiTableGenerator: AiTableGeneratorService,
  ) {}

  async extractTables(input: ExtractDocumentTablesInput): Promise<ExtractDocumentTablesOutput> {
    const document = await this.textExtractor.extract(input.sourcePath);
    const generated = await this.aiTableGenerator.generateTables(document, input.maxChunkCharacters);
    const outputPath = path.resolve(input.outputPath ?? process.env.DEFAULT_TABLE_OUTPUT_PATH ?? 'output/document-tables.json');

    const output: DocumentTablesJson = {
      schemaVersion: '1.0',
      generatedAt: new Date().toISOString(),
      documentId: input.documentId ?? this.createDocumentId(document.metadata.fileName),
      source: {
        path: document.metadata.absolutePath,
        fileName: document.metadata.fileName,
        type: document.type,
        sizeBytes: document.metadata.sizeBytes,
        ...(document.metadata.pageCount ? { pageCount: document.metadata.pageCount } : {}),
      },
      ai: {
        model: generated.model,
        chunkCount: generated.chunkCount,
      },
      tables: generated.tables,
    };

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

    return {
      outputPath,
      tableCount: output.tables.length,
      sourcePath: document.metadata.absolutePath,
    };
  }

  private createDocumentId(fileName: string): string {
    return fileName
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
