import * as mockApi from './mockApiService';
import * as serverApi from './serverApi';
import { type Student, type ProgressData } from '../types';

declare const google: any;

interface ApiService {
    verifyLogin(email: string, password: string): Promise<Student | null>;
    getStudentProgressData(studentId: string): Promise<ProgressData | null>;
}

const isProduction = typeof google !== 'undefined' && 
                     typeof google.script !== 'undefined' && 
                     typeof google.script.run !== 'undefined';

const api: ApiService = isProduction ? serverApi : mockApi;

export default api;
