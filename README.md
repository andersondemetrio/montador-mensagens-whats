# Simulador de Mensagens WhatsApp — Intelipost

App web estático (HTML + CSS + JS puro, sem build) que reproduz o simulador
de templates original, incluindo:

- Lista de variáveis por categoria (clique para inserir no texto)
- 6 templates prontos (Criado, Despachado, Em Trânsito, Saiu para Entrega,
  Falha na Entrega, Entregue) com botão "Copiar e Usar"
- Prévia em tempo real no formato "bolha do WhatsApp"
- Validador das regras da Meta (Utilidade x Marketing, início/fim com
  variável, emojis proibidos, urgência artificial, pesquisas de feedback)
- Formulário de homologação (empresa, e-mail, analista, status)
- Tela de sucesso após o envio
- Guia de regras da Meta com accordions

## Envio para o Slack

O botão **"Enviar formulário"** chama uma **Netlify Function**
(`netlify/functions/submit-template.js`), que formata os dados e posta no
seu canal do Slack via Incoming Webhook.

**Importante:** a URL do webhook NUNCA fica no HTML/JS do navegador (isso
exporia publicamente o link e qualquer pessoa poderia postar no seu canal).
Ela fica só no servidor, como variável de ambiente.

### Passo a passo para configurar

1. Publique o site no Netlify (veja abaixo)
2. No painel do site: **Site configuration → Environment variables → Add a variable**
3. Crie a variável:
   - **Key:** `SLACK_WEBHOOK_URL`
   - **Value:** SLACK_WEBHOOK_URL=<YOUR_SLACK_WEBHOOK_URL>`
4. Clique em **Deploy** novamente (ou "Trigger deploy") para a function
   pegar a variável nova
5. Pronto — toda submissão do formulário vai cair no canal configurado
   nesse webhook

Se quiser trocar de canal no futuro, é só atualizar essa variável de
ambiente no Netlify — não precisa mexer no código.

## Envio de e-mail (grátis, via Gmail)

Além de postar no Slack, a mesma function agora também envia e-mail: uma
cópia para o **analista responsável** (mapeado em `analystEmails`, dentro de
`submit-template.js` — o mesmo mapeamento que a Mari usava no Google Apps
Script) e uma cópia de confirmação para o **cliente**.

Isso é feito com **Nodemailer + Gmail SMTP**, que é 100% gratuito (não é
nenhum serviço pago tipo SendGrid/Resend) — só precisa de uma conta Google
com **Verificação em duas etapas** ativada e uma **Senha de app**.

### Passo a passo

1. Na conta Gmail/Google Workspace que vai disparar os e-mails (ex: uma
   conta compartilhada tipo `homologacao@intelipost.com.br`), ative a
   **Verificação em duas etapas**: https://myaccount.google.com/security
2. Gere uma **Senha de app**: https://myaccount.google.com/apppasswords
   (escolha "Outro" e dê um nome, ex: "Montador WhatsApp")
3. No painel do site no Netlify: **Site configuration → Environment
   variables → Add a variable**, crie duas variáveis:
   - **Key:** `GMAIL_USER` — **Value:** o e-mail completo da conta (ex:
     `homologacao@intelipost.com.br`)
   - **Key:** `GMAIL_APP_PASSWORD` — **Value:** a senha de app gerada no
     passo 2 (16 caracteres, sem espaços)
4. Ajuste os e-mails de cada analista dentro do objeto `analystEmails` em
   `netlify/functions/submit-template.js` para os endereços reais
5. Clique em **Deploy** novamente (ou "Trigger deploy")

Se `GMAIL_USER`/`GMAIL_APP_PASSWORD` não estiverem configuradas, o envio de
e-mail simplesmente é pulado — o post no Slack continua funcionando
normalmente, então não tem risco de quebrar nada em produção enquanto isso
não for configurado.

**Se o Google Workspace da empresa bloquear o uso de Senha de app** (alguns
admins de Workspace desativam essa opção por política de segurança), a
alternativa gratuita mais simples é o [Resend](https://resend.com/) (100
e-mails/dia grátis, sem cartão de crédito) — nesse caso me avisem que eu
adapto a function pra usar a API deles no lugar do SMTP do Gmail.

## Como publicar no Netlify

Como agora o projeto tem uma Netlify Function, o deploy precisa ser via
**Git** (o drag-and-drop simples não roda functions):

1. Suba esta pasta inteira (`index.html`, `netlify.toml`, e a pasta
   `netlify/`) para um repositório no GitHub/GitLab/Bitbucket
2. No Netlify: **Add new site → Import an existing project**
3. Conecte o repositório
4. Configurações de build: deixe em branco / padrão — o `netlify.toml`
   já diz onde estão as functions e o que publicar
5. Depois do primeiro deploy, configure a variável de ambiente
   `SLACK_WEBHOOK_URL` como descrito acima e faça um novo deploy

## Estrutura de arquivos

```
whatsapp-template-builder/
├── index.html                        → o site em si
├── netlify.toml                      → configuração do Netlify
└── netlify/
    └── functions/
        └── submit-template.js        → recebe o form e posta no Slack
```
