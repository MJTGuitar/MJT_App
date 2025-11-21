import { google } from 'googleapis';

interface ProgressItem {
  category: string;
  detail: string;
  item_status: string;
  resource_links?: string;
}

interface ProgressData {
  student_id: string;
  currentGrade: string;
  previousGrades: string[];
  progressByGrade: Record<string, ProgressItem[]>;
}

export default async function handler(req: any, res: any) {
  try {
    const student_id = req.query?.student_id;
    if (!student_id) return res.status(400).json({ error: 'Missing student_id' });

    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      undefined,
      process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: process.env.SHEET_RANGE,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'No data found' });

    const headers = rows[0];
    const dataRows = rows.slice(1);

    const progressByGrade: Record<string, ProgressItem[]> = {};
    let currentGrade = '';
    const previousGrades: string[] = [];

    dataRows.forEach((row) => {
      const rowObj: Record<string, string> = {};
      headers.forEach((h, i) => { rowObj[h] = row[i]; });

      if (rowObj.student_id !== student_id) return;

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
      student_id,
      currentGrade,
      previousGrades,
      progressByGrade,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Unknown error' });
  }
}
