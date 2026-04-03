import React, { useState } from 'react';

interface VoteButtonsProps {
  answerId: string;
  score: number;
  userVote: number | null;
  onVote: (answerId: string, value: 1 | -1) => Promise<void>;
}

export const VoteButtons: React.FC<VoteButtonsProps> = ({ answerId, score, userVote, onVote }) => {
  const [optimisticScore, setOptimisticScore] = useState<number | null>(null);
  const [optimisticVote, setOptimisticVote] = useState<number | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const displayScore = optimisticScore ?? score;
  const displayVote = optimisticVote !== undefined ? optimisticVote : userVote;

  const handleVote = async (e: React.MouseEvent, value: 1 | -1) => {
    e.stopPropagation();
    if (loading) return;

    // Calcul optimiste
    const isToggle = displayVote === value;
    const isChange = displayVote !== null && displayVote !== value;
    let newScore: number;
    let newVote: number | null;

    if (isToggle) {
      newScore = displayScore - value;
      newVote = null;
    } else if (isChange) {
      newScore = displayScore + 2 * value;
      newVote = value;
    } else {
      newScore = displayScore + value;
      newVote = value;
    }

    setOptimisticScore(newScore);
    setOptimisticVote(newVote);
    setLoading(true);

    try {
      await onVote(answerId, value);
      // Le parent mettra à jour les props, on reset les optimistes
      setOptimisticScore(null);
      setOptimisticVote(undefined);
    } catch {
      // Revert
      setOptimisticScore(null);
      setOptimisticVote(undefined);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <button
        onClick={e => handleVote(e, 1)}
        onMouseEnter={e => {
          if (displayVote !== 1) (e.currentTarget as HTMLButtonElement).style.color = '#2563eb';
        }}
        onMouseLeave={e => {
          if (displayVote !== 1) (e.currentTarget as HTMLButtonElement).style.color = '#9ca3af';
        }}
        style={{
          ...arrowButtonStyle,
          color: displayVote === 1 ? '#2563eb' : '#9ca3af',
        }}
        title="Upvote"
        disabled={loading}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <path d="M6 1L11 8H1L6 1Z" />
        </svg>
      </button>
      <span
        style={{
          ...scoreStyle,
          color: displayScore > 0 ? '#2563eb' : displayScore < 0 ? '#dc2626' : '#6b7280',
        }}
      >
        {displayScore}
      </span>
      <button
        onClick={e => handleVote(e, -1)}
        onMouseEnter={e => {
          if (displayVote !== -1) (e.currentTarget as HTMLButtonElement).style.color = '#dc2626';
        }}
        onMouseLeave={e => {
          if (displayVote !== -1) (e.currentTarget as HTMLButtonElement).style.color = '#9ca3af';
        }}
        style={{
          ...arrowButtonStyle,
          color: displayVote === -1 ? '#dc2626' : '#9ca3af',
        }}
        title="Downvote"
        disabled={loading}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <path d="M6 11L1 4H11L6 11Z" />
        </svg>
      </button>
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '2px',
  flexShrink: 0,
  marginRight: '0.5rem',
};

const arrowButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '2px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '2px',
  transition: 'color 0.15s',
};

const scoreStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  minWidth: '14px',
  textAlign: 'center',
  lineHeight: 1,
};
