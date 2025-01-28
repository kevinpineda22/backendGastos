import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  secure: true, // Usa SSL
  port: 465, // Puerto para SSL
  tls: {
    rejectUnauthorized: false, // Permite certificados no autorizados (útil para pruebas)
  },
});

export const sendEmail = async (to, subject, htmlContent) => {
  try {
    await transporter.sendMail({
      from: `"Merkahorro" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: htmlContent, // Asegúrate de usar la propiedad `html` para correos con diseño
    });
    console.log(`📨 Correo enviado a ${to}`);
  } catch (error) {
    console.error('❌ Error al enviar el correo:', error);
  }
};