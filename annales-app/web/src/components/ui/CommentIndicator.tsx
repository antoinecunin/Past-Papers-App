import React from 'react';

interface CommentIndicatorProps {
  yPosition: number; // Position relative [0,1] dans la page
  isActive?: boolean;
  onClick?: () => void;
  commentCount?: number;
}

/**
 * Indicateur visuel de commentaire positionné sur une page PDF
 * Affiche un point cliquable avec le nombre de commentaires
 */
export function CommentIndicator({
  yPosition,
  isActive = false,
  onClick,
  commentCount = 1,
}: CommentIndicatorProps) {
  const topPercent = yPosition * 100;

  return (
    <div
      className={`absolute right-2 w-6 h-6 rounded-full cursor-pointer transition-all duration-200 flex items-center justify-center text-xs font-bold z-10 ${
        isActive
          ? 'bg-blue-600 text-white shadow-lg scale-110'
          : 'bg-blue-500 text-white hover:bg-blue-600 hover:scale-105 shadow-md'
      }`}
      style={{ top: `${topPercent}%`, transform: 'translateY(-50%)' }}
      onClick={onClick}
      title={`${commentCount} commentaire${commentCount > 1 ? 's' : ''}`}
    >
      {commentCount}
    </div>
  );
}

interface NewCommentIndicatorProps {
  yPosition: number;
  onConfirm: (text: string) => void;
  onCancel: () => void;
}

/**
 * Indicateur temporaire pour créer un nouveau commentaire
 * Affiche un formulaire de saisie inline
 */
export function NewCommentIndicator({ yPosition, onConfirm, onCancel }: NewCommentIndicatorProps) {
  const topPercent = yPosition * 100;
  const [text, setText] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onConfirm(text.trim());
    }
  };

  return (
    <div
      className="absolute right-2 bg-white border border-gray-300 rounded-lg shadow-lg p-3 z-20 min-w-64"
      style={{ top: `${topPercent}%`, transform: 'translateY(-50%)' }}
    >
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Votre commentaire..."
          className="w-full p-2 text-sm border border-gray-200 rounded resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows={3}
          autoFocus
        />
        <div className="flex space-x-2">
          <button
            type="submit"
            disabled={!text.trim()}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Ajouter
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
