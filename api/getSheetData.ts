import { google } from 'googleapis';
import { NextApiRequest, NextApiResponse } from 'next';

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
  comments?: string;
  share_link?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const student_email = req.query?.student_email as string;
    const student_password = req.query?.student_password as string;

    if (!student_email || !student_password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }

    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // 1️⃣ Fetch students sheet
    const studentsRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: 'students!A:H', // adjust if your sheet range is dynamic
    });

    const studentsRows = studentsRes.data.values;
    if (!studentsRows || studentsRows.length === 0)
      return res.status(404).json({ error: 'No students found' });

    const studentsHeaders = studentsRows[0];
    const studentsData = studentsRows.slice(1);

    // Find student by email + password
    const studentRow = studentsData.find((row) => {
      const obj: Record<string, string> = {};
      studentsHeaders.forEach((h, i) => (obj[h] = row[i] || ''));
      return obj['student_email'] === student_email && obj['student_password'] === student_password;
    });

    if (!studentRow) return res.status(401).json({ error: 'Invalid email or password' });

    const studentObj: Record<string, string> = {};
    studentsHeaders.forEach((h, i) => (studentObj[h] = studentRow[i] || ''));

    const student_id = studentObj['student_id'];
    const currentGrade = studentObj['current_grade'];

    // 2️⃣ Fetch progress sheet
    const progressRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: 'progress!A:F',
    });

    const progressRows = progressRes.data.values;
    if (!progressRows || progressRows.length === 0)
      return res.status(404).json({ error: 'No progress found' });

    const progressHeaders = progressRows[0];
    const progressDataRows = progressRows.slice(1);

    // Filter progress for this student
    const studentProgressRows = progressDataRows.filter((row) => {
      const obj: Record<string, string> = {};
      progressHeaders.forEach((h, i) => (obj[h] = row[i] || ''));
      return obj['student_id'] === student_id;
    });

    // Map tasks by grade
    const progressByGrade: Record<string, ProgressItem[]> = {};
    const previousGrades: string[] = [];

    studentProgressRows.forEach((row) => {
      const obj: Record<string, string> = {};
      progressHeaders.forEach((h, i) => (obj[h] = row[i] || ''));

      if (!progressByGrade[obj['grade']]) progressByGrade[obj['grade']] = [];

      progressByGrade[obj['grade']].push({
        category: obj['category'],
        detail: obj['detail'],
        item_status: obj['item_status'],
        resource_links: obj['resource_links'],
      });
    });

    Object.keys(progressByGrade).forEach((g) => {
      if (g !== currentGrade) previousGrades.push(g);
    });

    const studentData: ProgressData = {
      student_id,
      student_name: studentObj['student_name'],
      email: student_email,
      currentGrade,
      previousGrades,
      progressByGrade,
      comments: studentObj['comments'],
      share_link: studentObj['share_link'],
    };

    return res.status(200).json(studentData);
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Unknown error' });
  }
}
