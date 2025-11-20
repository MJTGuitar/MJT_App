import * as mockApi from './mockApiService';
import * as serverApi from './serverApi';
import { type Student, type ProgressData } from '../types';

interface ApiService {
    verifyLogin(email: string, password: string): Promise<Student | null>;
    getStudentProgressData(studentId: string): Promise<ProgressData | null>;
}

// Use serverApi for both local dev and production
const api: ApiService = serverApi;

export default api;
