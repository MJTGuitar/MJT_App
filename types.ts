export interface Student {
  student_id: string;
  student_name: string;
}

export type ItemStatus = 'Completed' | 'In Progress' | 'Not Started';

interface ResourceLink {
	url: string;
	title: string;
}

export interface ProgressItem {
  student_id: string;
  grade: string;
  category: string;
  detail: string;
  item_status: ItemStatus;
  resource_links?: ResourceLink[];
}

export interface ProgressData {
  current_grade: string;
  previous_grades: string[];
  progressByGrade: {
    [grade: string]: ProgressItem[];
  };
}
