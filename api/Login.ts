
import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email & password required" });
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const SHEET_ID = process.env.GOOGLE_SHEET_ID!;

    // 🔥 Tab where email/password live
    const LOGIN_TAB = "Students";

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${LOGIN_TAB}!G:H`, // g=student_Email h=student_password etc.
    });

    const rows = response.data.values;
    if (!rows) return res.status(401).json({ error: "No data" });

    let found: any = null;

    // Skip header row
    for (let i = 1; i < rows.length; i++) {
      const [rowEmail, rowPassword] = rows[i];
      if (email === rowEmail && password === rowPassword) {
        found = { email: rowEmail };
        break;
      }
    }

    if (!found) {
      return res.status(401).json({ error: "Invalid login" });
    }

    return res.status(200).json({ success: true, user: found });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server Error" });
  }
}
