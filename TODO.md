# TODO

## Known Issues

### Visual Indicator Colors Not Showing
- **Issue**: Colored dots for inclusion modes showing as white instead of green/yellow/blue
- **Current Implementation**: Using `charts.green`, `charts.yellow`, `charts.blue` theme colors
- **Problem**: Theme colors may not be defined or visible in all VS Code themes
- **Potential Solutions**:
  - Use built-in status colors (`testing.iconPassed`, `editorWarning.foreground`, etc.)
  - Use different icon shapes instead of relying on color
  - Create custom SVG icon assets
  - Add emoji/unicode to labels
- **Priority**: Low - functional but not matching description
- **Version**: 0.1.1

