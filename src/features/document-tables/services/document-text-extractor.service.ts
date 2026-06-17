import { Injectable } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';

import { ExtractedDocumentText, SupportedDocumentType } from '../document-tables.types.js';

@Injectable()
export class DocumentTextExtractorService {
  async extract(sourcePath: string): Promise<ExtractedDocumentText> {
    if (sourcePath.startsWith('http://') || sourcePath.startsWith('https://')) {
      return this.extractFromUrl(sourcePath);
    }

    return this.extractFromFile(sourcePath);
  }

  private async extractFromUrl(url: string): Promise<ExtractedDocumentText> {
    const urlObj = new URL(url);
    const extension = path.extname(urlObj.pathname).toLowerCase();
    const type = this.detectDocumentType(extension);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch URL (${response.status}): ${url}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const text = await this.extractTextByType(type, buffer);

    if (!text.trim()) {
      throw new Error(`No readable text was extracted from: ${url}`);
    }

    const fileName = path.basename(urlObj.pathname) || 'document';

    return {
      type,
      text,
      metadata: {
        absolutePath: url,
        fileName,
        sizeBytes: buffer.byteLength,
      },
    };
  }

  private async extractFromFile(sourcePath: string): Promise<ExtractedDocumentText> {
    const absolutePath = path.resolve(sourcePath);
    const stats = await fs.stat(absolutePath);

    if (!stats.isFile()) {
      throw new Error(`Source path is not a file: ${absolutePath}`);
    }

    const extension = path.extname(absolutePath).toLowerCase();
    const buffer = await fs.readFile(absolutePath);
    const type = this.detectDocumentType(extension);
    const text = await this.extractTextByType(type, buffer);

    if (!text.trim()) {
      throw new Error(`No readable text was extracted from: ${absolutePath}`);
    }

    const pageCount = type === 'pdf' ? await this.getPdfPageCount(buffer) : undefined;

    return {
      type,
      text,
      metadata: {
        absolutePath,
        fileName: path.basename(absolutePath),
        sizeBytes: stats.size,
        ...(pageCount ? { pageCount } : {}),
      },
    };
  }

  private detectDocumentType(extension: string): SupportedDocumentType {
    switch (extension) {
      case '.pdf':
        return 'pdf';
      case '.docx':
        return 'docx';
      case '.md':
      case '.markdown':
        return 'markdown';
      case '.csv':
        return 'csv';
      case '.json':
        return 'json';
      case '.html':
      case '.htm':
        return 'html';
      case '.txt':
        return 'text';
      default:
        throw new Error(`Unsupported document extension "${extension}". Supported: .pdf, .docx, .txt, .md, .csv, .json, .html`);
    }
  }

  private async extractTextByType(type: SupportedDocumentType, buffer: Buffer): Promise<string> {
    if (type === 'pdf') {
      const result = await pdfParse(buffer);
      return result.text;
    }

    if (type === 'docx') {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }

    return buffer.toString('utf8');
  }

  private async getPdfPageCount(buffer: Buffer): Promise<number | undefined> {
    try {
      const result = await pdfParse(buffer);
      return result.numpages;
    } catch {
      return undefined;
    }
  }
}
