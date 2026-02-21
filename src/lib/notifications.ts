/**
 * Servicio de notificaciones para alertas meteorológicas.
 * Placeholders que fallan silenciosamente si no están configurados.
 */

interface AlertNotification {
  id: string
  alertType: string
  severity: string
  description: string
  forecastDate: Date
}

export async function sendSlackNotification(alerts: AlertNotification[]): Promise<boolean> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) {
    console.warn("[notifications] SLACK_WEBHOOK_URL no configurada — omitiendo notificación Slack")
    return false
  }

  try {
    const blocks = alerts.map((a) => ({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${a.alertType}* (${a.severity})\n${a.description}\nFecha: ${a.forecastDate.toISOString().split("T")[0]}`,
      },
    }))

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `⚠️ ${alerts.length} alerta(s) meteorológica(s) detectada(s)`,
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: "⚠️ Alertas Meteorológicas" },
          },
          ...blocks,
        ],
      }),
    })

    return res.ok
  } catch (error) {
    console.error("[notifications] Error enviando a Slack:", error)
    return false
  }
}

export async function sendEmailNotification(alerts: AlertNotification[]): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY
  const recipientEmail = process.env.WEATHER_ALERT_EMAIL
  if (!resendKey || !recipientEmail) {
    console.warn("[notifications] RESEND_API_KEY o WEATHER_ALERT_EMAIL no configuradas — omitiendo email")
    return false
  }

  try {
    const alertsList = alerts
      .map((a) => `• ${a.alertType} (${a.severity}): ${a.description} — ${a.forecastDate.toISOString().split("T")[0]}`)
      .join("\n")

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "alertas@dreamland.app",
        to: recipientEmail,
        subject: `⚠️ ${alerts.length} alerta(s) meteorológica(s) — Dreamland`,
        text: `Se han detectado las siguientes alertas meteorológicas:\n\n${alertsList}\n\nRevisa el panel de operaciones para más detalles.`,
      }),
    })

    return res.ok
  } catch (error) {
    console.error("[notifications] Error enviando email:", error)
    return false
  }
}
