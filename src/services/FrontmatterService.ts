/**
 * Result of parsing a markdown document with frontmatter
 */
export interface ParseResult {
    frontmatter: Record<string, unknown>;
    body: string;
}

/**
 * Minimal YAML parser for simple flat key-value frontmatter.
 * Handles strings, booleans, numbers, and string arrays.
 * Does not require js-yaml — avoids bundling issues in VS Code extensions.
 */
function parseSimpleYaml(content: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const lines = content.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            continue;
        }

        const colonIndex = trimmed.indexOf(':');
        if (colonIndex === -1) {
            continue;
        }

        const key = trimmed.slice(0, colonIndex).trim();
        const rawValue = trimmed.slice(colonIndex + 1).trim();

        if (!key) {
            continue;
        }

        // Array: ["a", "b"] or [a, b]
        if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
            const inner = rawValue.slice(1, -1);
            result[key] = inner
                .split(',')
                .map(v => v.trim().replace(/^["']|["']$/g, ''))
                .filter(v => v.length > 0);
            continue;
        }

        // Boolean
        if (rawValue === 'true') { result[key] = true; continue; }
        if (rawValue === 'false') { result[key] = false; continue; }

        // Number
        if (rawValue !== '' && !isNaN(Number(rawValue))) {
            result[key] = Number(rawValue);
            continue;
        }

        // Quoted string
        if ((rawValue.startsWith('"') && rawValue.endsWith('"')) ||
            (rawValue.startsWith("'") && rawValue.endsWith("'"))) {
            result[key] = rawValue.slice(1, -1);
            continue;
        }

        // Plain string (including empty)
        result[key] = rawValue;
    }

    return result;
}

/**
 * Serialize a flat key-value object to simple YAML.
 */
function dumpSimpleYaml(obj: Record<string, unknown>): string {
    const lines: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
        if (Array.isArray(value)) {
            const items = value.map(v => `"${String(v)}"`).join(', ');
            lines.push(`${key}: [${items}]`);
        } else if (typeof value === 'boolean' || typeof value === 'number') {
            lines.push(`${key}: ${value}`);
        } else {
            const str = String(value ?? '');
            // Quote if contains special characters
            const needsQuotes = /[:#\[\]{},&*?|<>=!%@`]/.test(str) || str.includes('\n');
            lines.push(needsQuotes ? `${key}: "${str.replace(/"/g, '\\"')}"` : `${key}: ${str}`);
        }
    }

    return lines.join('\n') + (lines.length > 0 ? '\n' : '');
}

/**
 * Service for parsing and manipulating YAML frontmatter in markdown documents
 */
export class FrontmatterService {
    private readonly FRONTMATTER_DELIMITER = '---';

    /**
     * Parse a markdown document to extract frontmatter and body
     * @param content The full markdown document content
     * @returns Object containing parsed frontmatter and body
     */
    parse(content: string): ParseResult {
        const lines = content.split('\n');
        
        // Check if document starts with frontmatter delimiter
        if (lines.length === 0 || lines[0].trim() !== this.FRONTMATTER_DELIMITER) {
            return {
                frontmatter: {},
                body: content
            };
        }

        // Find the closing delimiter
        let closingDelimiterIndex = -1;
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === this.FRONTMATTER_DELIMITER) {
                closingDelimiterIndex = i;
                break;
            }
        }

        // If no closing delimiter found, treat as no frontmatter
        if (closingDelimiterIndex === -1) {
            return {
                frontmatter: {},
                body: content
            };
        }

        // Extract frontmatter content between delimiters
        const frontmatterContent = lines.slice(1, closingDelimiterIndex).join('\n');
        const body = lines.slice(closingDelimiterIndex + 1).join('\n');

        // Parse YAML frontmatter
        let frontmatter: Record<string, unknown> = {};
        try {
            const parsed = parseSimpleYaml(frontmatterContent);
            if (parsed && typeof parsed === 'object') {
                frontmatter = parsed;
            }
        } catch (error) {
            // If YAML parsing fails, return empty frontmatter
            console.error('Failed to parse frontmatter:', error);
        }

        return {
            frontmatter,
            body
        };
    }

    /**
     * Combine frontmatter and body into a complete markdown document
     * @param frontmatter The frontmatter object to serialize
     * @param body The markdown body content
     * @returns Complete markdown document with frontmatter
     */
    stringify(frontmatter: Record<string, unknown>, body: string): string {
        // If frontmatter is empty, return just the body
        if (Object.keys(frontmatter).length === 0) {
            return body;
        }

        // Serialize frontmatter to YAML
        const yamlContent = dumpSimpleYaml(frontmatter);

        // Combine with delimiters and body
        return `${this.FRONTMATTER_DELIMITER}\n${yamlContent}${this.FRONTMATTER_DELIMITER}\n${body}`;
    }

    /**
     * Update or add inclusion mode to a document's frontmatter
     * @param content The full markdown document content
     * @param mode The inclusion mode to set ('always', 'manual', or 'fileMatch')
     * @param pattern Optional file match pattern (required if mode is 'fileMatch')
     * @returns Updated markdown document with modified frontmatter
     */
    updateInclusionMode(content: string, mode: 'always' | 'manual' | 'fileMatch', pattern?: string): string {
        const { frontmatter, body } = this.parse(content);

        // Update inclusion mode
        frontmatter['inclusion'] = mode;

        // Handle fileMatchPattern based on mode
        if (mode === 'fileMatch') {
            if (pattern) {
                frontmatter['fileMatchPattern'] = pattern;
            }
            // Keep existing pattern if no new pattern provided
        } else {
            // Remove fileMatchPattern if mode is not fileMatch
            delete frontmatter['fileMatchPattern'];
        }

        return this.stringify(frontmatter, body);
    }

    /**
     * Get the current inclusion mode from a document's frontmatter
     * @param content The full markdown document content
     * @returns The inclusion mode or undefined if not set
     */
    getInclusionMode(content: string): string | undefined {
        const { frontmatter } = this.parse(content);
        const mode = frontmatter['inclusion'];
        return typeof mode === 'string' ? mode : undefined;
    }
}
