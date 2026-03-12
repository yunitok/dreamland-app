/**
 * Registro centralizado de todos los agentes.
 *
 * Importar este módulo provoca el side-effect de registrar
 * todos los agentes en el agent-registry.
 *
 * Usar en: cron/agent-tick, API /agents, dashboard admin.
 */

// Los imports ejecutan registerAgent() como side-effect
import "@/modules/atc/agents/atc-agent"
import "@/modules/sherlock/agents/sherlock-agent"
import "@/modules/analytics/agents/analytics-agent"
import "@/modules/calidad/agents/calidad-agent"
