# Implementation Plan

- [x] 1. Implement toggle functionality


  - [x] 1.1 Add uninstallDocument method to DocumentService


    - Create method that deletes document file from `.kiro/steering/` directory
    - Use VS Code FileSystem API for file deletion
    - Add error handling for file not found and permission errors
    - Show success notification after uninstall
    - _Requirements: 1.3, 5.2, 5.3_

  - [x] 1.2 Create toggle command handler


    - Implement command that checks document installation state
    - Call installDocument with "always" mode if not installed
    - Call uninstallDocument if currently installed
    - Show appropriate notifications for each action
    - Handle errors and revert UI state on failure
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 5.3_

  - [x] 1.3 Update tree item context values for toggle states


    - Modify SteeringDocsTreeProvider to set context values based on installation state
    - Use "document-not-installed" for available documents
    - Use "document-installed" for installed documents
    - Update getTreeItem method to assign correct context values
    - _Requirements: 1.4, 4.1, 4.2_

  - [x] 1.4 Add toggle button to tree items


    - Add inline command to tree items for toggle action
    - Use appropriate icons for on/off states (circle-outline vs check)
    - Register toggle command in package.json commands section
    - Add menu contribution for inline toggle button
    - Update when clauses to show correct button based on state
    - _Requirements: 1.1, 1.4, 4.1, 4.2_

  - [x] 1.5 Update tree view refresh logic


    - Ensure tree view refreshes immediately after toggle actions
    - Update document state indicators after toggle
    - Maintain scroll position and expansion state during refresh
    - _Requirements: 1.5, 4.5_

- [x] 2. Migrate to Kiro sidebar



  - [x] 2.1 Update package.json view contribution


    - Change views contribution from "explorer" to "kiro"
    - Update view name to "Steering Documents" (shorter for sidebar)
    - Verify view ID remains "steeringDocsView"
    - Update all when clauses to reference correct view
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 2.2 Test sidebar integration in Kiro IDE


    - Launch extension in debug mode
    - Verify view appears in Kiro sidebar
    - Verify view does not appear in Explorer sidebar
    - Test all commands work from Kiro sidebar context
    - Verify coexistence with MCP Manager extension
    - _Requirements: 2.2, 2.3, 2.4_

  - [x] 2.3 Update activation events if needed


    - Verify extension activates when Kiro sidebar is opened
    - Test activation with "onView:steeringDocsView" event
    - Remove any Explorer-specific activation events
    - _Requirements: 2.4_

- [x] 3. Prepare marketplace assets






  - [x] 3.1 Create extension icon


    - Design 128x128 PNG icon representing steering/guidance
    - Use simple, recognizable design
    - Save as icon.png in project root
    - Reference icon in package.json
    - _Requirements: 3.3_

  - [x] 3.2 Write comprehensive README


    - Add overview section explaining extension purpose
    - Document key features with descriptions
    - Include installation instructions
    - Add usage guide with step-by-step instructions
    - Document configuration options
    - Add requirements section (Kiro IDE)
    - Include screenshots showing extension in action
    - Add contributing guidelines
    - Include license information
    - _Requirements: 3.1_

  - [x] 3.3 Take screenshots for documentation


    - Capture extension in Kiro sidebar
    - Show toggle functionality in action
    - Demonstrate document preview
    - Show installation confirmation
    - Save screenshots in docs/ or images/ folder
    - Reference screenshots in README
    - _Requirements: 3.1_


  - [x] 3.4 Update package.json metadata

    - Add publisher field
    - Add repository URL
    - Add keywords for discoverability
    - Set appropriate category
    - Add icon reference
    - Set version to 0.1.0 for initial release
    - Add license field
    - _Requirements: 3.2_

  - [x] 3.5 Add LICENSE file


    - Create LICENSE file with MIT license (or chosen license)
    - Include copyright information
    - _Requirements: 3.5_

- [x] 4. Package and test extension








  - [x] 4.1 Install vsce packaging tool




    - Run `npm install -g @vscode/vsce`
    - Verify vsce is available in PATH
    - _Requirements: 3.4_


  - [x] 4.2 Package extension as VSIX

    - Run `vsce package` to create VSIX file
    - Verify package builds without errors
    - Check package size is reasonable
    - _Requirements: 3.4_


  - [x] 4.3 Test VSIX installation locally


    - Install VSIX in Kiro IDE using "Install from VSIX"
    - Verify extension appears in Kiro sidebar
    - Test all toggle functionality
    - Test document preview and installation
    - Verify no errors in console
    - Uninstall and reinstall to test clean installation
    - _Requirements: 2.4, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 5. Publish to marketplace




  - [x] 5.1 Create publisher account


    - Sign up for Visual Studio Marketplace publisher account
    - Verify email and complete account setup
    - Note publisher ID for package.json
    - _Requirements: 3.2_

  - [x] 5.2 Publish extension


    - Run `vsce publish` to publish to marketplace
    - Verify extension appears in marketplace
    - Test installation from marketplace
    - Monitor for any initial user feedback or issues
    - _Requirements: 3.2_

- [ ] 6. Final verification and documentation

  - [ ] 6.1 Create release notes
    - Document initial release features
    - List known limitations
    - Add changelog entry for v0.1.0
    - _Requirements: 3.1_

  - [ ] 6.2 Update repository README
    - Add marketplace badge
    - Add installation instructions from marketplace
    - Link to documentation
    - _Requirements: 3.1_
