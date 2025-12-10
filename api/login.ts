import { google } from "googleapis";
import fetch from "node-fetch";

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const STUDENTS_TAB = "students";
const PROGRESS_TAB = "progress";

// ------------------- Helpers to fetch titles -------------------
const fetchGoogleDocTitle = async (url: string) => {
  try {
    const res = await fetch(url);
    const html = await res.text();
    const match = html.match(/<title>(.*?)<\/title>/i);
    return match ? match[1].replace(" - Google Docs", "").trim() : url;
  } catch {
    return url;
  }
};

const fetchYouTubeTitle = async (url: string) => {
  try {
    const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
    const json = await res.json();
    return json.title || url;
  } catch {
    return url;
  }
};

const getLinkTitle = async (url: string) => {
  if (url.includes("docs.google.com")) return fetchGoogleDocTitle(url);
  if (url.includes("youtube.com") || url.includes("youtu.be")) return fetchYouTubeTitle(url);
  return url;
};

// ------------------- Parse links -------------------
const parseLinks = (cell: string) => {
  if (!cell) return [];
  return cell
    .split(/\n|,/g)        // split by newline or comma
    .map(s => s.trim())
    .filter(Boolean);
};

// ------------------- Login API -------------------
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Missing credentials" });

    if (!SPREADSHEET_ID) return res.status(500).json({ error: "Missing SPREADSHEET_ID" });

    // ------------------- Auth -------------------
    const serviceAccountJson = JSON.parse(
      Buffer.from(process.env.SERVICE_ACCOUNT_JSON_B64!, "base64").toString("utf8")
    );

    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountJson,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // ------------------- Fetch Students -------------------
    const studentsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: STUDENTS_TAB,
    });

    const studentRows = studentsResponse.data.values || [];
    const studentRow = studentRows.find(
      row => row[6]?.toLowerCase() === email.toLowerCase() && row[7] === password
    );

    if (!studentRow) return res.status(401).json({ error: "Invalid credentials" });

    const student = {
      student_id: studentRow[0],
      student_name: studentRow[1],
      current_grade: studentRow[2],
      previous_grades: studentRow[3],
      comments: studentRow[4],
      share_link: studentRow[5],
      student_email: studentRow[6],
      next_lesson_date: studentRow[8],
      next_lesson_time: studentRow[9],
      next_lesson_length: studentRow[10],
    };

    // ------------------- Fetch Progress -------------------
    const progressResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: PROGRESS_TAB,
    });

    const progressRows = progressResponse.data.values || [];

    // Map tasks for this student
    const progress = await Promise.all(
      progressRows
        .filter(row => row[0] === student.student_id)
        .map(async (row) => {
          const resourceCell = row[5] || ""; // links are in column 6
          const links = parseLinks(resourceCell);

          const resource_links = await Promise.all(
            links.map(async (url) => ({
              url,
              title: await getLinkTitle(url),
            }))
          );

          return {
            student_id: row[0],
            grade: row[1],
            category: row[2],
            detail: row[3],
            item_status: row[4],
            resource_links,
          };
        })
    );

    return res.status(200).json({ student, progress });
  } catch (err) {
    console.error("Login API error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
