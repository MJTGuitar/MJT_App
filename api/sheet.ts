// api/sheet.js
import { GoogleSpreadsheet } from 'google-spreadsheet';

export default async function handler(req, res) {
  try {
    const doc = new GoogleSpreadsheet(process.env.SHEET_ID);

    // Format private key: replace escaped newlines if needed
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: privateKey,
    });

    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0]; // first sheet
    const rows = await sheet.getRows();

    // Convert rows to plain data
    const data = rows.map(r => ({
      id: r._rawData[0], // or r._rowNumber etc
      ...r._rawData // or map by headers if you prefer
    }));

    res.status(200).json({ success: true, rows: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
}
