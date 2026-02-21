import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database (catalogs only)...');

  // --- RBAC SEEDING ---
  console.log('🔒 Seeding RBAC system...');

  // 1. Create Permissions - Global/system-level resources only.
  // Project-scoped access (tasks, lists, comments, attachments, tags)
  // is governed by ProjectMember roles (OWNER/MANAGER/EDITOR/VIEWER).
  const resources = [
    'projects', 'users', 'roles', 'departments', 'sentiment', 'admin',
    'sherlock', 'reports', 'atc'
  ];
  const actions = ['read', 'create', 'update', 'delete', 'manage'];

  const permissionsList: any[] = [];

  for (const resource of resources) {
    for (const action of actions) {
      const p = await prisma.permission.upsert({
        where: { action_resource: { action, resource } },
        update: {},
        create: {
          action,
          resource,
          description: `Can ${action} ${resource}`
        }
      });
      permissionsList.push(p);
    }
  }

  // Helper to get permission IDs by filters
  const getPerms = (res: string, acts: string[] = []) => {
    return permissionsList
      .filter(p => p.resource === res && (acts.length === 0 || acts.includes(p.action)))
      .map(p => ({ id: p.id }));
  };

  // 2. Create Roles

  // SUPER ADMIN (System) - Full access to everything
  await prisma.role.upsert({
    where: { code: 'SUPER_ADMIN' },
    update: {},
    create: {
      code: 'SUPER_ADMIN',
      name: 'Super Admin',
      description: 'Full system access',
      isSystem: true,
      permissions: {
        connect: permissionsList.map(p => ({ id: p.id }))
      }
    }
  });

  // STRATEGIC PM - High level project management
  await prisma.role.upsert({
    where: { code: 'STRATEGIC_PM' },
    update: {},
    create: {
      code: 'STRATEGIC_PM',
      name: 'Strategic PM',
      description: 'Manages roadmap and projects at strategic level',
      isSystem: false,
      permissions: {
        connect: [
          ...getPerms('projects'),
          ...getPerms('departments', ['read']),
          ...getPerms('sentiment', ['read']),
          ...getPerms('admin', ['read']),
          ...getPerms('sherlock', ['read', 'create']),
          ...getPerms('reports', ['read', 'create', 'manage'])
        ]
      }
    }
  });

  // TEAM LEAD - Manages team tasks
  await prisma.role.upsert({
    where: { code: 'TEAM_LEAD' },
    update: {},
    create: {
      code: 'TEAM_LEAD',
      name: 'Team Lead',
      description: 'Manages team tasks and assignments',
      isSystem: false,
      permissions: {
        connect: [
          ...getPerms('projects', ['read']),
          ...getPerms('departments', ['read']),
          ...getPerms('sentiment', ['read']),
          ...getPerms('admin', ['read']),
          ...getPerms('sherlock', ['read']),
          ...getPerms('reports', ['read'])
        ]
      }
    }
  });

  // TEAM MEMBER - Works on assigned tasks
  await prisma.role.upsert({
    where: { code: 'TEAM_MEMBER' },
    update: {},
    create: {
      code: 'TEAM_MEMBER',
      name: 'Team Member',
      description: 'Works on assigned tasks',
      isSystem: false,
      permissions: {
        connect: [
          ...getPerms('projects', ['read']),
          ...getPerms('admin', ['read'])
        ]
      }
    }
  });

  // HR / PEOPLE LEAD
  await prisma.role.upsert({
    where: { code: 'PEOPLE_LEAD' },
    update: {},
    create: {
      code: 'PEOPLE_LEAD',
      name: 'People & Culture Lead',
      description: 'Manages team sentiment and departments',
      isSystem: false,
      permissions: {
        connect: [
          ...getPerms('sentiment'),
          ...getPerms('departments'),
          ...getPerms('projects', ['read']),
          ...getPerms('admin', ['read'])
        ]
      }
    }
  });

  // STAKEHOLDER (Viewer)
  await prisma.role.upsert({
    where: { code: 'STAKEHOLDER' },
    update: {},
    create: {
      code: 'STAKEHOLDER',
      name: 'Stakeholder',
      description: 'Read-only access to insights',
      isSystem: false,
      permissions: {
        connect: [
          ...getPerms('projects', ['read']),
          ...getPerms('sentiment', ['read']),
          ...getPerms('departments', ['read']),
          ...getPerms('admin', ['read'])
        ]
      }
    }
  });

  // ATC roles
  await prisma.role.upsert({
    where: { code: 'ATC_VIEWER' },
    update: {},
    create: {
      code: 'ATC_VIEWER',
      name: 'ATC Viewer',
      description: 'Acceso de solo lectura al módulo ATC',
      isSystem: false,
      permissions: {
        connect: [...getPerms('atc', ['read'])]
      }
    }
  });

  await prisma.role.upsert({
    where: { code: 'ATC_AGENT' },
    update: {},
    create: {
      code: 'ATC_AGENT',
      name: 'ATC Agent',
      description: 'Agente de atención al cliente con acceso completo al módulo ATC',
      isSystem: false,
      permissions: {
        connect: [...getPerms('atc', ['read', 'manage'])]
      }
    }
  });

  console.log('✅ RBAC seeded: Permissions and roles created');

  // --- TASK STATUSES ---
  console.log('📋 Seeding task statuses...');

  const CANONICAL_STATUSES = [
    { name: 'Backlog',     color: '#808080', position: 0, isDefault: true,  isClosed: false },
    { name: 'To Do',       color: '#6B7280', position: 1, isDefault: false, isClosed: false },
    { name: 'In Progress', color: '#3B82F6', position: 2, isDefault: false, isClosed: false },
    { name: 'In Review',   color: '#A855F7', position: 3, isDefault: false, isClosed: false },
    { name: 'On Hold',     color: '#F97316', position: 4, isDefault: false, isClosed: false },
    { name: 'Blocked',     color: '#EF4444', position: 5, isDefault: false, isClosed: false },
    { name: 'Review',      color: '#F59E0B', position: 6, isDefault: false, isClosed: false },
    { name: 'Done',        color: '#10B981', position: 7, isDefault: false, isClosed: true  },
  ];

  for (const status of CANONICAL_STATUSES) {
    await prisma.taskStatus.upsert({
      where: { name: status.name },
      update: { color: status.color, position: status.position, isDefault: status.isDefault, isClosed: status.isClosed },
      create: status,
    });
  }

  console.log('✅ Canonical task statuses upserted');

  // --- CLEANUP: Remove duplicate Spanish-named statuses ---
  console.log('🧹 Cleaning up duplicate task statuses...');

  const SPANISH_DUPLICATES: Record<string, string> = {
    'Por Hacer':    'To Do',
    'En Curso':     'In Progress',
    'Revisión':     'Review',
    'En Revisión':  'In Review',
    'Bloqueado':    'Blocked',
    'En Pausa':     'On Hold',
    'Pendientes':   'Backlog',
    'Finalizado':   'Done',
    'Completado':   'Done',
  };

  for (const [name, targetName] of Object.entries(SPANISH_DUPLICATES)) {
    const status = await prisma.taskStatus.findUnique({
      where: { name },
      include: { _count: { select: { tasks: true } } },
    });

    if (!status) continue;

    if (status._count.tasks > 0) {
      const target = await prisma.taskStatus.findUnique({ where: { name: targetName } });
      if (!target) {
        console.warn(`⚠️  No se encontró target "${targetName}" para "${name}" — se omite`);
        continue;
      }
      const result = await prisma.task.updateMany({
        where: { statusId: status.id },
        data: { statusId: target.id },
      });
      console.log(`   📦 Movidas ${result.count} tareas: "${name}" → "${targetName}"`);
    }

    await prisma.taskStatus.delete({ where: { id: status.id } });
    console.log(`   🗑️  Eliminado: "${name}"`);
  }

  console.log('✅ Task statuses cleanup completed');

  // --- ATC CATALOGS ---
  console.log('📞 Seeding ATC catalogs...');

  await prisma.reservationChannel.createMany({
    data: [
      { name: 'Web',           code: 'WEB' },
      { name: 'Teléfono',      code: 'PHONE' },
      { name: 'Nacional',      code: 'NATIONAL' },
      { name: 'Internacional', code: 'INTERNATIONAL' },
    ],
    skipDuplicates: true,
  });

  await prisma.queryCategory.createMany({
    data: [
      { name: 'Espacios',       code: 'SPACES' },
      { name: 'Alérgenos',      code: 'ALLERGENS' },
      { name: 'Accesibilidad',  code: 'ACCESSIBILITY' },
      { name: 'Horarios',       code: 'SCHEDULES' },
      { name: 'Menús',          code: 'MENUS' },
      { name: 'Políticas',      code: 'POLICIES' },
      { name: 'Reservas',       code: 'RESERVATIONS' },
      { name: 'Pagos',          code: 'PAYMENTS' },
      { name: 'Eventos',        code: 'EVENTS' },
      { name: 'Incidencias',    code: 'INCIDENTS' },
      { name: 'General',        code: 'GENERAL' },
    ],
    skipDuplicates: true,
  });

  // --- EMAIL CATEGORIES ---
  console.log('📧 Seeding email categories...');

  const parentCategories = [
    { name: 'Reservas',             slug: 'reservas',         description: 'Emails sobre reservas',                              color: '#3B82F6', icon: 'CalendarDays',   sortOrder: 1 },
    { name: 'Reclamaciones',        slug: 'reclamaciones',    description: 'Quejas y reclamaciones formales o informales',       color: '#EF4444', icon: 'AlertTriangle',  sortOrder: 2 },
    { name: 'Consultas Generales',  slug: 'consultas',        description: 'Preguntas sobre horarios, menús y servicios',       color: '#8B5CF6', icon: 'HelpCircle',     sortOrder: 3 },
    { name: 'Facturación',          slug: 'facturacion',      description: 'Solicitudes y consultas de facturación',            color: '#F59E0B', icon: 'FileText',       sortOrder: 4 },
    { name: 'Eventos y Grupos',     slug: 'eventos',          description: 'Eventos privados, celebraciones, grupos grandes',   color: '#EC4899', icon: 'PartyPopper',    sortOrder: 5 },
    { name: 'Alergias / Dietético', slug: 'alergias',         description: 'Alérgenos, intolerancias, opciones especiales',     color: '#14B8A6', icon: 'Wheat',          sortOrder: 6 },
    { name: 'Objetos Perdidos',     slug: 'objetos_perdidos', description: 'Objetos olvidados o perdidos en el local',          color: '#6366F1', icon: 'Search',         sortOrder: 7 },
    { name: 'Colaboraciones',       slug: 'colaboraciones',   description: 'Propuestas comerciales, proveedores, partnerships', color: '#78716C', icon: 'Handshake',      sortOrder: 8 },
    { name: 'Empleo',               slug: 'empleo',           description: 'CVs, solicitudes de empleo, consultas laborales',   color: '#0EA5E9', icon: 'Briefcase',      sortOrder: 9 },
    { name: 'Bonos Regalo',         slug: 'bonos',            description: 'Consultas sobre bonos regalo y tarjetas',           color: '#D946EF', icon: 'Gift',           sortOrder: 10 },
    { name: 'Spam / No Relevante',  slug: 'spam',             description: 'Publicidad, newsletters, emails automáticos',       color: '#9CA3AF', icon: 'Ban',            sortOrder: 99 },
    { name: 'Otro',                 slug: 'otro',             description: 'Emails que no encajan en ninguna categoría',        color: '#6B7280', icon: 'MoreHorizontal', sortOrder: 100 },
  ];

  const createdParents: Record<string, string> = {};
  for (const cat of parentCategories) {
    const result = await prisma.emailCategory.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    createdParents[cat.slug] = result.id;
  }

  const subCategories = [
    { name: 'Reserva Nueva',             slug: 'reservas_nueva',         parentSlug: 'reservas',      color: '#3B82F6', icon: 'CalendarPlus',    sortOrder: 1, description: 'Solicitud de nueva reserva' },
    { name: 'Modificación de Reserva',   slug: 'reservas_modificacion',  parentSlug: 'reservas',      color: '#3B82F6', icon: 'CalendarClock',   sortOrder: 2, description: 'Cambio de fecha, hora o número de personas' },
    { name: 'Cancelación de Reserva',    slug: 'reservas_cancelacion',   parentSlug: 'reservas',      color: '#EF4444', icon: 'CalendarX2',      sortOrder: 3, description: 'Solicitud de cancelación' },
    { name: 'Confirmación de Reserva',   slug: 'reservas_confirmacion',  parentSlug: 'reservas',      color: '#22C55E', icon: 'CalendarCheck',   sortOrder: 4, description: 'Confirmación de asistencia' },
    { name: 'Queja de Servicio',         slug: 'reclamaciones_servicio', parentSlug: 'reclamaciones', color: '#EF4444', icon: 'UserX',           sortOrder: 1, description: 'Queja sobre atención, tiempos de espera o trato' },
    { name: 'Queja de Comida',           slug: 'reclamaciones_comida',   parentSlug: 'reclamaciones', color: '#EF4444', icon: 'UtensilsCrossed', sortOrder: 2, description: 'Queja sobre calidad, sabor o presentación' },
    { name: 'Queja de Cobro',            slug: 'reclamaciones_cobro',    parentSlug: 'reclamaciones', color: '#EF4444', icon: 'Receipt',         sortOrder: 3, description: 'Error en cuenta, cobro duplicado o discrepancia' },
    { name: 'Horarios y Disponibilidad', slug: 'consultas_horarios',     parentSlug: 'consultas',     color: '#8B5CF6', icon: 'Clock',           sortOrder: 1, description: 'Preguntas sobre horarios y días de apertura' },
    { name: 'Menú y Carta',              slug: 'consultas_menu',         parentSlug: 'consultas',     color: '#8B5CF6', icon: 'BookOpen',        sortOrder: 2, description: 'Preguntas sobre platos, carta y opciones' },
    { name: 'Servicios e Instalaciones', slug: 'consultas_servicios',    parentSlug: 'consultas',     color: '#8B5CF6', icon: 'Building2',       sortOrder: 3, description: 'Preguntas sobre parking, terraza, wifi o accesibilidad' },
    { name: 'Solicitud de Factura',      slug: 'facturacion_solicitud',  parentSlug: 'facturacion',   color: '#F59E0B', icon: 'FilePlus',        sortOrder: 1, description: 'Pide factura con datos fiscales' },
    { name: 'Error en Factura',          slug: 'facturacion_error',      parentSlug: 'facturacion',   color: '#F59E0B', icon: 'FileWarning',     sortOrder: 2, description: 'Factura incorrecta o con datos erróneos' },
  ];

  for (const sub of subCategories) {
    const { parentSlug, ...data } = sub;
    await prisma.emailCategory.upsert({
      where: { slug: data.slug },
      update: {},
      create: { ...data, parentId: createdParents[parentSlug] },
    });
  }

  console.log('✅ ATC catalogs seeded');

  // --- RESTAURANT LOCATIONS (Voltereta) ---
  console.log('📍 Seeding restaurant locations...');
  const locations = [
    { id: 'loc-casa',       name: 'Voltereta Casa',          city: 'Valencia',  address: 'Av. de las Cortes Valencianes, 26, 46015 Valencia', aemetMunicipioId: '46250', latitude: 39.4699, longitude: -0.3763 },
    { id: 'loc-bali',       name: 'Voltereta Bali',          city: 'Valencia',  address: 'Gran Vía Marqués del Turia, 59, 46005 Valencia',    aemetMunicipioId: '46250', latitude: 39.4667, longitude: -0.3667 },
    { id: 'loc-manhattan',  name: 'Voltereta Manhattan',     city: 'Valencia',  address: 'Calle Isabel la Católica, 11, 46004 Valencia',      aemetMunicipioId: '46250', latitude: 39.4697, longitude: -0.3775 },
    { id: 'loc-kioto',      name: 'Voltereta Kioto',         city: 'Valencia',  address: 'Pg. de l\'Albereda, 51, 46023 Valencia',            aemetMunicipioId: '46250', latitude: 39.4700, longitude: -0.3600 },
    { id: 'loc-oneburger',  name: 'One Burger Laundry',      city: 'Valencia',  address: 'Carrer de Misser Mascó, 42, 46010 Valencia',        aemetMunicipioId: '46250', latitude: 39.4750, longitude: -0.3700 },
    { id: 'loc-nz',         name: 'Voltereta Nueva Zelanda', city: 'Zaragoza',  address: 'C/ La Salle, 4, 50006 Zaragoza',                    aemetMunicipioId: '50297', latitude: 41.6488, longitude: -0.8891 },
    { id: 'loc-paris',      name: 'Voltereta París',         city: 'Sevilla',   address: 'C/ Santo Domingo de la Calzada, 3, 41018 Sevilla',  aemetMunicipioId: '41091', latitude: 37.3886, longitude: -5.9823 },
    { id: 'loc-tanzania',   name: 'Voltereta Tanzania',      city: 'Alicante',  address: 'C/ Navas, 33, 03001 Alicante',                      aemetMunicipioId: '03014', latitude: 38.3452, longitude: -0.4815 },
    { id: 'loc-toscana',    name: 'Voltereta Toscana',       city: 'Córdoba',   address: 'C/ Manríquez 4, 14003 Córdoba',                     aemetMunicipioId: '14021', latitude: 37.8882, longitude: -4.7794 },
  ];
  for (const loc of locations) {
    await prisma.restaurantLocation.upsert({
      where: { id: loc.id },
      update: { name: loc.name, city: loc.city, address: loc.address, aemetMunicipioId: loc.aemetMunicipioId, latitude: loc.latitude, longitude: loc.longitude },
      create: loc,
    });
  }
  console.log('✅ Restaurant locations seeded');

  // --- WEATHER CONFIG (defaults) ---
  await prisma.weatherConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      rainProbability: 50,
      rainMm: 5,
      windSpeed: 40,
      windGust: 60,
      temperatureLow: 8,
      temperatureHigh: 36,
      serviceHoursStart: 12,
      serviceHoursEnd: 0,
    },
  });
  console.log('✅ Weather config seeded');

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
