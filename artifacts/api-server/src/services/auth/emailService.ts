/**
 * Email Service
 * Serviço para envio de emails (recuperação de senha, verificação de email)
 * 
 * NOTA: Este é um stub que pode ser implementado com:
 * - SMTP (nodemailer)
 * - SendGrid
 * - Mailgun
 * - AWS SES
 * - Resend
 * - etc.
 */

// Configuração
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || "log"; // log, smtp, sendgrid, etc.
const EMAIL_FROM = process.env.EMAIL_FROM || "noreply@zarith.com";

// Interface para email
export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Interface para template de email
export interface EmailTemplateData {
  name?: string;
  email?: string;
  resetLink?: string;
  verificationLink?: string;
  token?: string;
  expiresIn?: string;
}

// Templates de email
const templates = {
  verification: (data: EmailTemplateData): { subject: string; html: string; text: string } => ({
    subject: "Verifique seu email - Zarith",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Bem-vindo ao Zarith!</h2>
        <p>Olá ${data.name || "Usuário"},</p>
        <p>Para verificar seu email, clique no link abaixo:</p>
        <p><a href="${data.verificationLink}" style="display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">Verificar Email</a></p>
        <p>Ou copie e cole este link no seu navegador:</p>
        <p><code>${data.verificationLink}</code></p>
        <p>Este link expira em ${data.expiresIn || "24 horas"}.</p>
        <p>Se você não solicitou esta verificação, ignore este email.</p>
        <p>Atenciosamente,<br>Equipe Zarith</p>
      </div>
    `,
    text: `
      Bem-vindo ao Zarith!
      
      Olá ${data.name || "Usuário"},
      
      Para verificar seu email, clique no link abaixo:
      ${data.verificationLink}
      
      Ou copie e cole este link no seu navegador.
      
      Este link expira em ${data.expiresIn || "24 horas"}.
      
      Se você não solicitou esta verificação, ignore este email.
      
      Atenciosamente,
      Equipe Zarith
    `,
  }),

  resetPassword: (data: EmailTemplateData): { subject: string; html: string; text: string } => ({
    subject: "Recuperação de Senha - Zarith",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Recuperação de Senha</h2>
        <p>Olá ${data.name || "Usuário"},</p>
        <p>Recebemos uma solicitação para redefinir a senha da sua conta Zarith.</p>
        <p>Para redefinir sua senha, clique no link abaixo:</p>
        <p><a href="${data.resetLink}" style="display: inline-block; padding: 10px 20px; background: #ff0080; color: white; text-decoration: none; border-radius: 5px;">Redefinir Senha</a></p>
        <p>Ou copie e cole este link no seu navegador:</p>
        <p><code>${data.resetLink}</code></p>
        <p>Este link expira em ${data.expiresIn || "1 hora"}.</p>
        <p><strong>Se você não solicitou esta recuperação, ignore este email e sua senha permanecerá inalterada.</strong></p>
        <p>Atenciosamente,<br>Equipe Zarith</p>
      </div>
    `,
    text: `
      Recuperação de Senha
      
      Olá ${data.name || "Usuário"},
      
      Recebemos uma solicitação para redefinir a senha da sua conta Zarith.
      
      Para redefinir sua senha, clique no link abaixo:
      ${data.resetLink}
      
      Ou copie e cole este link no seu navegador.
      
      Este link expira em ${data.expiresIn || "1 hora"}.
      
      Se você não solicitou esta recuperação, ignore este email e sua senha permanecerá inalterada.
      
      Atenciosamente,
      Equipe Zarith
    `,
  }),
};

// Implementações de provedores de email
const providers = {
  log: {
    send: async (options: EmailOptions) => {
      console.log("[Email Service] Enviando email:");
      console.log("  To:", options.to);
      console.log("  Subject:", options.subject);
      console.log("  Text:", options.text?.substring(0, 100) + "...");
      console.log("  HTML:", options.html?.substring(0, 100) + "...");
      console.log("[Email Service] Email 'enviado' (modo log)");
      return { success: true, messageId: "log-" + Date.now() };
    },
  },
  
  smtp: {
    send: async (options: EmailOptions) => {
      // Implementar com nodemailer
      throw new Error("Provedor SMTP não implementado. Configure EMAIL_PROVIDER=smtp e implemente este método.");
    },
  },
  
  sendgrid: {
    send: async (options: EmailOptions) => {
      // Implementar com SendGrid
      throw new Error("Provedor SendGrid não implementado. Configure EMAIL_PROVIDER=sendgrid e implemente este método.");
    },
  },
};

// Obter provedor
function getProvider() {
  const provider = providers[EMAIL_PROVIDER as keyof typeof providers];
  if (!provider) {
    throw new Error(`Provedor de email não encontrado: ${EMAIL_PROVIDER}`);
  }
  return provider;
}

export const emailService = {
  /**
   * Enviar email
   */
  async send(options: EmailOptions) {
    const provider = getProvider();
    return await provider.send(options);
  },

  /**
   * Enviar email de verificação
   */
  async sendVerificationEmail(email: string, name: string, verificationLink: string, expiresIn: string) {
    const template = templates.verification({ name, email, verificationLink, expiresIn });
    
    return this.send({
      to: email,
      from: EMAIL_FROM,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  },

  /**
   * Enviar email de recuperação de senha
   */
  async sendResetPasswordEmail(email: string, name: string, resetLink: string, expiresIn: string) {
    const template = templates.resetPassword({ name, email, resetLink, expiresIn });
    
    return this.send({
      to: email,
      from: EMAIL_FROM,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  },

  /**
   * Validar configuração de email
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (EMAIL_PROVIDER !== "log") {
      if (!EMAIL_FROM) {
        errors.push("EMAIL_FROM não configurado");
      }
      
      if (EMAIL_PROVIDER === "smtp") {
        if (!process.env.SMTP_HOST) errors.push("SMTP_HOST não configurado");
        if (!process.env.SMTP_PORT) errors.push("SMTP_PORT não configurado");
        if (!process.env.SMTP_USER) errors.push("SMTP_USER não configurado");
        if (!process.env.SMTP_PASSWORD) errors.push("SMTP_PASSWORD não configurado");
      }
      
      if (EMAIL_PROVIDER === "sendgrid") {
        if (!process.env.SENDGRID_API_KEY) errors.push("SENDGRID_API_KEY não configurado");
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  },
};
