import { google } from "googleapis";
import fetch from "node-fetch";

// -------------------------
// Types
// -------------------------
type LinkWithTitle = {
  url: string;
  title: string;
};

type SheetRow = (string | LinkWithTitle[])[];

// -------------------------
// Helper functions
// -------------------------

/**
 * Fetches the title of a Google Doc.
 */
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

/**
 * Fetches the title of a YouTube video via noembed.
 */
const fetchYouTubeTitle = async (url: string): Promise<string> => {
  try {
    const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
    const json = (await res.json()) as { title?: string };
    return json.title ?? url;
  } catch {
    return url;
  }
};

/**
 * Determines which fetch function to use based on URL.
 */
const getLinkTitle = async (url: string): Promise<string> => {
  if (url.includes("docs.google.com")) return fetchGoogleDocTitle(url);
  if (url.includes("youtube.com") || url.includes("youtu.be")) return fetchYouTubeTitle(url);
  return url;
};

/**
 * Parses comma or newline separated links into an array of strings.
 */
const parseLinks = (cell: string): string[] => {
  if (!cell) return [];
  return cell
    .split(/\n|,/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
};

// -------------------------
// API Handler
// -------------------------
export default async function handler(
  req: { method: string },
  res: { status: (code: number) => { json: (body: unknown) => void } }
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
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

    const sheetData = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID!,
      range: process.env.SHEET_NAME || "Sheet1",
    });

    const rows: string[][] = (sheetData.data.values as string[][]) ?? [];

    const enhancedRows: SheetRow[] = await Promise.all(
      rows.map(async (row: string[], rowIndex: number) => {
        const newRow: SheetRow = [...row];

        if (!row[2]) return newRow;

        const links = parseLinks(row[2]);

        const linksWithTitles: LinkWithTitle[] = await Promise.all(
          links.map(async (url) => ({
            url,
            title: await getLinkTitle(url),
          }))
        );

        // Store enhanced links in 3rd column
        newRow[2] = linksWithTitles;

        return newRow;
      })
    );

    res.status(200).json(enhancedRows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch sheet with titles" });
  }
}
