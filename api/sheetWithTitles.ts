
import { google } from "googleapis";
import fetch from "node-fetch";

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

// parse comma or newline separated links
const parseLinks = (cell: string) => {
  if (!cell) return [];
  return cell
    .split(/\n|,/g)
    .map(s => s.trim())
    .filter(s => s.length > 0);
};

export default async function handler(req, res) {
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

    const rows = sheetData.data.values || [];

    // Map each row and fetch titles for the links column (assuming 3rd column)
    const enhancedRows = await Promise.all(
      rows.map(async (row: string[], rowIndex: number) => {
        if (!row[2]) return row;

        const links = parseLinks(row[2]);
        const linksWithTitles = await Promise.all(
          links.map(async (url) => ({
            url,
            title: await getLinkTitle(url),
          }))
        );

        // Copy row and replace links column with enhanced links
        const newRow = [...row];
        newRow[2] = linksWithTitles; // store array of {url, title}
        return newRow;
      })
    );

    res.status(200).json(enhancedRows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch sheet with titles" });
  }
}