// api/login.ts
import { google } from "googleapis";

// Environment variables (set in Vercel)
const API_KEY = process.env.GOOGLE_API_KEY;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

const STUDENTS_TAB = "students";
const PROGRESS_TAB = "progress";

export default async function handler(req: any, res: any) {
  try {
    // Only allow POST
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Missing credentials" });
    }

    if (!API_KEY || !SPREADSHEET_ID) {
      console.error("Missing GOOGLE_API_KEY or SPREADSHEET_ID");
      return res.status(500).json({ success: false, message: "Server configuration error" });
    }

    const sheets = google.sheets({ version: "v4", auth: API_KEY });

    // Fetch Students tab
    const studentsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: STUDENTS_TAB,
    });
    const studentRows = studentsResponse.data.values || [];

    if (!studentRows.length) {
      console.error("No student rows found");
      return res.status(500).json({ success: false, message: "No student data found" });
    }

    // Find student by email and password
    const studentRow = studentRows.find(
      (row) =>
        row[6]?.toLowerCase() === email.toLowerCase() &&
        row[7] === password
    );

    if (!studentRow) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const student = {
      student_id: studentRow[0],
      student_name: studentRow[1],
      current_grade: studentRow[2],
      previous_grades: studentRow[3],
      comments: studentRow[4],
      share_link: studentRow[5],
      student_email: studentRow[6],
    };

    // Fetch Progress tab
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

    return res.status(200).json({ success: true, student, progress });
  } catch (err) {
    console.error("Login API error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
