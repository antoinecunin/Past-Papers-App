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
  yTop: number; // Position Y du commentaire [0,1]
  content: AnswerContent;
  authorId?: string; // ID utilisateur
  parentId?: string; // ID du commentaire parent (thread)
  replyCount?: number; // Nombre de réponses (uniquement sur les racines)
  createdAt: string;
  updatedAt: string;
}
