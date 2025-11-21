import * as mockApi from './mockApiService';
import * as serverApi from './serverApi';
import { type Student, type ProgressData } from '../types';

interface ApiService {
    verifyLogin(student_email: string, student_password: string): Promise<Students | null>;
    getStudentProgressData(student_id: string): Promise<Progress | null>;
}

// Use serverApi for both local dev and production
const api: ApiService = serverApi;

export default api;
