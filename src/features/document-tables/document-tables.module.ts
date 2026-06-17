import { Module } from '@nestjs/common';

import { AiTableGeneratorService } from './services/ai-table-generator.service.js';
import { DocumentTextExtractorService } from './services/document-text-extractor.service.js';
import { DocumentTablesService } from './document-tables.service.js';

@Module({
  providers: [AiTableGeneratorService, DocumentTextExtractorService, DocumentTablesService],
  exports: [DocumentTablesService],
})
export class DocumentTablesModule {}
