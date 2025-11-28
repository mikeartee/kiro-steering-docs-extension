import * as vscode from 'vscode';
import { WorkspaceAnalyzer } from './WorkspaceAnalyzer';
import { WorkspaceContext } from '../models/types';

/**
 * Cache entry for workspace analysis results
 */
interface AnalysisCacheEntry {
    context: WorkspaceContext;
    timestamp: number;
}

/**
 * Service that wraps WorkspaceAnalyzer with caching and file watching
 * Caches analysis results for 5 minutes and invalidates on relevant file changes
 */
export class WorkspaceAnalysisCache {
    private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
    private cache: Map<string, AnalysisCacheEntry> = new Map();
    private fileWatchers: vscode.FileSystemWatcher[] = [];
    private watchedWorkspaces: Set<string> = new Set();

    constructor(private readonly analyzer: WorkspaceAnalyzer) {}

    /**
     * Analyzes workspace with caching support
     * @param workspaceRoot Path to workspace root
     * @returns Workspace context (cached or fresh)
     */
    async analyze(workspaceRoot: string | undefined): Promise<WorkspaceContext> {
        if (!workspaceRoot) {
            // No caching for undefined workspace - let analyzer handle error
            return this.analyzer.analyze(workspaceRoot);
        }

        const cacheKey = this.getCacheKey(workspaceRoot);
        const cached = this.getCachedResult(cacheKey);

        if (cached) {
            return cached;
        }

        // Perform fresh analysis
        const context = await this.analyzer.analyze(workspaceRoot);

        // Cache the result
        this.setCachedResult(cacheKey, context);

        // Set up file watchers if not already watching this workspace
        this.setupFileWatchers(workspaceRoot, cacheKey);

        return context;
    }

    /**
     * Generates cache key based on workspace root path
     * @param workspaceRoot Workspace root path
     * @returns Cache key
     */
    private getCacheKey(workspaceRoot: string): string {
        return `workspace:${workspaceRoot}`;
    }

    /**
     * Retrieves cached result if valid
     * @param cacheKey Cache key
     * @returns Cached context or undefined if expired/missing
     */
    private getCachedResult(cacheKey: string): WorkspaceContext | undefined {
        const entry = this.cache.get(cacheKey);

        if (!entry) {
            return undefined;
        }

        // Check if entry has expired
        const now = Date.now();
        const age = now - entry.timestamp;

        if (age > this.CACHE_TTL_MS) {
            // Entry has expired, remove it
            this.cache.delete(cacheKey);
            return undefined;
        }

        return entry.context;
    }

    /**
     * Stores analysis result in cache
     * @param cacheKey Cache key
     * @param context Workspace context to cache
     */
    private setCachedResult(cacheKey: string, context: WorkspaceContext): void {
        this.cache.set(cacheKey, {
            context,
            timestamp: Date.now()
        });
    }

    /**
     * Sets up file watchers for package.json and tsconfig.json
     * @param workspaceRoot Workspace root path
     * @param cacheKey Cache key to invalidate
     */
    private setupFileWatchers(workspaceRoot: string, cacheKey: string): void {
        // Check if we already have watchers for this workspace
        if (this.watchedWorkspaces.has(workspaceRoot)) {
            return; // Already watching this workspace
        }

        this.watchedWorkspaces.add(workspaceRoot);

        // Watch package.json
        const packageJsonPattern = new vscode.RelativePattern(
            workspaceRoot,
            'package.json'
        );
        const packageJsonWatcher = vscode.workspace.createFileSystemWatcher(packageJsonPattern);

        packageJsonWatcher.onDidChange(() => this.invalidateCache(cacheKey));
        packageJsonWatcher.onDidCreate(() => this.invalidateCache(cacheKey));
        packageJsonWatcher.onDidDelete(() => this.invalidateCache(cacheKey));

        this.fileWatchers.push(packageJsonWatcher);

        // Watch tsconfig.json
        const tsconfigPattern = new vscode.RelativePattern(
            workspaceRoot,
            'tsconfig.json'
        );
        const tsconfigWatcher = vscode.workspace.createFileSystemWatcher(tsconfigPattern);

        tsconfigWatcher.onDidChange(() => this.invalidateCache(cacheKey));
        tsconfigWatcher.onDidCreate(() => this.invalidateCache(cacheKey));
        tsconfigWatcher.onDidDelete(() => this.invalidateCache(cacheKey));

        this.fileWatchers.push(tsconfigWatcher);
    }

    /**
     * Invalidates cache for a specific key
     * @param cacheKey Cache key to invalidate
     */
    private invalidateCache(cacheKey: string): void {
        this.cache.delete(cacheKey);
        console.log(`Cache invalidated for: ${cacheKey}`);
    }

    /**
     * Clears all cached results
     */
    clearAll(): void {
        this.cache.clear();
    }

    /**
     * Disposes all file watchers
     */
    dispose(): void {
        for (const watcher of this.fileWatchers) {
            watcher.dispose();
        }
        this.fileWatchers = [];
        this.watchedWorkspaces.clear();
        this.cache.clear();
    }
}
