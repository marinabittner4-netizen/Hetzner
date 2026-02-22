# Marina Pflegebox Konfigurator (mit E-Mail Versand)

## Offline
Du kannst den Konfigurator weiterhin **offline** mit `index.html` öffnen.
➡️ Dann funktionieren aber **nur Downloads** – der E-Mail Versand braucht einen Server.

## E-Mail Versand aktivieren (empfohlen)
Damit der Button **„Bestellung erstellen“** die ausgefüllten PDFs automatisch per E-Mail versendet, starte den Konfigurator über den mitgelieferten Node-Server:

1) Node.js installieren (LTS)
2) Im Ordner (wo `server.js` liegt) öffnen:
```bash
npm install
npm start
```
3) Browser öffnen:
`http://localhost:3000`

### SMTP Zugangsdaten
- Datei `.env` anlegen (Vorlage: `.env.example`)
- SMTP Daten eintragen

## Button / Empfänger anpassen
In `index.html`:
- `ORDER_EMAIL_TO` (Empfänger)
- `EMAIL_API_ENDPOINT` (API Pfad)

Erstellt am: 2026-02-22
