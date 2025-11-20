import { type Student, type ProgressData, type ProgressItem } from '../types';

const MOCK_STUDENTS: (Student & { student_email: string, student_password: string })[] = [
  {
    student_id: '101',
    student_name: 'Alex Ryder',
    student_email: 'student@example.com',
    student_password: 'password123',
  },
];

const MOCK_PROGRESS: ProgressItem[] = [
  // Grade 9
  { student_id: '101', grade: 'Grade 9', category: 'Math', detail: 'Algebra I Final', item_status: 'Completed', resource_links: 'https://example.com/algebra' },
  { student_id: '101', grade: 'Grade 9', category: 'Science', detail: 'Biology Midterm', item_status: 'Completed' },
  { student_id: '101', grade: 'Grade 9', category: 'History', detail: 'History Project', item_status: 'Completed' },
  { student_id: '101', grade: 'Grade 9', category: 'English', detail: 'English Essay', item_status: 'Completed' },
  // Grade 10
  { student_id: '101', grade: 'Grade 10', category: 'Math', detail: 'Geometry Final', item_status: 'Completed' },
  { student_id: '101', grade: 'Grade 10', category: 'Science', detail: 'Chemistry Lab', item_status: 'Completed' },
  { student_id: '101', grade: 'Grade 10', category: 'History', detail: 'World History Exam', item_status: 'Completed' },
  { student_id: '101', grade: 'Grade 10', category: 'English', detail: 'Literature Review', item_status: 'In Progress' },
  // Grade 11
  { student_id: '101', grade: 'Grade 11', category: 'Math', detail: 'Algebra II Midterm', item_status: 'Completed' },
  { student_id: '101', grade: 'Grade 11', category: 'Science', detail: 'Physics Project', item_status: 'In Progress' },
  { student_id: '101', grade: 'Grade 11', category: 'History', detail: 'US History Paper', item_status: 'Not Started' },
  { student_id: '101', grade: 'Grade 11', category: 'English', detail: 'Creative Writing', item_status: 'Not Started' },
];

export const verifyLogin = (email: string, password: string): Promise<Student | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const foundStudent = MOCK_STUDENTS.find(
        (s) => s.student_email === email.trim() && s.student_password === password.trim()
      );
      if (foundStudent) {
        resolve({
          student_id: foundStudent.student_id,
          student_name: foundStudent.student_name,
        });
      } else {
        resolve(null);
      }
    }, 500);
  });
};

export const getStudentProgressData = (studentId: string): Promise<ProgressData | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const student = MOCK_STUDENTS.find((s) => s.student_id === studentId);
      if (!student) {
        resolve(null);
        return;
      }

      const allProgress = MOCK_PROGRESS.filter(p => p.student_id === studentId);
      
      const progressByGrade: { [grade: string]: ProgressItem[] } = {};
      const grades = new Set(allProgress.map(p => p.grade));
      
      grades.forEach(grade => {
        progressByGrade[grade] = allProgress.filter(p => p.grade === grade);
      });

      const sortedGrades = Array.from(grades).sort((a,b) => parseInt(a.split(' ')[1]) - parseInt(b.split(' ')[1]));
      const currentGrade = sortedGrades[sortedGrades.length-1] || 'N/A';
      const previousGrades = sortedGrades.slice(0, sortedGrades.length - 1);

      const data: ProgressData = {
        currentGrade,
        previousGrades,
        progressByGrade,
      };
      
      resolve(data);
    }, 1000);
  });
};
