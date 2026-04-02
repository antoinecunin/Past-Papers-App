import { useCallback, useState } from 'react';
import Swal from 'sweetalert2';
import { renderLatex } from '../utils/latex';
import { apiFetch } from '../utils/api';
import type { AnswerContent } from '../types/answer';

interface ClickPosition {
  pageIndex: number;
  yPosition: number; // [0,1] relatif à la page
}

interface UseCommentPositioningReturn {
  pendingPosition: ClickPosition | null;
  handlePageClick: (pageElement: HTMLElement, pageIndex: number, event: React.MouseEvent) => void;
  confirmComment: (content: AnswerContent) => Promise<void>;
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

  const handlePageClick = useCallback(
    (pageElement: HTMLElement, pageIndex: number, event: React.MouseEvent) => {
      // Empêcher la propagation pour éviter les clics multiples
      event.stopPropagation();

      // Calculer la position relative dans la page
      const pageRect = pageElement.getBoundingClientRect();
      const relativeY = (event.clientY - pageRect.top) / pageRect.height;

      // Contraindre entre 0 et 1
      const clampedY = Math.max(0, Math.min(1, relativeY));

      setPendingPosition({
        pageIndex,
        yPosition: clampedY,
      });
    },
    []
  );

  const confirmComment = useCallback(
    async (content: AnswerContent) => {
      if (!pendingPosition) return;

      try {
        const answerContent = { ...content };

        // Pré-rendre le LaTeX si nécessaire
        if (answerContent.type === 'latex' && !answerContent.rendered) {
          answerContent.rendered = renderLatex(answerContent.data);
        }

        const payload = {
          examId,
          page: pendingPosition.pageIndex + 1, // API utilise 1-based
          yTop: pendingPosition.yPosition,
          content: answerContent,
        };

        const response = await apiFetch('/api/answers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Error creating comment');
        }

        setPendingPosition(null);
        onCommentAdded();
      } catch (error) {
        console.error('Error creating comment:', error);
        const message = error instanceof Error ? error.message : 'Error creating comment';
        await Swal.fire({
          title: 'Error',
          text: message,
          icon: 'error',
          confirmButtonColor: '#ef4444',
        });
      }
    },
    [examId, pendingPosition, onCommentAdded]
  );

  const cancelComment = useCallback(() => {
    setPendingPosition(null);
  }, []);

  return {
    pendingPosition,
    handlePageClick,
    confirmComment,
    cancelComment,
  };
}
