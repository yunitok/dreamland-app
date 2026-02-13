import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Map of Task ID to Technical Notes (Markdown)
const updates: Record<string, string> = {
  // 1. Conector API Jurest
  'cmll5dpgp000hegukuvfi5y0f': `
- **Integration:** Research Jurest API documentation to find endpoints for retrieving dish details by ID.
- **Data Mapping:** Create a mapping interface between Jurest response fields and Sherlock's internal data model (e.g., \`Dish\` entry).
- **Service:** Implement \`JurestService\` with a method \`getDishDetails(externalId: string)\`.
- **Security:** securely store API credentials in \`.env\`.
- **Error Handling:** Handle cases where ID is not found or API is unreachable.
`,

  // 2. Conector API Web/WordPress
  'cmll5dpxg000kegukebcmakzj': `
- **API:** Use WooCommerce REST API v3.
- **Functionality:** Implement \`updateProductStatus(sku: string, status: 'publish' | 'private')\`.
- **Automation:** Create a webhook or scheduled job that checks Sherlock's stock status and pushes updates to WordPress.
- **Safety:** Implement a "dry-run" mode to test synchronization without affecting live production data initially.
`,

  // 3. Formulario de Solicitud
  'cmll5dqn8000pegukxpuxp7qk': `
- **Tech Stack:** React Hook Form + Zod for schema validation.
- **Components:** Create a dynamic \`RequestForm\` component.
- **Logic:**
    - If \`type === 'Substitution'\`, render a dynamic dropdown to select the "Product to Replace".
    - If \`type === 'New'\`, require "Target Launch Date".
- **Validation:** Ensure all required fields for the specific request type are filled before submission.
`,

  // 4. Visor "Drill-Down"
  'cmll5dr5c000teguk9njzghhh': `
- **Route:** Create \`/kitchen/viewer/[dishId]\`.
- **UI:** Mobile-first design using Tailwind CSS.
- **Component:** Recursive \`RecipeTree\` component to display ingredients and sub-recipes (exploded view).
- **Optimization:** Use \`next/image\` for optimized loading of the "Glory Shot" and step-by-step photos.
`,

  // 5. Normalización de Taxonomías
  'cmll5do7v0008eguk57aosaia': `
- **Database:** Create \`Category\` and \`Venue\` models (or Enums if static) in Prisma.
- **Migration:** Write a script \`scripts/normalize-taxonomies.ts\` to map existing free-text strings in the database to these new canonical values.
- **Constraint:** Update \`Dish\` model to use foreign keys to \`Category\` instead of string fields.
`,

  // 6. Definición de Campos de "Protocolo de Sala"
  'cmll5doq5000cegukxwba2xxq': `
- **Schema:** Add \`serviceProtocol\` (Text or JSON) field to the \`Dish\` (or \`SherlockAudit\` context) model.
- **UI:** Update the Dish Editor form to include a "Service Protocol" textarea or rich text editor.
- **Usage:** This field will be the source of truth for the "Manual del Buen Camarero".
`,

  // 7. Integración Feedback (Cover/Google)
  'cmll5dv24001iegukaj5jzot2': `
- **Ingestion:** Investigate access to Google My Business API or CoverManager API.
- **Alternative:** Implement a CSV import feature for review exports if API is not feasible.
- **Analysis:** (Future) Simple keyword matching to tag reviews with dish names automatically (e.g., "The paella was salty" -> tags "Paella").
`,

  // 8. Diseño del Esquema Relacional "Funnel de Altas"
  'cmll5dnqv0004eguke9m8tzq0': `
- **Core Models:** Define \`Dish\`, \`Ingredient\`, \`SubRecipe\`, \`Venue\`.
- **Relations:** 
    - \`Dish\` <-> \`Ingredient\` (Many-to-Many with quantity).
    - \`Dish\` <-> \`Venue\` (Many-to-Many for availability).
    - \`SubRecipe\` as a specialized \`Dish\` or recursive \`Ingredient\` structure.
- **Refactor:** Move away from flat "Excel-style" data to a normalized relational structure in Postgres.
`,

  // 9. Generador de QRs Dinámicos
  'cmll5drjt000veguk62utun4t': `
- **Library:** Use \`qrcode.react\` or similar.
- **Endpoint:** Create a view \`/dish/[id]/qr\` that displays the QR code and print-friendly label.
- **Destination:** The QR should point to the production URL of the "Drill-Down" viewer (Task 1.4).
`,

  // 10. Bot de "Checklist Web" (Auditoría)
  'cmll5ds8w000zegukyqete8jy': `
- **Scheduler:** Set up a Cron job (Vercel Cron or GitHub Action).
- **Logic:**
    1. Fetch active products from WordPress API.
    2. Fetch active products from Sherlock DB.
    3. Diff the lists.
- **Alerting:** If \`Web.active\` AND \`Sherlock.outOfStock\`, send alert to Slack/Email.
`,

  // 11. Gestión de "Externalizables"
  'cmll5dsog0012egukbb1grgfk': `
- **Schema:** Add \`isExternalizable\` (Boolean) and \`externalizationStatus\` (Enum: CANDIDATE, REVIEWING, APPROVED, REJECTED) to \`Ingredient\` model.
- **Workflow:** Create a dedicated view/list in the UI filtering by \`isExternalizable === true\`.
`,

  // 12. Notificaciones Inteligentes Centralizadas
  'cmll5dt470015eguk9x91wtkz': `
- **Infrastructure:** Implement an Event Bus or Observer pattern.
- **Events:** \`DISH_CREATED\`, \`DISH_DISCONTINUED\`, \`STOCK_LOW\`.
- **Handlers:** 
    - \`MarketingNotifier\`: Listens to \`DISH_CREATED\`.
    - \`OpsNotifier\`: Listens to \`DISH_DISCONTINUED\`.
- **Integration:** Use Slack Webhooks for notifications.
`,

  // 13. Lógica de Alérgenos Cruzada
  'cmll5dtu3001aegukf4b7zviz': `
- **Algorithm:** Implement recursive function \`getAllergens(dish)\` which aggregates allergens from all its ingredients and sub-recipes.
- **Optimization:** Store computed allergens in the DB and update only when ingredients change (write-heavy, read-light approach).
`,

  // 14. Chatbot "Allergen Helper" (Sala)
  'cmll5duaw001degukedocsr4r': `
- **AI Agent:** Leverage existing Chat Agent infrastructure.
- **Context:** Inject \`Dish\` + \`Allergens\` data into the context window (or use RAG if dataset is large).
- **Prompt:** "You are an allergen safety assistant. Given a user's allergy, verify against the menu database and list SAFE dishes only."
`,

  // 15. Disparador de Reformulación (Trigger)
  'cmll5dvj4001legukfs4qxczt': `
- **Monitor:** Scheduled job to check \`costPercentage\` vs \`targetCost\`.
- **Action:** If \`current > target\`, automatically create a new Task in "R&D Backlog" titled "Reformulate [Dish Name] - Cost Deviation".
- **Link:** Link the new task to the Dish entity.
`,

  // 16. Flujo de Vídeo-Formación
  'cmll5dw52001pegukklfie4ml': `
- **Field:** Add \`trainingVideoUrl\` to \`Dish\` model.
- **UI:** Integrate a video player component (iframe for YouTube/Vimeo) in the Dish Detail view.
- **Validation:** Regex check to ensure valid video URL format.
`,

  // 17. Digitalización del "Manual del Buen Camarero"
  'cmll5dwhx001qeguk3xmesfy7': `
- **Generation:** Dynamic page \`/manual/service\` that iterates over active dishes.
- **Content:** Displays Name, Photo, and \`serviceProtocol\` text.
- **Export:** Add \`@media print\` CSS styles to ensure it prints cleanly to PDF.
`
};

async function main() {
  console.log('🚀 Starting Technical Notes Update for Sherlock Tasks...');

  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    let updatedCount = 0;
    const taskIds = Object.keys(updates);

    for (const taskId of taskIds) {
      console.log(`📝 Updating task ${taskId}...`);
      
      try {
        await prisma.task.update({
          where: { id: taskId },
          data: {
            technicalNotes: updates[taskId].trim(),
          },
        });
        updatedCount++;
        console.log(`✅ Updated: ${taskId}`);
      } catch (err) {
        console.error(`❌ Failed to update task ${taskId}:`, err);
      }
    }

    console.log(`\n🎉 Finished! Updated ${updatedCount} out of ${taskIds.length} tasks.`);
    
  } catch (error) {
    console.error('❌ Critical error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
