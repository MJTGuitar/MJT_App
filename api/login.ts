// api/login.ts
import { google } from "googleapis";

// ✅ Environment variables in Vercel:
// GOOGLE_API_KEY → your Google Sheets API key
// SPREADSHEET_ID → your spreadsheet ID
const API_KEY = process.env.GOOGLE_API_KEY;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

const STUDENTS_TAB = "Students";
const PROGRESS_TAB = "Progress";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Missing credentials" });
  }

  try {
    const sheets = google.sheets({ version: "v4", auth: API_KEY });

    // 1️⃣ Fetch students
    const studentsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: STUDENTS_TAB,
    });
    const studentRows = studentsResponse.data.values || [];

    // Find student by email and password (plain text)
    const studentRow = studentRows.find(
      (row) =>
        row[6]?.toLowerCase() === email.toLowerCase() && // student_email
        row[7] === password // student_password
    );

    if (!studentRow) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // 2️⃣ Map student object
    const student = {
      student_id: studentRow[0],
      student_name: studentRow[1],
      current_grade: studentRow[2],
      previous_grades: studentRow[3],
      comments: studentRow[4],
      share_link: studentRow[5],
      student_email: studentRow[6],
    };

    // 3️⃣ Fetch progress
    const progressResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: PROGRESS_TAB,
    });
    const progressRows = progressResponse.data.values || [];

    const progress = progressRows
      .filter((row) => row[0] === student.student_id)
      .map((row) => ({
        student_id: row[0],
        grade: row[1],
        category: row[2],
        detail: row[3],
        item_status: row[4],
        resource_links: row[5],
      }));

    // 4️⃣ Return success
    return res.status(200).json({ success: true, student, progress });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
