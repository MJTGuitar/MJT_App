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
    .split(/\n|,/g) // split by newline or comma
    .map((s) => s.trim())
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

    const allRows = studentsResponse.data.values || [];
    if (allRows.length < 2) return res.status(401).json({ error: "No students found" });

    const header = allRows[0].map((h) => h.trim().toLowerCase());
    const rows = allRows.slice(1);

    const emailIndex = header.indexOf("student_email");
    const passwordIndex = header.indexOf("password");

    if (emailIndex === -1 || passwordIndex === -1)
      return res.status(500).json({ error: "Email or password column missing" });

    const studentRow = rows.find(
      (row) =>
        row[emailIndex]?.trim().toLowerCase() === email.trim().toLowerCase() &&
        row[passwordIndex]?.trim() === password.trim()
    );

    if (!studentRow) return res.status(401).json({ error: "Invalid credentials" });

    const getValue = (colName: string) => {
      const idx = header.indexOf(colName.toLowerCase());
      return idx !== -1 ? studentRow[idx] : "";
    };

    const student = {
      student_id: getValue("student_id"),
      student_name: getValue("student_name"),
      current_grade: getValue("current_grade"),
      previous_grades: getValue("previous_grades"),
      comments: getValue("comments"),
      share_link: getValue("share_link"),
      student_email: getValue("student_email"),
      next_lesson_date: getValue("next_lesson_date"),
      next_lesson_time: getValue("next_lesson_time"),
      next_lesson_length: getValue("next_lesson_length"),
    };

    // ------------------- Fetch Progress -------------------
    const progressResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: PROGRESS_TAB,
    });

    const allProgressRows = progressResponse.data.values || [];
    if (allProgressRows.length < 2) return res.status(200).json({ student, progress: [] });

    const progressHeader = allProgressRows[0].map((h) => h.trim().toLowerCase());
    const progressDataRows = allProgressRows.slice(1);

    const studentIdIndex = progressHeader.indexOf("student_id");
    const gradeIndex = progressHeader.indexOf("grade");
    const categoryIndex = progressHeader.indexOf("category");
    const detailIndex = progressHeader.indexOf("detail");
    const statusIndex = progressHeader.indexOf("item_status");
    const linksIndex = progressHeader.indexOf("resource_links");

    const progress = await Promise.all(
      progressDataRows
        .filter((row) => row[studentIdIndex] === student.student_id)
        .map(async (row) => {
          const linksCell = row[linksIndex] || "";
          const links = parseLinks(linksCell);

          const resource_links = await Promise.all(
            links.map(async (url) => ({
              url,
              title: await getLinkTitle(url),
            }))
          );

          return {
            student_id: row[studentIdIndex],
            grade: row[gradeIndex],
            category: row[categoryIndex],
            detail: row[detailIndex],
            item_status: row[statusIndex],
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
