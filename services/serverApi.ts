import { type Student, type ProgressData } from '../types';

declare const google: {
  script: {
    run: {
      withSuccessHandler: (handler: (result: any) => void) => any;
      withFailureHandler: (handler: (error: Error) => void) => any;
      verifyLogin: (email: string, password: string) => void;
      getStudentProgressData: (studentId: string) => void;
    };
  };
};

export const verifyLogin = (email: string, password: string): Promise<Student | null> => {
  return new Promise((resolve, reject) => {
    google.script.run
      .withSuccessHandler(resolve)
      .withFailureHandler(reject)
      .verifyLogin(email, password);
  });
};

export const getStudentProgressData = (studentId: string): Promise<ProgressData | null> => {
  return new Promise((resolve, reject) => {
    google.script.run
      .withSuccessHandler(resolve)
      .withFailureHandler(reject)
      .getStudentProgressData(studentId);
  });
};
