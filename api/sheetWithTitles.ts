import { google } from "googleapis";
import fetch from "node-fetch";

// ------------------- Types -------------------
interface ResourceLink {
  url: string;
  title: string;
}

// ------------------- Fetch Titles -------------------
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
    const json: { title?: string } = (await res.json()) as { title?: string };
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

// ------------------- Parse Links -------------------
const parseLinks = (cell: string): string[] => {
  if (!cell) return [];
  return cell
    .split(/\n|,/g)
    .map((s) => s.trim())
    .filter(Boolean);
};

// ------------------- API Handler -------------------
export default async function handler(req: any, res: any) {
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
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: process.env.SHEET_NAME || "Sheet1",
    });

    const rows: string[][] = sheetData.data.values || [];

    const enhancedRows: (string[] | (string | ResourceLink[])[])[] =
      await Promise.all(
        rows.map(async (row) => {
          if (!row[2]) return row;

          const links = parseLinks(row[2]);

          const linksWithTitles: ResourceLink[] = await Promise.all(
            links.map(async (url) => ({
              url,
              title: await getLinkTitle(url),
            }))
          );

          const newRow = [...row];
          newRow[2] = linksWithTitles; // now properly typed as ResourceLink[]
          return newRow;
        })
      );

    res.status(200).json(enhancedRows);
  } catch (err) {
    console.error("Error fetching sheet with titles:", err);
    res.status(500).json({ error: "Failed to fetch sheet with titles" });
  }
}
