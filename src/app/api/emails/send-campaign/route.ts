import { NextRequest, NextResponse } from 'next/server';
// import nodemailer from 'nodemailer';

// TODO: Configurar com suas credenciais reais (Gmail, SendGrid, etc)
// const transporter = nodemailer.createTransport({
//   host: process.env.SMTP_HOST || 'smtp.gmail.com',
//   port: parseInt(process.env.SMTP_PORT || '587'),
//   secure: false,
//   auth: {
//     user: process.env.SMTP_USER || '',
//     pass: process.env.SMTP_PASSWORD || '',
//   },
// });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadIds, subject, message, expeditionName, expeditionLink } = body;

    if (!leadIds || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: leadIds, subject, message' },
        { status: 400 }
      );
    }

    // Simular envio de emails (em produção, integrar com banco de dados)
    const results = [];

    for (const leadId of leadIds) {
      try {
        // TODO: Buscar email do lead no banco de dados
        const leadEmail = `lead_${leadId}@example.com`; // Mock

        const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0369a1;">🏔️ ${expeditionName || 'Nova Expedição Disponível'}</h2>
            <p>${message}</p>
            ${expeditionLink ? `<p><a href="${expeditionLink}" style="background-color: #0369a1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ver Expedição</a></p>` : ''}
            <hr style="border: none; border-top: 1px solid #ccc; margin: 20px 0;">
            <p style="font-size: 12px; color: #666;">
              © 2024 4x4 Mundo Afora<br>
              Aventuras de Verdade no Sertão Brasileiro
            </p>
          </div>
        `;
        console.log('Email template prepared for:', leadEmail, 'with html:', htmlContent.substring(0, 50));

        // const mailOptions = {
        //   from: process.env.SMTP_USER || 'noreply@4x4mundoafora.com',
        //   to: leadEmail,
        //   subject: subject,
        //   html: htmlContent,
        // };

        // Simular envio (em produção, usar await transporter.sendMail(mailOptions))
        results.push({
          leadId,
          email: leadEmail,
          status: 'sent',
          timestamp: new Date(),
        });

        console.log(`📧 Email queued for ${leadEmail}`);
      } catch (error: any) {
        results.push({
          leadId,
          status: 'failed',
          error: error.message,
        });
      }
    }

    const successful = results.filter((r) => r.status === 'sent').length;
    const failed = results.filter((r) => r.status === 'failed').length;

    return NextResponse.json({
      success: true,
      message: `Campanha enviada: ${successful} emails com sucesso, ${failed} falhas`,
      results,
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error('Email campaign error:', error);
    return NextResponse.json(
      { error: error.message || 'Campaign send failed' },
      { status: 500 }
    );
  }
}
