import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import * as pdfjs from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { useCommentPositioning } from '../hooks/useCommentPositioning';
import { renderLatex } from '../utils/latex';
import { PermissionUtils } from '../utils/permissions';
import type { Answer, AnswerContent, ContentType } from '../types/answer';
import { AnswerContentDisplay } from './AnswerContentDisplay';
import { VoteButtons } from './VoteButtons';
import { ReplyForm } from './ReplyForm';
import { useAuthStore } from '../stores/authStore';
import { showReportModal, showReportSuccess, showReportError } from '../utils/reportModal';
import {
  CONTENT_MAX_LENGTH,
  IMAGE_MAX_SIZE,
  formatCharCount,
  getCharCountColor,
} from '../constants/content';
import { apiFetch } from '../utils/api';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

type Props = {
  /** URL of the PDF to display (served by the API) */
  pdfUrl: string;
  /** Exam ID (ObjectId) */
  examId: string;
};

/**
 * Single component: PDF viewer on the left, comments (for the visible page) on the right.
 * - Comments are anchored via normalized (page, yTop).
 * - On scroll, we detect the mostly visible page and refresh the list.
 * - Adding a comment: captures the current yTop (center of the visible area).
 */
export default function PdfAnnotator({ pdfUrl, examId }: Props) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [visiblePage, setVisiblePage] = useState(1);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [allAnswers, setAllAnswers] = useState<Answer[]>([]); // All comments for visual display
  const [selectedGroup, setSelectedGroup] = useState<Answer[] | null>(null); // Selected comment group
  const [highlightedAnswers, setHighlightedAnswers] = useState<string[]>([]); // IDs of highlighted comments
  const highlightTimeoutRef = useRef<number | null>(null); // Reference to current timeout
  const currentHighlightedMarkerRef = useRef<HTMLElement | null>(null); // Reference to currently highlighted marker

  // Thread state
  interface ReplyTarget {
    rootId: string;
    mentionUserId?: string;
    mentionLabel?: string;
  }
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [openThreads, setOpenThreads] = useState<Record<string, boolean>>({});
  const [loadedReplies, setLoadedReplies] = useState<
    Record<string, { replies: Answer[]; hasMore: boolean; cursor?: string }>
  >({});

  // Hook for click positioning
  const { pendingPosition, handlePageClick, confirmComment, cancelComment } = useCommentPositioning(
    examId,
    () => {
      // Reload callback after adding a comment
      loadAllAnswers();
    }
  );

  // Ref to track if we've already done the initial focus
  const hasFocusedRef = useRef(false);
  // Ref to track current position to avoid scroll on page changes
  const currentPositionRef = useRef<{ pageIndex: number; yPosition: number } | null>(null);

  // Wrappers to reset refs
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

  // Load PDF
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return;

      // Load PDF with authentication
      const response = await apiFetch(pdfUrl);

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
  }, [pdfUrl, user]);

  // Render pages (canvas) in the container
  useEffect(() => {
    if (!pdfDoc || !containerRef.current) return;
    const container = containerRef.current;
    container.innerHTML = ''; // clean reset

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
        canvas.style.pointerEvents = 'none'; // Allow clicks on the wrapper

        pageWrapper.appendChild(canvas);
        container.appendChild(pageWrapper);

        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      }
    })().catch(console.error);
  }, [pdfDoc]);

  // Visible page detection based on scroll (simpler and more reliable)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateVisiblePage = () => {
      const pages = Array.from(container.querySelectorAll<HTMLDivElement>('.pdf-page'));
      if (!pages.length) return;

      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const viewportCenter = scrollTop + containerHeight / 2;

      // Find the page that contains the viewport center
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

    // Wait for pages to be rendered
    const checkAndSetup = () => {
      const pages = Array.from(container.querySelectorAll<HTMLDivElement>('.pdf-page'));
      if (!pages.length) {
        setTimeout(checkAndSetup, 100);
        return;
      }

      // Initial setup
      updateVisiblePage();

      // Listen for scroll
      container.addEventListener('scroll', updateVisiblePage, { passive: true });

      return () => {
        container.removeEventListener('scroll', updateVisiblePage);
      };
    };

    return checkAndSetup();
  }, [pdfDoc, visiblePage]);

  // Handle clicks on pages to add comments
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Ignore clicks on indicators and forms
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
        // Deselect group if clicking on the page
        if (selectedGroup) {
          setSelectedGroup(null);
        }

        // Reset comment and marker highlighting
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

  // Function to group nearby comments (within 5% of page height)
  const groupCommentsByPosition = (comments: Answer[]) => {
    const groups: { answers: Answer[]; avgPosition: number }[] = [];
    const tolerance = 0.05; // 5% de la hauteur de la page

    comments.forEach(comment => {
      // Find a nearby existing group (distance from first element of group)
      const existingGroup = groups.find(
        group => Math.abs(group.answers[0].yTop - comment.yTop) <= tolerance
      );

      if (existingGroup) {
        // Add to existing group
        existingGroup.answers.push(comment);
        // Recalculate average position
        existingGroup.avgPosition =
          existingGroup.answers.reduce((sum, a) => sum + a.yTop, 0) / existingGroup.answers.length;
      } else {
        // Create a new group
        groups.push({
          answers: [comment],
          avgPosition: comment.yTop,
        });
      }
    });

    return groups;
  };

  // Update visual indicators with grouping
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clean up old indicators
    const existingIndicators = container.querySelectorAll('.comment-indicator');
    existingIndicators.forEach(indicator => indicator.remove());

    if (!allAnswers.length || !pdfDoc) return;

    // Verify PDF pages are rendered, with retry
    const checkAndCreateIndicators = () => {
      const pages = Array.from(container.querySelectorAll('.pdf-page'));
      if (!pages.length) {
        setTimeout(checkAndCreateIndicators, 100);
        return;
      }

      // Group by page then by position
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

        // Group nearby comments on this page
        const groups = groupCommentsByPosition(pageComments);

        groups.forEach(group => {
          const indicator = document.createElement('div');
          indicator.className = 'comment-indicator';
          // Add associated comment IDs to enable highlighting
          indicator.setAttribute('data-answer-ids', group.answers.map(a => a._id).join(','));
          indicator.style.position = 'absolute';
          indicator.style.right = '8px';
          indicator.style.top = `${group.avgPosition * 100}%`;
          indicator.style.transform = 'translateY(-50%)';
          indicator.style.width = '24px';
          indicator.style.height = '24px';
          // Determine if this group is selected
          const isSelected =
            selectedGroup &&
            selectedGroup.length === group.answers.length &&
            selectedGroup.every(selected =>
              group.answers.some(grouped => grouped._id === selected._id)
            );

          indicator.style.backgroundColor = isSelected
            ? '#dc2626' // Red for selected
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

            // Select this comment group
            setSelectedGroup(group.answers);

            // Scroll to this position
            const targetY = targetPage.offsetTop + targetPage.offsetHeight * group.avgPosition;
            container.scrollTo({ top: targetY - container.clientHeight / 2, behavior: 'smooth' });
          });

          targetPage.appendChild(indicator);
        });
      });
    };

    // Start verification
    checkAndCreateIndicators();
  }, [allAnswers, visiblePage, selectedGroup, pdfDoc]);

  // Upload an image to S3
  const uploadImage = useCallback(
    async (file: File): Promise<string> => {
      if (!user) throw new Error('Not authenticated');
      const formData = new FormData();
      formData.append('image', file);
      const res = await apiFetch('/api/files/image', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || t('comments.image_upload_failed'));
      }
      const { key } = await res.json();
      return key;
    },
    [user, t]
  );

  // Handle new comment indicator
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clean up old new comment indicator
    const existingNewIndicator = container.querySelector('.new-comment-indicator');
    if (existingNewIndicator) {
      existingNewIndicator.remove();
    }

    // Add new indicator if needed
    if (pendingPosition) {
      // Check if this is really a new comment or just a page change
      const isSamePosition =
        currentPositionRef.current &&
        currentPositionRef.current.pageIndex === pendingPosition.pageIndex &&
        currentPositionRef.current.yPosition === pendingPosition.yPosition;

      if (!isSamePosition) {
        // New comment - reset flag to allow focus/scroll
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

        // Adjust positioning based on Y position
        // If clicking near the top (< 15%), position below the click
        // If clicking near the bottom (> 85%), position above the click
        // Otherwise, center on the click
        const yPos = pendingPosition.yPosition;
        if (yPos < 0.15) {
          indicator.style.top = `${yPos * 100}%`;
          indicator.style.transform = 'translateY(0)';
        } else if (yPos > 0.85) {
          indicator.style.top = `${yPos * 100}%`;
          indicator.style.transform = 'translateY(-100%)';
        } else {
          indicator.style.top = `${yPos * 100}%`;
          indicator.style.transform = 'translateY(-50%)';
        }

        indicator.style.backgroundColor = 'white';
        indicator.style.border = '2px solid #2563eb';
        indicator.style.borderRadius = '8px';
        indicator.style.padding = '8px';
        indicator.style.zIndex = '20';
        indicator.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        indicator.style.minWidth = '12rem';
        indicator.style.maxWidth = '18rem';
        indicator.style.maxHeight = '50vh';
        indicator.style.overflow = 'auto';
        indicator.style.pointerEvents = 'auto';

        // Prevent propagation on the entire indicator
        indicator.addEventListener('click', e => {
          e.stopPropagation();
        });

        // Form content
        const defaultMaxLength = CONTENT_MAX_LENGTH.text;
        indicator.innerHTML = `
          <form class="new-comment-form" style="display: flex; flex-direction: column; gap: 8px;">
            <select class="content-type-select" style="padding: 4px 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px;">
              <option value="text">${t('comments.content.type_text')}</option>
              <option value="image">${t('comments.content.type_image')}</option>
              <option value="latex">${t('comments.content.type_latex')}</option>
            </select>
            <textarea
              class="content-input"
              placeholder="${t('comments.your_comment')}"
              style="padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; resize: none; font-size: 12px;"
              rows="3"
              maxlength="${defaultMaxLength}"
              required
            ></textarea>
            <input class="image-file-input" type="file" accept="image/*" style="display: none; font-size: 12px; padding: 4px 0;" />
            <div class="image-error" style="display: none; font-size: 11px; color: #dc2626; padding: 4px 8px; background: #fef2f2; border-radius: 4px; border: 1px solid #fecaca;"></div>
            <div class="image-preview" style="display: none; max-width: 50%; max-height: 5rem; overflow: hidden;">
              <img style="width: 100%; height: auto; border-radius: 4px; object-fit: cover;" />
            </div>
            <div class="char-counter" style="font-size: 11px; text-align: right; color: #6b7280;">
              0 / ${defaultMaxLength.toLocaleString('en-US')}
            </div>
            <div class="latex-preview" style="display: none; padding: 8px; background: #f9fafb; border-radius: 4px; border: 1px solid #e5e7eb; font-size: 14px; max-width: 100%; overflow-x: auto; overflow-y: hidden; word-wrap: break-word; overflow-wrap: break-word;">
            </div>
            <div style="display: flex; gap: 8px;">
              <button type="submit" style="padding: 4px 12px; background: #2563eb; color: white; border: none; border-radius: 4px; font-size: 12px; cursor: pointer;">
                ${t('comments.add_button')}
              </button>
              <button type="button" class="cancel-btn" style="padding: 4px 12px; background: #f3f4f6; color: #374151; border: none; border-radius: 4px; font-size: 12px; cursor: pointer;">
                ${t('common.cancel')}
              </button>
            </div>
          </form>
        `;

        // Event handlers
        const form = indicator.querySelector('.new-comment-form') as HTMLFormElement;
        const typeSelect = indicator.querySelector('.content-type-select') as HTMLSelectElement;
        const textarea = indicator.querySelector('.content-input') as HTMLTextAreaElement;
        const cancelBtn = indicator.querySelector('.cancel-btn') as HTMLButtonElement;
        const imageFileInput = indicator.querySelector('.image-file-input') as HTMLInputElement;
        const imageErrorDiv = indicator.querySelector('.image-error') as HTMLDivElement;
        const imagePreviewDiv = indicator.querySelector('.image-preview') as HTMLDivElement;
        const previewImg = imagePreviewDiv.querySelector('img') as HTMLImageElement;
        const latexPreview = indicator.querySelector('.latex-preview') as HTMLDivElement;
        const charCounter = indicator.querySelector('.char-counter') as HTMLDivElement;
        const submitBtn = indicator.querySelector('button[type="submit"]') as HTMLButtonElement;

        let selectedImageFile: File | null = null;

        // Function to update the character counter
        const updateCharCounter = () => {
          const currentType = typeSelect.value as ContentType;
          const maxLength = CONTENT_MAX_LENGTH[currentType];
          const currentLength = textarea.value.length;
          charCounter.textContent = formatCharCount(currentLength, maxLength);
          charCounter.style.color = getCharCountColor(currentLength, maxLength);
        };

        // Handle type change
        const updatePlaceholder = () => {
          const selectedType = typeSelect.value as ContentType;
          const maxLength = CONTENT_MAX_LENGTH[selectedType];

          submitBtn.disabled = false;
          submitBtn.style.opacity = '1';
          submitBtn.style.cursor = 'pointer';
          imageErrorDiv.style.display = 'none';

          if (selectedType === 'image') {
            textarea.style.display = 'none';
            textarea.removeAttribute('required');
            charCounter.style.display = 'none';
            imageFileInput.style.display = 'block';
            latexPreview.style.display = 'none';
          } else {
            textarea.style.display = 'block';
            textarea.setAttribute('required', '');
            charCounter.style.display = 'block';
            imageFileInput.style.display = 'none';
            imagePreviewDiv.style.display = 'none';
            selectedImageFile = null;
            imageFileInput.value = '';

            textarea.maxLength = maxLength;
            updateCharCounter();

            if (selectedType === 'text') {
              textarea.placeholder = t('comments.your_comment');
              latexPreview.style.display = 'none';
            } else {
              textarea.placeholder = t('comments.reply_form.latex_placeholder');
              const content = textarea.value.trim();
              latexPreview.style.display = 'block';
              latexPreview.innerHTML = content
                ? renderLatex(content)
                : '<em style="color: #9ca3af;">LaTeX preview...</em>';
            }
          }
        };

        typeSelect.addEventListener('change', updatePlaceholder);

        // Image file selection
        imageFileInput.addEventListener('change', () => {
          const file = imageFileInput.files?.[0];
          imageErrorDiv.style.display = 'none';
          if (!file) {
            selectedImageFile = null;
            imagePreviewDiv.style.display = 'none';
            return;
          }
          if (!file.type.startsWith('image/')) {
            imageErrorDiv.textContent = t('comments.reply_form.file_type_error');
            imageErrorDiv.style.display = 'block';
            selectedImageFile = null;
            return;
          }
          if (file.size > IMAGE_MAX_SIZE) {
            imageErrorDiv.textContent = t('comments.reply_form.file_size_error', { size: IMAGE_MAX_SIZE / 1024 / 1024 });
            imageErrorDiv.style.display = 'block';
            selectedImageFile = null;
            return;
          }
          selectedImageFile = file;
          previewImg.src = URL.createObjectURL(file);
          imagePreviewDiv.style.display = 'block';
        });

        // Real-time preview + character counter for text/latex
        textarea.addEventListener('input', () => {
          const currentType = typeSelect.value as ContentType;
          const content = textarea.value.trim();
          updateCharCounter();

          if (currentType === 'latex') {
            latexPreview.innerHTML = content
              ? renderLatex(content)
              : '<em style="color: #9ca3af;">LaTeX preview...</em>';
          }
        });

        form.addEventListener('submit', async e => {
          e.preventDefault();
          e.stopPropagation();
          const contentType = typeSelect.value as ContentType;

          if (contentType === 'image') {
            if (!selectedImageFile) return;
            submitBtn.disabled = true;
            submitBtn.textContent = '...';
            try {
              const key = await uploadImage(selectedImageFile);
              wrappedConfirmComment({ type: 'image', data: key });
            } catch (err) {
              imageErrorDiv.textContent = err instanceof Error ? err.message : 'Upload failed';
              imageErrorDiv.style.display = 'block';
              submitBtn.disabled = false;
              submitBtn.textContent = t('comments.add_button');
            }
          } else {
            const content = textarea.value.trim();
            if (!content) return;
            const answerContent: AnswerContent = { type: contentType, data: content };
            wrappedConfirmComment(answerContent);
          }
        });

        cancelBtn.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          wrappedCancelComment();
        });

        targetPage.appendChild(indicator);

        // Focus and scroll to textarea only on initial creation
        if (!hasFocusedRef.current) {
          hasFocusedRef.current = true;
          setTimeout(() => {
            // Smooth scroll to make the element visible
            indicator.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest',
            });
            // Focus after scroll
            setTimeout(() => textarea.focus(), 300);
          }, 10);
        }
      }
    }
  }, [pendingPosition, wrappedConfirmComment, wrappedCancelComment, uploadImage, t]);

  // Function to load all comments
  const loadAllAnswers = useCallback(async () => {
    if (!examId || !user) return;
    try {
      const url = `/api/answers?examId=${encodeURIComponent(examId)}`;
      const res = await apiFetch(url);
      if (!res.ok) throw new Error('Failed to load all answers');
      const data: Answer[] = await res.json();
      setAllAnswers(data);
    } catch (err) {
      console.error(err);
    }
  }, [examId, user]);

  // Load all comments on mount and when examId changes
  useEffect(() => {
    loadAllAnswers();
  }, [loadAllAnswers, examId]);

  // Filter comments for the visible page (locally, no API call)
  useEffect(() => {
    const pageAnswers = allAnswers
      .filter(a => a.page === visiblePage)
      .sort((a, b) => a.yTop - b.yTop);
    setAnswers(pageAnswers);
  }, [allAnswers, visiblePage]);

  // Inject CSS styles for highlighted indicators
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
      // Cleanup on component unmount
      const style = document.getElementById(styleId);
      if (style) {
        style.remove();
      }
    };
  }, []);

  // Helper: find the parentId of a reply in loadedReplies
  const findReplyParent = useCallback(
    (answerId: string): string | null => {
      for (const [parentId, data] of Object.entries(loadedReplies)) {
        if (data.replies.some(r => r._id === answerId)) {
          return parentId;
        }
      }
      return null;
    },
    [loadedReplies]
  );

  // Function to edit a comment
  const editAnswer = useCallback(
    async (answerId: string, newContent: AnswerContent) => {
      try {
        // Pre-render LaTeX if needed
        if (newContent.type === 'latex' && !newContent.rendered) {
          newContent.rendered = renderLatex(newContent.data);
        }

        const response = await apiFetch(`/api/answers/${answerId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content: newContent }),
        });

        if (!response.ok) {
          throw new Error('Error editing comment');
        }

        // Update UI: check if it's a reply in a thread
        const parentId = findReplyParent(answerId);
        if (parentId) {
          // Optimistic update of loadedReplies state
          setLoadedReplies(prev => {
            const entry = prev[parentId];
            if (!entry) return prev;
            return {
              ...prev,
              [parentId]: {
                ...entry,
                replies: entry.replies.map(r =>
                  r._id === answerId ? { ...r, content: newContent } : r
                ),
              },
            };
          });
        } else {
          // Root comment: reload normally
          await loadAllAnswers();
        }
      } catch (error) {
        console.error('Error editing comment:', error);
        throw error;
      }
    },
    [loadAllAnswers, findReplyParent]
  );

  // Function to delete a comment
  const deleteAnswer = useCallback(
    async (answerId: string) => {
      try {
        const response = await apiFetch(`/api/answers/${answerId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Error deleting comment');
        }

        // Update UI: check if it's a reply in a thread
        const parentId = findReplyParent(answerId);
        if (parentId) {
          // Remove reply from loadedReplies state
          setLoadedReplies(prev => {
            const entry = prev[parentId];
            if (!entry) return prev;
            return {
              ...prev,
              [parentId]: {
                ...entry,
                replies: entry.replies.filter(r => r._id !== answerId),
              },
            };
          });
        }

        // Always reload root comments (updates replyCount)
        await loadAllAnswers();
      } catch (error) {
        console.error('Error deleting comment:', error);
        throw error;
      }
    },
    [loadAllAnswers, findReplyParent]
  );

  // Function to report a comment
  const reportAnswer = useCallback(
    async (answerId: string) => {
      if (!user) return;

      const reportData = await showReportModal(t('comments.content.report_title'), 'comment');
      if (!reportData) return;

      try {
        const response = await apiFetch('/api/reports', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
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
        console.error('Error reporting comment:', error);
        await showReportError();
      }
    },
    [user, t]
  );

  // Vote on a comment
  const voteOnAnswer = useCallback(
    async (answerId: string, value: 1 | -1) => {
      if (!user) return;
      const res = await apiFetch(`/api/answers/${answerId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value }),
      });
      if (!res.ok) throw new Error('Failed to vote');
      const data: { score: number; userVote: number | null } = await res.json();

      // Update root answers state
      setAllAnswers(prev =>
        prev.map(a =>
          a._id === answerId ? { ...a, score: data.score, userVote: data.userVote } : a
        )
      );
      // Update loaded replies if the voted answer is a reply
      setLoadedReplies(prev => {
        const updated = { ...prev };
        for (const parentId of Object.keys(updated)) {
          const entry = updated[parentId];
          if (entry.replies.some(r => r._id === answerId)) {
            updated[parentId] = {
              ...entry,
              replies: entry.replies.map(r =>
                r._id === answerId ? { ...r, score: data.score, userVote: data.userVote } : r
              ),
            };
          }
        }
        return updated;
      });
    },
    [user]
  );

  // Toggle best answer (admin only)
  const toggleBestAnswer = useCallback(
    async (answerId: string) => {
      if (!user) return;
      const res = await apiFetch(`/api/answers/${answerId}/best`, {
        method: 'PUT',
      });
      if (!res.ok) return;
      const { isBestAnswer } = await res.json();
      setAllAnswers(prev => prev.map(a => (a._id === answerId ? { ...a, isBestAnswer } : a)));
    },
    [user]
  );

  // Load replies for a thread
  const loadReplies = useCallback(
    async (parentId: string, cursor?: string) => {
      if (!user) return;
      try {
        const params = new URLSearchParams();
        if (cursor) params.set('cursor', cursor);
        params.set('limit', '10');

        const res = await apiFetch(`/api/answers/${parentId}/replies?${params}`);
        if (!res.ok) throw new Error('Failed to load replies');
        const data: { replies: Answer[]; hasMore: boolean } = await res.json();

        setLoadedReplies(prev => {
          const existing = prev[parentId];
          const newReplies =
            cursor && existing ? [...existing.replies, ...data.replies] : data.replies;
          const lastReply = newReplies[newReplies.length - 1];
          return {
            ...prev,
            [parentId]: {
              replies: newReplies,
              hasMore: data.hasMore,
              cursor: lastReply?._id,
            },
          };
        });
      } catch (err) {
        console.error(err);
      }
    },
    [user]
  );

  // Toggle thread open/close
  const toggleThread = useCallback(
    (parentId: string) => {
      setOpenThreads(prev => {
        const isOpen = !prev[parentId];
        if (isOpen && !loadedReplies[parentId]) {
          loadReplies(parentId);
        }
        return { ...prev, [parentId]: isOpen };
      });
    },
    [loadReplies, loadedReplies]
  );

  // Create a reply in a thread
  const replyToAnswer = useCallback(
    async (parentId: string, content: AnswerContent, mentionedUserId?: string) => {
      if (!user) return;
      // Find parent to inherit page/yTop
      const parent = allAnswers.find(a => a._id === parentId);
      if (!parent) return;

      // Pre-render LaTeX if needed
      if (content.type === 'latex' && !content.rendered) {
        content.rendered = renderLatex(content.data);
      }

      const body: Record<string, unknown> = {
        examId,
        page: parent.page,
        yTop: parent.yTop,
        content,
        parentId,
      };
      if (mentionedUserId) {
        body.mentionedUserId = mentionedUserId;
      }

      const res = await apiFetch('/api/answers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create reply');
      }

      setReplyTarget(null);
      // Reload thread replies and root comments (to update replyCount)
      await Promise.all([loadReplies(parentId), loadAllAnswers()]);
      // Make sure the thread is open
      setOpenThreads(prev => ({ ...prev, [parentId]: true }));
    },
    [user, examId, allAnswers, loadReplies, loadAllAnswers]
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
      <aside style={sidebarStyle} aria-label="Comments">
        <div style={sidebarHeaderStyle}>
          <strong>{t('comments.sidebar_title')}</strong>
          <span style={{ opacity: 0.7 }}>
            {selectedGroup
              ? t('comments.selected_group', { count: selectedGroup.length })
              : t('comments.page_indicator', { current: visiblePage, total: numPages || '…' })}
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
              {t('comments.back_to_page')}
            </button>
          </div>
        )}

        <ul style={commentListStyle}>
          {[...(selectedGroup || answers)]
            .sort((a, b) => {
              if (a.isBestAnswer && !b.isBestAnswer) return -1;
              if (!a.isBestAnswer && b.isBestAnswer) return 1;
              return 0;
            })
            .map(a => (
              <li
                key={a._id}
                onClick={() => {
                  // Highlight this comment
                  setHighlightedAnswers([a._id]);

                  // Scroll to the corresponding indicator and highlight it
                  const container = containerRef.current;
                  if (!container) return;

                  // Find all indicators and search for the one corresponding to this comment
                  const indicators = Array.from(container.querySelectorAll('.comment-indicator'));
                  let targetIndicator: HTMLElement | null = null;

                  for (const indicator of indicators) {
                    const indicatorElement = indicator as HTMLElement;
                    const answerIds =
                      indicatorElement.getAttribute('data-answer-ids')?.split(',') || [];

                    // Check if this indicator contains our comment
                    if (answerIds.includes(a._id)) {
                      targetIndicator = indicatorElement;
                      break;
                    }
                  }

                  if (targetIndicator) {
                    // If it's the same marker as before, reset the timer
                    if (currentHighlightedMarkerRef.current === targetIndicator) {
                      // Same marker: reset timer
                      if (highlightTimeoutRef.current) {
                        clearTimeout(highlightTimeoutRef.current);
                      }
                    } else {
                      // Different marker: stop previous effect
                      if (currentHighlightedMarkerRef.current) {
                        currentHighlightedMarkerRef.current.classList.remove(
                          'highlighted-indicator'
                        );
                        if (highlightTimeoutRef.current) {
                          clearTimeout(highlightTimeoutRef.current);
                        }
                      }
                    }

                    // Apply new effect
                    currentHighlightedMarkerRef.current = targetIndicator;
                    targetIndicator.classList.add('highlighted-indicator');
                    targetIndicator.scrollIntoView({ behavior: 'smooth', block: 'center' });

                    // Create a new timeout
                    highlightTimeoutRef.current = setTimeout(() => {
                      targetIndicator?.classList.remove('highlighted-indicator');
                      setHighlightedAnswers([]);
                      currentHighlightedMarkerRef.current = null;
                      highlightTimeoutRef.current = null;
                    }, 3000);
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
                <div
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <div style={commentMetaStyle}>
                    {PermissionUtils.isAdmin(user) && !a.parentId ? (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          toggleBestAnswer(a._id);
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLButtonElement).style.background = a.isBestAnswer
                            ? '#15803d'
                            : '#16a34a';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLButtonElement).style.background = a.isBestAnswer
                            ? '#16a34a'
                            : '#d1d5db';
                        }}
                        style={{
                          ...bestAnswerBadgeStyle,
                          background: a.isBestAnswer ? '#16a34a' : '#d1d5db',
                          cursor: 'pointer',
                        }}
                        title={a.isBestAnswer ? t('comments.best_answer.unmark') : t('comments.best_answer.mark')}
                      >
                        ✓
                      </button>
                    ) : a.isBestAnswer ? (
                      <span style={bestAnswerBadgeStyle} title={t('comments.best_answer.title')}>
                        ✓
                      </span>
                    ) : null}
                    {a.author ? `${a.author.firstName} ${a.author.lastName[0]}.` : t('comments.anonymous')} •
                    {t('common.page')} {a.page}
                  </div>
                  <VoteButtons
                    answerId={a._id}
                    score={a.score ?? 0}
                    userVote={a.userVote ?? null}
                    onVote={voteOnAnswer}
                  />
                </div>
                <AnswerContentDisplay
                  answer={a}
                  onEdit={PermissionUtils.canEdit(user, a.authorId || '') ? editAnswer : undefined}
                  onDelete={
                    PermissionUtils.canDelete(user, a.authorId || '') ? deleteAnswer : undefined
                  }
                  onReport={reportAnswer}
                  onReply={
                    !a.parentId
                      ? id => setReplyTarget(replyTarget?.rootId === id ? null : { rootId: id })
                      : undefined
                  }
                  onUploadImage={uploadImage}
                />

                {/* Thread: reply form (just below the root comment) */}
                {replyTarget?.rootId === a._id && (
                  <ReplyForm
                    onSubmit={content => replyToAnswer(a._id, content, replyTarget.mentionUserId)}
                    onCancel={() => setReplyTarget(null)}
                    onUploadImage={uploadImage}
                    mentionLabel={replyTarget.mentionLabel}
                    onClearMention={() => setReplyTarget({ rootId: a._id })}
                  />
                )}

                {/* Thread: button to view replies */}
                {!a.parentId && (a.replyCount || 0) > 0 && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      toggleThread(a._id);
                    }}
                    style={threadToggleStyle}
                  >
                    {openThreads[a._id]
                      ? t('comments.hide_replies')
                      : (a.replyCount || 0) === 1
                        ? t('comments.view_replies', { count: a.replyCount })
                        : t('comments.view_replies_plural', { count: a.replyCount })}
                  </button>
                )}

                {/* Thread: loaded replies */}
                {openThreads[a._id] && loadedReplies[a._id] && (
                  <div style={threadContainerStyle}>
                    {loadedReplies[a._id].replies.map(reply => (
                      <div key={reply._id} style={replyItemStyle}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div style={commentMetaStyle}>
                            {reply.mentionedAuthor && (
                              <span style={mentionDisplayStyle}>
                                @{reply.mentionedAuthor.firstName}{' '}
                                {reply.mentionedAuthor.lastName[0]}.
                              </span>
                            )}
                            {reply.author
                              ? `${reply.author.firstName} ${reply.author.lastName[0]}.`
                              : t('comments.anonymous')}
                          </div>
                          <VoteButtons
                            answerId={reply._id}
                            score={reply.score ?? 0}
                            userVote={reply.userVote ?? null}
                            onVote={voteOnAnswer}
                          />
                        </div>
                        <AnswerContentDisplay
                          answer={reply}
                          onEdit={
                            PermissionUtils.canEdit(user, reply.authorId || '')
                              ? editAnswer
                              : undefined
                          }
                          onDelete={
                            PermissionUtils.canDelete(user, reply.authorId || '')
                              ? deleteAnswer
                              : undefined
                          }
                          onReport={reportAnswer}
                          onReply={() => {
                            const label = reply.author
                              ? `@${reply.author.firstName} ${reply.author.lastName[0]}.`
                              : undefined;
                            setReplyTarget({
                              rootId: a._id,
                              mentionUserId: reply.authorId,
                              mentionLabel: label,
                            });
                          }}
                          onUploadImage={uploadImage}
                        />
                      </div>
                    ))}
                    {loadedReplies[a._id].hasMore && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          loadReplies(a._id, loadedReplies[a._id].cursor);
                        }}
                        style={loadMoreStyle}
                      >
                        {t('comments.load_more')}
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          {!(selectedGroup || answers).length && (
            <li style={{ opacity: 0.6, padding: '8px 0' }}>
              {selectedGroup ? t('comments.no_group_comments') : t('comments.no_comments')}
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
          {t('comments.tip')}
        </div>
      </aside>
    </div>
  );
}

// ---------- minimal inline styles (no additional CSS dependencies) ----------
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
  marginRight: '1rem', // Prevent text from being hidden by the scrollbar
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
const threadToggleStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#2563eb',
  cursor: 'pointer',
  fontSize: '12px',
  padding: '4px 0',
  textDecoration: 'underline',
};
const threadContainerStyle: React.CSSProperties = {
  borderLeft: '2px solid #d1d5db',
  marginLeft: 8,
  paddingLeft: 10,
  marginTop: 4,
};
const replyItemStyle: React.CSSProperties = {
  padding: '6px 0',
  borderBottom: '1px dotted #e5e7eb',
  wordWrap: 'break-word',
  overflowWrap: 'break-word',
  wordBreak: 'break-word',
  maxWidth: '100%',
};
const loadMoreStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#2563eb',
  cursor: 'pointer',
  fontSize: '11px',
  padding: '4px 0',
  textDecoration: 'underline',
};

const mentionDisplayStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '1px 6px',
  background: '#dbeafe',
  color: '#1d4ed8',
  borderRadius: '10px',
  fontSize: '11px',
  fontWeight: 600,
  marginRight: '4px',
};

const bestAnswerBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '16px',
  height: '16px',
  borderRadius: '50%',
  background: '#16a34a',
  color: 'white',
  fontSize: '10px',
  fontWeight: 700,
  marginRight: '4px',
  verticalAlign: 'middle',
};
