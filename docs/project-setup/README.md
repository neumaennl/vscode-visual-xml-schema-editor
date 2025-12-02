# Editor Refactor: Project Setup and Roadmap

This document provides guidance for setting up the GitHub Project board and the initial issues for the "Editor Transition" effort. It complements the main ADR in `docs/architecture/001-editor-transition.md`.

## Recommended Project Board: `Editor Refactor`
Columns:
- Backlog
- Ready (prioritized tasks ready to pick up)
- In Progress
- Review
- Done

## Suggested initial cards / issues (create issues from these):
- Phase 1: Foundation - Define command types, implement CommandProcessor, SchemaModelManager, message protocol
- Phase 2: Basic Editing - Add/Remove/Modify element handlers and document edits
- Phase 3: UI Integration - Webview actions, toolbar, properties panel
- Phase 4: State Reconciliation - Implement StateReconciler and incremental updates
- Phase 5: Advanced Features - Attributes, drag/drop, copy/paste
- Phase 6: Polish &amp; Testing - Integration and performance testing

## How to create the board
1. Go to the repository &gt; Projects &gt; New project
2. Name: `Editor Refactor`
3. Visibility: Repository
4. Create columns as recommended above
5. Add cards by creating issues and linking them to the board

## Notes
- Link implementation issues back to the ADR and this README for context.
- Use labels like `editor`, `architecture`, `phase-1`, etc.
