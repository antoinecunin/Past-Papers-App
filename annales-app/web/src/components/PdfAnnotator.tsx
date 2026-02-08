import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjs from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { useCommentPositioning } from '../hooks/useCommentPositioning';
import { renderLatex } from '../utils/latex';
import { PermissionUtils } from '../utils/permissions';
import type { Answer, AnswerContent, ContentType } from '../types/answer';
import { AnswerContentDisplay } from './AnswerContentDisplay';
import { ReplyForm } from './ReplyForm';
import { useAuthStore } from '../stores/authStore';
import { useInstance } from '../hooks/useInstance';
import { showReportModal, showReportSuccess, showReportError } from '../utils/reportModal';
import { CONTENT_MAX_LENGTH, formatCharCount, getCharCountColor, isAllowedImageUrl } from '../constants/content';

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
  const { user, token } = useAuthStore();
  const { primaryColor, primaryHoverColor } = useInstance();
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
  const [loadedReplies, setLoadedReplies] = useState<Record<string, { replies: Answer[]; hasMore: boolean; cursor?: string }>>({});

  // Hook for click positioning
  const { pendingPosition, handlePageClick, confirmComment, cancelComment } = useCommentPositioning(
    examId,
    token,
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
      if (!token) return;

      // Load PDF with authentication
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
              <option value="text">💬 Text</option>
              <option value="image">🖼️ Image (URL)</option>
              <option value="latex">📐 LaTeX</option>
            </select>
            <textarea
              class="content-input"
              placeholder="Your comment..."
              style="padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; resize: none; font-size: 12px;"
              rows="3"
              maxlength="${defaultMaxLength}"
              required
            ></textarea>
            <div class="char-counter" style="font-size: 11px; text-align: right; color: #6b7280;">
              0 / ${defaultMaxLength.toLocaleString('en-US')}
            </div>
            <div class="image-host-warning" style="display: none; font-size: 11px; color: #dc2626; padding: 4px 8px; background: #fef2f2; border-radius: 4px; border: 1px solid #fecaca;">
              Unauthorized host. Use imgur.com, ibb.co, or postimg.cc
            </div>
            <div class="image-preview" style="display: none; max-width: 50%; max-height: 5rem; overflow: hidden;">
              <img style="width: 100%; height: auto; border-radius: 4px; object-fit: cover;" />
            </div>
            <div class="latex-preview" style="display: none; padding: 8px; background: #f9fafb; border-radius: 4px; border: 1px solid #e5e7eb; font-size: 14px; max-width: 100%; overflow-x: auto; overflow-y: hidden; word-wrap: break-word; overflow-wrap: break-word;">
            </div>
            <div style="display: flex; gap: 8px;">
              <button type="submit" style="padding: 4px 12px; background: #2563eb; color: white; border: none; border-radius: 4px; font-size: 12px; cursor: pointer;">
                Add
              </button>
              <button type="button" class="cancel-btn" style="padding: 4px 12px; background: #f3f4f6; color: #374151; border: none; border-radius: 4px; font-size: 12px; cursor: pointer;">
                Cancel
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
        const charCounter = indicator.querySelector('.char-counter') as HTMLDivElement;
        const imageHostWarning = indicator.querySelector('.image-host-warning') as HTMLDivElement;
        const submitBtn = indicator.querySelector('button[type="submit"]') as HTMLButtonElement;

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
          const content = textarea.value.trim();
          const maxLength = CONTENT_MAX_LENGTH[selectedType];

          // Update textarea limit
          textarea.maxLength = maxLength;
          updateCharCounter();

          // Reset button state and warning
          submitBtn.disabled = false;
          submitBtn.style.opacity = '1';
          submitBtn.style.cursor = 'pointer';
          imageHostWarning.style.display = 'none';

          switch (selectedType) {
            case 'text':
              textarea.placeholder = 'Your comment...';
              imagePreview.style.display = 'none';
              latexPreview.style.display = 'none';
              break;
            case 'image':
              textarea.placeholder = 'Image URL (imgur.com, ibb.co, postimg.cc)';
              latexPreview.style.display = 'none';
              // Update image preview with existing content
              if (content && content.startsWith('http')) {
                const isAllowed = isAllowedImageUrl(content);
                imageHostWarning.style.display = isAllowed ? 'none' : 'block';
                submitBtn.disabled = !isAllowed;
                submitBtn.style.opacity = isAllowed ? '1' : '0.5';
                submitBtn.style.cursor = isAllowed ? 'pointer' : 'not-allowed';
                if (isAllowed) {
                  previewImg.src = content;
                  imagePreview.style.display = 'block';
                  previewImg.onerror = () => (imagePreview.style.display = 'none');
                } else {
                  imagePreview.style.display = 'none';
                }
              } else {
                imagePreview.style.display = 'none';
              }
              break;
            case 'latex':
              textarea.placeholder = 'LaTeX code (e.g.: \\int_0^1 x^2 dx = \\frac{1}{3})';
              imagePreview.style.display = 'none';
              latexPreview.style.display = 'block';
              // Update preview with existing content
              if (content) {
                latexPreview.innerHTML = renderLatex(content);
              } else {
                latexPreview.innerHTML = '<em style="color: #9ca3af;">LaTeX preview...</em>';
              }
              break;
          }
        };

        typeSelect.addEventListener('change', updatePlaceholder);

        // Real-time preview + character counter
        textarea.addEventListener('input', () => {
          const currentType = typeSelect.value as ContentType;
          const content = textarea.value.trim();

          // Update counter
          updateCharCounter();

          if (currentType === 'image') {
            if (content && content.startsWith('http')) {
              // Check if the host is authorized
              const isAllowed = isAllowedImageUrl(content);
              imageHostWarning.style.display = isAllowed ? 'none' : 'block';
              submitBtn.disabled = !isAllowed;
              submitBtn.style.opacity = isAllowed ? '1' : '0.5';
              submitBtn.style.cursor = isAllowed ? 'pointer' : 'not-allowed';

              // Show preview only if authorized
              if (isAllowed) {
                previewImg.src = content;
                imagePreview.style.display = 'block';
                previewImg.onerror = () => (imagePreview.style.display = 'none');
              } else {
                imagePreview.style.display = 'none';
              }
            } else {
              imageHostWarning.style.display = 'none';
              imagePreview.style.display = 'none';
              submitBtn.disabled = false;
              submitBtn.style.opacity = '1';
              submitBtn.style.cursor = 'pointer';
            }
          } else if (currentType === 'latex') {
            if (content) {
              latexPreview.innerHTML = renderLatex(content);
            } else {
              latexPreview.innerHTML = '<em style="color: #9ca3af;">LaTeX preview...</em>';
            }
          }
        });

        form.addEventListener('submit', e => {
          e.preventDefault();
          e.stopPropagation();
          const content = textarea.value.trim();
          const contentType = typeSelect.value as ContentType;

          if (content) {
            // Create the AnswerContent object based on selected type
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
  }, [pendingPosition, wrappedConfirmComment, wrappedCancelComment]);

  // Function to load all comments
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

  // Load all comments on mount and when examId changes
  useEffect(() => {
    loadAllAnswers();
  }, [loadAllAnswers, examId]);

  // Filter comments for the visible page (locally, no API call)
  useEffect(() => {
    const pageAnswers = allAnswers
      .filter((a) => a.page === visiblePage)
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

        const response = await fetch(`/api/answers/${answerId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
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
    [loadAllAnswers, token, findReplyParent]
  );

  // Function to delete a comment
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
    [loadAllAnswers, token, findReplyParent]
  );

  // Function to report a comment
  const reportAnswer = useCallback(
    async (answerId: string) => {
      if (!token) return;

      const reportData = await showReportModal('Report this comment', 'comment');
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
        console.error('Error reporting comment:', error);
        await showReportError();
      }
    },
    [token]
  );

  // Load replies for a thread
  const loadReplies = useCallback(
    async (parentId: string, cursor?: string) => {
      if (!token) return;
      try {
        const params = new URLSearchParams();
        if (cursor) params.set('cursor', cursor);
        params.set('limit', '10');

        const res = await fetch(`/api/answers/${parentId}/replies?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load replies');
        const data: { replies: Answer[]; hasMore: boolean } = await res.json();

        setLoadedReplies(prev => {
          const existing = prev[parentId];
          const newReplies = cursor && existing
            ? [...existing.replies, ...data.replies]
            : data.replies;
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
    [token]
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
      if (!token) return;
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

      const res = await fetch('/api/answers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Failed to create reply');

      setReplyTarget(null);
      // Reload thread replies and root comments (to update replyCount)
      await Promise.all([
        loadReplies(parentId),
        loadAllAnswers(),
      ]);
      // Make sure the thread is open
      setOpenThreads(prev => ({ ...prev, [parentId]: true }));
    },
    [token, examId, allAnswers, loadReplies, loadAllAnswers]
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
          <strong>Comments</strong>
          <span style={{ opacity: 0.7 }}>
            {selectedGroup
              ? `Selected group (${selectedGroup.length})`
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
              Back to page
            </button>
          </div>
        )}

        <ul style={commentListStyle}>
          {(selectedGroup || answers).map(a => (
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
                      currentHighlightedMarkerRef.current.classList.remove('highlighted-indicator');
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
              onMouseEnter={e => {
                // Trigger hover on AnswerContentDisplay action buttons
                const buttons = e.currentTarget.querySelector(
                  '[data-action-buttons]'
                ) as HTMLElement;
                if (buttons) {
                  buttons.style.opacity = '1';
                }
              }}
              onMouseLeave={e => {
                // Remove hover from action buttons
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
                {a.author ? `${a.author.firstName} ${a.author.lastName[0]}.` : 'Anonymous'} • Page {a.page}
              </div>
              <AnswerContentDisplay
                answer={a}
                onEdit={PermissionUtils.canEdit(user, a.authorId || '') ? editAnswer : undefined}
                onDelete={PermissionUtils.canDelete(user, a.authorId || '') ? deleteAnswer : undefined}
                onReport={reportAnswer}
                onReply={!a.parentId ? (id) => setReplyTarget(replyTarget?.rootId === id ? null : { rootId: id }) : undefined}
              />

              {/* Thread: reply form (just below the root comment) */}
              {replyTarget?.rootId === a._id && (
                <ReplyForm
                  onSubmit={content => replyToAnswer(a._id, content, replyTarget.mentionUserId)}
                  onCancel={() => setReplyTarget(null)}
                  mentionLabel={replyTarget.mentionLabel}
                  onClearMention={() => setReplyTarget({ rootId: a._id })}
                />
              )}

              {/* Thread: button to view replies */}
              {!a.parentId && (a.replyCount || 0) > 0 && (
                <button
                  onClick={e => { e.stopPropagation(); toggleThread(a._id); }}
                  style={threadToggleStyle}
                >
                  {openThreads[a._id]
                    ? 'Hide replies'
                    : `View ${a.replyCount} repl${(a.replyCount || 0) > 1 ? 'ies' : 'y'}`}
                </button>
              )}

              {/* Thread: loaded replies */}
              {openThreads[a._id] && loadedReplies[a._id] && (
                <div style={threadContainerStyle}>
                  {loadedReplies[a._id].replies.map(reply => (
                    <div
                      key={reply._id}
                      style={replyItemStyle}
                    >
                      <div style={commentMetaStyle}>
                        {reply.mentionedAuthor && (
                          <span style={getMentionDisplayStyle(primaryHoverColor)}>
                            @{reply.mentionedAuthor.firstName} {reply.mentionedAuthor.lastName[0]}.
                          </span>
                        )}
                        {reply.author ? `${reply.author.firstName} ${reply.author.lastName[0]}.` : 'Anonymous'}
                      </div>
                      <AnswerContentDisplay
                        answer={reply}
                        onEdit={PermissionUtils.canEdit(user, reply.authorId || '') ? editAnswer : undefined}
                        onDelete={PermissionUtils.canDelete(user, reply.authorId || '') ? deleteAnswer : undefined}
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
                      />
                    </div>
                  ))}
                  {loadedReplies[a._id].hasMore && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        loadReplies(a._id, loadedReplies[a._id].cursor);
                      }}
                      style={getLoadMoreStyle(primaryColor)}
                    >
                      Load more replies
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
          {!(selectedGroup || answers).length && (
            <li style={{ opacity: 0.6, padding: '8px 0' }}>
              {selectedGroup
                ? 'No comments in this group.'
                : 'No comments on this page.'}
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
          Tip: Click directly on the PDF to add a comment at the exact location
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
const getLoadMoreStyle = (primaryColor: string): React.CSSProperties => ({
  background: 'none',
  border: 'none',
  color: primaryColor,
  cursor: 'pointer',
  fontSize: '11px',
  padding: '4px 0',
  textDecoration: 'underline',
});

const getMentionDisplayStyle = (primaryHoverColor: string): React.CSSProperties => {
  // Calculate lighter background based on primary hover color
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 29, g: 78, b: 216 };
  };

  const rgb = hexToRgb(primaryHoverColor);
  const lightBg = `rgb(${Math.min(255, rgb.r + (255 - rgb.r) * 0.9)}, ${Math.min(255, rgb.g + (255 - rgb.g) * 0.9)}, ${Math.min(255, rgb.b + (255 - rgb.b) * 0.9)})`;

  return {
    display: 'inline-block',
    padding: '1px 6px',
    background: lightBg,
    color: primaryHoverColor,
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: 600,
    marginRight: '4px',
  };
};
