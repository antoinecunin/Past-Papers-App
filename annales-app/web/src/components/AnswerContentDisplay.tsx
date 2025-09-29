import React, { useState, useEffect } from 'react';
import type { Answer, AnswerContent, ContentType } from '../types/answer';
import { renderLatex } from '../utils/latex';
import { TrashIcon, CopyIcon } from './ui/Icon';

interface AnswerContentDisplayProps {
  answer: Answer;
  onEdit?: (answerId: string, newContent: AnswerContent) => Promise<void>;
  onDelete?: (answerId: string) => Promise<void>;
}

export const AnswerContentDisplay: React.FC<AnswerContentDisplayProps> = ({
  answer,
  onEdit,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [editContent, setEditContent] = useState<AnswerContent | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [renderKey, setRenderKey] = useState(0);
  const content = answer.content;

  // Forcer le re-rendu quand le contenu change ou quand on sort du mode édition
  useEffect(() => {
    setRenderKey(prev => prev + 1);
  }, [content.type, content.data, isEditing]);

  const startEdit = () => {
    setEditContent(content);
    setIsEditing(true);
  };

  const saveEdit = async () => {
    if (editContent && onEdit) {
      try {
        await onEdit(answer._id.toString(), editContent);
        setIsEditing(false);
        setEditContent(null);
      } catch (error) {
        console.error('Erreur lors de la modification:', error);
      }
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditContent(null);
  };

  const handleCopy = async () => {
    try {
      // Pour LaTeX, copier le contenu brut (avant compilation)
      const textToCopy = content.data;
      await navigator.clipboard.writeText(textToCopy);
    } catch {
      // Fallback pour les navigateurs plus anciens
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
        console.error('Erreur lors de la copie:', fallbackError);
      }
      document.body.removeChild(textArea);
    }
  };

  const handleDelete = async () => {
    if (onDelete && showConfirmDelete) {
      try {
        await onDelete(answer._id.toString());
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
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
                {truncated ? '...Plus' : ' Moins'}
              </button>
            )}
          </div>
        );
      }

      case 'image':
        return (
          <div style={{ maxWidth: '100%', overflow: 'hidden' }}>
            <img
              src={contentToRender.data}
              alt="Commentaire image"
              style={imageStyle}
              onError={e => {
                const img = e.target as HTMLImageElement;
                const errorDiv = img.nextElementSibling as HTMLDivElement;
                img.style.display = 'none';
                errorDiv.textContent = `[Image non trouvée: ${contentToRender.data}]`;
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
              onMouseDown={e => e.preventDefault()} // Empêche la sélection
            />
            {shouldShowLatexToggle && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                style={{ ...toggleButtonStyle, marginTop: '4px', pointerEvents: 'auto' }}
              >
                {truncated ? '...Plus' : ' Moins'}
              </button>
            )}
            <details style={{ marginTop: '4px', pointerEvents: 'auto' }}>
              <summary style={summaryStyle}>Code LaTeX</summary>
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
        onClick={e => e.stopPropagation()} // Empêcher la propagation vers le parent
      >
        <select
          value={editContent.type}
          onChange={e => {
            const newType = e.target.value as ContentType;
            const newContent = { ...editContent, type: newType };
            // Supprimer le rendered quand on change de type
            delete newContent.rendered;
            setEditContent({ ...newContent });
          }}
          style={selectStyle}
        >
          <option value="text">💬 Texte</option>
          <option value="image">🖼️ Image</option>
          <option value="latex">📐 LaTeX</option>
        </select>
        <textarea
          value={editContent.data}
          onChange={e => {
            const newContent = { ...editContent, data: e.target.value };
            // Si c'est du LaTeX, supprimer le rendered existant pour forcer la régénération
            if (newContent.type === 'latex') {
              delete newContent.rendered;
            }
            setEditContent(newContent);
          }}
          style={textareaStyle}
        />
        {editContent.type === 'latex' && (
          <div style={latexPreviewStyle} key={`latex-preview-${editContent.data.length}`}>
            <div dangerouslySetInnerHTML={{ __html: renderLatex(editContent.data) }} />
          </div>
        )}
        {editContent.type === 'image' && editContent.data.trim() && (
          <div style={imagePreviewStyle} key={`image-preview-${editContent.data.trim()}`}>
            <strong
              style={{ fontSize: '10px', color: '#6b7280', display: 'block', marginBottom: '4px' }}
            >
              Aperçu de l&apos;image :
            </strong>
            <img
              src={editContent.data.trim()}
              alt="Aperçu"
              style={previewImageStyle}
              key={editContent.data.trim()}
              onError={e => {
                const img = e.target as HTMLImageElement;
                const errorDiv = img.nextElementSibling as HTMLDivElement;
                img.style.display = 'none';
                if (errorDiv) {
                  errorDiv.textContent = `[Image non trouvée: ${editContent.data.trim()}]`;
                  errorDiv.style.display = 'block';
                }
              }}
            />
            <div style={{ ...errorDivStyle, marginTop: '4px' }}></div>
          </div>
        )}
        <div style={buttonContainerStyle}>
          <button onClick={saveEdit} style={saveButtonStyle}>
            ✓ Sauver
          </button>
          <button onClick={cancelEdit} style={cancelButtonStyle}>
            ✕ Annuler
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
        onClick={e => e.stopPropagation()} // Empêcher la propagation vers le parent
      >
        <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#dc2626' }}>
          Êtes-vous sûr de vouloir supprimer ce commentaire ?
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleDelete} style={deleteButtonStyle}>
            Supprimer
          </button>
          <button onClick={cancelDelete} style={cancelButtonStyle}>
            Annuler
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        marginRight: '1rem', // Réserver un espace responsive pour les icônes
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
          cursor: 'inherit', // Hériter du curseur du parent (pointer)
          userSelect: 'auto',
        }}
      >
        <div key={`${content.type}-${renderKey}-${isExpanded}`}>
          {renderContent(content, !isExpanded)}
        </div>
      </div>

      {/* Boutons d'actions */}
      {!isEditing && (
        <div style={actionButtonsStyle} data-action-buttons>
          {/* Bouton copier */}
          <button
            onClick={e => {
              e.stopPropagation(); // Empêcher la propagation vers le parent
              handleCopy();
            }}
            style={actionButtonStyle}
            title="Copier le contenu"
          >
            <CopyIcon className="text-gray-500 hover:text-gray-700" />
          </button>

          {/* Bouton éditer */}
          {onEdit && (
            <button
              onClick={e => {
                e.stopPropagation(); // Empêcher la propagation vers le parent
                startEdit();
              }}
              style={actionButtonStyle}
              title="Modifier"
            >
              ✏️
            </button>
          )}

          {/* Bouton supprimer */}
          {onDelete && (
            <button
              onClick={e => {
                e.stopPropagation(); // Empêcher la propagation vers le parent
                confirmDelete();
              }}
              style={actionButtonStyle}
              title="Supprimer"
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
  userSelect: 'none', // Empêche la sélection sur le LaTeX rendu
};

const summaryStyle: React.CSSProperties = {
  fontSize: '10px',
  color: '#6b7280',
  cursor: 'pointer',
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

const imagePreviewStyle: React.CSSProperties = {
  marginTop: '8px',
  padding: '8px',
  background: '#f9fafb',
  borderRadius: '4px',
  border: '1px solid #e5e7eb',
};

const previewImageStyle: React.CSSProperties = {
  maxWidth: '200px',
  maxHeight: '150px',
  borderRadius: '4px',
  display: 'block',
  objectFit: 'contain',
};
