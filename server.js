/**
 * Marina Pflegebox Konfigurator – Mail API (lokal/Server)
 * Start:  npm install  &&  npm start
 * Dann im Browser: http://localhost:3000
 *
 * SMTP Zugangsdaten in .env setzen (siehe .env.example)
 */
const path = require('path');
const express = require('express');
const nodemailer = require('nodemailer');

const app = express();

// JSON kann groß sein (Base64 PDF)
app.use(express.json({ limit: '35mb' }));

// Static Files (Konfigurator)
app.use(express.static(__dirname, { extensions: ['html'] }));

app.post('/api/send-email', async (req, res) => {
  try {
    const { to, subject, text, filename, pdfBase64 } = req.body || {};
    if (!to || !subject || !text || !filename || !pdfBase64) {
      return res.status(400).json({ error: 'Fehlende Felder: to, subject, text, filename, pdfBase64' });
    }

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';
    const from = process.env.FROM_EMAIL || user;

    if (!host || !user || !pass || !from) {
      return res.status(500).json({ error: 'SMTP nicht konfiguriert. Bitte .env prüfen.' });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass }
    });

    await transporter.sendMail({
      from,
      to,
      subject,
      text,
      attachments: [
        {
          filename,
          content: Buffer.from(pdfBase64, 'base64'),
          contentType: 'application/pdf'
        }
      ]
    });

    return res.json({ ok: true });
  } catch (e) {
    console.error('send-email error:', e);
    return res.status(500).json({ error: e && e.message ? e.message : 'Unbekannter Fehler' });
  }
});

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`Konfigurator läuft auf http://localhost:${PORT}`);
});
