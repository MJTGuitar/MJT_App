import { google } from 'googleapis';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  try {
    const { email, password } = JSON.parse(req.body);

    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4' });

    const spreadsheetId = process.env.SPREADSHEET_ID!;
    const range = 'Sheet1!A:C'; // Adjust range to match your sheet

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
      auth: client, // Pass auth explicitly
    });

    const rows = response.data.values || [];

    const student = rows.find((row) => row[0] === email && row[1] === password);

    if (!student) {
      res.statusCode = 401;
      return res.end(JSON.stringify({ error: 'Invalid credentials' }));
    }

    res.statusCode = 200;
    return res.end(JSON.stringify({ email: student[0], name: student[2] }));
  } catch (err) {
    console.error(err);
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'Server error' }));
  }
}
