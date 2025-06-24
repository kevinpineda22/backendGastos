import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// --- CONFIGURACIÓN CORREGIDA PARA OUTLOOK/OFFICE 365 ---
// Se elimina `service: 'gmail'` y se añaden los datos del servidor manualmente.
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true', // secure:false para STARTTLS en el puerto 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


export const sendEmail = async ({ to, subject, htmlContent, attachments = [] }) => {
  try {
    const info = await transporter.sendMail({
      from: `"Merkahorro" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: htmlContent,
      text: textContent,
      attachments,
    });

    console.log(`📨 Correo enviado a ${to}:`, info.messageId);
    return info; // Devolvemos la información del envío exitoso.
  } catch (error) {
    console.error('❌ Error al enviar el correo:', error);
    // Es una buena práctica relanzar el error para que la función que llama a sendEmail
    // sepa que algo salió mal y pueda manejarlo adecuadamente.
    throw error;
  }
};