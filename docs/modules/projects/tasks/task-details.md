---
title: Task Details
description: Detailed task view with comments, attachments, and dependencies
---

# Task Details - Dreamland Manager

## Overview

The **Task Detail View** provides a comprehensive interface for viewing and editing individual task properties. It is implemented as a slide-over sheet (`Sheet` component) to maintain context within the board or list view.

## Markdown Rendering

To enhance readability and documentation, both the **Description** and **Technical Notes** fields support rich text formatting via Markdown.

### Supported Formatting
The system uses `react-markdown` with the `remark-gfm` plugin, enabling:
-   **Headers** (`#`, `##`)
-   **Lists** (Ordered and Unordered)
-   **Task Lists** (`- [ ]`, `- [x]`)
-   **Tables**
-   **Code Blocks** using backticks
-   **Links** and **Emphasis** (*italic*, **bold**, ~~strikethrough~~)

### Technical Implementation
-   **Component**: `src/modules/projects/components/tasks/task-detail-sheet.tsx`
-   **Libraries**: `react-markdown`, `remark-gfm`
-   **Styling**: Uses Tailwind's `@tailwindcss/typography` plugin via the `prose` class (specifically `prose-sm prose-stone dark:prose-invert`) to ensure consistent and readable typography in both light and dark modes.

## Technical Notes Field

A specialized field for engineering-specific details (API endpoints, implementation caveats, etc.).
-   **Visibility**: Always visible in the detail view.
-   **Styling**: Rendered with a monospace font in edit mode for code clarity.
-   **Background**: distinct visual emphasis to differentiate from the main description.
