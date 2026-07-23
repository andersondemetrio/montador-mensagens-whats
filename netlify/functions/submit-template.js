// Netlify Function — recebe o formulário do site e:
//  1) posta no Slack via Incoming Webhook
//  2) envia e-mail (analista responsável + cópia para o cliente) via Gmail SMTP
//
// Tanto a URL do webhook quanto as credenciais de e-mail ficam só aqui no
// servidor (variáveis de ambiente), nunca expostas no HTML/JS do navegador.

const nodemailer = require("nodemailer");

// Mesmo mapeamento que a Mari fez no Apps Script (analystEmails), só que
// agora vivendo aqui no servidor da Netlify Function.
const analystEmails = {
  "Mariele Santos": "mariele.santos@intelipost.com.br",
  "Alexandre Jesus": "alexandre.jesus@intelipost.com.br",
  "Anderson Demetrio": "anderson.demetrio@intelipost.com.br",
  "Marina Beatriz": "marina.beatriz@intelipost.com.br",
  "Renato Mansini": "renato.mansini@intelipost.com.br",
  "Larissa Amaral": "larissa.amaral@intelipost.com.br",
  "Red Junior": "red.junior@intelipost.com.br",
  "Kamily Santos": "kamily.santos@intelipost.com.br",
  "Nathália Goulart": "nathalia.goulart@intelipost.com.br",
  "Nathy Louise": "nathy.louise@intelipost.com.br",
  "Luana Santos": "luana.santos@intelipost.com.br",
  "Dayane Costa": "dayane.costa@intelipost.com.br",
  "Débora Santos": "debora.santos@intelipost.com.br",
  "Douglas Cursino": "douglas.cursino@intelipost.com.br",
  "Eduardo Barbosa": "eduardo.barbosa@intelipost.com.br",
  "Greice Santos": "greice.santos@intelipost.com.br",
  "Juliana Fernandes": "juliana.fernandes@intelipost.com.br",
  "Lucas Stanley": "lucas.stanley@intelipost.com.br",
  "Wellington Silva": "wellington.silva@intelipost.com.br",
};

// Ajuste os e-mails acima para os endereços reais de cada analista.

async function sendNotificationEmail(data) {
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

  // Se as credenciais não estiverem configuradas, simplesmente pula o
  // envio de e-mail (o post no Slack continua funcionando normalmente).
  if (!gmailUser || !gmailAppPassword) {
    return { skipped: true, reason: "GMAIL_USER/GMAIL_APP_PASSWORD não configurados." };
  }

  const { clientName, clientEmail, analystName, whatsappStatus, templateText } = data;
  const analystEmail = analystEmails[analystName] || gmailUser;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailUser, pass: gmailAppPassword },
  });

  const subject = `Novo Template de WhatsApp - Cliente: ${clientName}`;
  const bodyHtml =
    `Olá,<br><br>` +
    `Um novo template de WhatsApp foi submetido na nossa base!<br><br>` +
    `<strong>Empresa / Cliente:</strong> ${clientName}<br>` +
    `<strong>E-mail do cliente:</strong> ${clientEmail}<br>` +
    `<strong>Analista responsável:</strong> ${analystName}<br>` +
    `<strong>Status WhatsApp:</strong> ${whatsappStatus}<br><br>` +
    `<strong>Mensagem:</strong><br><pre style="white-space:pre-wrap; font-family:inherit;">${templateText}</pre>`;

  // E-mail interno para o analista responsável
  await transporter.sendMail({
    from: gmailUser,
    to: analystEmail,
    subject,
    html: bodyHtml,
  });

  // Cópia para o cliente, confirmando o recebimento do template preenchido
  await transporter.sendMail({
    from: gmailUser,
    to: clientEmail,
    subject: `Recebemos seu template de WhatsApp - ${clientName}`,
    html:
      `Olá,<br><br>` +
      `Recebemos o seu template de WhatsApp para homologação. Segue uma cópia do que foi enviado:<br><br>` +
      `<strong>Status WhatsApp:</strong> ${whatsappStatus}<br><br>` +
      `<pre style="white-space:pre-wrap; font-family:inherit;">${templateText}</pre><br>` +
      `Em breve nosso time (${analystName}) dará retorno sobre a homologação.`,
  });

  return { skipped: false };
}

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

    // O e-mail é um "bônus": se ele falhar, não derruba o envio pro cliente,
    // já que o registro no Slack (fonte da verdade) já foi feito com sucesso.
    let emailWarning;
    try {
      await sendNotificationEmail(data);
    } catch (emailErr) {
      emailWarning = String(emailErr);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, emailWarning }),
    };
  } catch (err) {
    return {
      statusCode: 502,
      body: JSON.stringify({ success: false, error: String(err) }),
    };
  }
};
