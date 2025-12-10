import { google } from "googleapis";

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const STUDENTS_TAB = "students";
const PROGRESS_TAB = "progress";

// Parse service account JSON from environment variable
const serviceAccountJson = JSON.parse(
  Buffer.from(process.env.SERVICE_ACCOUNT_JSON_B64!, "base64").toString("utf8")
);

const auth = new google.auth.GoogleAuth({
  credentials: serviceAccountJson,
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

const sheets = google.sheets({ version: "v4", auth });

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Missing credentials" });
    }

    if (!SPREADSHEET_ID) {
      return res.status(500).json({ success: false, message: "Missing SPREADSHEET_ID" });
    }

    // Fetch Students tab
    const studentsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: STUDENTS_TAB,
    });

    const studentRows = studentsResponse.data.values || [];
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
      next_lesson_date: studentRow[7],
      next_lesson_time: studentRow[8]
      next_lesson_length: studentRow[9]
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
        item_status: Array.isArray(row[2]) ? row[2] : [],
        resource_links: row[5],
      }));

    return res.status(200).json({ success: true, student, progress });
  } catch (err) {
    console.error("Login API error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
