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
  mentionedUserId?: string; // ID de l'utilisateur mentionné
  replyCount?: number; // Nombre de réponses (uniquement sur les racines)
  score?: number; // Score (somme des votes)
  userVote?: number | null; // Vote de l'utilisateur courant (1, -1, ou null)
  isBestAnswer?: boolean; // Marqué comme meilleure réponse
  author?: { firstName: string; lastName: string } | null; // Auteur du commentaire
  mentionedAuthor?: { firstName: string; lastName: string } | null; // Auteur mentionné
  createdAt: string;
  updatedAt: string;
}
