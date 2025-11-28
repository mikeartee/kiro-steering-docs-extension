import { RecommendationMetadata, ProjectType } from './types';

/**
 * Metadata rules for language-specific documents
 */
export const LANGUAGE_RULES: Record<string, RecommendationMetadata> = {
  'javascript': {
    requiredDependencies: [],
    applicableTo: [
      ProjectType.WEB_APP,
      ProjectType.LIBRARY,
      ProjectType.CLI_TOOL,
      ProjectType.API_SERVER
    ],
    filePatterns: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    enhancedTags: ['javascript', 'formatting', 'code-generation']
  },
  'typescript': {
    requiredDependencies: ['typescript'],
    applicableTo: [
      ProjectType.WEB_APP,
      ProjectType.LIBRARY,
      ProjectType.CLI_TOOL,
      ProjectType.API_SERVER,
      ProjectType.VSCODE_EXTENSION
    ],
    filePatterns: ['**/*.ts', '**/*.tsx'],
    enhancedTags: ['typescript', 'formatting', 'code-generation']
  },
  'python': {
    requiredDependencies: [],
    applicableTo: [
      ProjectType.WEB_APP,
      ProjectType.LIBRARY,
      ProjectType.CLI_TOOL,
      ProjectType.API_SERVER
    ],
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
    applicableTo: [
      ProjectType.WEB_APP,
      ProjectType.LIBRARY,
      ProjectType.CLI_TOOL,
      ProjectType.API_SERVER,
      ProjectType.VSCODE_EXTENSION
    ],
    filePatterns: ['**/*.json'],
    enhancedTags: ['json', 'data-format', 'formatting']
  }
};

/**
 * Metadata rules for framework-specific documents
 */
export const FRAMEWORK_RULES: Record<string, RecommendationMetadata> = {
  'react': {
    requiredDependencies: ['react'],
    applicableTo: [ProjectType.WEB_APP, ProjectType.LIBRARY],
    filePatterns: [
      'components/**/*.jsx',
      'components/**/*.tsx',
      'src/components/**/*'
    ],
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
 * Metadata rules for practice documents
 */
export const PRACTICE_RULES: Record<string, RecommendationMetadata> = {
  'testing': {
    requiredDependencies: [],
    applicableTo: [
      ProjectType.WEB_APP,
      ProjectType.LIBRARY,
      ProjectType.CLI_TOOL,
      ProjectType.API_SERVER,
      ProjectType.VSCODE_EXTENSION
    ],
    filePatterns: [
      '**/*.test.ts',
      '**/*.test.js',
      '**/*.spec.ts',
      '**/*.spec.js',
      'tests/**/*'
    ],
    enhancedTags: ['testing', 'best-practices', 'quality']
  },
  'security': {
    requiredDependencies: [],
    applicableTo: [
      ProjectType.WEB_APP,
      ProjectType.LIBRARY,
      ProjectType.CLI_TOOL,
      ProjectType.API_SERVER
    ],
    filePatterns: [],
    enhancedTags: ['security', 'best-practices']
  },
  'codeQuality': {
    requiredDependencies: [],
    applicableTo: [
      ProjectType.WEB_APP,
      ProjectType.LIBRARY,
      ProjectType.CLI_TOOL,
      ProjectType.API_SERVER,
      ProjectType.VSCODE_EXTENSION
    ],
    filePatterns: [],
    enhancedTags: ['code-quality', 'best-practices']
  },
  'gitWorkflow': {
    requiredDependencies: [],
    applicableTo: [
      ProjectType.WEB_APP,
      ProjectType.LIBRARY,
      ProjectType.CLI_TOOL,
      ProjectType.API_SERVER,
      ProjectType.VSCODE_EXTENSION
    ],
    filePatterns: [],
    enhancedTags: ['git', 'workflow', 'best-practices']
  }
};
