/**
 * Department Normalization Script
 * Converts legacy department names to the new Opción A taxonomy
 */

import * as fs from 'fs/promises';
import * as path from 'path';

// New taxonomy based on organizational chart (Opción A)
interface DepartmentMapping {
  normalized: string;      // Normalized sub-department
  parentArea: string;      // Parent functional area
  icon: string;            // Emoji icon for UI
}

const DEPARTMENT_MAP: Record<string, DepartmentMapping> = {
  // Finanzas (CFO - Belén)
  'Financiero': { normalized: 'Finanzas', parentArea: 'Finanzas', icon: '💼' },
  'Finanzas / Ops': { normalized: 'Finanzas', parentArea: 'Finanzas', icon: '💼' },
  
  // Personas & Cultura
  'RRHH': { normalized: 'RRHH', parentArea: 'Personas & Cultura', icon: '👥' },
  'Cultura': { normalized: 'Cultura', parentArea: 'Personas & Cultura', icon: '👥' },
  
  // Operaciones
  'Operaciones': { normalized: 'Operaciones', parentArea: 'Operaciones', icon: '🍽️' },
  'Operaciones Sala': { normalized: 'Operaciones - Sala', parentArea: 'Operaciones', icon: '🍽️' },
  'Operaciones / Ventas': { normalized: 'Operaciones - Sala', parentArea: 'Operaciones', icon: '🍽️' },
  'Atención al Cliente': { normalized: 'Operaciones - ATC', parentArea: 'Operaciones', icon: '🍽️' },
  'Area Manager Sala': { normalized: 'Operaciones - Sala', parentArea: 'Operaciones', icon: '🍽️' },
  'Area Manager Cocina': { normalized: 'Operaciones - Cocina', parentArea: 'Operaciones', icon: '🍽️' },
  
  // I+D & Calidad (Miguel Ángel) - Includes Sherlock, Vajilla, Diseño
  'Calidad / I+D': { normalized: 'I+D', parentArea: 'I+D & Calidad', icon: '🔬' },
  'Vajilla/Almacén': { normalized: 'I+D - Interiorismo', parentArea: 'I+D & Calidad', icon: '🔬' },
  'Diseño': { normalized: 'I+D - Diseño', parentArea: 'I+D & Calidad', icon: '🎨' },
  
  // Comercial (Ventas + Eventos + Marketing)
  'Ventas': { normalized: 'Comercial - Ventas', parentArea: 'Comercial', icon: '📈' },
  'Marketing': { normalized: 'Comercial - Marketing', parentArea: 'Comercial', icon: '📈' },
  
  // Mantenimiento (Marta)
  'Mantenimiento': { normalized: 'Mantenimiento', parentArea: 'Mantenimiento', icon: '🔧' },
  
  // Tech & Innovación (Alvar/Andrea)
  'Transversal': { normalized: 'Tech & Innovación', parentArea: 'Tech', icon: '🌐' },
  'Alvar': { normalized: 'Tech & Innovación', parentArea: 'Tech', icon: '🌐' },
};

async function normalizeProjects() {
  const inputPath = path.join(process.cwd(), 'data', 'reports', 'dreamland - projects.txt');
  const outputPath = path.join(process.cwd(), 'data', 'reports', 'dreamland - projects.txt');
  
  const rawData = await fs.readFile(inputPath, 'utf-8');
  const projects = JSON.parse(rawData);
  
  const normalizedProjects = projects.map((project: any) => {
    const originalDept = project.departamento_origen;
    const mapping = DEPARTMENT_MAP[originalDept];
    
    if (mapping) {
      return {
        ...project,
        departamento_origen: mapping.normalized,
        area_funcional: mapping.parentArea,
        departamento_legacy: originalDept, // Keep original for reference
      };
    } else {
      console.warn(`⚠️ Unknown department: ${originalDept}`);
      return {
        ...project,
        area_funcional: 'Sin Clasificar',
        departamento_legacy: originalDept,
      };
    }
  });
  
  await fs.writeFile(outputPath, JSON.stringify(normalizedProjects, null, 2), 'utf-8');
  
  console.log('✅ Projects normalized!');
  console.log(`📊 Total: ${normalizedProjects.length} projects`);
  
  // Count by new departments
  const deptCount: Record<string, number> = {};
  normalizedProjects.forEach((p: any) => {
    deptCount[p.departamento_origen] = (deptCount[p.departamento_origen] || 0) + 1;
  });
  
  console.log('\n📋 New Distribution:');
  Object.entries(deptCount)
    .sort((a, b) => b[1] - a[1])
    .forEach(([dept, count]) => {
      console.log(`  ${dept}: ${count}`);
    });
}

normalizeProjects().catch(console.error);
