import { google } from "googleapis";

export default async function handler(req: any, res: any) {
  console.log("=== Login API called ===");
  console.log("Request method:", req.method);
  console.log("Request body:", req.body);

  if (req.method !== "POST") {
    console.warn("Invalid method:", req.method);
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { email, password } = req.body;
  if (!email || !password) {
    console.warn("Missing email or password");
    return res.status(400).json({ error: "Email & password required" });
  }

  try {
    console.log("Initializing Google Auth...");
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const SHEET_ID = process.env.GOOGLE_SHEET_ID!;
    const LOGIN_TAB = "Students";
    console.log(`Fetching rows from Sheet ID: ${SHEET_ID}, tab: ${LOGIN_TAB}`);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${LOGIN_TAB}!G:H`, // G = email, H = password
    });

    const rows = response.data.values;
    console.log("Fetched rows:", rows?.length || 0);

    if (!rows || rows.length < 2) {
      console.warn("No data found in sheet or only headers present");
      return res.status(401).json({ error: "No data found" });
    }

    let found: any = null;
    for (let i = 1; i < rows.length; i++) {
      const [rowEmail, rowPassword] = rows[i];
      console.log(`Checking row ${i}: ${rowEmail}`);
      if (rowEmail === email && rowPassword === password) {
        found = { email: rowEmail };
        console.log("User found:", found);
        break;
      }
    }

    if (!found) {
      console.warn("Invalid login attempt for email:", email);
      return res.status(401).json({ error: "Invalid login" });
    }

    // Optionally fetch progress for the student
    const progress: any[] = [];
    console.log("Returning success for user:", found.email);

    return res.status(200).json({ success: true, student: found, progress });
  } catch (err) {
    console.error("Login API error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
