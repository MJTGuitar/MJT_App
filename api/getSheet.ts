// /api/getSheet.ts
import { google } from "googleapis";

export default async function handler(req: any, res: any) {
  try {
    // 1️⃣ Authenticate with service account
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // 2️⃣ Fetch both tabs in one request
    const response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: process.env.SHEET_ID,
      ranges: [
        process.env.SHEET_RANGE_STUDENTS || "'Students'!A1:Z999",
        process.env.SHEET_RANGE_PROGRESS || "'Progress'!A1:Z999",
      ],
    });

    // 3️⃣ Extract values
    const students = response.data.valueRanges?.[0]?.values || [];
    const progress = response.data.valueRanges?.[1]?.values || [];

    // 4️⃣ Return JSON
    res.status(200).json({ students, progress });
  } catch (error) {
    console.error("Error fetching sheets:", error);
    res.status(500).json({ error: "Failed to load sheet data" });
  }
}
