import * as assert from 'assert';
import * as path from 'path';
import { DocumentScanner } from './DocumentScanner';

suite('DocumentScanner Test Suite', () => {
  let scanner: DocumentScanner;

  setup(() => {
    scanner = new DocumentScanner();
  });

  test('scanRepository should find documents in target directories', async () => {
    // Use the actual kiro-steering-docs repository path
    const repoRoot = path.join(__dirname, '../../../kiro-steering-docs');
    
    const documents = await scanner.scanRepository(repoRoot);
    
    // Should find at least some documents
    assert.ok(documents.length > 0, 'Should find at least one document');
    
    // All documents should have required fields
    documents.forEach(doc => {
      assert.ok(doc.path, 'Document should have a path');
      assert.ok(doc.category, 'Document should have a category');
      assert.ok(['code-formatting', 'practices', 'agents'].includes(doc.category), 
        `Category should be one of the target directories, got: ${doc.category}`);
    });
  });

  test('shouldInclude should exclude documentation files', async () => {
    const repoRoot = path.join(__dirname, '../../../kiro-steering-docs');
    const documents = await scanner.scanRepository(repoRoot);
    
    // Check that no excluded files are in the results
    const excludedFiles = ['README.md', 'CONTRIBUTING.md', 'CODE_OF_CONDUCT.md'];
    documents.forEach(doc => {
      const fileName = path.basename(doc.path);
      assert.ok(!excludedFiles.includes(fileName), 
        `Should not include ${fileName}`);
    });
  });

  test('shouldInclude should exclude docs directory', async () => {
    const repoRoot = path.join(__dirname, '../../../kiro-steering-docs');
    const documents = await scanner.scanRepository(repoRoot);
    
    // Check that no files from docs/ directory are included
    documents.forEach(doc => {
      assert.ok(!doc.path.includes(path.sep + 'docs' + path.sep), 
        `Should not include files from docs/ directory: ${doc.path}`);
    });
  });

  test('shouldInclude should exclude templates directory', async () => {
    const repoRoot = path.join(__dirname, '../../../kiro-steering-docs');
    const documents = await scanner.scanRepository(repoRoot);
    
    // Check that no files from templates/ directory are included
    documents.forEach(doc => {
      assert.ok(!doc.path.includes(path.sep + 'templates' + path.sep), 
        `Should not include files from templates/ directory: ${doc.path}`);
    });
  });

  test('determineSubcategory should detect subcategories from path', async () => {
    const repoRoot = path.join(__dirname, '../../../kiro-steering-docs');
    const documents = await scanner.scanRepository(repoRoot);
    
    // Find documents with subcategories
    const docsWithSubcategory = documents.filter(doc => doc.subcategory);
    
    // Should find at least some documents with subcategories
    assert.ok(docsWithSubcategory.length > 0, 
      'Should find at least one document with a subcategory');
    
    // Log some examples for verification
    console.log('Sample documents with subcategories:');
    docsWithSubcategory.slice(0, 5).forEach(doc => {
      console.log(`  ${doc.category}/${doc.subcategory}: ${path.basename(doc.path)}`);
    });
  });

  test('scanRepository should only include markdown files', async () => {
    const repoRoot = path.join(__dirname, '../../../kiro-steering-docs');
    const documents = await scanner.scanRepository(repoRoot);
    
    // All documents should be .md files
    documents.forEach(doc => {
      assert.ok(doc.path.endsWith('.md'), 
        `All documents should be markdown files: ${doc.path}`);
    });
  });
});

