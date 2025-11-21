import { google } from 'googleapis';

interface ProgressItem {
  category: string;
  detail: string;
  item_status: string;
  resource_links?: string;
}

export default async function handler(req: any, res: any) {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Missing email or password' });

    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: process.env.SHEET_RANGE,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'No data found' });

    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Find student row by email/password
    const studentRow = dataRows.find(row => {
      const rowObj: Record<string, string> = {};
      headers.forEach((h, i) => { rowObj[h] = row[i]; });
      return rowObj['student_email'] === email && rowObj['student_password'] === password;
    });

    if (!studentRow) return res.status(401).json({ error: 'Invalid credentials' });

    // Build progress data
    const progressByGrade: Record<string, ProgressItem[]> = {};
    let currentGrade = '';
    const previousGrades: string[] = [];

    dataRows.forEach(row => {
      const rowObj: Record<string, string> = {};
      headers.forEach((h, i) => { rowObj[h] = row[i]; });
      if (rowObj['student_email'] !== email) return;

      const grade = rowObj.grade;
      if (!progressByGrade[grade]) progressByGrade[grade] = [];

      progressByGrade[grade].push({
        category: rowObj.category,
        detail: rowObj.task,
        item_status: rowObj.status,
        resource_links: rowObj.resource_link,
      });

      currentGrade = grade;
      if (!previousGrades.includes(grade) && grade !== currentGrade) previousGrades.push(grade);
    });

    res.status(200).json({
      student_email: email,
      currentGrade,
      previousGrades,
      progressByGrade,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Unknown error' });
  }
}
