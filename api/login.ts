
import { google } from "googleapis";
import fetch from "node-fetch";

// ------------------- Types -------------------
interface ResourceLink {
  url: string;
  title: string;
}

interface ProgressRow {
  student_id: string;
  grade: string;
  category: string;
  detail: string;
  item_status: string;
  resource_links: ResourceLink[];
}

interface Student {
  student_id: string;
  student_name: string;
  current_grade: string;
  previous_grades: string[];
  comments: string;
  share_link: string;
  student_email: string;
  next_lesson_date: string;
  next_lesson_time: string;
  next_lesson_length: string;
}

// ------------------- Helpers -------------------
const fetchGoogleDocTitle = async (url: string): Promise<string> => {
  try {
    const res = await fetch(url);
    const html = await res.text();
    const match = html.match(/<title>(.*?)<\/title>/i);
    return match ? match[1].replace(" - Google Docs", "").trim() : url;
  } catch {
    return url;
  }
};

const fetchYouTubeTitle = async (url: string): Promise<string> => {
  try {
    const res = await fetch(
      `https://noembed.com/embed?url=${encodeURIComponent(url)}`
    );
    const json: any = await res.json();
    return json.title || url;
  } catch {
    return url;
  }
};

const getLinkTitle = async (url: string): Promise<string> => {
  if (url.includes("docs.google.com")) return fetchGoogleDocTitle(url);
  if (url.includes("youtube.com") || url.includes("youtu.be"))
    return fetchYouTubeTitle(url);
  return url;
};

/** Turn CSV or newline-separated fields into a clean array */
const normalizeList = (val: string | undefined): string[] => {
  if (!val) return [];
  return val
    .split(/\n|,/g)
    .map((s) => s.trim())
    .filter(Boolean);
};

/** Extract URLs safely */
const parseLinks = (cell: string | undefined): string[] => {
  if (!cell) return [];
  return cell
    .split(/\n|,/g)
    .map((s) => s.trim())
    .filter(Boolean);
};

// ------------------- Login API -------------------
export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") {
      return res
        .status(405)
        .json({ success: false, message: "Method not allowed" });
    }

    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Missing credentials" });
    }

    const serviceAccountJson = JSON.parse(
      Buffer.from(process.env.SERVICE_ACCOUNT_JSON_B64!, "base64").toString(
        "utf8"
      )
    );

    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountJson,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
    const STUDENTS_TAB = "students";
    const PROGRESS_TAB = "progress";

    if (!SPREADSHEET_ID) {
      return res
        .status(500)
        .json({ success: false, message: "Missing SPREADSHEET_ID" });
    }

    // ------------------- Fetch Students -------------------
    const studentsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: STUDENTS_TAB,
    });

    const studentRows: string[][] = studentsResponse.data.values || [];

    const studentRow = studentRows.find(
      (row) =>
        row[6]?.toLowerCase() === email.toLowerCase() && row[7] === password
    );

    if (!studentRow) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    // ------------------- Build Student Object -------------------
    const student: Student = {
      student_id: studentRow[0] || "",
      student_name: studentRow[1] || "",
      current_grade: studentRow[2] || "",
      previous_grades: normalizeList(studentRow[3]),
      comments: studentRow[4] || "",
      share_link: studentRow[5] || "",
      student_email: studentRow[6] || "",
      next_lesson_date: studentRow[8] || "",
      next_lesson_time: studentRow[9] || "",
      next_lesson_length: studentRow[10] || "",
    };

    // ------------------- Fetch Progress -------------------
    const progressResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: PROGRESS_TAB,
    });

    const progressRows: string[][] = progressResponse.data.values || [];

    // Map over rows safely, keeping one row per progress entry
    const progress: ProgressRow[] = await Promise.all(
      progressRows.map(async (row) => {
        // Process resource links safely as a sub-array
        const urls = parseLinks(row[5]);
        const resource_links: ResourceLink[] = await Promise.all(
          urls.map(async (url) => {
            let title = url.split("/").filter(Boolean).pop()?.split("?")[0] || url;

            // Fetch real title for Google Docs / YouTube
            if (
              url.includes("docs.google.com") ||
              url.includes("youtube.com") ||
              url.includes("youtu.be")
            ) {
              title = await getLinkTitle(url);
            }

            // Clean up display name
            const displayName = title
              .replace(/[-_]/g, " ")
              .replace(/\b\w/g, (c) => c.toUpperCase());

            return { url, title: displayName };
          })
        );

        return {
          student_id: row[0] || "",
          grade: row[1] || "",
          category: row[2] || "",
          detail: row[3] || "",
          item_status: row[4] || "Not Started",
          resource_links,
        };
      })
    );

    return res.status(200).json({ success: true, student, progress });
  } catch (err) {
    console.error("Login API error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error" });
  }
}