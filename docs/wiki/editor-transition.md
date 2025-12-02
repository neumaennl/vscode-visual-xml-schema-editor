# Editor Transition Wiki

This wiki-style page summarizes the architecture decision to transition the Visual XML Schema Editor from a viewer to a full-featured editor.

Primary ADR (detailed technical reference):
- docs/architecture/001-editor-transition.md

Purpose of this wiki page:
- Provide a short, human-friendly summary of the ADR and where to find the full details
- Provide links to implementation checklist and project board
- Document where to start and who to contact

## Summary (short)
We use a Command-Driven, Unidirectional Data Flow architecture:
- Extension (backend) is the single source of truth for the schema model
- Webview (frontend) sends typed commands for edit intents
- Extension validates and applies changes to the schema model and writes to the document via WorkspaceEdit
- Updated schema is sent back to the webview; the webview reconciles view state (zoom/expand) and re-renders

Benefits: maintainability, testability, native undo/redo integration, and clear separation of concerns.

## Quick links
- ADR: docs/architecture/001-editor-transition.md
- Implementation Roadmap: docs/architecture/001-editor-transition.md#implementation-roadmap

## How to get started
1. Review the ADR above.
2. Create or join the GitHub Project board named `Editor Refactor` (recommended columns: Backlog, In Progress, Review, Done).
3. Use the issue template `Editor: Phase X - <short description>` when creating feature tasks.

## Contact
Ping @neumaennl for questions and design decisions.
