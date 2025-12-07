export interface Student {
  student_id: string;
  student_name: string;
}

export type ItemStatus = 'Completed' | 'In Progress' | 'Not Started';

export interface ProgressItem {
  student_id: string;
  grade: string;
  category: string;
  detail: string;
  item_status: ItemStatus;
  resource_links?: string;
}

export interface ProgressData {
  currentGrade: string;
  previousGrades: string[];
  progressByGrade: {
    [grade: string]: ProgressItem[];
  };
}
