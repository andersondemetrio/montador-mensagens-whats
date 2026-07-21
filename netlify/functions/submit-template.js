// Netlify Function — recebe o formulário do site e envia para o Slack via
// Incoming Webhook. A URL do webhook fica só aqui no servidor (variável de
// ambiente SLACK_WEBHOOK_URL), nunca exposta no HTML/JS do navegador.

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error:
          "SLACK_WEBHOOK_URL não configurada nas variáveis de ambiente do Netlify.",
      }),
    };
  }

  let data;
  try {
    data = JSON.parse(event.body || "{}");
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, error: "JSON inválido." }),
    };
  }

  const { clientName, clientEmail, analystName, whatsappStatus, templateText } = data;

  if (!clientName || !clientEmail || !analystName || !whatsappStatus || !templateText) {
    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, error: "Campos obrigatórios faltando." }),
    };
  }

  const slackPayload = {
    text: `📲 Novo template WhatsApp enviado para homologação — *${clientName}*`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "📲 Novo template WhatsApp para homologação", emoji: true },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Empresa / Cliente:*\n${clientName}` },
          { type: "mrkdwn", text: `*E-mail:*\n${clientEmail}` },
          { type: "mrkdwn", text: `*Analista responsável:*\n${analystName}` },
          { type: "mrkdwn", text: `*Status WhatsApp:*\n${whatsappStatus}` },
        ],
      },
      { type: "divider" },
      {
        type: "section",
        text: { type: "mrkdwn", text: `*Mensagem:*\n\`\`\`${templateText}\`\`\`` },
      },
    ],
  };

  try {
    const resp = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(slackPayload),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return {
        statusCode: 502,
        body: JSON.stringify({ success: false, error: `Slack respondeu ${resp.status}: ${errText}` }),
      };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    return {
      statusCode: 502,
      body: JSON.stringify({ success: false, error: String(err) }),
    };
  }
};
