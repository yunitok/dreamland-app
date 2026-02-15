---
title: Voice Commands
description: Using voice input for project management tasks
---

# Voice Commands Reference - Dreamland Manager

## Overview

This guide lists all voice commands supported by the Dreamland Manager Voice Assistant. Commands work in both **English** and **Spanish**.

---

## Getting Started

### Activating Voice Assistant

1. Click the **microphone icon** in the app header
2. Grant microphone permission (if first time)
3. Speak your command clearly
4. Wait for confirmation message

---

## Task Management Commands

### Create Task

**English**:
- "Create task: Fix login bug"
- "Add task called Deploy to production"
- "New task: Update documentation"

**Spanish**:
- "Crear tarea: Arreglar bug de login"
- "Añadir tarea llamada Desplegar a producción"
- "Nueva tarea: Actualizar documentación"

**Result**: Creates a new task in the current project's default list.

---

### Delete Task

**English**:
- "Delete task [task ID]"
- "Remove task [task ID]"

**Spanish**:
- "Eliminar tarea [ID de tarea]"
- "Borrar tarea [ID de tarea]"

**Result**: Permanently deletes the specified task.

> [!WARNING]
> This action cannot be undone!

---

### Update Task Status

**English**:
- "Mark task [task ID] as done"
- "Complete task [task ID]"
- "Set task [task ID] to in progress"

**Spanish**:
- "Marcar tarea [ID] como completada"
- "Completar tarea [ID]"
- "Poner tarea [ID] en progreso"

**Result**: Updates the task's status.

---

### Assign Task

**English**:
- "Assign task [task ID] to [username]"

**Spanish**:
- "Asignar tarea [ID] a [nombre de usuario]"

**Result**: Assigns task to specified user.

---

## List Management Commands

### Create List

**English**:
- "Create list called Testing"
- "Add list named Backlog"
- "New list: In Progress"

**Spanish**:
- "Crear lista llamada Pruebas"
- "Añadir lista llamada Backlog"
- "Nueva lista: En Progreso"

**Result**: Creates a new task list in the current project.

---

### Delete List

**English**:
- "Delete list [list name]"

**Spanish**:
- "Eliminar lista [nombre]"

**Result**: Deletes the list and all tasks within it.

> [!CAUTION]
> All tasks in the list will be permanently deleted!

---

## Project Commands

### Create Project

**English**:
- "Create project called Mobile App Redesign"
- "New project: API Migration"

**Spanish**:
- "Crear proyecto llamado Rediseño App Móvil"
- "Nuevo proyecto: Migración de API"

**Result**: Creates a new project.

---

### View Project Status

**English**:
- "Show project status"
- "What's the progress on [project name]?"

**Spanish**:
- "Mostrar estado del proyecto"
- "¿Cuál es el progreso de [nombre de proyecto]?"

**Result**: Displays project progress summary.

---

## Query Commands

### Task Queries

**English**:
- "Show my tasks"
- "What tasks are assigned to me?"
- "List all high-priority tasks"

**Spanish**:
- "Mostrar mis tareas"
- "¿Qué tareas tengo asignadas?"
- "Listar todas las tareas de alta prioridad"

**Result**: Returns filtered task list.

---

### Project Queries

**English**:
- "Show active projects"
- "List all projects in Engineering"

**Spanish**:
- "Mostrar proyectos activos"
- "Listar todos los proyectos en Ingeniería"

**Result**: Returns filtered project list.

---

## Advanced Commands

### Bulk Operations

**English**:
- "Create 3 tasks: [task 1], [task 2], [task 3]"
- "Delete all completed tasks"

**Spanish**:
- "Crear 3 tareas: [tarea 1], [tarea 2], [tarea 3]"
- "Eliminar todas las tareas completadas"

**Result**: Executes multiple operations at once.

---

### Natural Language

The AI understands variations and natural phrasing:

**English**:
- "I need to add a new task for fixing the header layout" ✅
- "Can you create a task called Review PR #123?" ✅
- "Delete the task about updating tests" ✅

**Spanish**:
- "Necesito añadir una nueva tarea para arreglar el layout del header" ✅
- "¿Puedes crear una tarea llamada Revisar PR #123?" ✅
- "Eliminar la tarea sobre actualizar tests" ✅

---

## Tips for Best Results

### 1. Speak Clearly
- Use a quiet environment
- Speak at normal pace (not too fast/slow)
- Pronounce task names clearly

### 2. Be Specific
- Include task/list/project names explicitly
- Use IDs when referencing existing items
- Specify department or priority when filtering

### 3. Check Confirmation
- Wait for visual/audio confirmation
- Verify the action was executed correctly
- Use undo command if mistake (future feature)

---

## Unsupported Commands

The following are **not yet supported** but planned for future releases:

- ❌ Calendar/scheduling ("Schedule meeting for tomorrow")
- ❌ File uploads ("Add this image to task")
- ❌ Reporting ("Generate weekly report")
- ❌ User management ("Create new user account")

---

## Troubleshooting

### "I didn't understand that command"

**Possible causes**:
- Unclear pronunciation
- Unsupported command type
- Missing required information (e.g., task name)

**Solutions**:
- Rephrase the command
- Provide more context
- Use simpler sentence structure

---

### Command executed incorrectly

**Example**: Created task in wrong project

**Solution**: 
1. Delete the incorrect item
2. Switch to correct project
3. Repeat command

---

### Microphone not working

**Check**:
1. Browser permissions granted
2. Correct microphone selected in browser settings
3. Microphone works in other apps

---

## Privacy & Data

### What is recorded?
- ✅ Voice-to-text transcript (sent to AI provider)
- ✅ Executed commands (logged in database)
- ❌ Audio recordings (NOT stored)

### Who has access?
- AI providers (Groq/Gemini) process transcripts
- Your database stores command history
- No third-party analytics

---

## Further Reading

- [Voice Assistant Architecture](../capabilities/ai-assistant/architecture.md)
- [Groq Integration](../capabilities/ai-assistant/groq-integration.md)
- [Gemini Integration](../capabilities/ai-assistant/gemini-integration.md)
