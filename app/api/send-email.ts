import type { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, phone, email, subject, message, type, productName } = req.body;

  // Create the email content
  const mailOptions = {
    from: process.env.SMTP_FROM_EMAIL,
    to: 'ananyamangal@gmail.com',
    subject: type === 'brochure' ? 'Brochure Download Request' : 'Contact Form Submission',
    text: `
Type: ${type || 'contact'}
Name: ${name}
Phone: ${phone}
Email: ${email || '-'}
Subject: ${subject || '-'}
Product: ${productName || '-'}
Message: ${message || '-'}
    `,
  };

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send email' });
  }
} 