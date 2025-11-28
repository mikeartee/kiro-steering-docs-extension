import * as fs from 'fs/promises';
import * as path from 'path';
import { DocumentLocation } from '../models/types';

/**
 * Service for scanning the repository to find steering documents
 */
export class DocumentScanner {
  private readonly targetDirectories = ['code-formatting', 'practices', 'agents'];
  private readonly excludedDirectories = ['docs', 'templates', 'node_modules', '.git'];
  private readonly excludedFiles = [
    'README.md',
    'CONTRIBUTING.md',
    'CODE_OF_CONDUCT.md',
    'LICENSE',
    'CHANGELOG.md',
    'SECURITY.md',
    'MAINTAINERS.md',
    'ROADMAP.md',
    'TAGS.md'
  ];

  /**
   * Scans the repository for all steering documents
   * @param repoRoot - Root directory of the repository
   * @returns Array of document locations with path and category
   */
  async scanRepository(repoRoot: string): Promise<DocumentLocation[]> {
    const documents: DocumentLocation[] = [];

    for (const category of this.targetDirectories) {
      const categoryPath = path.join(repoRoot, category);
      
      try {
        await fs.access(categoryPath);
        const categoryDocs = await this.scanDirectory(categoryPath, category);
        documents.push(...categoryDocs);
      } catch (error) {
        // Directory doesn't exist, skip it
        continue;
      }
    }

    return documents;
  }

  /**
   * Recursively scans a directory for markdown files
   * @param dir - Directory to scan
   * @param category - Category name (code-formatting, practices, agents)
   * @returns Array of document locations
   */
  private async scanDirectory(dir: string, category: string): Promise<DocumentLocation[]> {
    const documents: DocumentLocation[] = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Skip excluded directories
          if (this.excludedDirectories.includes(entry.name)) {
            continue;
          }

          // Recursively scan subdirectories
          const subDocs = await this.scanDirectory(fullPath, category);
          documents.push(...subDocs);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          // Check if this file should be included
          if (this.shouldInclude(fullPath)) {
            const subcategory = this.determineSubcategory(fullPath);
            documents.push({
              path: fullPath,
              category,
              subcategory
            });
          }
        }
      }
    } catch (error) {
      // Error reading directory, skip it
      console.error(`Error scanning directory ${dir}:`, error);
    }

    return documents;
  }

  /**
   * Determines if a file should be included in the scan
   * @param filePath - Full path to the file
   * @returns True if the file should be included
   */
  private shouldInclude(filePath: string): boolean {
    const fileName = path.basename(filePath);
    
    // Exclude specific documentation files
    if (this.excludedFiles.includes(fileName)) {
      return false;
    }

    // Exclude files in docs/ directory
    if (filePath.includes(path.sep + 'docs' + path.sep)) {
      return false;
    }

    // Exclude files in templates/ directory
    if (filePath.includes(path.sep + 'templates' + path.sep)) {
      return false;
    }

    // Exclude files in _drafts/ directory
    if (filePath.includes(path.sep + '_drafts' + path.sep)) {
      return false;
    }

    return true;
  }

  /**
   * Determines the subcategory from the file path
   * @param filePath - Full path to the file
   * @returns Subcategory name or undefined
   */
  private determineSubcategory(filePath: string): string | undefined {
    const pathParts = filePath.split(path.sep);
    
    // Find the category index first
    const categoryIndex = pathParts.findIndex(part => 
      this.targetDirectories.includes(part)
    );

    if (categoryIndex !== -1 && categoryIndex < pathParts.length - 2) {
      // Return the directory immediately after the category
      // For example: code-formatting/languages/javascript.md -> languages
      return pathParts[categoryIndex + 1];
    }

    return undefined;
  }
}

