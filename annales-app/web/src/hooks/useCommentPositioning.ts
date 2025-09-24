import { useCallback, useState } from 'react';
import katex from 'katex';

// Fonction pour rendre le LaTeX en HTML
const renderLatex = (latex: string): string => {
  try {
    return katex.renderToString(latex, {
      throwOnError: false,
      displayMode: false,
      strict: false
    });
  } catch (error) {
    console.warn('Erreur de rendu LaTeX:', error);
    return `<span style="color: #dc2626; font-family: monospace;">[Erreur LaTeX: ${latex}]</span>`;
  }
};

interface ClickPosition {
  pageIndex: number;
  yPosition: number; // [0,1] relatif à la page
}

type ContentType = 'text' | 'image' | 'latex';

interface AnswerContent {
  type: ContentType;
  data: string;
  rendered?: string;
}

interface UseCommentPositioningReturn {
  pendingPosition: ClickPosition | null;
  handlePageClick: (pageElement: HTMLElement, pageIndex: number, event: React.MouseEvent) => void;
  confirmComment: (content: string | AnswerContent) => Promise<void>;
  cancelComment: () => void;
}

/**
 * Hook pour gérer le positionnement des commentaires par clic
 * Calcule la position relative et gère l'état du commentaire en cours
 */
export function useCommentPositioning(
  examId: string,
  onCommentAdded: () => void
): UseCommentPositioningReturn {
  const [pendingPosition, setPendingPosition] = useState<ClickPosition | null>(null);

  const handlePageClick = useCallback((
    pageElement: HTMLElement,
    pageIndex: number,
    event: React.MouseEvent
  ) => {
    // Empêcher la propagation pour éviter les clics multiples
    event.stopPropagation();

    // Calculer la position relative dans la page
    const pageRect = pageElement.getBoundingClientRect();
    const relativeY = (event.clientY - pageRect.top) / pageRect.height;

    // Contraindre entre 0 et 1
    const clampedY = Math.max(0, Math.min(1, relativeY));

    setPendingPosition({
      pageIndex,
      yPosition: clampedY
    });
  }, []);

  const confirmComment = useCallback(async (content: string | AnswerContent) => {
    if (!pendingPosition) return;

    try {
      // Normaliser le contenu vers le nouveau format
      let answerContent: AnswerContent;
      if (typeof content === 'string') {
        // Rétrocompatibilité pour les anciens appels
        answerContent = { type: 'text', data: content };
      } else {
        answerContent = { ...content };

        // Pré-rendre le LaTeX si nécessaire
        if (answerContent.type === 'latex' && !answerContent.rendered) {
          answerContent.rendered = renderLatex(answerContent.data);
        }
      }

      const payload = {
        examId,
        page: pendingPosition.pageIndex + 1, // API utilise 1-based
        yTop: pendingPosition.yPosition,
        content: answerContent,
        // Compatibilité avec l'ancien backend
        text: answerContent.type === 'text' ? answerContent.data : `[${answerContent.type.toUpperCase()}]`
      };

      const response = await fetch('/api/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la création du commentaire');
      }

      setPendingPosition(null);
      onCommentAdded();
    } catch (error) {
      console.error('Erreur:', error);
      // TODO: Afficher une notification d'erreur à l'utilisateur
    }
  }, [examId, pendingPosition, onCommentAdded]);

  const cancelComment = useCallback(() => {
    setPendingPosition(null);
  }, []);

  return {
    pendingPosition,
    handlePageClick,
    confirmComment,
    cancelComment
  };
}