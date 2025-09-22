import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjs from 'pdfjs-dist';
// @ts-ignore - types non fournis pour build.worker.mjs dans pdfjs-dist 5.x
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { CommentIndicator, NewCommentIndicator } from './ui/CommentIndicator';
import { useCommentPositioning } from '../hooks/useCommentPositioning';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

type Answer = {
  _id: string;
  examId: string;
  page: number;        // 1-based
  yTop: number;        // [0,1]
  yBottom?: number;    // [0,1]
  text: string;
  author?: string;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  /** URL du PDF à afficher (servi par l'API) */
  pdfUrl: string;
  /** Id de l'examen (ObjectId) */
  examId: string;
};

/**
 * Composant unique : lecteur PDF à gauche, commentaires (de la page visible) à droite.
 * - Les commentaires sont ancrés via (page, yTop[, yBottom]) normalisés.
 * - Au scroll, on détecte la page majoritairement visible et on rafraîchit la liste.
 * - Ajout d'un commentaire : capture du yTop actuel (centre de la zone visible).
 */
export default function PdfAnnotator({ pdfUrl, examId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [visiblePage, setVisiblePage] = useState(1);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [allAnswers, setAllAnswers] = useState<Answer[]>([]); // Tous les commentaires pour affichage visuel
  const [selectedGroup, setSelectedGroup] = useState<Answer[] | null>(null); // Groupe de commentaires sélectionné

  // Hook pour le positionnement par clic
  const { pendingPosition, handlePageClick, confirmComment, cancelComment } = useCommentPositioning(
    examId,
    () => {
      // Callback de rechargement après ajout de commentaire
      loadAnswersForPage(visiblePage);
      loadAllAnswers();
    }
  );

  // Chargement du PDF
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loadingTask = pdfjs.getDocument({ url: pdfUrl });
      const doc = await loadingTask.promise;
      if (cancelled) return;
      setPdfDoc(doc);
      setNumPages(doc.numPages);
    })().catch(console.error);
    return () => { cancelled = true; };
  }, [pdfUrl]);

  // Rendu des pages (canvas) dans le container
  useEffect(() => {
    if (!pdfDoc || !containerRef.current) return;
    const container = containerRef.current;
    container.innerHTML = ''; // reset propre

    (async () => {
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });

        const pageWrapper = document.createElement('div');
        pageWrapper.className = 'pdf-page';
        pageWrapper.style.position = 'relative';
        pageWrapper.style.margin = '0 auto 24px';
        pageWrapper.style.width = `${viewport.width}px`;
        pageWrapper.style.cursor = 'crosshair';
        pageWrapper.dataset.pageIndex = String(i - 1); // 0-based pour le dataset

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        canvas.style.pointerEvents = 'none'; // Permettre les clics sur le wrapper

        pageWrapper.appendChild(canvas);

        // Conteneur pour les indicateurs de commentaires de cette page
        const indicatorsContainer = document.createElement('div');
        indicatorsContainer.className = 'comments-indicators';
        indicatorsContainer.style.position = 'absolute';
        indicatorsContainer.style.top = '0';
        indicatorsContainer.style.right = '0';
        indicatorsContainer.style.width = '100%';
        indicatorsContainer.style.height = '100%';
        indicatorsContainer.style.pointerEvents = 'none';
        pageWrapper.appendChild(indicatorsContainer);

        container.appendChild(pageWrapper);

        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      }
    })().catch(console.error);
  }, [pdfDoc]);

  // Détection de page visible basée sur scroll (plus simple et fiable)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateVisiblePage = () => {
      const pages = Array.from(container.querySelectorAll<HTMLDivElement>('.pdf-page'));
      if (!pages.length) return;

      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const viewportCenter = scrollTop + containerHeight / 2;

      // Trouver la page qui contient le centre du viewport
      let currentPage = 1;
      let accumulatedHeight = 0;

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const pageHeight = page.offsetHeight + 24; // +24 pour la marge

        if (viewportCenter >= accumulatedHeight && viewportCenter < accumulatedHeight + pageHeight) {
          currentPage = i + 1;
          break;
        }

        accumulatedHeight += pageHeight;
      }

      if (currentPage !== visiblePage) {
        setVisiblePage(currentPage);
      }
    };

    // Attendre que les pages soient rendues
    const checkAndSetup = () => {
      const pages = Array.from(container.querySelectorAll<HTMLDivElement>('.pdf-page'));
      if (!pages.length) {
        setTimeout(checkAndSetup, 100);
        return;
      }

      // Setup initial
      updateVisiblePage();

      // Écouter le scroll
      container.addEventListener('scroll', updateVisiblePage, { passive: true });

      return () => {
        container.removeEventListener('scroll', updateVisiblePage);
      };
    };

    return checkAndSetup();
  }, [pdfDoc, visiblePage]);

  // Gestion des clics sur les pages pour ajouter des commentaires
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Ignorer les clics sur les indicateurs et formulaires
      if (target.closest('.comment-indicator') ||
          target.closest('.new-comment-indicator') ||
          target.closest('button') ||
          target.closest('textarea') ||
          target.closest('form')) {
        return;
      }

      const pageWrapper = target.closest('.pdf-page') as HTMLElement;

      if (pageWrapper && pageWrapper.dataset.pageIndex) {
        // Désélectionner le groupe si on clique sur la page
        if (selectedGroup) {
          setSelectedGroup(null);
        }

        const pageIndex = parseInt(pageWrapper.dataset.pageIndex, 10);
        handlePageClick(pageWrapper, pageIndex, event as any);
      }
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [handlePageClick, selectedGroup]);

  // Fonction pour grouper les commentaires proches (dans un rayon de 5% de la hauteur)
  const groupCommentsByPosition = (comments: Answer[]) => {
    const groups: { answers: Answer[], avgPosition: number }[] = [];
    const tolerance = 0.05; // 5% de la hauteur de la page

    comments.forEach(comment => {
      // Chercher un groupe existant proche
      const existingGroup = groups.find(group =>
        Math.abs(group.avgPosition - comment.yTop) <= tolerance
      );

      if (existingGroup) {
        // Ajouter au groupe existant
        existingGroup.answers.push(comment);
        // Recalculer la position moyenne
        existingGroup.avgPosition = existingGroup.answers.reduce((sum, a) => sum + a.yTop, 0) / existingGroup.answers.length;
      } else {
        // Créer un nouveau groupe
        groups.push({
          answers: [comment],
          avgPosition: comment.yTop
        });
      }
    });

    return groups;
  };

  // Mise à jour des indicateurs visuels avec groupement
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Nettoyer les anciens indicateurs
    const existingIndicators = container.querySelectorAll('.comment-indicator');
    existingIndicators.forEach(indicator => indicator.remove());

    if (!allAnswers.length || !pdfDoc) return;

    // Vérifier que les pages PDF sont rendues, avec retry
    const checkAndCreateIndicators = () => {
      const pages = Array.from(container.querySelectorAll('.pdf-page'));
      if (!pages.length) {
        setTimeout(checkAndCreateIndicators, 100);
        return;
      }

      // Grouper par page puis par position
      const commentsByPage = allAnswers.reduce((acc, comment) => {
        if (!acc[comment.page]) acc[comment.page] = [];
        acc[comment.page].push(comment);
        return acc;
      }, {} as Record<number, Answer[]>);

      Object.entries(commentsByPage).forEach(([pageNumStr, pageComments]) => {
        const pageNum = parseInt(pageNumStr);
        const pageElements = Array.from(container.querySelectorAll('.pdf-page'));
        const targetPage = pageElements[pageNum - 1] as HTMLElement;

        if (!targetPage) return;

        // Grouper les commentaires proches sur cette page
        const groups = groupCommentsByPosition(pageComments);

        groups.forEach(group => {
          const indicator = document.createElement('div');
          indicator.className = 'comment-indicator';
          indicator.style.position = 'absolute';
          indicator.style.right = '8px';
          indicator.style.top = `${group.avgPosition * 100}%`;
          indicator.style.transform = 'translateY(-50%)';
          indicator.style.width = '24px';
          indicator.style.height = '24px';
          // Déterminer si ce groupe est sélectionné
          const isSelected = selectedGroup &&
            selectedGroup.length === group.answers.length &&
            selectedGroup.every(selected => group.answers.some(grouped => grouped._id === selected._id));

          indicator.style.backgroundColor = isSelected
            ? '#dc2626' // Rouge pour sélectionné
            : (pageNum === visiblePage ? '#2563eb' : '#3b82f6');
          indicator.style.color = 'white';
          indicator.style.borderRadius = '50%';
          indicator.style.display = 'flex';
          indicator.style.alignItems = 'center';
          indicator.style.justifyContent = 'center';
          indicator.style.fontSize = '12px';
          indicator.style.fontWeight = 'bold';
          indicator.style.cursor = 'pointer';
          indicator.style.zIndex = '10';
          indicator.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
          indicator.style.transition = 'all 0.2s ease';
          indicator.textContent = group.answers.length.toString();
          indicator.style.pointerEvents = 'auto';

          // Click handler pour l'indicateur
          indicator.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Sélectionner ce groupe de commentaires
            setSelectedGroup(group.answers);

            // Scroll vers cette position
            const targetY = targetPage.offsetTop + (targetPage.offsetHeight * group.avgPosition);
            container.scrollTo({ top: targetY - container.clientHeight / 2, behavior: 'smooth' });
          });

          targetPage.appendChild(indicator);
        });
      });
    };

    // Démarrer la vérification
    checkAndCreateIndicators();
  }, [allAnswers, visiblePage, selectedGroup, pdfDoc]);

  // Gestion de l'indicateur de nouveau commentaire
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Nettoyer l'ancien indicateur de nouveau commentaire
    const existingNewIndicator = container.querySelector('.new-comment-indicator');
    if (existingNewIndicator) {
      existingNewIndicator.remove();
    }

    // Ajouter le nouvel indicateur si nécessaire
    if (pendingPosition) {
      const pageElements = Array.from(container.querySelectorAll('.pdf-page'));
      const targetPage = pageElements[pendingPosition.pageIndex] as HTMLElement;

      if (targetPage) {
        const indicator = document.createElement('div');
        indicator.className = 'new-comment-indicator';
        indicator.style.position = 'absolute';
        indicator.style.right = '8px';
        indicator.style.top = `${pendingPosition.yPosition * 100}%`;
        indicator.style.transform = 'translateY(-50%)';
        indicator.style.backgroundColor = 'white';
        indicator.style.border = '2px solid #2563eb';
        indicator.style.borderRadius = '8px';
        indicator.style.padding = '8px';
        indicator.style.zIndex = '20';
        indicator.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        indicator.style.minWidth = '200px';
        indicator.style.pointerEvents = 'auto';

        // Empêcher la propagation sur tout l'indicateur
        indicator.addEventListener('click', (e) => {
          e.stopPropagation();
        });

        // Contenu du formulaire
        indicator.innerHTML = `
          <form class="new-comment-form" style="display: flex; flex-direction: column; gap: 8px;">
            <textarea
              placeholder="Votre commentaire..."
              style="padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; resize: none; font-size: 12px;"
              rows="3"
              required
            ></textarea>
            <div style="display: flex; gap: 8px;">
              <button type="submit" style="padding: 4px 12px; background: #2563eb; color: white; border: none; border-radius: 4px; font-size: 12px; cursor: pointer;">
                Ajouter
              </button>
              <button type="button" class="cancel-btn" style="padding: 4px 12px; background: #f3f4f6; color: #374151; border: none; border-radius: 4px; font-size: 12px; cursor: pointer;">
                Annuler
              </button>
            </div>
          </form>
        `;

        // Event handlers
        const form = indicator.querySelector('.new-comment-form') as HTMLFormElement;
        const textarea = indicator.querySelector('textarea') as HTMLTextAreaElement;
        const cancelBtn = indicator.querySelector('.cancel-btn') as HTMLButtonElement;

        form.addEventListener('submit', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const text = textarea.value.trim();
          if (text) {
            confirmComment(text);
          }
        });

        cancelBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          cancelComment();
        });

        targetPage.appendChild(indicator);

        // Focus sur le textarea
        setTimeout(() => textarea.focus(), 10);
      }
    }
  }, [pendingPosition, confirmComment, cancelComment]);

  // Fonction pour charger les commentaires d'une page spécifique
  const loadAnswersForPage = useCallback(async (page: number) => {
    if (!examId || !page) return;
    try {
      const url = `/api/answers?examId=${encodeURIComponent(examId)}&page=${page}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load answers');
      const data: Answer[] = await res.json();
      setAnswers(data.sort((a, b) => a.yTop - b.yTop));
    } catch (err) {
      console.error(err);
    }
  }, [examId]);

  // Fonction pour charger tous les commentaires (pour les indicateurs visuels)
  const loadAllAnswers = useCallback(async () => {
    if (!examId) return;
    try {
      const url = `/api/answers?examId=${encodeURIComponent(examId)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load all answers');
      const data: Answer[] = await res.json();
      setAllAnswers(data);
    } catch (err) {
      console.error(err);
    }
  }, [examId]);

  // Charger les commentaires de la page visible
  useEffect(() => {
    loadAnswersForPage(visiblePage);
  }, [loadAnswersForPage, visiblePage]);

  // Charger tous les commentaires au montage et quand examId change
  useEffect(() => {
    loadAllAnswers();
  }, [loadAllAnswers, examId]);


  return (
    <div style={wrapperStyle}>
      <div style={{ ...pdfPaneStyle, position: 'relative' }}>
        <div ref={containerRef} style={{ height: '100%', overflow: 'auto' }} aria-label="PDF viewer">
        </div>
      </div>
      <aside style={sidebarStyle} aria-label="Commentaires">
        <div style={sidebarHeaderStyle}>
          <strong>Commentaires</strong>
          <span style={{ opacity: 0.7 }}>
            {selectedGroup ? `Groupe sélectionné (${selectedGroup.length})` : `Page ${visiblePage}/${numPages || '…'}`}
          </span>
        </div>

        {selectedGroup && (
          <div style={{ marginBottom: 12 }}>
            <button
              onClick={() => setSelectedGroup(null)}
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                background: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                cursor: 'pointer',
                color: '#374151'
              }}
            >
              ← Retour à la page
            </button>
          </div>
        )}

        <ul style={commentListStyle}>
          {(selectedGroup || answers).map(a => (
            <li key={a._id} style={commentItemStyle}>
              <div style={commentMetaStyle}>
                y={a.yTop.toFixed(2)} • Page {a.page}
              </div>
              <div>{a.text}</div>
            </li>
          ))}
          {!(selectedGroup || answers).length && (
            <li style={{ opacity: 0.6, padding: '8px 0' }}>
              {selectedGroup ? 'Aucun commentaire dans ce groupe.' : 'Aucun commentaire sur cette page.'}
            </li>
          )}
        </ul>
        <div style={{ marginTop: 12, padding: '12px', background: '#f9fafb', borderRadius: '8px', fontSize: '14px', color: '#6b7280' }}>
          💡 <strong>Astuce :</strong> Cliquez directement sur le PDF pour ajouter un commentaire à l'endroit précis
        </div>
      </aside>
    </div>
  );
}

// ---------- styles inline minimalistes (pas de dépendance CSS supplémentaire) ----------
const wrapperStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 360px)',
  gap: 16,
  height: 'calc(100vh - 80px)',
  padding: 16,
  boxSizing: 'border-box',
  maxWidth: '100%',
  overflow: 'hidden',
};
const pdfPaneStyle: React.CSSProperties = {
  overflow: 'auto',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  background: '#fafafa',
  padding: 16,
  minWidth: 0,
};
const sidebarStyle: React.CSSProperties = {
  overflow: 'auto',
  borderLeft: '1px solid #e5e7eb',
  paddingLeft: 16,
  minWidth: 0,
};
const sidebarHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 12,
};
const commentListStyle: React.CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
};
const commentItemStyle: React.CSSProperties = {
  borderBottom: '1px dashed #e5e7eb',
  padding: '8px 0',
};
const commentMetaStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#6b7280',
  marginBottom: 4,
};
const buttonStyle: React.CSSProperties = {
  justifySelf: 'end',
  borderRadius: 8,
  border: '1px solid #d1d5db',
  background: 'white',
  padding: '6px 12px',
  cursor: 'pointer',
};