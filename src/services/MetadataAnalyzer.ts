import { AnalysisContext, RecommendationMetadata, ProjectType } from '../models/types';

/**
 * Metadata mapping rules for language documents
 */
const LANGUAGE_RULES: Record<string, RecommendationMetadata> = {
  'javascript': {
    requiredDependencies: [],
    applicableTo: [ProjectType.WEB_APP, ProjectType.LIBRARY, ProjectType.CLI_TOOL, ProjectType.API_SERVER],
    filePatterns: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    enhancedTags: ['javascript', 'formatting', 'code-generation']
  },
  'typescript': {
    requiredDependencies: ['typescript'],
    applicableTo: [ProjectType.WEB_APP, ProjectType.LIBRARY, ProjectType.CLI_TOOL, ProjectType.API_SERVER, ProjectType.VSCODE_EXTENSION],
    filePatterns: ['**/*.ts', '**/*.tsx'],
    enhancedTags: ['typescript', 'formatting', 'code-generation']
  },
  'python': {
    requiredDependencies: [],
    applicableTo: [ProjectType.WEB_APP, ProjectType.LIBRARY, ProjectType.CLI_TOOL, ProjectType.API_SERVER],
    filePatterns: ['**/*.py'],
    enhancedTags: ['python', 'formatting', 'code-generation']
  },
  'bash': {
    requiredDependencies: [],
    applicableTo: [ProjectType.CLI_TOOL],
    filePatterns: ['**/*.sh', '**/*.bash'],
    enhancedTags: ['bash', 'shell', 'scripting']
  },
  'css': {
    requiredDependencies: [],
    applicableTo: [ProjectType.WEB_APP],
    filePatterns: ['**/*.css', '**/*.scss', '**/*.sass'],
    enhancedTags: ['css', 'styling', 'formatting']
  },
  'json': {
    requiredDependencies: [],
    applicableTo: [ProjectType.WEB_APP, ProjectType.LIBRARY, ProjectType.CLI_TOOL, ProjectType.API_SERVER, ProjectType.VSCODE_EXTENSION],
    filePatterns: ['**/*.json'],
    enhancedTags: ['json', 'data-format', 'formatting']
  }
};

/**
 * Metadata mapping rules for framework documents
 */
const FRAMEWORK_RULES: Record<string, RecommendationMetadata> = {
  'react': {
    requiredDependencies: ['react'],
    applicableTo: [ProjectType.WEB_APP, ProjectType.LIBRARY],
    filePatterns: ['components/**/*.jsx', 'components/**/*.tsx', 'src/components/**/*'],
    enhancedTags: ['react', 'components', 'best-practices']
  },
  'vue': {
    requiredDependencies: ['vue'],
    applicableTo: [ProjectType.WEB_APP],
    filePatterns: ['components/**/*.vue', 'src/components/**/*.vue'],
    enhancedTags: ['vue', 'components', 'best-practices']
  },
  'express': {
    requiredDependencies: ['express'],
    applicableTo: [ProjectType.API_SERVER],
    filePatterns: ['routes/**/*.js', 'routes/**/*.ts', 'api/**/*'],
    enhancedTags: ['express', 'nodejs', 'api', 'best-practices']
  },
  'fastapi': {
    requiredDependencies: [],
    applicableTo: [ProjectType.API_SERVER],
    filePatterns: ['routes/**/*.py', 'api/**/*.py'],
    enhancedTags: ['fastapi', 'python', 'api', 'best-practices']
  },
  'django': {
    requiredDependencies: [],
    applicableTo: [ProjectType.WEB_APP, ProjectType.API_SERVER],
    filePatterns: ['views/**/*.py', 'models/**/*.py', 'urls.py'],
    enhancedTags: ['django', 'python', 'web', 'best-practices']
  }
};

/**
 * Metadata mapping rules for practice documents
 */
const PRACTICE_RULES: Record<string, RecommendationMetadata> = {
  'testing': {
    requiredDependencies: [],
    applicableTo: [ProjectType.WEB_APP, ProjectType.LIBRARY, ProjectType.CLI_TOOL, ProjectType.API_SERVER, ProjectType.VSCODE_EXTENSION],
    filePatterns: ['**/*.test.ts', '**/*.test.js', '**/*.spec.ts', '**/*.spec.js', 'tests/**/*'],
    enhancedTags: ['testing', 'best-practices', 'quality']
  },
  'security': {
    requiredDependencies: [],
    applicableTo: [ProjectType.WEB_APP, ProjectType.LIBRARY, ProjectType.CLI_TOOL, ProjectType.API_SERVER],
    filePatterns: [],
    enhancedTags: ['security', 'best-practices']
  },
  'codeQuality': {
    requiredDependencies: [],
    applicableTo: [ProjectType.WEB_APP, ProjectType.LIBRARY, ProjectType.CLI_TOOL, ProjectType.API_SERVER, ProjectType.VSCODE_EXTENSION],
    filePatterns: [],
    enhancedTags: ['code-quality', 'best-practices']
  },
  'gitWorkflow': {
    requiredDependencies: [],
    applicableTo: [ProjectType.WEB_APP, ProjectType.LIBRARY, ProjectType.CLI_TOOL, ProjectType.API_SERVER, ProjectType.VSCODE_EXTENSION],
    filePatterns: [],
    enhancedTags: ['git', 'workflow', 'best-practices']
  }
};

/**
 * Service for analyzing documents to determine appropriate recommendation metadata
 */
export class MetadataAnalyzer {
  /**
   * Analyzes a document to determine appropriate recommendation metadata
   * @param context - Analysis context with document information
   * @returns Recommendation metadata for the document
   */
  analyze(context: AnalysisContext): RecommendationMetadata {
    let metadata: RecommendationMetadata = {};

    // Analyze based on category
    if (context.category === 'code-formatting' && context.subcategory === 'languages') {
      metadata = this.analyzeLanguageDocument(context);
    } else if (context.category === 'code-formatting' && context.subcategory === 'frameworks') {
      metadata = this.analyzeFrameworkDocument(context);
    } else if (context.category === 'practices') {
      metadata = this.analyzePracticeDocument(context);
    } else if (context.category === 'agents') {
      // Agents documents typically apply to all project types
      metadata = {
        applicableTo: [ProjectType.WEB_APP, ProjectType.LIBRARY, ProjectType.CLI_TOOL, ProjectType.API_SERVER, ProjectType.VSCODE_EXTENSION],
        enhancedTags: ['agents', 'automation']
      };
    }

    // Enhance tags with existing tags
    if (context.existingFrontmatter.tags && Array.isArray(context.existingFrontmatter.tags)) {
      metadata.enhancedTags = this.enhanceTags(context.existingFrontmatter.tags, context);
    }

    return metadata;
  }

  /**
   * Analyzes a language document to determine metadata
   * @param context - Analysis context
   * @returns Recommendation metadata
   */
  private analyzeLanguageDocument(context: AnalysisContext): RecommendationMetadata {
    const fileName = context.documentPath.toLowerCase();
    
    // Detect language from file path
    for (const [language, rules] of Object.entries(LANGUAGE_RULES)) {
      if (fileName.includes(language)) {
        return { ...rules };
      }
    }

    // Default for unrecognized language documents
    return {
      applicableTo: [ProjectType.WEB_APP, ProjectType.LIBRARY, ProjectType.CLI_TOOL, ProjectType.API_SERVER],
      enhancedTags: ['formatting', 'code-generation']
    };
  }

  /**
   * Analyzes a framework document to determine metadata
   * @param context - Analysis context
   * @returns Recommendation metadata
   */
  private analyzeFrameworkDocument(context: AnalysisContext): RecommendationMetadata {
    const fileName = context.documentPath.toLowerCase();
    const bodyLower = context.bodyContent.toLowerCase();
    
    // Detect framework from file path and content
    for (const [framework, rules] of Object.entries(FRAMEWORK_RULES)) {
      if (fileName.includes(framework) || bodyLower.includes(framework)) {
        return { ...rules };
      }
    }

    // Default for unrecognized framework documents
    return {
      applicableTo: [ProjectType.WEB_APP, ProjectType.LIBRARY],
      enhancedTags: ['framework', 'best-practices']
    };
  }

  /**
   * Analyzes a practice document to determine metadata
   * @param context - Analysis context
   * @returns Recommendation metadata
   */
  private analyzePracticeDocument(context: AnalysisContext): RecommendationMetadata {
    const fileName = context.documentPath.toLowerCase();
    const subcategory = context.subcategory?.toLowerCase() || '';
    
    // Detect practice category from file path and subcategory
    for (const [practice, rules] of Object.entries(PRACTICE_RULES)) {
      if (fileName.includes(practice) || subcategory.includes(practice)) {
        return { ...rules };
      }
    }

    // Default for unrecognized practice documents
    return {
      applicableTo: [ProjectType.WEB_APP, ProjectType.LIBRARY, ProjectType.CLI_TOOL, ProjectType.API_SERVER, ProjectType.VSCODE_EXTENSION],
      enhancedTags: ['best-practices']
    };
  }

  /**
   * Enhances tags by preserving existing tags and adding new relevant tags
   * @param existingTags - Existing tags from frontmatter
   * @param context - Analysis context
   * @returns Enhanced array of tags with duplicates removed
   */
  private enhanceTags(existingTags: string[], context: AnalysisContext): string[] {
    const tags = new Set<string>(existingTags);
    const fileName = context.documentPath.toLowerCase();

    // Add category-based tags
    if (context.category === 'code-formatting') {
      tags.add('formatting');
      tags.add('code-generation');
    } else if (context.category === 'practices') {
      tags.add('best-practices');
    } else if (context.category === 'agents') {
      tags.add('agents');
      tags.add('automation');
    }

    // Add language tags
    if (fileName.includes('javascript')) {
      tags.add('javascript');
    } else if (fileName.includes('typescript')) {
      tags.add('typescript');
    } else if (fileName.includes('python')) {
      tags.add('python');
    } else if (fileName.includes('css')) {
      tags.add('css');
      tags.add('styling');
    } else if (fileName.includes('json')) {
      tags.add('json');
      tags.add('data-format');
    } else if (fileName.includes('bash') || fileName.includes('shell')) {
      tags.add('bash');
      tags.add('shell');
      tags.add('scripting');
    }

    // Add framework tags
    if (fileName.includes('react')) {
      tags.add('react');
      tags.add('components');
    } else if (fileName.includes('vue')) {
      tags.add('vue');
      tags.add('components');
    } else if (fileName.includes('express')) {
      tags.add('express');
      tags.add('nodejs');
      tags.add('api');
    } else if (fileName.includes('django')) {
      tags.add('django');
      tags.add('web');
    } else if (fileName.includes('fastapi')) {
      tags.add('fastapi');
      tags.add('api');
    }

    // Add practice tags
    if (fileName.includes('testing') || fileName.includes('test')) {
      tags.add('testing');
      tags.add('quality');
    } else if (fileName.includes('security')) {
      tags.add('security');
    } else if (fileName.includes('code-quality') || fileName.includes('quality')) {
      tags.add('code-quality');
      tags.add('quality');
    } else if (fileName.includes('git') || fileName.includes('workflow')) {
      tags.add('git');
      tags.add('workflow');
    }

    return Array.from(tags);
  }
}

