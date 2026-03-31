import React, { useState, useRef } from 'react';
import type { AnswerContent, ContentType } from '../types/answer';
import { renderLatex } from '../utils/latex';
import { useInstance } from '../hooks/useInstance';
import { CONTENT_MAX_LENGTH, IMAGE_MAX_SIZE, formatCharCount, getCharCountColor } from '../constants/content';

interface ReplyFormProps {
  onSubmit: (content: AnswerContent) => Promise<void>;
  onCancel: () => void;
  onUploadImage: (file: File) => Promise<string>;
  mentionLabel?: string;
  onClearMention?: () => void;
}

export const ReplyForm: React.FC<ReplyFormProps> = ({ onSubmit, onCancel, onUploadImage, mentionLabel, onClearMention }) => {
  const { primaryHoverColor } = useInstance();
  const [contentType, setContentType] = useState<ContentType>('text');
  const [data, setData] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxLength = CONTENT_MAX_LENGTH[contentType];
  const trimmed = data.trim();
  const canSubmit = contentType === 'image'
    ? !!imageFile && !imageError && !submitting
    : trimmed.length > 0 && !submitting;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setImageError(null);

    if (!file) {
      setImageFile(null);
      setImagePreview(null);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setImageError('Only image files are accepted');
      setImageFile(null);
      setImagePreview(null);
      return;
    }

    if (file.size > IMAGE_MAX_SIZE) {
      setImageError(`Image too large (max ${IMAGE_MAX_SIZE / 1024 / 1024} MB)`);
      setImageFile(null);
      setImagePreview(null);
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      let content: AnswerContent;

      if (contentType === 'image' && imageFile) {
        const key = await onUploadImage(imageFile);
        content = { type: 'image', data: key };
      } else {
        content = { type: contentType, data: trimmed };
        if (contentType === 'latex') {
          content.rendered = renderLatex(trimmed);
        }
      }

      await onSubmit(content);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTypeChange = (newType: ContentType) => {
    setContentType(newType);
    setData('');
    setImageFile(null);
    setImagePreview(null);
    setImageError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <form
      onSubmit={handleSubmit}
      onClick={e => e.stopPropagation()}
      style={formStyle}
    >
      {mentionLabel && (
        <div style={mentionBadgeContainerStyle}>
          <span style={getMentionTagStyle(primaryHoverColor)}>{mentionLabel}</span>
          {onClearMention && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onClearMention(); }}
              style={mentionClearButtonStyle}
              title="Remove mention"
            >
              ×
            </button>
          )}
        </div>
      )}
      <select
        value={contentType}
        onChange={e => handleTypeChange(e.target.value as ContentType)}
        style={selectStyle}
      >
        <option value="text">Text</option>
        <option value="image">Image</option>
        <option value="latex">LaTeX</option>
      </select>

      {contentType === 'image' ? (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={fileInputStyle}
          />
          {imageError && <div style={warningStyle}>{imageError}</div>}
          {imagePreview && (
            <img src={imagePreview} alt="Preview" style={imagePreviewStyle} />
          )}
        </>
      ) : (
        <>
          <textarea
            value={data}
            onChange={e => setData(e.target.value)}
            placeholder={contentType === 'latex' ? 'LaTeX code (e.g.: \\int_0^1 x^2 dx)' : 'Your reply...'}
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
        </>
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
          {submitting ? '...' : 'Send'}
        </button>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onCancel(); }}
          style={cancelButtonStyle}
        >
          Cancel
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

const fileInputStyle: React.CSSProperties = {
  fontSize: '11px',
  padding: '4px 0',
};

const imagePreviewStyle: React.CSSProperties = {
  maxWidth: '100%',
  maxHeight: '150px',
  borderRadius: '4px',
  objectFit: 'contain',
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

const mentionBadgeContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
};

const getMentionTagStyle = (primaryHoverColor: string): React.CSSProperties => {
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
    padding: '1px 8px',
    background: lightBg,
    color: primaryHoverColor,
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: 600,
  };
};

const mentionClearButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#6b7280',
  cursor: 'pointer',
  fontSize: '14px',
  padding: '0 2px',
  lineHeight: 1,
};
