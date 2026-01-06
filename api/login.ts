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

const extractDriveFileId = (url: string): string | null => {
  const match =
    url.match(/\/file\/d\/([^/]+)/) ||
    url.match(/\/d\/([^/]+)/) ||
    url.match(/id=([^&]+)/);

  return match ? match[1] : null;
};

const fetchDriveFilename = async (
  drive: any,
  url: string
): Promise<string | null> => {
  const fileId = extractDriveFileId(url);
  if (!fileId) return null;

  try {
    const res = await drive.files.get({
      fileId,
      fields: "name",
    });

    return res.data.name ?? null;
  } catch {
    return null;
  }
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

    // ------------------- Google Auth -------------------
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountJson,
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets.readonly",
        "https://www.googleapis.com/auth/drive.readonly",
      ],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const drive = google.drive({ version: "v3", auth });

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

    const studentRows: string[][] = (studentsResponse.data.values || []).slice(1);

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

    const progressRows: string[][] = (progressResponse.data.values || []).slice(1);

    const studentProgressRows = progressRows.filter(
      (row) => row[0] === student.student_id && row[1] && row[2] && row[3]
    );

    // ------------------- Map Progress -------------------
    const progress: ProgressRow[] = await Promise.all(
      studentProgressRows.map(async (row) => {
        const urls = parseLinks(row[5]);

        const resource_links: ResourceLink[] = await Promise.all(
          urls.map(async (url) => {
            let title: string | null = null;

            // Google Drive / Docs
            if (
              url.includes("drive.google.com") ||
              url.includes("docs.google.com")
            ) {
              title = await fetchDriveFilename(drive, url);
            }

            // YouTube
            if (
              !title &&
              (url.includes("youtube.com") || url.includes("youtu.be"))
            ) {
              title = await fetchYouTubeTitle(url);
            }

            // Fallback
            if (!title) {
              title =
                url.split("/").filter(Boolean).pop()?.split("?")[0] || url;
            }

            const displayName = title
              .replace(/[-_]/g, " ")
              .replace(/\b\w/g, (c) => c.toUpperCase());

            return { url, title: displayName };
          })
        );

        return {
          student_id: row[0],
          grade: row[1],
          category: row[2],
          detail: row[3],
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
