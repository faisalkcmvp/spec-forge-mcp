import { Module } from '@nestjs/common';

import { DocumentTablesModule } from './features/document-tables/document-tables.module.js';
import { McpModule } from './mcp/mcp.module.js';

@Module({
  imports: [DocumentTablesModule, McpModule],
})
export class AppModule {}
