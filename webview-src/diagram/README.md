# XSD Diagram Rendering Implementation

## Overview

This implementation ports the core diagram rendering functionality from the [xsddiagram project](https://github.com/dgis/xsddiagram) to TypeScript for use in the VS Code Visual XML Schema Editor extension.

## Architecture

### Core Components

#### 1. **Diagram Data Structures** (`webview-src/diagram/`)

- **DiagramTypes.ts**: Core types and enums including `DiagramItemType`, `DiagramItemGroupType`, `Point`, `Rectangle`, `Size`, and styling configuration
- **DiagramItem.ts**: Represents individual diagram nodes (elements, groups, types) with properties for:
  - Identity and hierarchy (parent/child relationships)
  - Occurrence constraints (minOccurs, maxOccurs)
  - Layout properties (location, size, bounding boxes)
  - Display state (expanded/collapsed, selected)
- **Diagram.ts**: Container for the entire diagram with:
  - Root elements
  - Global settings (scale, alignment, show documentation, etc.)
  - Bounding box calculations

#### 2. **Schema Processing**

- **DiagramBuilder.ts**: Converts unmarshalled XML Schema objects into diagram data structures
  - Traverses schema elements, complexTypes, simpleTypes
  - Processes sequences, choices, and all groups
  - Extracts occurrence constraints and documentation
  - Builds hierarchical diagram item tree

#### 3. **Layout Engine**

- **DiagramLayout.ts**: Calculates positions and sizes for all diagram items
  - Computes element dimensions based on type
  - Arranges children hierarchically
  - Calculates documentation box sizes
  - Supports expand/collapse recalculation

#### 4. **SVG Renderer**

- **DiagramSvgRenderer.ts**: Renders diagram items to SVG
  - **Element shapes**: Rectangles with optional shadows for multiple occurrences
  - **Group shapes**: Diamond shapes with type indicators (sequence/choice/all)
  - **Type shapes**: Beveled rectangles
  - **Connectors**: Lines connecting parents to children with proper routing
  - **Text rendering**: Labels, types, occurrences, documentation
  - **Expand buttons**: Interactive +/- buttons for collapsing/expanding nodes
  - **Reference arrows**: Visual indicators for type references

### Rendering Features

#### Shape Types

1. **Elements** (`DiagramItemType.element`)

   - Rendered as rectangles
   - Dashed border when minOccurs = 0 (optional)
   - Shadow effect when maxOccurs > 1 (multiple occurrences)

2. **Groups** (`DiagramItemType.group`)

   - Rendered as diamonds
   - Visual indicator for group type:
     - **Sequence**: Three dots in a row
     - **Choice**: Choice symbol (branching lines)
     - **All**: Grid of dots

3. **Types** (`DiagramItemType.type`)
   - Rendered as beveled rectangles (slanted corner)
   - Distinguishes complex types from elements

#### Visual Elements

- **Child Connection Lines**: Connect parent elements to their children
  - Single child: Direct line
  - Multiple children: Vertical connector with branches
- **Occurrence Text**: Shows cardinality (e.g., "0..∞", "1..5")

  - Positioned near element box
  - Uses infinity symbol (∞) for unbounded

- **Documentation**: Rendered below elements when available

  - Truncated to prevent overflow
  - Configurable max width

- **Expand/Collapse Buttons**: Small boxes with +/- symbols
  - Positioned to the right of elements with children
  - Interactive click handling

#### Interaction Features

1. **Click Handling**

   - Click on diagram item to select and show properties
   - Click on expand button to toggle child visibility

2. **Expand/Collapse**

   - Dynamically show/hide child elements
   - Automatic layout recalculation on state change

3. **Zoom and Pan** (inherited from existing implementation)
   - Mouse wheel to zoom
   - Drag to pan (middle click or Ctrl+drag)

## Integration

### Webview Integration

The diagram rendering is integrated into the existing webview through:

1. **renderer.ts**: Updated to use the new diagram system

   - Creates `DiagramBuilder`, `DiagramLayout`, and `DiagramSvgRenderer` instances
   - Handles schema updates from extension
   - Manages interaction events (clicks, expand/collapse)

2. **main.ts**: Orchestrates the overall webview application

   - No changes needed - works with updated renderer

3. **styles.css**: Enhanced with diagram-specific styles
   - `.diagram-item` styling for rendered elements
   - `.expand-button` styling for interactive buttons
   - Hover and selection states

### Extension Integration

The extension side remains largely unchanged:

- **webviewProvider.ts**: Unmarshals XSD using `@neumaennl/xmlbind-ts` and sends to webview
- Webview receives schema object and renders it using new diagram system

## Ported from XSD Diagram

This implementation is based on the following key files from the xsddiagram C# project:

- **XSDDiagrams/Rendering/DiagramItem.cs** → `DiagramItem.ts`
- **XSDDiagrams/Rendering/Diagram.cs** → `Diagram.ts`
- **XSDDiagrams/Rendering/DiagramSvgRenderer.cs** → `DiagramSvgRenderer.ts`

Key differences from original:

1. **Language**: C# → TypeScript
2. **Rendering**: System.Drawing/GDI+ → SVG DOM manipulation
3. **Schema parsing**: .NET XML APIs → xmlbind-ts generated classes
4. **UI Framework**: WinForms → VS Code webview

## Known Limitations

1. **Schema Traversal**: Current implementation uses basic property inspection to traverse unmarshalled schema objects. The generated classes from `@neumaennl/xmlbind-ts` may need enhancement to expose all child elements properly.

2. **Layout Algorithm**: Simplified compared to original - no automatic positioning optimization, complex inheritance visualization, or substitution groups yet.

3. **Documentation Rendering**: Basic implementation - no HTML formatting or multi-language support yet.

4. **Font Metrics**: Uses estimated sizes rather than actual font measurements (browser limitations).

## Future Enhancements

1. **Enhanced Schema Parsing**:

   - Better handling of includes/imports
   - Type inheritance visualization
   - Attribute display in diagram

2. **Advanced Layout**:

   - Automatic node positioning optimization
   - Compact vs. expanded layout modes
   - Better handling of large schemas

3. **Export Capabilities**:

   - Export diagram as PNG/SVG
   - Print support

4. **Search and Navigation**:

   - Search for elements in diagram
   - Jump to definition/references

5. **Visual Editing**:
   - Drag-and-drop to reorganize
   - In-place editing of properties
   - Visual schema modification

## References

- Original Project: https://github.com/dgis/xsddiagram
- License: GPL-2.0, LGPL-3.0, and MS-PL (matching original project)
- Author: Régis COSNIER (original), ported by GitHub Copilot
