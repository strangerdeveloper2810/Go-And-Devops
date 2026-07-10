export type Priority = 'highest' | 'high' | 'medium' | 'low' | 'lowest';

// Dữ liệu presentational cho 1 issue card (KHÔNG dính model backend — design system thuần).
export interface IssueCardData {
  id: string | number;
  issueKey: string; // vd 'APOLLO-12'
  summary: string;
  priority: Priority;
  labels?: string[];
  assigneeName?: string;
}
