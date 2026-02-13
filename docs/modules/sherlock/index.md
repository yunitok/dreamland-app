# Sherlock - Dreamland Manager

## Overview

**Sherlock** is an specialized AI-driven investigation module designed to perform deep-dive analysis on project data. It acts as a dedicated "detective" that uncovers hidden patterns, risks, and insights within the project ecosystem.

## Functionality

### 1. Task Fetching & Analysis
Sherlock can ingest and analyze tasks from specific projects (identified by fuzzy matching, e.g., "Sherlock Project") to build a comprehensive context for its investigations.

-   **Script**: `scripts/fetch-sherlock-tasks.ts`
-   **Output**: Generates `sherlock_tasks.json`, a structured dataset of project tasks used for offline analysis or retraining.

### 2. Investigation Context
Unlike the general chat agent, Sherlock is optimized for:
-   **Deep Context**: Handling larger datasets related to specific project histories.
-   **Pattern Recognition**: Identifying recurring bottlenecks or team sentiment issues over time.

## Directory Structure

Located in `src/modules/sherlock`, the module contains:
-   `actions/`: Server actions for triggering investigations (in development).
-   `domain/`: Core logic for the investigation engine (in development).
-   `utils/`: Helper functions for data parsing and formatting.

*Note: This module is currently in active development. Features are being incrementally added.*
