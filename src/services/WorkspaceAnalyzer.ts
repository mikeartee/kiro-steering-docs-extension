import * as vscode from 'vscode';
import * as path from 'path';
import {
    WorkspaceContext,
    FrameworkInfo,
    DependencyInfo,
    FilePattern,
    ProjectType,
    DependencyCategory,
    RecommendationError,
    RecommendationErrorCode
} from '../models/types';

/**
 * Service for analyzing workspace context to support document recommendations
 */
export class WorkspaceAnalyzer {
    /**
     * Analyzes the workspace and returns comprehensive context information
     * @param workspaceRoot Path to the workspace root directory
     * @returns Complete workspace context
     * @throws RecommendationError if no workspace is open or analysis fails
     */
    async analyze(workspaceRoot: string | undefined): Promise<WorkspaceContext> {
        // Handle no workspace scenario
        if (!workspaceRoot) {
            throw new RecommendationError(
                RecommendationErrorCode.NO_WORKSPACE,
                'No workspace is currently open. Please open a workspace to get recommendations.'
            );
        }

        try {
            // Orchestrate all analysis steps
            const packageJsonPath = path.join(workspaceRoot, 'package.json');
            const { dependencies, frameworks } = await this.analyzePackageJson(packageJsonPath);
            
            const { filePatterns, hasTests } = await this.analyzeFileStructure(workspaceRoot);
            
            const { languages, projectType } = await this.analyzeConfigurations(
                workspaceRoot,
                dependencies,
                filePatterns
            );

            // Get installed documents (placeholder for now - will be integrated with DocumentService)
            const installedDocs: string[] = [];

            const context = {
                languages,
                frameworks,
                dependencies,
                filePatterns,
                hasTests,
                projectType,
                installedDocs
            };

            console.log('[WorkspaceAnalyzer] Workspace context:', {
                languages,
                frameworks: frameworks.map(f => f.name),
                dependencyCount: dependencies.length,
                projectType,
                hasTests
            });

            return context;
        } catch (error) {
            if (error instanceof RecommendationError) {
                throw error;
            }
            throw new RecommendationError(
                RecommendationErrorCode.ANALYSIS_FAILED,
                'Failed to analyze workspace context',
                error
            );
        }
    }

    /**
     * Analyzes package.json to extract dependencies and detect frameworks
     * @param packagePath Path to package.json file
     * @returns Dependencies and detected frameworks
     */
    private async analyzePackageJson(packagePath: string): Promise<{
        dependencies: DependencyInfo[];
        frameworks: FrameworkInfo[];
    }> {
        const dependencies: DependencyInfo[] = [];

        try {
            const packageUri = vscode.Uri.file(packagePath);
            const packageContent = await vscode.workspace.fs.readFile(packageUri);
            const packageJson = JSON.parse(packageContent.toString());

            // Parse dependencies
            if (packageJson.dependencies) {
                for (const [name, version] of Object.entries(packageJson.dependencies)) {
                    dependencies.push({
                        name,
                        version: version as string,
                        isDev: false,
                        category: this.categorizeDependency(name)
                    });
                }
            }

            // Parse devDependencies
            if (packageJson.devDependencies) {
                for (const [name, version] of Object.entries(packageJson.devDependencies)) {
                    dependencies.push({
                        name,
                        version: version as string,
                        isDev: true,
                        category: this.categorizeDependency(name)
                    });
                }
            }

            // Detect frameworks from dependencies
            const frameworks = this.detectFrameworks(dependencies);

            return { dependencies, frameworks };
        } catch (error) {
            // Handle malformed package.json gracefully - log warning and continue
            console.warn('Failed to parse package.json:', error);
            return { dependencies: [], frameworks: [] };
        }
    }

    /**
     * Categorizes a dependency by its type
     * @param name Dependency name
     * @returns Dependency category
     */
    private categorizeDependency(name: string): DependencyCategory {
        // Framework detection
        const frameworks = ['react', 'vue', 'angular', 'svelte', 'next', 'nuxt', 'express', 'fastify', 'koa', 'hapi', 'nestjs'];
        if (frameworks.some(fw => name.includes(fw))) {
            return DependencyCategory.FRAMEWORK;
        }

        // Testing framework detection
        const testingTools = ['jest', 'mocha', 'vitest', 'jasmine', 'karma', 'cypress', 'playwright', 'testing-library', '@testing-library'];
        if (testingTools.some(tool => name.includes(tool))) {
            return DependencyCategory.TESTING;
        }

        // Build tool detection
        const buildTools = ['webpack', 'vite', 'rollup', 'parcel', 'esbuild', 'babel', 'typescript', 'tsc', 'swc'];
        if (buildTools.some(tool => name.includes(tool))) {
            return DependencyCategory.BUILD;
        }

        // Default to utility
        return DependencyCategory.UTILITY;
    }

    /**
     * Detects frameworks from the dependency list
     * @param dependencies List of dependencies
     * @returns Detected frameworks with confidence scores
     */
    private detectFrameworks(dependencies: DependencyInfo[]): FrameworkInfo[] {
        const frameworks: FrameworkInfo[] = [];
        const frameworkMap = new Map<string, { version: string; confidence: number }>();

        // Framework detection patterns
        const frameworkPatterns: { [key: string]: { patterns: string[]; confidence: number } } = {
            'react': { patterns: ['react'], confidence: 0.9 },
            'vue': { patterns: ['vue'], confidence: 0.9 },
            'angular': { patterns: ['@angular/core'], confidence: 0.9 },
            'svelte': { patterns: ['svelte'], confidence: 0.9 },
            'next.js': { patterns: ['next'], confidence: 0.95 },
            'nuxt': { patterns: ['nuxt'], confidence: 0.95 },
            'express': { patterns: ['express'], confidence: 0.85 },
            'fastify': { patterns: ['fastify'], confidence: 0.85 },
            'nestjs': { patterns: ['@nestjs/core'], confidence: 0.9 }
        };

        for (const dep of dependencies) {
            for (const [frameworkName, { patterns, confidence }] of Object.entries(frameworkPatterns)) {
                if (patterns.some(pattern => dep.name === pattern || dep.name.startsWith(pattern + '/'))) {
                    if (!frameworkMap.has(frameworkName) || frameworkMap.get(frameworkName)!.confidence < confidence) {
                        frameworkMap.set(frameworkName, {
                            version: dep.version,
                            confidence
                        });
                    }
                }
            }
        }

        // Convert map to array
        for (const [name, { version, confidence }] of frameworkMap.entries()) {
            frameworks.push({ name, version, confidence });
        }

        return frameworks;
    }

    /**
     * Analyzes file structure to detect patterns
     * @param workspaceRoot Path to workspace root
     * @returns Detected file patterns and test presence
     */
    private async analyzeFileStructure(workspaceRoot: string): Promise<{
        filePatterns: FilePattern[];
        hasTests: boolean;
    }> {
        const filePatterns: FilePattern[] = [];
        let hasTests = false;

        try {
            // Detect component directories
            const componentPatterns = ['components', 'src/components', 'app/components'];
            for (const pattern of componentPatterns) {
                const count = await this.countMatchingFiles(workspaceRoot, pattern, 5);
                if (count > 0) {
                    filePatterns.push({
                        pattern: `${pattern}/**/*`,
                        count,
                        significance: Math.min(count / 10, 1.0)
                    });
                }
            }

            // Detect API route patterns
            const apiPatterns = ['routes', 'api', 'pages/api', 'src/routes', 'src/api'];
            for (const pattern of apiPatterns) {
                const count = await this.countMatchingFiles(workspaceRoot, pattern, 5);
                if (count > 0) {
                    filePatterns.push({
                        pattern: `${pattern}/**/*`,
                        count,
                        significance: Math.min(count / 10, 1.0)
                    });
                }
            }

            // Detect test files
            const testExtensions = ['.test.ts', '.test.js', '.spec.ts', '.spec.js', '.test.tsx', '.spec.jsx'];
            const testCount = await this.countTestFiles(workspaceRoot, testExtensions, 5);
            if (testCount > 0) {
                hasTests = true;
                filePatterns.push({
                    pattern: '**/*.{test,spec}.{ts,js,tsx,jsx}',
                    count: testCount,
                    significance: Math.min(testCount / 20, 1.0)
                });
            }

            return { filePatterns, hasTests };
        } catch (error) {
            console.warn('Failed to analyze file structure:', error);
            return { filePatterns: [], hasTests: false };
        }
    }

    /**
     * Counts files matching a pattern, excluding node_modules
     * @param workspaceRoot Workspace root path
     * @param pattern Directory pattern to search
     * @param maxDepth Maximum traversal depth
     * @returns Count of matching files
     */
    private async countMatchingFiles(
        workspaceRoot: string,
        pattern: string,
        maxDepth: number
    ): Promise<number> {
        try {
            const targetPath = path.join(workspaceRoot, pattern);
            const targetUri = vscode.Uri.file(targetPath);
            
            // Check if directory exists
            try {
                const stat = await vscode.workspace.fs.stat(targetUri);
                if (stat.type !== vscode.FileType.Directory) {
                    return 0;
                }
            } catch {
                return 0;
            }

            // Count files recursively
            return await this.countFilesRecursive(targetUri, 0, maxDepth);
        } catch {
            return 0;
        }
    }

    /**
     * Recursively counts files in a directory
     * @param dirUri Directory URI
     * @param currentDepth Current depth
     * @param maxDepth Maximum depth
     * @returns File count
     */
    private async countFilesRecursive(
        dirUri: vscode.Uri,
        currentDepth: number,
        maxDepth: number
    ): Promise<number> {
        if (currentDepth >= maxDepth) {
            return 0;
        }

        try {
            const entries = await vscode.workspace.fs.readDirectory(dirUri);
            let count = 0;

            for (const [name, type] of entries) {
                // Exclude node_modules
                if (name === 'node_modules') {
                    continue;
                }

                if (type === vscode.FileType.File) {
                    count++;
                } else if (type === vscode.FileType.Directory) {
                    const subDirUri = vscode.Uri.joinPath(dirUri, name);
                    count += await this.countFilesRecursive(subDirUri, currentDepth + 1, maxDepth);
                }
            }

            return count;
        } catch {
            return 0;
        }
    }

    /**
     * Counts test files in the workspace
     * @param workspaceRoot Workspace root path
     * @param extensions Test file extensions
     * @param maxDepth Maximum traversal depth
     * @returns Count of test files
     */
    private async countTestFiles(
        workspaceRoot: string,
        extensions: string[],
        maxDepth: number
    ): Promise<number> {
        try {
            const rootUri = vscode.Uri.file(workspaceRoot);
            return await this.countTestFilesRecursive(rootUri, extensions, 0, maxDepth);
        } catch {
            return 0;
        }
    }

    /**
     * Recursively counts test files
     * @param dirUri Directory URI
     * @param extensions Test file extensions
     * @param currentDepth Current depth
     * @param maxDepth Maximum depth
     * @returns Test file count
     */
    private async countTestFilesRecursive(
        dirUri: vscode.Uri,
        extensions: string[],
        currentDepth: number,
        maxDepth: number
    ): Promise<number> {
        if (currentDepth >= maxDepth) {
            return 0;
        }

        try {
            const entries = await vscode.workspace.fs.readDirectory(dirUri);
            let count = 0;

            for (const [name, type] of entries) {
                // Exclude node_modules
                if (name === 'node_modules') {
                    continue;
                }

                if (type === vscode.FileType.File) {
                    // Check if file has test extension
                    if (extensions.some(ext => name.endsWith(ext))) {
                        count++;
                    }
                } else if (type === vscode.FileType.Directory) {
                    const subDirUri = vscode.Uri.joinPath(dirUri, name);
                    count += await this.countTestFilesRecursive(subDirUri, extensions, currentDepth + 1, maxDepth);
                }
            }

            return count;
        } catch {
            return 0;
        }
    }

    /**
     * Analyzes configurations to detect languages and project type
     * @param workspaceRoot Path to workspace root
     * @param dependencies Detected dependencies
     * @param filePatterns Detected file patterns
     * @returns Detected languages and project type
     */
    private async analyzeConfigurations(
        workspaceRoot: string,
        dependencies: DependencyInfo[],
        filePatterns: FilePattern[]
    ): Promise<{
        languages: string[];
        projectType: ProjectType;
    }> {
        const languages: string[] = [];

        // Detect TypeScript from tsconfig.json
        const tsconfigPath = path.join(workspaceRoot, 'tsconfig.json');
        try {
            const tsconfigUri = vscode.Uri.file(tsconfigPath);
            await vscode.workspace.fs.stat(tsconfigUri);
            languages.push('typescript');
        } catch {
            // tsconfig.json doesn't exist
        }

        // Detect TypeScript from dependencies
        const hasTypeScriptDep = dependencies.some(dep => 
            dep.name === 'typescript' || dep.name === '@types/node'
        );
        if (hasTypeScriptDep && !languages.includes('typescript')) {
            languages.push('typescript');
        }

        // Always include JavaScript as it's the base language
        languages.push('javascript');

        // Categorize project type
        const projectType = this.categorizeProjectType(dependencies, filePatterns);

        return { languages, projectType };
    }

    /**
     * Categorizes the project type based on dependencies and file patterns
     * @param dependencies Detected dependencies
     * @param filePatterns Detected file patterns
     * @returns Project type classification
     */
    private categorizeProjectType(
        dependencies: DependencyInfo[],
        filePatterns: FilePattern[]
    ): ProjectType {
        const depNames = dependencies.map(d => d.name);

        // Check for VS Code extension
        if (depNames.some(name => name === 'vscode' || name === '@types/vscode')) {
            return ProjectType.VSCODE_EXTENSION;
        }

        // Check for CLI tool
        const cliIndicators = ['commander', 'yargs', 'inquirer', 'chalk', 'ora'];
        if (cliIndicators.some(indicator => depNames.includes(indicator))) {
            return ProjectType.CLI_TOOL;
        }

        // Check for API server
        const apiFrameworks = ['express', 'fastify', 'koa', 'hapi', '@nestjs/core'];
        if (apiFrameworks.some(fw => depNames.includes(fw))) {
            return ProjectType.API_SERVER;
        }

        // Check for web app
        const webFrameworks = ['react', 'vue', 'angular', 'svelte', 'next', 'nuxt'];
        const hasWebFramework = webFrameworks.some(fw => depNames.some(name => name.includes(fw)));
        const hasComponents = filePatterns.some(p => p.pattern.includes('components'));
        
        if (hasWebFramework || hasComponents) {
            return ProjectType.WEB_APP;
        }

        // Check for library (has dependencies but no clear app structure)
        const hasApiRoutes = filePatterns.some(p => 
            p.pattern.includes('routes') || p.pattern.includes('api')
        );
        
        if (!hasApiRoutes && !hasComponents && dependencies.length > 0) {
            return ProjectType.LIBRARY;
        }

        return ProjectType.UNKNOWN;
    }
}
