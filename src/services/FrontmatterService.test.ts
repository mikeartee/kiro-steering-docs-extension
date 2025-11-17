import * as assert from 'assert';
import { FrontmatterService } from './FrontmatterService';

suite('FrontmatterService Tests', () => {
    let service: FrontmatterService;

    setup(() => {
        service = new FrontmatterService();
    });

    suite('parse', () => {
        test('should parse document with valid frontmatter', () => {
            const content = `---
version: "1.0.0"
category: "testing"
description: "Test document"
---

# Document Content
This is the body.`;

            const result = service.parse(content);

            assert.deepStrictEqual(result.frontmatter, {
                version: '1.0.0',
                category: 'testing',
                description: 'Test document'
            });
            assert.strictEqual(result.body, '\n# Document Content\nThis is the body.');
        });

        test('should handle document without frontmatter', () => {
            const content = '# Document Content\nThis is the body.';

            const result = service.parse(content);

            assert.deepStrictEqual(result.frontmatter, {});
            assert.strictEqual(result.body, content);
        });

        test('should handle document with only opening delimiter', () => {
            const content = `---
version: "1.0.0"
# Document Content`;

            const result = service.parse(content);

            assert.deepStrictEqual(result.frontmatter, {});
            assert.strictEqual(result.body, content);
        });

        test('should handle empty document', () => {
            const content = '';

            const result = service.parse(content);

            assert.deepStrictEqual(result.frontmatter, {});
            assert.strictEqual(result.body, '');
        });

        test('should handle malformed YAML in frontmatter', () => {
            const content = `---
invalid: yaml: content: here
---

# Document Content`;

            const result = service.parse(content);

            assert.deepStrictEqual(result.frontmatter, {});
            assert.strictEqual(result.body, '\n# Document Content');
        });

        test('should parse frontmatter with inclusion mode', () => {
            const content = `---
version: "1.0.0"
inclusion: "always"
---

# Document Content`;

            const result = service.parse(content);

            assert.strictEqual(result.frontmatter.inclusion, 'always');
        });

        test('should parse frontmatter with fileMatch inclusion and pattern', () => {
            const content = `---
version: "1.0.0"
inclusion: "fileMatch"
fileMatchPattern: "*.ts"
---

# Document Content`;

            const result = service.parse(content);

            assert.strictEqual(result.frontmatter.inclusion, 'fileMatch');
            assert.strictEqual(result.frontmatter.fileMatchPattern, '*.ts');
        });
    });

    suite('stringify', () => {
        test('should combine frontmatter and body correctly', () => {
            const frontmatter = {
                version: '1.0.0',
                category: 'testing'
            };
            const body = '\n# Document Content\nThis is the body.';

            const result = service.stringify(frontmatter, body);

            assert.ok(result.startsWith('---\n'));
            assert.ok(result.includes('version: 1.0.0'));
            assert.ok(result.includes('category: testing'));
            assert.ok(result.includes('---\n'));
            assert.ok(result.endsWith(body));
        });

        test('should return only body when frontmatter is empty', () => {
            const frontmatter = {};
            const body = '# Document Content\nThis is the body.';

            const result = service.stringify(frontmatter, body);

            assert.strictEqual(result, body);
        });

        test('should handle complex frontmatter objects', () => {
            const frontmatter = {
                version: '1.0.0',
                tags: ['test', 'example'],
                metadata: {
                    author: 'Test Author',
                    date: '2024-01-01'
                }
            };
            const body = '\n# Content';

            const result = service.stringify(frontmatter, body);

            assert.ok(result.includes('version: 1.0.0'));
            assert.ok(result.includes('tags:'));
            assert.ok(result.includes('metadata:'));
        });
    });

    suite('updateInclusionMode', () => {
        test('should add inclusion mode to document without frontmatter', () => {
            const content = '# Document Content\nThis is the body.';

            const result = service.updateInclusionMode(content, 'always');

            const parsed = service.parse(result);
            assert.strictEqual(parsed.frontmatter.inclusion, 'always');
            assert.ok(parsed.body.includes('# Document Content'));
        });

        test('should update inclusion mode in existing frontmatter', () => {
            const content = `---
version: "1.0.0"
category: "testing"
inclusion: "manual"
---

# Document Content`;

            const result = service.updateInclusionMode(content, 'always');

            const parsed = service.parse(result);
            assert.strictEqual(parsed.frontmatter.inclusion, 'always');
            assert.strictEqual(parsed.frontmatter.version, '1.0.0');
            assert.strictEqual(parsed.frontmatter.category, 'testing');
        });

        test('should preserve other frontmatter properties when updating inclusion', () => {
            const content = `---
version: "1.0.0"
category: "testing"
description: "Test document"
author: "Test Author"
---

# Document Content`;

            const result = service.updateInclusionMode(content, 'manual');

            const parsed = service.parse(result);
            assert.strictEqual(parsed.frontmatter.inclusion, 'manual');
            assert.strictEqual(parsed.frontmatter.version, '1.0.0');
            assert.strictEqual(parsed.frontmatter.category, 'testing');
            assert.strictEqual(parsed.frontmatter.description, 'Test document');
            assert.strictEqual(parsed.frontmatter.author, 'Test Author');
        });

        test('should add fileMatchPattern when mode is fileMatch', () => {
            const content = '# Document Content';

            const result = service.updateInclusionMode(content, 'fileMatch', '*.ts');

            const parsed = service.parse(result);
            assert.strictEqual(parsed.frontmatter.inclusion, 'fileMatch');
            assert.strictEqual(parsed.frontmatter.fileMatchPattern, '*.ts');
        });

        test('should remove fileMatchPattern when changing from fileMatch to always', () => {
            const content = `---
inclusion: "fileMatch"
fileMatchPattern: "*.ts"
---

# Document Content`;

            const result = service.updateInclusionMode(content, 'always');

            const parsed = service.parse(result);
            assert.strictEqual(parsed.frontmatter.inclusion, 'always');
            assert.strictEqual(parsed.frontmatter.fileMatchPattern, undefined);
        });

        test('should keep existing fileMatchPattern if mode is fileMatch and no pattern provided', () => {
            const content = `---
inclusion: "fileMatch"
fileMatchPattern: "*.ts"
---

# Document Content`;

            const result = service.updateInclusionMode(content, 'fileMatch');

            const parsed = service.parse(result);
            assert.strictEqual(parsed.frontmatter.inclusion, 'fileMatch');
            assert.strictEqual(parsed.frontmatter.fileMatchPattern, '*.ts');
        });
    });

    suite('getInclusionMode', () => {
        test('should return inclusion mode from frontmatter', () => {
            const content = `---
version: "1.0.0"
inclusion: "always"
---

# Document Content`;

            const mode = service.getInclusionMode(content);

            assert.strictEqual(mode, 'always');
        });

        test('should return undefined when no inclusion mode is set', () => {
            const content = `---
version: "1.0.0"
category: "testing"
---

# Document Content`;

            const mode = service.getInclusionMode(content);

            assert.strictEqual(mode, undefined);
        });

        test('should return undefined for document without frontmatter', () => {
            const content = '# Document Content\nThis is the body.';

            const mode = service.getInclusionMode(content);

            assert.strictEqual(mode, undefined);
        });
    });

    suite('Round-trip parsing', () => {
        test('should maintain content integrity through parse and stringify', () => {
            const originalContent = `---
version: "1.0.0"
category: "testing"
description: "Test document"
---

# Document Content
This is the body with multiple lines.
And more content here.`;

            const parsed = service.parse(originalContent);
            const reconstructed = service.stringify(parsed.frontmatter, parsed.body);
            const reparsed = service.parse(reconstructed);

            assert.deepStrictEqual(reparsed.frontmatter, parsed.frontmatter);
            assert.strictEqual(reparsed.body, parsed.body);
        });
    });
});
