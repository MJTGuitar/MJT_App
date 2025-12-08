// services/api.ts

import { type Students, type Progress } from "../types";
import { transformProgressData } from "../utils/transformProgressData"; // the function we wrote earlier

// Example flat data from your Progress tab
const flatProgressRows: Progress[] = [
  {
    student_id: "123",
    grade: "Grade 6",
    category: "Scales",
    detail: "Practice C Major",
    item_status: "Completed",
    resource_links: "https://example.com/scales",
  },
  {
    student_id: "123",
    grade: "Grade 6",
    category: "Chords",
    detail: "Learn G Major",
    item_status: "In Progress",
  },
  {
    student_id: "123",
    grade: "Grade 5",
    category: "Theory",
    detail: "Read notes",
    item_status: "Not Started",
  },
];

// Example student data
const students: Students[] = [
  {
    student_id: "123",
    student_name: "Alice",
    current_grade: "Grade 6",
    previous_grades: ["Grade 5"],
    comments: "",
    share_link: "",
    student_email: "alice@example.com",
    student_password: "password123", // For demo only
  },
];

interface ApiService {
  verifyLogin(
    email: string,
    password: string
  ): Promise<{ student: Students; progressData: ReturnType<typeof transformProgressData> } | null>;
}

const api: ApiService = {
  verifyLogin: async (email, password) => {
    try {
      // 🔹 For demo: find student in local array
      const student = students.find(
        (s) => s.student_email === email && s.student_password === password
      );
      if (!student) return null;

      // 🔹 Transform flat progress rows into Dashboard-ready structure
      const progressData = transformProgressData(
        student.student_id,
        student.current_grade,
        student.previous_grades,
        flatProgressRows
      );

      return { student, progressData };
    } catch (err) {
      console.error("API verifyLogin error:", err);
      return null;
    }
  },
};

export default api;
