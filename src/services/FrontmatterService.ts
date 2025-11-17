import * as yaml from 'js-yaml';

/**
 * Result of parsing a markdown document with frontmatter
 */
export interface ParseResult {
    frontmatter: Record<string, any>;
    body: string;
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
        let frontmatter: Record<string, any> = {};
        try {
            const parsed = yaml.load(frontmatterContent);
            if (parsed && typeof parsed === 'object') {
                frontmatter = parsed as Record<string, any>;
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
    stringify(frontmatter: Record<string, any>, body: string): string {
        // If frontmatter is empty, return just the body
        if (Object.keys(frontmatter).length === 0) {
            return body;
        }

        // Serialize frontmatter to YAML
        const yamlContent = yaml.dump(frontmatter, {
            lineWidth: -1, // Don't wrap lines
            noRefs: true   // Don't use references
        });

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
        frontmatter.inclusion = mode;

        // Handle fileMatchPattern based on mode
        if (mode === 'fileMatch') {
            if (pattern) {
                frontmatter.fileMatchPattern = pattern;
            }
            // Keep existing pattern if no new pattern provided
        } else {
            // Remove fileMatchPattern if mode is not fileMatch
            delete frontmatter.fileMatchPattern;
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
        return frontmatter.inclusion;
    }
}
