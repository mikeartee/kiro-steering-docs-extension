import * as path from 'path';
import * as os from 'os';
import * as cp from 'child_process';
import { runTests } from '@vscode/test-electron';

/**
 * Get Windows short path (8.3 format) to avoid issues with spaces
 */
function getShortPath(longPath: string): string {
    if (process.platform !== 'win32') {
        return longPath;
    }
    
    try {
        const result = cp.execSync(`for %I in ("${longPath}") do @echo %~sI`, {
            encoding: 'utf8',
            shell: 'cmd.exe'
        });
        return result.trim() || longPath;
    } catch {
        return longPath;
    }
}

async function main() {
    try {
        // The folder containing the Extension Manifest package.json
        const extensionDevelopmentPath = path.resolve(__dirname, '../../');

        // The path to the extension test script - use short path to avoid space issues
        const extensionTestsPath = getShortPath(path.resolve(__dirname, './suite/index'));

        // Use temp directory to avoid issues with spaces in username
        const testDataDir = path.join(os.tmpdir(), 'vscode-test-data');
        const extensionsDir = path.join(os.tmpdir(), 'vscode-test-extensions');
        const workspacePath = path.resolve(__dirname, '../../test-workspace');

        console.log('Extension tests path:', extensionTestsPath);
        console.log('Workspace path:', workspacePath);

        // Download VS Code, unzip it and run the integration test
        await runTests({
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs: [
                workspacePath, // Test workspace - must be first argument
                '--disable-extensions', // Disable other extensions
                `--user-data-dir=${testDataDir}`, // Use temp user data directory
                `--extensions-dir=${extensionsDir}`, // Use temp extensions directory
                '--no-sandbox', // Disable sandbox to avoid permission issues
                '--disable-gpu', // Disable GPU for headless testing
                '--skip-welcome', // Skip welcome page
                '--skip-release-notes' // Skip release notes
            ],
            extensionTestsEnv: {
                // Set environment variables to help with path resolution
                VSCODE_TEST_DATA_DIR: testDataDir,
                VSCODE_TEST_EXTENSIONS_DIR: extensionsDir
            }
        });
    } catch (err) {
        console.error('Failed to run tests:', err);
        process.exit(1);
    }
}

main();
