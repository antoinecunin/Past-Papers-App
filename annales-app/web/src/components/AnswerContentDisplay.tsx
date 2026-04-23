import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Answer, AnswerContent, ContentType } from '../types/answer';
import { renderLatex } from '../utils/latex';
import { TrashIcon, CopyIcon } from './ui/Icon';
import {
  CONTENT_MAX_LENGTH,
  IMAGE_MAX_SIZE,
  formatCharCount,
  getCharCountColor,
  imageKeyToUrl,
} from '../constants/content';

interface AnswerContentDisplayProps {
  answer: Answer;
  onEdit?: (answerId: string, newContent: AnswerContent) => Promise<void>;
  onDelete?: (answerId: string) => Promise<void>;
  onReport?: (answerId: string) => Promise<void>;
  onReply?: (answerId: string) => void;
  onUploadImage?: (file: File) => Promise<string>;
}

export const AnswerContentDisplay: React.FC<AnswerContentDisplayProps> = ({
  answer,
  onEdit,
  onDelete,
  onReport,
  onReply,
  onUploadImage,
}) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [editContent, setEditContent] = useState<AnswerContent | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editImageError, setEditImageError] = useState<string | null>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const content = answer.content;

  const startEdit = () => {
    setEditContent(content);
    setEditImageFile(null);
    setEditImagePreview(null);
    setEditImageError(null);
    setIsEditing(true);
  };

  const saveEdit = async () => {
    if (!editContent || !onEdit) return;
    try {
      let contentToSave = editContent;
      // Upload new image if one was selected
      if (editContent.type === 'image' && editImageFile && onUploadImage) {
        const key = await onUploadImage(editImageFile);
        contentToSave = { type: 'image', data: key };
      }
      await onEdit(answer._id.toString(), contentToSave);
      setIsEditing(false);
      setEditContent(null);
      setEditImageFile(null);
      setEditImagePreview(null);
    } catch (error) {
      console.error('Error editing:', error);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditContent(null);
    setEditImageFile(null);
    setEditImagePreview(null);
    setEditImageError(null);
  };

  const handleCopy = async () => {
    try {
      // For LaTeX, copy the raw content (before compilation)
      const textToCopy = content.data;
      await navigator.clipboard.writeText(textToCopy);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = content.data;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
      } catch (fallbackError) {
        console.error('Error copying:', fallbackError);
      }
      document.body.removeChild(textArea);
    }
  };

  const handleDelete = async () => {
    if (onDelete && showConfirmDelete) {
      try {
        await onDelete(answer._id.toString());
      } catch (error) {
        console.error('Error deleting:', error);
      }
    }
    setShowConfirmDelete(false);
  };

  const confirmDelete = () => {
    setShowConfirmDelete(true);
  };

  const cancelDelete = () => {
    setShowConfirmDelete(false);
  };

  const truncateText = (text: string, maxLength = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength);
  };

  const renderContent = (contentToRender: AnswerContent, truncated = false) => {
    switch (contentToRender.type) {
      case 'text': {
        const textData = truncated ? truncateText(contentToRender.data) : contentToRender.data;
        const shouldShowTextToggle = contentToRender.data.length > 150;
        return (
          <div style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
            {textData}
            {shouldShowTextToggle && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                style={toggleButtonStyle}
              >
                {truncated ? t('comments.content.more') : t('comments.content.less')}
              </button>
            )}
          </div>
        );
      }

      case 'image':
        return (
          <div style={{ maxWidth: '100%', overflow: 'hidden' }}>
            <img
              src={imageKeyToUrl(contentToRender.data)}
              alt="Comment image"
              style={imageStyle}
              onError={e => {
                const img = e.target as HTMLImageElement;
                const errorDiv = img.nextElementSibling as HTMLDivElement;
                img.style.display = 'none';
                errorDiv.textContent = t('comments.content.image_not_found');
                errorDiv.style.display = 'block';
              }}
            />
            <div style={errorDivStyle}></div>
          </div>
        );

      case 'latex': {
        const latexData = truncated ? truncateText(contentToRender.data) : contentToRender.data;
        const renderedLatex = renderLatex(latexData);
        const shouldShowLatexToggle = contentToRender.data.length > 150;

        return (
          <div style={{ maxWidth: '100%' }}>
            <div
              dangerouslySetInnerHTML={{ __html: renderedLatex }}
              style={latexRenderStyle}
              onMouseDown={e => e.preventDefault()} // Prevent selection
            />
            {shouldShowLatexToggle && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                style={{ ...toggleButtonStyle, marginTop: '4px', pointerEvents: 'auto' }}
              >
                {truncated ? t('comments.content.more') : t('comments.content.less')}
              </button>
            )}
            <details
              style={{ marginTop: '4px', pointerEvents: 'auto' }}
              onClick={e => e.stopPropagation()}
            >
              <summary style={summaryStyle}>{t('comments.content.latex_code')}</summary>
              <div style={latexCodeStyle}>{latexData}</div>
            </details>
          </div>
        );
      }

      default:
        return (
          <div style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
            {contentToRender.data}
          </div>
        );
    }
  };

  if (isEditing && editContent) {
    return (
      <div
        style={editContainerStyle}
        onClick={e => e.stopPropagation()} // Prevent propagation to parent
      >
        <select
          value={editContent.type}
          onChange={e => {
            const newType = e.target.value as ContentType;
            const newContent = { ...editContent, type: newType };
            delete newContent.rendered;
            setEditContent({ ...newContent });
            setEditImageFile(null);
            setEditImagePreview(null);
            setEditImageError(null);
            if (editFileInputRef.current) editFileInputRef.current.value = '';
          }}
          style={selectStyle}
        >
          <option value="text">{t('comments.content.type_text')}</option>
          <option value="image">{t('comments.content.type_image')}</option>
          <option value="latex">{t('comments.content.type_latex')}</option>
        </select>
        {editContent.type === 'image' ? (
          <div>
            {/* Show current image */}
            {editContent.data && !editImagePreview && (
              <img src={imageKeyToUrl(editContent.data)} alt="Current" style={previewImageStyle} />
            )}
            {editImagePreview && (
              <img src={editImagePreview} alt="New preview" style={previewImageStyle} />
            )}
            <input
              ref={editFileInputRef}
              type="file"
              accept="image/*"
              onChange={e => {
                const file = e.target.files?.[0];
                setEditImageError(null);
                if (!file) {
                  setEditImageFile(null);
                  setEditImagePreview(null);
                  return;
                }
                if (!file.type.startsWith('image/')) {
                  setEditImageError(t('comments.reply_form.file_type_error'));
                  return;
                }
                if (file.size > IMAGE_MAX_SIZE) {
                  setEditImageError(
                    t('comments.reply_form.file_size_error', { size: IMAGE_MAX_SIZE / 1024 / 1024 })
                  );
                  return;
                }
                setEditImageFile(file);
                setEditImagePreview(URL.createObjectURL(file));
              }}
              style={{ fontSize: '11px', padding: '4px 0', marginTop: '4px' }}
            />
            {editImageError && (
              <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '2px' }}>
                {editImageError}
              </div>
            )}
          </div>
        ) : (
          <>
            <textarea
              value={editContent.data}
              onChange={e => {
                const newContent = { ...editContent, data: e.target.value };
                if (newContent.type === 'latex') {
                  delete newContent.rendered;
                }
                setEditContent(newContent);
              }}
              style={textareaStyle}
              maxLength={CONTENT_MAX_LENGTH[editContent.type]}
            />
            <div
              style={{
                fontSize: '11px',
                textAlign: 'right',
                marginTop: '2px',
                color: getCharCountColor(
                  editContent.data.length,
                  CONTENT_MAX_LENGTH[editContent.type]
                ),
              }}
            >
              {formatCharCount(editContent.data.length, CONTENT_MAX_LENGTH[editContent.type])}
            </div>
          </>
        )}
        {editContent.type === 'latex' && (
          <div style={latexPreviewStyle} key={`latex-preview-${editContent.data.length}`}>
            <div dangerouslySetInnerHTML={{ __html: renderLatex(editContent.data) }} />
          </div>
        )}
        <div style={buttonContainerStyle}>
          <button onClick={saveEdit} style={saveButtonStyle}>
            {t('comments.content.save')}
          </button>
          <button onClick={cancelEdit} style={cancelButtonStyle}>
            {t('comments.content.cancel')}
          </button>
        </div>
      </div>
    );
  }

  const handleContentClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON') {
      return;
    }
    if (content.data.length > 150) {
      setIsExpanded(!isExpanded);
    }
  };

  if (showConfirmDelete) {
    return (
      <div
        style={deleteConfirmStyle}
        onClick={e => e.stopPropagation()} // Prevent propagation to parent
      >
        <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#dc2626' }}>
          {t('comments.content.delete_confirm')}
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleDelete} style={deleteButtonStyle}>
            {t('common.delete')}
          </button>
          <button onClick={cancelDelete} style={cancelButtonStyle}>
            {t('common.cancel')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        marginRight: '1rem', // Reserve responsive space for icons
      }}
      onMouseEnter={e => {
        const buttons = e.currentTarget.querySelector('[data-action-buttons]') as HTMLElement;
        if (buttons) buttons.style.opacity = '1';
      }}
      onMouseLeave={e => {
        const buttons = e.currentTarget.querySelector('[data-action-buttons]') as HTMLElement;
        if (buttons) buttons.style.opacity = '0';
      }}
    >
      <div
        onClick={handleContentClick}
        style={{
          cursor: 'inherit', // Inherit cursor from parent (pointer)
          userSelect: 'auto',
        }}
      >
        <div key={`${content.type}-${content.data}-${isEditing}-${isExpanded}`}>
          {renderContent(content, !isExpanded)}
        </div>
      </div>

      {/* Action buttons */}
      {!isEditing && (
        <div style={actionButtonsStyle} data-action-buttons>
          {/* Copy button */}
          <button
            onClick={e => {
              e.stopPropagation(); // Prevent propagation to parent
              handleCopy();
            }}
            style={actionButtonStyle}
            title={t('comments.content.copy_title')}
          >
            <CopyIcon className="text-gray-500 hover:text-gray-700" />
          </button>

          {/* Edit button */}
          {onEdit && (
            <button
              onClick={e => {
                e.stopPropagation(); // Prevent propagation to parent
                startEdit();
              }}
              style={actionButtonStyle}
              title={t('comments.content.edit_title')}
            >
              ✏️
            </button>
          )}

          {/* Report button */}
          {onReport && (
            <button
              onClick={e => {
                e.stopPropagation(); // Prevent propagation to parent
                onReport(answer._id.toString());
              }}
              style={actionButtonStyle}
              title={t('comments.content.report_title')}
            >
              <svg
                className="w-3 h-3 text-orange-500 hover:text-orange-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </button>
          )}

          {/* Reply button */}
          {onReply && (
            <button
              onClick={e => {
                e.stopPropagation();
                onReply(answer._id.toString());
              }}
              style={actionButtonStyle}
              title={t('comments.content.reply_title')}
            >
              <svg
                className="w-3 h-3 text-blue-500 hover:text-blue-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                />
              </svg>
            </button>
          )}

          {/* Delete button */}
          {onDelete && (
            <button
              onClick={e => {
                e.stopPropagation(); // Prevent propagation to parent
                confirmDelete();
              }}
              style={actionButtonStyle}
              title={t('comments.content.delete_title')}
            >
              <TrashIcon className="text-red-500 hover:text-red-700" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Styles
const toggleButtonStyle: React.CSSProperties = {
  marginLeft: '4px',
  background: 'none',
  border: 'none',
  color: '#2563eb',
  cursor: 'pointer',
  fontSize: '12px',
  textDecoration: 'underline',
};

const imageStyle: React.CSSProperties = {
  maxWidth: '100%',
  maxHeight: '200px',
  borderRadius: '4px',
  display: 'block',
};

const errorDivStyle: React.CSSProperties = {
  display: 'none',
  color: '#dc2626',
  fontSize: '12px',
  wordWrap: 'break-word',
};

const latexRenderStyle: React.CSSProperties = {
  maxWidth: '100%',
  overflowX: 'auto',
  overflowY: 'hidden',
  WebkitOverflowScrolling: 'touch',
  scrollbarWidth: 'thin',
  userSelect: 'none', // Prevent selection on rendered LaTeX
};

const summaryStyle: React.CSSProperties = {
  fontSize: '10px',
  color: '#2563eb',
  cursor: 'pointer',
  textDecoration: 'underline',
};

const latexCodeStyle: React.CSSProperties = {
  fontFamily: 'monospace',
  background: '#f5f5f5',
  padding: '4px',
  borderRadius: '4px',
  fontSize: '10px',
  marginTop: '4px',
  wordWrap: 'break-word',
  overflowWrap: 'break-word',
  maxWidth: '100%',
};

const editContainerStyle: React.CSSProperties = {
  border: '1px solid #2563eb',
  borderRadius: '4px',
  padding: '8px',
  background: '#f8fafc',
};

const selectStyle: React.CSSProperties = {
  marginBottom: '8px',
  padding: '4px',
  fontSize: '12px',
  width: '100%',
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '60px',
  padding: '8px',
  fontSize: '12px',
  border: '1px solid #d1d5db',
  borderRadius: '4px',
  resize: 'vertical',
};

const latexPreviewStyle: React.CSSProperties = {
  marginTop: '8px',
  padding: '8px',
  background: '#f9fafb',
  borderRadius: '4px',
  fontSize: '14px',
  maxWidth: '100%',
  overflowX: 'auto',
  overflowY: 'hidden',
  wordWrap: 'break-word',
  overflowWrap: 'break-word',
};

const buttonContainerStyle: React.CSSProperties = {
  marginTop: '8px',
  display: 'flex',
  gap: '8px',
};

const saveButtonStyle: React.CSSProperties = {
  padding: '4px 12px',
  background: '#16a34a',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  fontSize: '12px',
  cursor: 'pointer',
};

const cancelButtonStyle: React.CSSProperties = {
  padding: '4px 12px',
  background: '#dc2626',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  fontSize: '12px',
  cursor: 'pointer',
};

const actionButtonsStyle: React.CSSProperties = {
  position: 'absolute',
  top: '0',
  right: '0',
  display: 'flex',
  gap: '2px',
  opacity: 0,
  transition: 'opacity 0.2s',
  pointerEvents: 'auto',
};

const actionButtonStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.9)',
  border: '1px solid #e5e7eb',
  borderRadius: '4px',
  padding: '4px',
  fontSize: '10px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '24px',
  height: '24px',
  transition: 'all 0.2s',
};

const deleteConfirmStyle: React.CSSProperties = {
  background: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: '6px',
  padding: '12px',
};

const deleteButtonStyle: React.CSSProperties = {
  padding: '4px 12px',
  background: '#dc2626',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  fontSize: '12px',
  cursor: 'pointer',
};

const previewImageStyle: React.CSSProperties = {
  maxWidth: '200px',
  maxHeight: '150px',
  borderRadius: '4px',
  display: 'block',
  objectFit: 'contain',
};
