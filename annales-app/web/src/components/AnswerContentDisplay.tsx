import React, { useState } from 'react';
import type { Answer, AnswerContent, ContentType } from '../types/answer';
import { renderLatex } from '../utils/latex';

// Helper for backward compatibility
const getAnswerContent = (answer: Answer): AnswerContent => {
  if (answer.content) {
    return answer.content;
  }
  // Fallback for old format
  return {
    type: 'text',
    data: answer.text || '',
  };
};

interface AnswerContentDisplayProps {
  answer: Answer;
  onEdit?: (answerId: string, newContent: AnswerContent) => Promise<void>;
}

export const AnswerContentDisplay: React.FC<AnswerContentDisplayProps> = ({ answer, onEdit }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [editContent, setEditContent] = useState<AnswerContent | null>(null);
  const content = getAnswerContent(answer);

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

  const truncateText = (text: string, maxLength = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength);
  };

  const renderContent = (contentToRender: AnswerContent, truncated = false) => {
    switch (contentToRender.type) {
      case 'text':
        const textData = truncated ? truncateText(contentToRender.data) : contentToRender.data;
        const shouldShowTextToggle = contentToRender.data.length > 150;
        return (
          <div style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
            {textData}
            {shouldShowTextToggle && (
              <button
                onClick={(e) => {
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

      case 'image':
        return (
          <div style={{ maxWidth: '100%', overflow: 'hidden' }}>
            <img
              src={contentToRender.data}
              alt="Commentaire image"
              style={imageStyle}
              onError={(e) => {
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

      case 'latex':
        const latexData = truncated ? truncateText(contentToRender.data) : contentToRender.data;
        const renderedLatex = contentToRender.rendered || renderLatex(latexData);
        const shouldShowLatexToggle = contentToRender.data.length > 150;

        return (
          <div style={{ maxWidth: '100%' }}>
            <div
              dangerouslySetInnerHTML={{ __html: renderedLatex }}
              style={latexRenderStyle}
            />
            {shouldShowLatexToggle && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                style={{ ...toggleButtonStyle, marginTop: '4px' }}
              >
                {truncated ? '...Plus' : ' Moins'}
              </button>
            )}
            <details style={{ marginTop: '4px' }}>
              <summary style={summaryStyle}>Code LaTeX</summary>
              <div style={latexCodeStyle}>
                {latexData}
              </div>
            </details>
          </div>
        );

      default:
        return <div style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>{contentToRender.data}</div>;
    }
  };

  if (isEditing && editContent) {
    return (
      <div style={editContainerStyle}>
        <select
          value={editContent.type}
          onChange={(e) => {
            const newType = e.target.value as ContentType;
            const newContent = { ...editContent, type: newType };
            // Supprimer le rendered quand on change de type
            delete newContent.rendered;
            setEditContent(newContent);
          }}
          style={selectStyle}
        >
          <option value="text">💬 Texte</option>
          <option value="image">🖼️ Image</option>
          <option value="latex">📐 LaTeX</option>
        </select>
        <textarea
          value={editContent.data}
          onChange={(e) => {
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
          <div style={latexPreviewStyle}>
            <div dangerouslySetInnerHTML={{ __html: renderLatex(editContent.data) }} />
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

  return (
    <div style={{ position: 'relative' }}>
      <div
        onClick={handleContentClick}
        onDoubleClick={startEdit}
        style={{
          cursor: content.data.length > 150 ? 'pointer' : (onEdit ? 'pointer' : 'default')
        }}
      >
        {renderContent(content, !isExpanded)}
      </div>
      {onEdit && !isEditing && (
        <button
          onClick={startEdit}
          style={editButtonStyle}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
        >
          ✏️
        </button>
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
  textDecoration: 'underline'
};

const imageStyle: React.CSSProperties = {
  maxWidth: '100%',
  maxHeight: '200px',
  borderRadius: '4px',
  display: 'block'
};

const errorDivStyle: React.CSSProperties = {
  display: 'none',
  color: '#dc2626',
  fontSize: '12px',
  wordWrap: 'break-word'
};

const latexRenderStyle: React.CSSProperties = {
  maxWidth: '100%',
  overflowX: 'auto',
  overflowY: 'hidden',
  WebkitOverflowScrolling: 'touch',
  scrollbarWidth: 'thin'
};

const summaryStyle: React.CSSProperties = {
  fontSize: '10px',
  color: '#6b7280',
  cursor: 'pointer'
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
  maxWidth: '100%'
};

const editContainerStyle: React.CSSProperties = {
  border: '1px solid #2563eb',
  borderRadius: '4px',
  padding: '8px',
  background: '#f8fafc'
};

const selectStyle: React.CSSProperties = {
  marginBottom: '8px',
  padding: '4px',
  fontSize: '12px',
  width: '100%'
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '60px',
  padding: '8px',
  fontSize: '12px',
  border: '1px solid #d1d5db',
  borderRadius: '4px',
  resize: 'vertical'
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
  overflowWrap: 'break-word'
};

const buttonContainerStyle: React.CSSProperties = {
  marginTop: '8px',
  display: 'flex',
  gap: '8px'
};

const saveButtonStyle: React.CSSProperties = {
  padding: '4px 12px',
  background: '#16a34a',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  fontSize: '12px',
  cursor: 'pointer'
};

const cancelButtonStyle: React.CSSProperties = {
  padding: '4px 12px',
  background: '#dc2626',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  fontSize: '12px',
  cursor: 'pointer'
};

const editButtonStyle: React.CSSProperties = {
  position: 'absolute',
  top: '0',
  right: '0',
  background: 'rgba(37, 99, 235, 0.8)',
  color: 'white',
  border: 'none',
  borderRadius: '0 0 0 4px',
  padding: '2px 6px',
  fontSize: '10px',
  cursor: 'pointer',
  opacity: 0,
  transition: 'opacity 0.2s'
};