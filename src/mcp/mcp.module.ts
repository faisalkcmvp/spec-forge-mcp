import { Module } from '@nestjs/common';

import { DocumentTablesModule } from '../features/document-tables/document-tables.module.js';
import { McpServerService } from './mcp-server.service.js';

@Module({
  imports: [DocumentTablesModule],
  providers: [McpServerService],
  exports: [McpServerService],
})
export class McpModule {}
