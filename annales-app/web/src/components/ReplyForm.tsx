import React, { useState } from 'react';
import type { AnswerContent, ContentType } from '../types/answer';
import { renderLatex } from '../utils/latex';
import { CONTENT_MAX_LENGTH, formatCharCount, getCharCountColor, isAllowedImageUrl } from '../constants/content';

interface ReplyFormProps {
  onSubmit: (content: AnswerContent) => Promise<void>;
  onCancel: () => void;
}

export const ReplyForm: React.FC<ReplyFormProps> = ({ onSubmit, onCancel }) => {
  const [contentType, setContentType] = useState<ContentType>('text');
  const [data, setData] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const maxLength = CONTENT_MAX_LENGTH[contentType];
  const trimmed = data.trim();
  const isImageInvalid = contentType === 'image' && trimmed.startsWith('http') && !isAllowedImageUrl(trimmed);
  const canSubmit = trimmed.length > 0 && !isImageInvalid && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const content: AnswerContent = { type: contentType, data: trimmed };
      if (contentType === 'latex') {
        content.rendered = renderLatex(trimmed);
      }
      await onSubmit(content);
    } finally {
      setSubmitting(false);
    }
  };

  const placeholder: Record<ContentType, string> = {
    text: 'Votre réponse...',
    image: "URL de l'image (imgur.com, ibb.co, postimg.cc)",
    latex: 'Code LaTeX (ex: \\int_0^1 x^2 dx)',
  };

  return (
    <form
      onSubmit={handleSubmit}
      onClick={e => e.stopPropagation()}
      style={formStyle}
    >
      <select
        value={contentType}
        onChange={e => setContentType(e.target.value as ContentType)}
        style={selectStyle}
      >
        <option value="text">Texte</option>
        <option value="image">Image (URL)</option>
        <option value="latex">LaTeX</option>
      </select>

      <textarea
        value={data}
        onChange={e => setData(e.target.value)}
        placeholder={placeholder[contentType]}
        maxLength={maxLength}
        rows={2}
        style={textareaStyle}
      />

      <div style={{
        fontSize: '11px',
        textAlign: 'right',
        color: getCharCountColor(data.length, maxLength),
      }}>
        {formatCharCount(data.length, maxLength)}
      </div>

      {isImageInvalid && (
        <div style={warningStyle}>
          Hebergeur non autorise. Utilisez imgur.com, ibb.co ou postimg.cc
        </div>
      )}

      {contentType === 'latex' && trimmed && (
        <div
          style={previewStyle}
          dangerouslySetInnerHTML={{ __html: renderLatex(trimmed) }}
        />
      )}

      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            ...submitButtonStyle,
            opacity: canSubmit ? 1 : 0.5,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
          }}
        >
          {submitting ? '...' : 'Envoyer'}
        </button>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onCancel(); }}
          style={cancelButtonStyle}
        >
          Annuler
        </button>
      </div>
    </form>
  );
};

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  padding: '8px',
  background: '#f8fafc',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  marginTop: '6px',
};

const selectStyle: React.CSSProperties = {
  padding: '3px 6px',
  border: '1px solid #d1d5db',
  borderRadius: '4px',
  fontSize: '11px',
};

const textareaStyle: React.CSSProperties = {
  padding: '6px',
  border: '1px solid #d1d5db',
  borderRadius: '4px',
  resize: 'none',
  fontSize: '12px',
  fontFamily: 'inherit',
};

const warningStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#dc2626',
  padding: '4px 6px',
  background: '#fef2f2',
  borderRadius: '4px',
  border: '1px solid #fecaca',
};

const previewStyle: React.CSSProperties = {
  padding: '6px',
  background: '#f9fafb',
  borderRadius: '4px',
  border: '1px solid #e5e7eb',
  fontSize: '13px',
  maxWidth: '100%',
  overflowX: 'auto',
};

const submitButtonStyle: React.CSSProperties = {
  padding: '3px 10px',
  background: '#2563eb',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  fontSize: '11px',
  cursor: 'pointer',
};

const cancelButtonStyle: React.CSSProperties = {
  padding: '3px 10px',
  background: '#f3f4f6',
  color: '#374151',
  border: 'none',
  borderRadius: '4px',
  fontSize: '11px',
  cursor: 'pointer',
};
