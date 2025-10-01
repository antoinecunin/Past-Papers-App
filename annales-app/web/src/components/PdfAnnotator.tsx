import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjs from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { useCommentPositioning } from '../hooks/useCommentPositioning';
import { renderLatex } from '../utils/latex';
import { PermissionUtils } from '../utils/permissions';
import type { Answer, AnswerContent, ContentType } from '../types/answer';
import { AnswerContentDisplay } from './AnswerContentDisplay';
import { useAuthStore } from '../stores/authStore';
import { showReportModal, showReportSuccess, showReportError } from '../utils/reportModal';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

type Props = {
  /** URL du PDF à afficher (servi par l'API) */
  pdfUrl: string;
  /** Id de l'examen (ObjectId) */
  examId: string;
};

/**
 * Composant unique : lecteur PDF à gauche, commentaires (de la page visible) à droite.
 * - Les commentaires sont ancrés via (page, yTop) normalisés.
 * - Au scroll, on détecte la page majoritairement visible et on rafraîchit la liste.
 * - Ajout d'un commentaire : capture du yTop actuel (centre de la zone visible).
 */
export default function PdfAnnotator({ pdfUrl, examId }: Props) {
  const { user, token } = useAuthStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [visiblePage, setVisiblePage] = useState(1);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [allAnswers, setAllAnswers] = useState<Answer[]>([]); // Tous les commentaires pour affichage visuel
  const [selectedGroup, setSelectedGroup] = useState<Answer[] | null>(null); // Groupe de commentaires sélectionné
  const [highlightedAnswers, setHighlightedAnswers] = useState<string[]>([]); // IDs des commentaires mis en valeur
  const highlightTimeoutRef = useRef<number | null>(null); // Référence vers le timeout actuel
  const currentHighlightedMarkerRef = useRef<HTMLElement | null>(null); // Référence vers le marqueur actuellement mis en valeur

  // Hook pour le positionnement par clic
  const { pendingPosition, handlePageClick, confirmComment, cancelComment } = useCommentPositioning(
    examId,
    token,
    () => {
      // Callback de rechargement après ajout de commentaire
      loadAnswersForPage(visiblePage);
      loadAllAnswers();
    }
  );

  // Ref pour tracker si on a déjà fait le focus initial
  const hasFocusedRef = useRef(false);
  // Ref pour tracker la position actuelle pour éviter le scroll lors des changements de page
  const currentPositionRef = useRef<{ pageIndex: number; yPosition: number } | null>(null);

  // Wrappers pour remettre à zéro les refs
  const wrappedConfirmComment = useCallback(
    async (content: AnswerContent) => {
      hasFocusedRef.current = false;
      currentPositionRef.current = null;
      return confirmComment(content);
    },
    [confirmComment]
  );

  const wrappedCancelComment = useCallback(() => {
    hasFocusedRef.current = false;
    currentPositionRef.current = null;
    return cancelComment();
  }, [cancelComment]);

  // Chargement du PDF
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) return;

      // Charger le PDF avec authentification
      const response = await fetch(pdfUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load PDF');
      }

      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const doc = await loadingTask.promise;
      if (cancelled) return;
      setPdfDoc(doc);
      setNumPages(doc.numPages);
    })().catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [pdfUrl, token]);

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

        if (
          viewportCenter >= accumulatedHeight &&
          viewportCenter < accumulatedHeight + pageHeight
        ) {
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
      if (
        target.closest('.comment-indicator') ||
        target.closest('.new-comment-indicator') ||
        target.closest('button') ||
        target.closest('textarea') ||
        target.closest('form')
      ) {
        return;
      }

      const pageWrapper = target.closest('.pdf-page') as HTMLElement;

      if (pageWrapper && pageWrapper.dataset.pageIndex) {
        // Désélectionner le groupe si on clique sur la page
        if (selectedGroup) {
          setSelectedGroup(null);
        }

        // Reset la mise en valeur des commentaires et des marqueurs
        if (highlightedAnswers.length > 0) {
          setHighlightedAnswers([]);
        }
        if (currentHighlightedMarkerRef.current) {
          currentHighlightedMarkerRef.current.classList.remove('highlighted-indicator');
          currentHighlightedMarkerRef.current = null;
        }
        if (highlightTimeoutRef.current) {
          clearTimeout(highlightTimeoutRef.current);
          highlightTimeoutRef.current = null;
        }

        const pageIndex = parseInt(pageWrapper.dataset.pageIndex, 10);
        handlePageClick(pageWrapper, pageIndex, event as unknown as React.MouseEvent);
      }
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [handlePageClick, selectedGroup, highlightedAnswers.length]);

  // Fonction pour grouper les commentaires proches (dans un rayon de 5% de la hauteur)
  const groupCommentsByPosition = (comments: Answer[]) => {
    const groups: { answers: Answer[]; avgPosition: number }[] = [];
    const tolerance = 0.05; // 5% de la hauteur de la page

    comments.forEach(comment => {
      // Chercher un groupe existant proche (distance depuis le premier élément du groupe)
      const existingGroup = groups.find(
        group => Math.abs(group.answers[0].yTop - comment.yTop) <= tolerance
      );

      if (existingGroup) {
        // Ajouter au groupe existant
        existingGroup.answers.push(comment);
        // Recalculer la position moyenne
        existingGroup.avgPosition =
          existingGroup.answers.reduce((sum, a) => sum + a.yTop, 0) / existingGroup.answers.length;
      } else {
        // Créer un nouveau groupe
        groups.push({
          answers: [comment],
          avgPosition: comment.yTop,
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
      const commentsByPage = allAnswers.reduce(
        (acc, comment) => {
          if (!acc[comment.page]) acc[comment.page] = [];
          acc[comment.page].push(comment);
          return acc;
        },
        {} as Record<number, Answer[]>
      );

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
          // Ajouter les IDs des commentaires associés pour pouvoir les mettre en valeur
          indicator.setAttribute('data-answer-ids', group.answers.map(a => a._id).join(','));
          indicator.style.position = 'absolute';
          indicator.style.right = '8px';
          indicator.style.top = `${group.avgPosition * 100}%`;
          indicator.style.transform = 'translateY(-50%)';
          indicator.style.width = '24px';
          indicator.style.height = '24px';
          // Déterminer si ce groupe est sélectionné
          const isSelected =
            selectedGroup &&
            selectedGroup.length === group.answers.length &&
            selectedGroup.every(selected =>
              group.answers.some(grouped => grouped._id === selected._id)
            );

          indicator.style.backgroundColor = isSelected
            ? '#dc2626' // Rouge pour sélectionné
            : pageNum === visiblePage
              ? '#2563eb'
              : '#3b82f6';
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
          indicator.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();

            // Sélectionner ce groupe de commentaires (filtrage déjà existant)
            setSelectedGroup(group.answers);

            // Scroll vers cette position
            const targetY = targetPage.offsetTop + targetPage.offsetHeight * group.avgPosition;
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
      // Vérifier si c'est vraiment un nouveau commentaire ou juste un changement de page
      const isSamePosition =
        currentPositionRef.current &&
        currentPositionRef.current.pageIndex === pendingPosition.pageIndex &&
        currentPositionRef.current.yPosition === pendingPosition.yPosition;

      if (!isSamePosition) {
        // Nouveau commentaire - remettre à zéro le flag pour permettre le focus/scroll
        hasFocusedRef.current = false;
        currentPositionRef.current = pendingPosition;
      }

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
        indicator.style.maxWidth = '280px';
        indicator.style.pointerEvents = 'auto';

        // Empêcher la propagation sur tout l'indicateur
        indicator.addEventListener('click', e => {
          e.stopPropagation();
        });

        // Contenu du formulaire
        indicator.innerHTML = `
          <form class="new-comment-form" style="display: flex; flex-direction: column; gap: 8px;">
            <select class="content-type-select" style="padding: 4px 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px;">
              <option value="text">💬 Texte</option>
              <option value="image">🖼️ Image (URL)</option>
              <option value="latex">📐 LaTeX</option>
            </select>
            <textarea
              class="content-input"
              placeholder="Votre commentaire..."
              style="padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; resize: none; font-size: 12px;"
              rows="3"
              required
            ></textarea>
            <div class="image-preview" style="display: none; max-width: 150px;">
              <img style="width: 100%; border-radius: 4px;" />
            </div>
            <div class="latex-preview" style="display: none; padding: 8px; background: #f9fafb; border-radius: 4px; border: 1px solid #e5e7eb; font-size: 14px; max-width: 100%; overflow-x: auto; overflow-y: hidden; word-wrap: break-word; overflow-wrap: break-word;">
            </div>
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
        const typeSelect = indicator.querySelector('.content-type-select') as HTMLSelectElement;
        const textarea = indicator.querySelector('.content-input') as HTMLTextAreaElement;
        const cancelBtn = indicator.querySelector('.cancel-btn') as HTMLButtonElement;
        const imagePreview = indicator.querySelector('.image-preview') as HTMLDivElement;
        const previewImg = imagePreview.querySelector('img') as HTMLImageElement;
        const latexPreview = indicator.querySelector('.latex-preview') as HTMLDivElement;

        // Gérer le changement de type
        const updatePlaceholder = () => {
          const selectedType = typeSelect.value as ContentType;
          const content = textarea.value.trim();

          switch (selectedType) {
            case 'text':
              textarea.placeholder = 'Votre commentaire...';
              imagePreview.style.display = 'none';
              latexPreview.style.display = 'none';
              break;
            case 'image':
              textarea.placeholder = "URL de l'image (ex: https://example.com/image.jpg)";
              latexPreview.style.display = 'none';
              // Mettre à jour l'aperçu d'image avec le contenu existant
              if (content && (content.startsWith('http') || content.startsWith('data:'))) {
                previewImg.src = content;
                imagePreview.style.display = 'block';
                previewImg.onerror = () => (imagePreview.style.display = 'none');
              } else {
                imagePreview.style.display = 'none';
              }
              break;
            case 'latex':
              textarea.placeholder = 'Code LaTeX (ex: \\int_0^1 x^2 dx = \\frac{1}{3})';
              imagePreview.style.display = 'none';
              latexPreview.style.display = 'block';
              // Mettre à jour la preview avec le contenu existant
              if (content) {
                latexPreview.innerHTML = renderLatex(content);
              } else {
                latexPreview.innerHTML = '<em style="color: #9ca3af;">Aperçu LaTeX...</em>';
              }
              break;
          }
        };

        typeSelect.addEventListener('change', updatePlaceholder);

        // Prévisualisation en temps réel
        textarea.addEventListener('input', () => {
          const currentType = typeSelect.value as ContentType;
          const content = textarea.value.trim();

          if (currentType === 'image') {
            if (content && (content.startsWith('http') || content.startsWith('data:'))) {
              previewImg.src = content;
              imagePreview.style.display = 'block';
              previewImg.onerror = () => (imagePreview.style.display = 'none');
            } else {
              imagePreview.style.display = 'none';
            }
          } else if (currentType === 'latex') {
            if (content) {
              latexPreview.innerHTML = renderLatex(content);
            } else {
              latexPreview.innerHTML = '<em style="color: #9ca3af;">Aperçu LaTeX...</em>';
            }
          }
        });

        form.addEventListener('submit', e => {
          e.preventDefault();
          e.stopPropagation();
          const content = textarea.value.trim();
          const contentType = typeSelect.value as ContentType;

          if (content) {
            // Créer l'objet AnswerContent selon le type sélectionné
            const answerContent: AnswerContent = {
              type: contentType,
              data: content,
            };

            wrappedConfirmComment(answerContent);
          }
        });

        cancelBtn.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          wrappedCancelComment();
        });

        targetPage.appendChild(indicator);

        // Focus et scroll vers le textarea seulement lors de la création initiale
        if (!hasFocusedRef.current) {
          hasFocusedRef.current = true;
          setTimeout(() => {
            // Scroll doux vers l'élément pour le rendre bien visible
            indicator.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest',
            });
            // Focus après le scroll
            setTimeout(() => textarea.focus(), 300);
          }, 10);
        }
      }
    }
  }, [pendingPosition, wrappedConfirmComment, wrappedCancelComment]);

  // Fonction pour charger les commentaires d'une page spécifique
  const loadAnswersForPage = useCallback(
    async (page: number) => {
      if (!examId || !page || !token) return;
      try {
        const url = `/api/answers?examId=${encodeURIComponent(examId)}&page=${page}`;
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error('Failed to load answers');
        const data: Answer[] = await res.json();
        setAnswers(data.sort((a, b) => a.yTop - b.yTop));
      } catch (err) {
        console.error(err);
      }
    },
    [examId, token]
  );

  // Fonction pour charger tous les commentaires (pour les indicateurs visuels)
  const loadAllAnswers = useCallback(async () => {
    if (!examId || !token) return;
    try {
      const url = `/api/answers?examId=${encodeURIComponent(examId)}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Failed to load all answers');
      const data: Answer[] = await res.json();
      setAllAnswers(data);
    } catch (err) {
      console.error(err);
    }
  }, [examId, token]);

  // Charger les commentaires de la page visible
  useEffect(() => {
    loadAnswersForPage(visiblePage);
  }, [loadAnswersForPage, visiblePage]);

  // Charger tous les commentaires au montage et quand examId change
  useEffect(() => {
    loadAllAnswers();
  }, [loadAllAnswers, examId]);

  // Injecter des styles CSS pour les indicateurs mis en valeur
  useEffect(() => {
    const styleId = 'highlighted-indicator-styles';
    let existingStyle = document.getElementById(styleId);

    if (!existingStyle) {
      existingStyle = document.createElement('style');
      existingStyle.id = styleId;
      document.head.appendChild(existingStyle);
    }

    existingStyle.textContent = `
      .highlighted-indicator {
        background-color: #f59e0b !important;
        transform: scale(1.2) !important;
        box-shadow: 0 0 20px rgba(245, 158, 11, 0.6) !important;
        z-index: 20 !important;
        animation: pulse-highlight 0.6s ease-in-out;
      }

      @keyframes pulse-highlight {
        0% { transform: scale(1) translateY(-50%); }
        50% { transform: scale(1.3) translateY(-50%); }
        100% { transform: scale(1) translateY(-50%); }
      }
    `;

    return () => {
      // Nettoyage lors du démontage du composant
      const style = document.getElementById(styleId);
      if (style) {
        style.remove();
      }
    };
  }, []);

  // Fonction pour éditer un commentaire
  const editAnswer = useCallback(
    async (answerId: string, newContent: AnswerContent) => {
      try {
        // Pré-rendre le LaTeX si nécessaire
        if (newContent.type === 'latex' && !newContent.rendered) {
          newContent.rendered = renderLatex(newContent.data);
        }

        const response = await fetch(`/api/answers/${answerId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content: newContent }),
        });

        if (!response.ok) {
          throw new Error('Erreur lors de la modification du commentaire');
        }

        // Recharger les commentaires
        await Promise.all([loadAnswersForPage(visiblePage), loadAllAnswers()]);
      } catch (error) {
        console.error('Erreur lors de la modification:', error);
        throw error;
      }
    },
    [loadAnswersForPage, loadAllAnswers, visiblePage, token]
  );

  // Fonction pour supprimer un commentaire
  const deleteAnswer = useCallback(
    async (answerId: string) => {
      try {
        const response = await fetch(`/api/answers/${answerId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Erreur lors de la suppression du commentaire');
        }

        // Recharger les commentaires
        await Promise.all([loadAnswersForPage(visiblePage), loadAllAnswers()]);
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        throw error;
      }
    },
    [loadAnswersForPage, loadAllAnswers, visiblePage, token]
  );

  // Fonction pour signaler un commentaire
  const reportAnswer = useCallback(
    async (answerId: string) => {
      if (!token) return;

      const reportData = await showReportModal('Signaler ce commentaire', 'comment');
      if (!reportData) return;

      try {
        const response = await fetch('/api/reports', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            type: 'comment',
            targetId: answerId,
            reason: reportData.reason,
            description: reportData.description || undefined,
          }),
        });

        if (response.ok) {
          await showReportSuccess();
        } else {
          const errorData = await response.json();
          await showReportError(errorData.error);
        }
      } catch (error) {
        console.error('Erreur lors du signalement:', error);
        await showReportError();
      }
    },
    [token]
  );

  return (
    <div style={wrapperStyle} data-pdf-annotator>
      <div style={{ ...pdfPaneStyle, position: 'relative' }}>
        <div
          ref={containerRef}
          style={{ height: '100%', overflow: 'auto' }}
          aria-label="PDF viewer"
        ></div>
      </div>
      <aside style={sidebarStyle} aria-label="Commentaires">
        <div style={sidebarHeaderStyle}>
          <strong>Commentaires</strong>
          <span style={{ opacity: 0.7 }}>
            {selectedGroup
              ? `Groupe sélectionné (${selectedGroup.length})`
              : `Page ${visiblePage}/${numPages || '…'}`}
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
                color: '#374151',
              }}
            >
              ← Retour à la page
            </button>
          </div>
        )}

        <ul style={commentListStyle}>
          {(selectedGroup || answers).map(a => (
            <li
              key={a._id}
              onClick={() => {
                // Mettre en valeur ce commentaire
                setHighlightedAnswers([a._id]);

                // Scroll vers l'indicateur correspondant et le mettre en valeur
                const container = containerRef.current;
                if (!container) return;

                // Trouver tous les indicateurs et chercher celui correspondant à ce commentaire
                const indicators = Array.from(container.querySelectorAll('.comment-indicator'));
                let targetIndicator: HTMLElement | null = null;

                for (const indicator of indicators) {
                  const indicatorElement = indicator as HTMLElement;
                  const answerIds =
                    indicatorElement.getAttribute('data-answer-ids')?.split(',') || [];

                  // Vérifier si cet indicateur contient notre commentaire
                  if (answerIds.includes(a._id)) {
                    targetIndicator = indicatorElement;
                    break;
                  }
                }

                if (targetIndicator) {
                  // Si c'est le même marqueur que précédemment, reset le timer
                  if (currentHighlightedMarkerRef.current === targetIndicator) {
                    // Même marqueur : reset le timer
                    if (highlightTimeoutRef.current) {
                      clearTimeout(highlightTimeoutRef.current);
                    }
                  } else {
                    // Marqueur différent : arrêter l'effet précédent
                    if (currentHighlightedMarkerRef.current) {
                      currentHighlightedMarkerRef.current.classList.remove('highlighted-indicator');
                      if (highlightTimeoutRef.current) {
                        clearTimeout(highlightTimeoutRef.current);
                      }
                    }
                  }

                  // Appliquer le nouvel effet
                  currentHighlightedMarkerRef.current = targetIndicator;
                  targetIndicator.classList.add('highlighted-indicator');
                  targetIndicator.scrollIntoView({ behavior: 'smooth', block: 'center' });

                  // Créer un nouveau timeout
                  highlightTimeoutRef.current = setTimeout(() => {
                    targetIndicator?.classList.remove('highlighted-indicator');
                    setHighlightedAnswers([]);
                    currentHighlightedMarkerRef.current = null;
                    highlightTimeoutRef.current = null;
                  }, 3000);
                }
              }}
              onMouseEnter={e => {
                // Déclencher le hover sur les boutons d'action de l'AnswerContentDisplay
                const buttons = e.currentTarget.querySelector(
                  '[data-action-buttons]'
                ) as HTMLElement;
                if (buttons) {
                  buttons.style.opacity = '1';
                }
              }}
              onMouseLeave={e => {
                // Retirer le hover des boutons d'action
                const buttons = e.currentTarget.querySelector(
                  '[data-action-buttons]'
                ) as HTMLElement;
                if (buttons) {
                  buttons.style.opacity = '0';
                }
              }}
              style={{
                ...commentItemStyle,
                cursor: 'pointer',
                backgroundColor: highlightedAnswers.includes(a._id) ? '#fef3c7' : 'transparent',
                transition: 'all 0.3s ease',
                transform: highlightedAnswers.includes(a._id) ? 'scale(1.02)' : 'scale(1)',
                boxShadow: highlightedAnswers.includes(a._id)
                  ? '0 4px 8px rgba(245, 158, 11, 0.2)'
                  : 'none',
              }}
            >
              <div style={commentMetaStyle}>
                y={a.yTop.toFixed(2)} • Page {a.page} • {a.content.type.toUpperCase()}
              </div>
              <AnswerContentDisplay
                answer={a}
                onEdit={PermissionUtils.canEdit(user, a.authorId || '') ? editAnswer : undefined}
                onDelete={PermissionUtils.canDelete(user, a.authorId || '') ? deleteAnswer : undefined}
                onReport={reportAnswer}
              />
            </li>
          ))}
          {!(selectedGroup || answers).length && (
            <li style={{ opacity: 0.6, padding: '8px 0' }}>
              {selectedGroup
                ? 'Aucun commentaire dans ce groupe.'
                : 'Aucun commentaire sur cette page.'}
            </li>
          )}
        </ul>
        <div
          style={{
            marginTop: 12,
            padding: '12px',
            background: '#f9fafb',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#6b7280',
          }}
        >
          💡 <strong>Astuce :</strong> Cliquez directement sur le PDF pour ajouter un commentaire à
          l&apos;endroit précis
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
  overflowX: 'hidden',
  borderLeft: '1px solid #e5e7eb',
  paddingLeft: 16,
  minWidth: 0,
  maxWidth: '100%',
};
const sidebarHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 12,
  marginRight: '1rem', // Éviter que le texte soit masqué par la barre de scroll
};
const commentListStyle: React.CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
};
const commentItemStyle: React.CSSProperties = {
  borderBottom: '1px dashed #e5e7eb',
  padding: '8px 0',
  wordWrap: 'break-word',
  overflowWrap: 'break-word',
  wordBreak: 'break-word',
  maxWidth: '100%',
};
const commentMetaStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#6b7280',
  marginBottom: 4,
};
