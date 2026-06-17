export type SupportedDocumentType = 'pdf' | 'docx' | 'text' | 'markdown' | 'csv' | 'json' | 'html';

export interface ExtractDocumentTablesInput {
  sourcePath: string;
  outputPath?: string;
  documentId?: string;
  maxChunkCharacters?: number;
}

export interface ExtractedDocumentText {
  type: SupportedDocumentType;
  text: string;
  metadata: {
    absolutePath: string;
    fileName: string;
    sizeBytes: number;
    pageCount?: number;
  };
}

export interface GeneratedTable {
  id: string;
  title: string | null;
  page: number | null;
  columns: string[];
  rows: Record<string, string | number | boolean | null>[];
  confidence: number;
  notes: string | null;
}

export interface DocumentTablesJson {
  schemaVersion: '1.0';
  generatedAt: string;
  documentId: string;
  source: {
    path: string;
    fileName: string;
    type: SupportedDocumentType;
    sizeBytes: number;
    pageCount?: number;
  };
  ai: {
    model: string;
    chunkCount: number;
  };
  tables: GeneratedTable[];
}

export interface ExtractDocumentTablesOutput extends Record<string, unknown> {
  outputPath: string;
  tableCount: number;
  sourcePath: string;
}
