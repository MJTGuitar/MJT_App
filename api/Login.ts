import { google } from "googleapis";

export default async function handler(req: any, res: any) {
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
    const LOGIN_TAB = "Students"; // your login tab

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${LOGIN_TAB}!G:H`, // G = email, H = password
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      return res.status(401).json({ error: "No data found" });
    }

    // headers not used since range is only G:H
    let found: any = null;
    for (let i = 1; i < rows.length; i++) {
      const [rowEmail, rowPassword] = rows[i];
      if (rowEmail === email && rowPassword === password) {
        found = { email: rowEmail }; // add more fields as needed
        break;
      }
    }

    if (!found) {
      return res.status(401).json({ error: "Invalid login" });
    }

    // Optionally fetch progress for the student
    const progress: any[] = []; // add real logic if needed

    return res.status(200).json({ success: true, student: found, progress });
  } catch (err) {
    console.error("Login API error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
