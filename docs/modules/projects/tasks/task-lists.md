---
title: Task Lists
description: Managing task lists and views (Board, Calendar, Gantt, Timeline)
---

# Task List Management

## Overview

La gestión de listas de tareas en Dreamland Manager permite organizar actividades de forma jerárquica y visual. Recientemente se ha introducido la capacidad de manipulación global de la visibilidad de las listas.

---

## 📂 Global List Folding (Colapso Global)

Esta funcionalidad permite al usuario contraer o expandir todas las listas de tareas simultáneamente con un solo clic, facilitando la navegación en proyectos con gran volumen de datos.

### Implementation Details

**Componente**: `src/components/tasks/task-list-view.tsx`

#### State Management
El componente utiliza un estado local para rastrear qué listas están expandidas:
```typescript
const [expandedLists, setExpandedLists] = useState<Record<string, boolean>>({});
```

#### Toggle Logic
La función `toggleAllLists` determina la acción a realizar basándose en el estado actual de las listas visibles:
- Si **todas** las listas están colapsadas → Expandir todas.
- Si **al menos una** lista está expandida → Colapsar todas.

```typescript
const toggleAllLists = () => {
  const allExpanded = Object.keys(groupedTasks).every(key => expandedLists[key]);
  const newState: Record<string, boolean> = {};
  
  Object.keys(groupedTasks).forEach(key => {
    newState[key] = !allExpanded;
  });
  
  setExpandedLists(newState);
};
```

### UI Components
- **Iconos Dinámicos**: Se utilizan `ChevronsDownUp` (para colapsar) y `ChevronsUpDown` (para expandir) de la librería `lucide-react`.
- **Tooltips**: El botón muestra "Colapsar todo" o "Expandir todo" según el contexto, integrado con el sistema de i18n.

---

## 🛠️ Toolbar Integration

El botón de colapso global se encuentra en la barra de herramientas principal de la vista de tareas, junto a los selectores de agrupación.

```tsx
<Button
  variant="ghost"
  size="icon"
  onClick={toggleAllLists}
  title={allListsExpanded ? t('collapseAll') : t('expandAll')}
>
  {allListsExpanded ? <ChevronsDownUp className="h-4 w-4" /> : <ChevronsUpDown className="h-4 w-4" />}
</Button>
```

---

## 🌐 Internationalization

Las etiquetas del botón están totalmente localizadas en los 6 idiomas soportados bajo el namespace `tasks`:
- `collapseAll`: Texto para contraer.
- `expandAll`: Texto para expandir.
