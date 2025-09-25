export type ContentType = 'text' | 'image' | 'latex';

export interface AnswerContent {
  type: ContentType;
  data: string;
  rendered?: string;
}

export interface Answer {
  _id: string;
  examId: string;
  page: number;
  yTop: number;
  yBottom?: number;
  content?: AnswerContent;
  text?: string; // Legacy compatibility
  author?: string;
  createdAt: string;
  updatedAt: string;
}
