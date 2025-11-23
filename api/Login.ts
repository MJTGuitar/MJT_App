import { google } from "googleapis";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Only POST allowed" });

  // login logic here
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

    // Tabs
    const LOGIN_TAB = "Students";     // email/password
    const PROGRESS_TAB = "Progress";  // student progress

    // 🔹 Fetch login and progress tabs in one batch
    const response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: SHEET_ID,
      ranges: [`${LOGIN_TAB}!G:H`, `${PROGRESS_TAB}!A:Z`], // adjust columns
    });

    const loginRows = response.data.valueRanges?.[0]?.values;
    const progressRows = response.data.valueRanges?.[1]?.values;

    if (!loginRows || loginRows.length < 2) {
      return res.status(401).json({ error: "No student data found" });
    }

    // Map login rows to objects
    const headers = loginRows[0];
    const students = loginRows.slice(1).map(row => {
      const obj: any = {};
      headers.forEach((key, i) => (obj[key] = row[i]));
      return obj;
    });

    // Find matching student
    const student = students.find(
      s =>
        s.email?.trim().toLowerCase() === email.trim().toLowerCase() &&
        s.password?.trim() === password.trim()
    );

    if (!student) {
      return res.status(401).json({ error: "Invalid login" });
    }

    // Map progress rows to objects
    let studentProgress: any[] = [];
    if (progressRows && progressRows.length > 1) {
      const progHeaders = progressRows[0];
      studentProgress = progressRows.slice(1)
        .map(row => {
          const obj: any = {};
          progHeaders.forEach((key, i) => (obj[key] = row[i]));
          return obj;
        })
        .filter(p => p.id === student.id); // filter progress for this student
    }

    // Return user + progress
    return res.status(200).json({ success: true, user: student, progress: studentProgress });

  } catch (err) {
    console.error("Login API error:", err);
    return res.status(500).json({ error: "Server Error" });
  }
}
