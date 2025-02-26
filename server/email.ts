import sgMail from '@sendgrid/mail';
import { randomBytes } from 'crypto';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function sendVerificationEmail(email: string, code: string) {
  try {
    const msg = {
      to: email,
      from: process.env.SENDGRID_API_KEY.includes('SG.') ? 'noreply@cyberchat.com' : email, // fallback to recipient email if from email not set
      subject: 'Verify your CyberChat account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #0066cc;">Welcome to CyberChat!</h1>
          <p>Thank you for registering. To complete your account setup, please use the following verification code:</p>
          <div style="background-color: #f4f4f4; padding: 15px; text-align: center; margin: 20px 0;">
            <h2 style="color: #333; font-size: 24px; margin: 0;">${code}</h2>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p><strong>Note:</strong> If you didn't request this verification, please ignore this email.</p>
        </div>
      `,
    };

    await sgMail.send(msg);
  } catch (error) {
    console.error('SendGrid email error:', error);
    throw new Error('Failed to send verification email. Please try again later.');
  }
}

export function generateVerificationCode(): string {
  return randomBytes(3).toString('hex').toUpperCase();
}

export function getVerificationExpiry(): Date {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 10); // Code expires in 10 minutes
  return expiry;
}