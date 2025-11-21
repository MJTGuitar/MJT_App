import { google } from 'googleapis';

interface ProgressItem {
  category: string;
  detail: string;
  item_status: string;
  resource_links?: string;
}

interface ProgressData {
  student_id: string;
  student_name: string;
  email: string;
  currentGrade: string;
  previousGrades: string[];
  progressByGrade: Record<string, ProgressItem[]>;
}

export default async function handler(req: any, res: any) {
  try {
    const student_email = req.query?.student_email;
    const student_password = req.query?.student_password;

    if (!student_email || !student_password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }

    // Authenticate with Google
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Fetch sheet data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: process.env.SHEET_RANGE,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'No data found' });

    const headers = rows[0]; // first row = headers
    const dataRows = rows.slice(1);

    // Find the student by email + password
    const studentRow = dataRows.find((row) => {
      const rowObj: Record<string, string> = {};
      headers.forEach((h, i) => (rowObj[h] = row[i]));
      return (
        rowObj['student_email'] === student_email &&
        rowObj['student_password'] === student_password
      );
    });

    if (!studentRow) return res.status(401).json({ error: 'Invalid email or password' });

    // Map row to object
    const rowObj: Record<string, string> = {};
    headers.forEach((h, i) => (rowObj[h] = studentRow[i]));

    // Build progress by grade
    const progressByGrade: Record<string, ProgressItem[]> = {};
    let currentGrade = rowObj['grade'] || '';
    const previousGrades: string[] = []; // could populate if you have multiple grades

    progressByGrade[currentGrade] = [
      {
        category: rowObj['category'],
        detail: rowObj['task'],
        item_status: rowObj['status'],
        resource_links: rowObj['resource_link'],
      },
    ];

    const studentData: ProgressData = {
      student_id: rowObj['student_id'],
      student_name: rowObj['student_name'],
      email: rowObj['student_email'],
      currentGrade,
      previousGrades,
      progressByGrade,
    };

    return res.status(200).json(studentData);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Unknown error' });
  }
}
