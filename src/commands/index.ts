import * as vscode from "vscode";
import { DocumentService } from "../services/DocumentService";
import { SteeringDocsTreeProvider } from "../providers/SteeringDocsTreeProvider";
import { DocumentMetadata, ExtensionError } from "../models/types";

/**
 * Register all command handlers
 */
export function registerCommands(
  context: vscode.ExtensionContext,
  documentService: DocumentService,
  treeProvider: SteeringDocsTreeProvider
): void {
  // Refresh command
  context.subscriptions.push(
    vscode.commands.registerCommand("steeringDocs.refresh", async () => {
      await handleRefresh(documentService, treeProvider);
    })
  );

  // Preview command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "steeringDocs.preview",
      async (item: any) => {
        await handlePreview(documentService, item);
      }
    )
  );

  // Install command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "steeringDocs.install",
      async (item: any) => {
        await handleInstall(documentService, treeProvider, item);
      }
    )
  );

  // Quick load command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "steeringDocs.quickLoad",
      async (item: any) => {
        await handleQuickLoad(documentService, treeProvider, item);
      }
    )
  );

  // Inclusion mode commands
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "steeringDocs.setInclusionAlways",
      async (item: any) => {
        await handleSetInclusionMode(
          documentService,
          treeProvider,
          item,
          "always"
        );
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "steeringDocs.setInclusionManual",
      async (item: any) => {
        await handleSetInclusionMode(
          documentService,
          treeProvider,
          item,
          "manual"
        );
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "steeringDocs.setInclusionFileMatch",
      async (item: any) => {
        await handleSetInclusionFileMatch(documentService, treeProvider, item);
      }
    )
  );

  // Update command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "steeringDocs.update",
      async (item: any) => {
        await handleUpdate(documentService, treeProvider, item);
      }
    )
  );

  // Check updates command
  context.subscriptions.push(
    vscode.commands.registerCommand("steeringDocs.checkUpdates", async () => {
      await handleCheckUpdates(documentService, treeProvider);
    })
  );

  // Show active only filter command
  context.subscriptions.push(
    vscode.commands.registerCommand("steeringDocs.showActiveOnly", async () => {
      await handleShowActiveOnly(treeProvider);
    })
  );

  // Toggle command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "steeringDocs.toggle",
      async (item: any) => {
        await handleToggle(documentService, treeProvider, item);
      }
    )
  );
}

/**
 * Handle refresh command
 */
async function handleRefresh(
  documentService: DocumentService,
  treeProvider: SteeringDocsTreeProvider
): Promise<void> {
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Refreshing steering documents...",
      cancellable: false,
    },
    async () => {
      try {
        // Clear cache
        documentService.clearCache();

        // Refetch document list (this will populate cache again)
        await documentService.fetchDocumentList();

        // Refresh tree view
        treeProvider.refresh();

        vscode.window.showInformationMessage(
          "Steering documents refreshed successfully"
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        vscode.window.showErrorMessage(
          `Failed to refresh documents: ${message}`
        );
      }
    }
  );
}

/**
 * Handle preview command
 */
async function handlePreview(
  documentService: DocumentService,
  item: any
): Promise<void> {
  try {
    if (!item || !item.metadata) {
      vscode.window.showErrorMessage("No document selected");
      return;
    }

    const doc: DocumentMetadata = item.metadata;

    // Fetch document content
    const content = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Loading ${doc.name}...`,
        cancellable: false,
      },
      async () => {
        return await documentService.fetchDocumentContent(doc.path);
      }
    );

    // Create a new untitled document with the content
    const document = await vscode.workspace.openTextDocument({
      content,
      language: "markdown",
    });

    // Open in editor
    await vscode.window.showTextDocument(document, {
      preview: true,
      viewColumn: vscode.ViewColumn.Beside,
    });

    // Show markdown preview
    await vscode.commands.executeCommand("markdown.showPreview", document.uri);
  } catch (error) {
    if (error instanceof ExtensionError) {
      vscode.window.showErrorMessage(error.message);
    } else {
      const message = error instanceof Error ? error.message : "Unknown error";
      vscode.window.showErrorMessage(`Failed to preview document: ${message}`);
    }
  }
}

/**
 * Handle install command
 */
async function handleInstall(
  documentService: DocumentService,
  treeProvider: SteeringDocsTreeProvider,
  item: any
): Promise<void> {
  try {
    if (!item || !item.metadata) {
      vscode.window.showErrorMessage("No document selected");
      return;
    }

    const doc: DocumentMetadata = item.metadata;

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Installing ${doc.name}...`,
        cancellable: false,
      },
      async () => {
        await documentService.installDocument(doc);
      }
    );

    // Refresh tree view
    treeProvider.refresh();
  } catch (error) {
    if (error instanceof ExtensionError) {
      vscode.window.showErrorMessage(error.message);
    } else {
      const message = error instanceof Error ? error.message : "Unknown error";
      vscode.window.showErrorMessage(`Failed to install document: ${message}`);
    }
  }
}

/**
 * Handle quick load command
 */
async function handleQuickLoad(
  documentService: DocumentService,
  treeProvider: SteeringDocsTreeProvider,
  item: any
): Promise<void> {
  try {
    if (!item || !item.metadata) {
      vscode.window.showErrorMessage("No document selected");
      return;
    }

    const doc: DocumentMetadata = item.metadata;

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Quick loading ${doc.name}...`,
        cancellable: false,
      },
      async () => {
        await documentService.quickLoadDocument(doc);
      }
    );

    // Refresh tree view
    treeProvider.refresh();
  } catch (error) {
    if (error instanceof ExtensionError) {
      vscode.window.showErrorMessage(error.message);
    } else {
      const message = error instanceof Error ? error.message : "Unknown error";
      vscode.window.showErrorMessage(
        `Failed to quick load document: ${message}`
      );
    }
  }
}

/**
 * Handle set inclusion mode command
 */
async function handleSetInclusionMode(
  documentService: DocumentService,
  treeProvider: SteeringDocsTreeProvider,
  item: any,
  mode: "always" | "manual"
): Promise<void> {
  try {
    if (!item || !item.metadata) {
      vscode.window.showErrorMessage("No document selected");
      return;
    }

    const docName: string = item.metadata.name;

    await documentService.setInclusionMode(docName, mode);

    // Refresh tree view
    treeProvider.refresh();
  } catch (error) {
    if (error instanceof ExtensionError) {
      vscode.window.showErrorMessage(error.message);
    } else {
      const message = error instanceof Error ? error.message : "Unknown error";
      vscode.window.showErrorMessage(
        `Failed to set inclusion mode: ${message}`
      );
    }
  }
}

/**
 * Handle set inclusion file match command
 */
async function handleSetInclusionFileMatch(
  documentService: DocumentService,
  treeProvider: SteeringDocsTreeProvider,
  item: any
): Promise<void> {
  try {
    if (!item || !item.metadata) {
      vscode.window.showErrorMessage("No document selected");
      return;
    }

    const docName: string = item.metadata.name;

    // Prompt for file match pattern
    const pattern = await vscode.window.showInputBox({
      prompt: "Enter file match pattern (e.g., *.ts, *.py)",
      placeHolder: "*.ts",
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return "Pattern cannot be empty";
        }
        return null;
      },
    });

    if (!pattern) {
      return; // User cancelled
    }

    await documentService.setInclusionMode(docName, "fileMatch", pattern);

    // Refresh tree view
    treeProvider.refresh();
  } catch (error) {
    if (error instanceof ExtensionError) {
      vscode.window.showErrorMessage(error.message);
    } else {
      const message = error instanceof Error ? error.message : "Unknown error";
      vscode.window.showErrorMessage(
        `Failed to set inclusion mode: ${message}`
      );
    }
  }
}

/**
 * Handle update command
 */
async function handleUpdate(
  documentService: DocumentService,
  treeProvider: SteeringDocsTreeProvider,
  item: any
): Promise<void> {
  try {
    if (!item || !item.metadata) {
      vscode.window.showErrorMessage("No document selected");
      return;
    }

    const doc: DocumentMetadata = item.metadata;

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Updating ${doc.name}...`,
        cancellable: false,
      },
      async () => {
        await documentService.updateDocument(doc);
      }
    );

    // Refresh tree view
    treeProvider.refresh();
  } catch (error) {
    if (error instanceof ExtensionError) {
      vscode.window.showErrorMessage(error.message);
    } else {
      const message = error instanceof Error ? error.message : "Unknown error";
      vscode.window.showErrorMessage(`Failed to update document: ${message}`);
    }
  }
}

/**
 * Handle check updates command
 */
async function handleCheckUpdates(
  documentService: DocumentService,
  treeProvider: SteeringDocsTreeProvider
): Promise<void> {
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Checking for updates...",
      cancellable: false,
    },
    async () => {
      try {
        const updates = await documentService.checkForUpdates();

        // Refresh tree view to show update indicators
        treeProvider.refresh();

        // Show summary notification
        if (updates.length === 0) {
          vscode.window.showInformationMessage("All documents are up to date");
        } else {
          const message =
            updates.length === 1
              ? "1 document has an update available"
              : `${updates.length} documents have updates available`;
          vscode.window.showInformationMessage(message);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        vscode.window.showErrorMessage(
          `Failed to check for updates: ${message}`
        );
      }
    }
  );
}

/**
 * Handle show active only filter command
 */
async function handleShowActiveOnly(
  treeProvider: SteeringDocsTreeProvider
): Promise<void> {
  // Toggle the filter state
  const currentState = treeProvider.getShowActiveOnly();
  treeProvider.setShowActiveOnly(!currentState);

  const message = !currentState
    ? "Showing only active documents"
    : "Showing all documents";
  vscode.window.showInformationMessage(message);
}

/**
 * Handle toggle command - install or uninstall document
 */
async function handleToggle(
  documentService: DocumentService,
  treeProvider: SteeringDocsTreeProvider,
  item: any
): Promise<void> {
  try {
    if (!item || !item.metadata) {
      vscode.window.showErrorMessage("No document selected");
      return;
    }

    const doc: DocumentMetadata = item.metadata;

    // Check if document is currently installed
    const installedDocs = await documentService.getInstalledDocuments();
    const isInstalled = installedDocs.some((d) => d.name === doc.name);

    if (isInstalled) {
      // Document is installed - uninstall it
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Deactivating ${doc.name}...`,
          cancellable: false,
        },
        async () => {
          await documentService.uninstallDocument(doc.name);
        }
      );
    } else {
      // Document is not installed - install with "always" mode
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Activating ${doc.name}...`,
          cancellable: false,
        },
        async () => {
          await documentService.installDocument(doc, "always");
        }
      );
    }

    // Refresh tree view to update toggle state
    treeProvider.refresh();
  } catch (error) {
    if (error instanceof ExtensionError) {
      vscode.window.showErrorMessage(error.message);
    } else {
      const message = error instanceof Error ? error.message : "Unknown error";
      vscode.window.showErrorMessage(`Failed to toggle document: ${message}`);
    }
    
    // Refresh tree view to revert UI state on error
    treeProvider.refresh();
  }
}
