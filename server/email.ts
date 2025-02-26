import nodemailer from 'nodemailer';
import { randomBytes } from 'crypto';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

export async function sendVerificationEmail(email: string, code: string) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Verify your CyberChat account',
    html: `
      <h1>Welcome to CyberChat!</h1>
      <p>Your verification code is: <strong>${code}</strong></p>
      <p>This code will expire in 10 minutes.</p>
    `
  };

  await transporter.sendMail(mailOptions);
}

export function generateVerificationCode(): string {
  return randomBytes(3).toString('hex').toUpperCase();
}

export function getVerificationExpiry(): Date {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 10); // Code expires in 10 minutes
  return expiry;
}
