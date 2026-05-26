// Vercel Serverless Function - /api/send-emails.js
// Sends supplier reports via SendGrid

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { emails } = req.body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: 'No emails provided' });
    }

    const results = [];

    // Send each email through SendGrid
    for (const email of emails) {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: email.to }],
              subject: email.subject
            }
          ],
          from: {
            email: process.env.FROM_EMAIL,        // e.g. reports@www.ignitecs.co
            name: process.env.FROM_NAME || 'Emberwatch Reports'
          },
          reply_to: process.env.REPLY_TO_EMAIL
            ? { email: process.env.REPLY_TO_EMAIL, name: process.env.REPLY_TO_NAME || undefined }
            : undefined,
          content: [
            {
              type: 'text/plain',
              value: email.body
            }
          ]
        })
      });

      if (response.ok) {
        results.push({ supplier: email.supplier, to: email.to, status: 'sent' });
      } else {
        const errorText = await response.text();
        console.error(`Failed to send to ${email.to}:`, errorText);
        results.push({ supplier: email.supplier, to: email.to, status: 'failed', error: errorText });
      }
    }

    const sentCount = results.filter(r => r.status === 'sent').length;
    const failedCount = results.filter(r => r.status === 'failed').length;

    return res.status(200).json({
      success: failedCount === 0,
      sent: sentCount,
      failed: failedCount,
      results
    });

  } catch (error) {
    console.error('Send error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
