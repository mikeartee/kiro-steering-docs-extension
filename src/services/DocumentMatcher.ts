import {
    DocumentMetadata,
    WorkspaceContext,
    ScoredDocument,
    MatchReason,
    FrameworkInfo,
    DependencyInfo,
    FilePattern,
    SCORING_WEIGHTS
} from '../models/types';

/**
 * Service for scoring and ranking documents based on workspace context
 */
export class DocumentMatcher {
    /**
     * Scores a single document based on workspace context
     * @param document Document to score
     * @param context Workspace context
     * @returns Scored document with reasons
     */
    scoreDocument(
        document: DocumentMetadata,
        context: WorkspaceContext
    ): ScoredDocument {
        const reasons: MatchReason[] = [];
        let totalScore = 0;

        // Calculate framework score
        const frameworkResult = this.calculateFrameworkScore(document, context.frameworks);
        if (frameworkResult.score > 0) {
            totalScore += frameworkResult.score;
            reasons.push(...frameworkResult.reasons);
        }

        // Calculate dependency score
        const dependencyResult = this.calculateDependencyScore(document, context.dependencies);
        if (dependencyResult.score > 0) {
            totalScore += dependencyResult.score;
            reasons.push(...dependencyResult.reasons);
        }

        // Calculate file pattern score
        const filePatternResult = this.calculateFilePatternScore(document, context.filePatterns);
        if (filePatternResult.score > 0) {
            totalScore += filePatternResult.score;
            reasons.push(...filePatternResult.reasons);
        }

        // Calculate language score
        const languageResult = this.calculateLanguageScore(document, context.languages);
        if (languageResult.score > 0) {
            totalScore += languageResult.score;
            reasons.push(...languageResult.reasons);
        }

        // Check if document is installed
        const isInstalled = context.installedDocs.includes(document.name);

        return {
            document,
            score: totalScore,
            reasons,
            isInstalled
        };
    }

    /**
     * Ranks multiple documents based on workspace context
     * @param documents Documents to rank
     * @param context Workspace context
     * @returns Sorted array of scored documents
     */
    rankDocuments(
        documents: DocumentMetadata[],
        context: WorkspaceContext
    ): ScoredDocument[] {
        console.log('[DocumentMatcher] Ranking documents:', {
            documentCount: documents.length,
            sampleDoc: documents[0] ? {
                name: documents[0].name,
                tags: documents[0].tags,
                tagCount: documents[0].tags?.length || 0,
                requiredDependencies: documents[0].requiredDependencies,
                depCount: documents[0].requiredDependencies?.length || 0,
                filePatterns: documents[0].filePatterns,
                patternCount: documents[0].filePatterns?.length || 0
            } : 'none'
        });

        // Log first 3 documents in detail
        console.log('[DocumentMatcher] First 3 documents:', documents.slice(0, 3).map(d => ({
            name: d.name,
            tags: d.tags,
            deps: d.requiredDependencies,
            patterns: d.filePatterns
        })));

        // Score all documents
        const scored = documents.map(doc => this.scoreDocument(doc, context));

        // Filter out documents with no matches (score = 0 and no reasons)
        const withMatches = scored.filter(doc => doc.reasons.length > 0);

        console.log('[DocumentMatcher] Scoring results:', {
            totalDocs: documents.length,
            matchedDocs: withMatches.length,
            topScores: withMatches.slice(0, 3).map(d => ({ name: d.document.name, score: d.score, reasons: d.reasons.length }))
        });

        // Sort by score descending, then alphabetically by title
        withMatches.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            return a.document.name.localeCompare(b.document.name);
        });

        return withMatches;
    }

    /**
     * Calculates score based on framework matches
     * @param document Document to score
     * @param frameworks Detected frameworks
     * @returns Score and match reasons
     */
    private calculateFrameworkScore(
        document: DocumentMetadata,
        frameworks: FrameworkInfo[]
    ): { score: number; reasons: MatchReason[] } {
        const reasons: MatchReason[] = [];
        let score = 0;

        if (!document.tags || frameworks.length === 0) {
            return { score, reasons };
        }

        const matchedFrameworks: string[] = [];

        for (const framework of frameworks) {
            // Check if any document tag matches the framework name
            const normalizedFrameworkName = framework.name.toLowerCase();
            const hasMatch = document.tags.some(tag => 
                tag.toLowerCase() === normalizedFrameworkName ||
                tag.toLowerCase().includes(normalizedFrameworkName)
            );

            if (hasMatch) {
                matchedFrameworks.push(framework.name);
                score += SCORING_WEIGHTS.FRAMEWORK_MATCH;
            }
        }

        if (matchedFrameworks.length > 0) {
            reasons.push({
                type: 'framework',
                description: `Matches your ${matchedFrameworks.join(', ')} framework${matchedFrameworks.length > 1 ? 's' : ''}`,
                weight: SCORING_WEIGHTS.FRAMEWORK_MATCH,
                details: matchedFrameworks
            });
        }

        return { score, reasons };
    }

    /**
     * Calculates score based on dependency matches
     * @param document Document to score
     * @param dependencies Workspace dependencies
     * @returns Score and match reasons
     */
    private calculateDependencyScore(
        document: DocumentMetadata,
        dependencies: DependencyInfo[]
    ): { score: number; reasons: MatchReason[] } {
        const reasons: MatchReason[] = [];
        let score = 0;

        if (!document.requiredDependencies || dependencies.length === 0) {
            return { score, reasons };
        }

        const matchedDependencies: string[] = [];
        const depNames = dependencies.map(d => d.name.toLowerCase());

        for (const requiredDep of document.requiredDependencies) {
            const normalizedRequired = requiredDep.toLowerCase();
            
            // Check for exact match or partial match
            const hasMatch = depNames.some(depName => 
                depName === normalizedRequired ||
                depName.includes(normalizedRequired) ||
                normalizedRequired.includes(depName)
            );

            if (hasMatch) {
                matchedDependencies.push(requiredDep);
                score += SCORING_WEIGHTS.DEPENDENCY_MATCH;
            }
        }

        if (matchedDependencies.length > 0) {
            reasons.push({
                type: 'dependency',
                description: `Uses ${matchedDependencies.join(', ')} from your dependencies`,
                weight: SCORING_WEIGHTS.DEPENDENCY_MATCH,
                details: matchedDependencies
            });
        }

        return { score, reasons };
    }

    /**
     * Calculates score based on file pattern matches
     * @param document Document to score
     * @param patterns Detected file patterns
     * @returns Score and match reasons
     */
    private calculateFilePatternScore(
        document: DocumentMetadata,
        patterns: FilePattern[]
    ): { score: number; reasons: MatchReason[] } {
        const reasons: MatchReason[] = [];
        let score = 0;

        if (!document.filePatterns || patterns.length === 0) {
            return { score, reasons };
        }

        const matchedPatterns: string[] = [];

        for (const docPattern of document.filePatterns) {
            // Check if any workspace pattern matches the document pattern
            const normalizedDocPattern = docPattern.toLowerCase();
            
            const hasMatch = patterns.some(workspacePattern => {
                const normalizedWorkspacePattern = workspacePattern.pattern.toLowerCase();
                return normalizedWorkspacePattern.includes(normalizedDocPattern) ||
                       normalizedDocPattern.includes(normalizedWorkspacePattern);
            });

            if (hasMatch) {
                matchedPatterns.push(docPattern);
                score += SCORING_WEIGHTS.FILE_PATTERN_MATCH;
            }
        }

        if (matchedPatterns.length > 0) {
            reasons.push({
                type: 'file-pattern',
                description: `Matches your project structure (${matchedPatterns.join(', ')})`,
                weight: SCORING_WEIGHTS.FILE_PATTERN_MATCH,
                details: matchedPatterns
            });
        }

        return { score, reasons };
    }

    /**
     * Calculates score based on language matches
     * @param document Document to score
     * @param languages Detected languages
     * @returns Score and match reasons
     */
    private calculateLanguageScore(
        document: DocumentMetadata,
        languages: string[]
    ): { score: number; reasons: MatchReason[] } {
        const reasons: MatchReason[] = [];
        let score = 0;

        if (!document.tags || languages.length === 0) {
            return { score, reasons };
        }

        const matchedLanguages: string[] = [];
        const normalizedLanguages = languages.map(l => l.toLowerCase());

        for (const tag of document.tags) {
            const normalizedTag = tag.toLowerCase();
            
            if (normalizedLanguages.includes(normalizedTag)) {
                matchedLanguages.push(tag);
                score += SCORING_WEIGHTS.LANGUAGE_MATCH;
            }
        }

        if (matchedLanguages.length > 0) {
            reasons.push({
                type: 'language',
                description: `Relevant for ${matchedLanguages.join(', ')} development`,
                weight: SCORING_WEIGHTS.LANGUAGE_MATCH,
                details: matchedLanguages
            });
        }

        return { score, reasons };
    }
}

