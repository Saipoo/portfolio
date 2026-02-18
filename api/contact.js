/**
 * Contact form API – sends name, email, subject, message to your inbox.
 * Deploy on Vercel; set env: RESEND_API_KEY, RECIPIENT_EMAIL (your email).
 * Get a free API key at https://resend.com (free tier: 100 emails/day).
 */

const RESEND_API = 'https://api.resend.com/emails';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const recipient = process.env.RECIPIENT_EMAIL;
  const apiKey = process.env.RESEND_API_KEY;

  if (!recipient || !apiKey) {
    return res.status(500).json({
      error: 'Server misconfiguration: set RECIPIENT_EMAIL and RESEND_API_KEY in environment.',
    });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const { name, email, subject, message } = body;
  if (!name || !email || !subject || !message) {
    return res.status(400).json({
      error: 'Missing required fields: name, email, subject, message',
    });
  }

  const html = `
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
    <p><strong>Message:</strong></p>
    <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
  `;

  try {
    const response = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: recipient,
        reply_to: email,
        subject: `[Portfolio] ${subject}`,
        html,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.message || 'Failed to send email',
      });
    }

    // Automated reply to the user who sent the message
    const autoReplyHtml = `
      <p>Hi ${escapeHtml(name)},</p>
      <p>Thanks for getting in touch! You've reached <strong>Poorna Seshaseyan</strong> — a Gen AI–focused developer who specializes in machine learning, NLP, and intelligent automation. He works on scalable AI pipelines, full-stack solutions, and has done 25+ projects across AI, full-stack development, and automation systems. You've reached the right person; he knows this space inside out.</p>
      <p>He's currently busy with a lot of work and projects but will take some time and get back to you soon. Stay tuned!</p>
      <p>— Poorna's portfolio</p>
    `;
    const autoReplyPayload = {
      from: 'Poorna Seshaseyan <onboarding@resend.dev>',
      to: [email.trim()],
      reply_to: [recipient],
      subject: `Re: ${subject} – Thanks for reaching out`,
      html: autoReplyHtml,
    };
    const autoReplyRes = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(autoReplyPayload),
    });
    const autoReplyData = await autoReplyRes.json().catch(() => ({}));
    if (!autoReplyRes.ok) {
      console.error('Auto-reply failed:', autoReplyRes.status, autoReplyData);
      return res.status(500).json({
        error: 'Message received, but auto-reply could not be sent. Please check server logs.',
        details: autoReplyData.message || autoReplyData,
      });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to send email' });
  }
}

function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return text.replace(/[&<>"']/g, (c) => map[c]);
}
