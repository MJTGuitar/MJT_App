import { NextApiRequest, NextApiResponse } from 'next';
import { google } from 'googleapis';

// Vercel serverless functions are Node.js environment, so googleapis works here
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  try {
    // Authenticate using service account credentials
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!), // we'll store key in env
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    // Replace with your spreadsheet ID and range
    const spreadsheetId = process.env.SPREADSHEET_ID!;
    const range = 'Sheet1!A:C'; // assuming email in col A, password in col B, name in col C

    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    const rows = response.data.values || [];

    const student = rows.find((row) => row[0] === email && row[1] === password);

    if (!student) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.status(200).json({ email: student[0], name: student[2] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}
