import { type Students, type Progress } from '../types';

interface ApiService {
  verifyLogin(student_email: string, student_password: string): Promise<Students | null>;
  getStudentProgressData(student_id: string): Promise<Progress | null>;
}

const api: ApiService = {
  verifyLogin: async (email, password) => {
    const res = await fetch('/api/getSheet');
    const data = await res.json();
    // Replace with your login filtering logic
    const user = data.values.find((s: any) => s.email === email && s.password === password);
    return user || null;
  },

  getStudentProgressData: async (studentId) => {
    const res = await fetch('/api/getSheet');
    const data = await res.json();
    // Replace with your student filtering logic
    const progress = data.values.find((s: any) => s.id === studentId);
    return progress || null;
  },
};

export default api;
