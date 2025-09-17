import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjs from 'pdfjs-dist';
// @ts-ignore - types non fournis pour build.worker.mjs dans pdfjs-dist 5.x
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

type Answer = {
  _id: string;
  examId: string;
  page: number;        // 1-based
  yTop: number;        // [0,1]
  yBottom?: number;    // [0,1]
  text: string;
  author?: string;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  /** URL du PDF à afficher (servi par l'API) */
  pdfUrl: string;
  /** Id de l'examen (ObjectId) */
  examId: string;
};

/**
 * Composant unique : lecteur PDF à gauche, commentaires (de la page visible) à droite.
 * - Les commentaires sont ancrés via (page, yTop[, yBottom]) normalisés.
 * - Au scroll, on détecte la page majoritairement visible et on rafraîchit la liste.
 * - Ajout d’un commentaire : capture du yTop actuel (centre de la zone visible).
 */
export default function PdfAnnotator({ pdfUrl, examId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [visiblePage, setVisiblePage] = useState(1);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [newText, setNewText] = useState('');
  const [posting, setPosting] = useState(false);

  // Chargement du PDF
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loadingTask = pdfjs.getDocument({ url: pdfUrl });
      const doc = await loadingTask.promise;
      if (cancelled) return;
      setPdfDoc(doc);
      setNumPages(doc.numPages);
    })().catch(console.error);
    return () => { cancelled = true; };
  }, [pdfUrl]);

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

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        pageWrapper.appendChild(canvas);
        container.appendChild(pageWrapper);

        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      }
    })().catch(console.error);
  }, [pdfDoc]);

  // Observer pour connaître la page la plus visible
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const pages = Array.from(container.querySelectorAll<HTMLDivElement>('.pdf-page'));
    if (!pages.length) return;

    const onIntersect: IntersectionObserverCallback = (entries) => {
      // Prendre l’entrée avec le plus grand ratio
      const top = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!top) return;
      const idx = pages.indexOf(top.target as HTMLDivElement);
      if (idx >= 0) setVisiblePage(idx + 1);
    };

    const io = new IntersectionObserver(onIntersect, {
      root: container,
      threshold: buildThresholds(20),
    });
    pages.forEach(p => io.observe(p));
    return () => io.disconnect();
  }, [pdfDoc]);

  // Charger les commentaires de la page visible
  useEffect(() => {
    if (!examId || !visiblePage) return;
    const ctrl = new AbortController();
    (async () => {
      const url = `/api/answers?examId=${encodeURIComponent(examId)}&page=${visiblePage}`;
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error('Failed to load answers');
      const data: Answer[] = await res.json();
      setAnswers(data.sort((a, b) => a.yTop - b.yTop));
    })().catch(err => {
      if (err.name !== 'AbortError') console.error(err);
    });
    return () => ctrl.abort();
  }, [examId, visiblePage]);

  const handleAddComment = useCallback(async () => {
    if (!newText.trim()) return;
    const container = containerRef.current;
    if (!container) return;
    const currentPageEl = container.querySelectorAll<HTMLDivElement>('.pdf-page')[visiblePage - 1];
    if (!currentPageEl) return;

    // yTop normalisé = (scroll local dans l’élément page) / (hauteur page)
    const centerYInContainer = container.clientHeight / 2;
    // point d’ancrage = centre du viewport (façon Google Docs)
    const anchorY = container.scrollTop + centerYInContainer - currentPageEl.offsetTop;
    const yTop = clamp(anchorY / currentPageEl.clientHeight, 0, 1);

    setPosting(true);
    try {
      const payload = { examId, page: visiblePage, yTop, text: newText.trim() };
      const res = await fetch('/api/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('POST /api/answers failed');
      setNewText('');
      // recharge
      const reload = await fetch(`/api/answers?examId=${encodeURIComponent(examId)}&page=${visiblePage}`);
      const data: Answer[] = await reload.json();
      setAnswers(data.sort((a, b) => a.yTop - b.yTop));
    } catch (e) {
      console.error(e);
    } finally {
      setPosting(false);
    }
  }, [examId, newText, visiblePage]);

  return (
    <div style={wrapperStyle}>
      <div style={pdfPaneStyle} ref={containerRef} aria-label="PDF viewer" />
      <aside style={sidebarStyle} aria-label="Commentaires">
        <div style={sidebarHeaderStyle}>
          <strong>Commentaires</strong>
          <span style={{ opacity: 0.7 }}>Page {visiblePage}/{numPages || '…'}</span>
        </div>
        <ul style={commentListStyle}>
          {answers.map(a => (
            <li key={a._id} style={commentItemStyle}>
              <div style={commentMetaStyle}>y={a.yTop.toFixed(2)}</div>
              <div>{a.text}</div>
            </li>
          ))}
          {!answers.length && (
            <li style={{ opacity: 0.6, padding: '8px 0' }}>Aucun commentaire sur cette page.</li>
          )}
        </ul>
        <div style={newCommentBoxStyle}>
          <textarea
            value={newText}
            onChange={e => setNewText(e.target.value)}
            placeholder="Ajouter un commentaire lié à la zone visible…"
            rows={4}
            style={textareaStyle}
          />
          <button onClick={handleAddComment} disabled={posting || !newText.trim()} style={buttonStyle}>
            {posting ? 'Envoi…' : 'Publier'}
          </button>
        </div>
      </aside>
    </div>
  );
}

// ---------- styles inline minimalistes (pas de dépendance CSS supplémentaire) ----------
const wrapperStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 360px',
  gap: 16,
  height: 'calc(100vh - 80px)',
  padding: 16,
  boxSizing: 'border-box',
};
const pdfPaneStyle: React.CSSProperties = {
  overflow: 'auto',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  background: '#fafafa',
  padding: 16,
};
const sidebarStyle: React.CSSProperties = {
  overflow: 'auto',
  borderLeft: '1px solid #e5e7eb',
  paddingLeft: 16,
};
const sidebarHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 12,
};
const commentListStyle: React.CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
};
const commentItemStyle: React.CSSProperties = {
  borderBottom: '1px dashed #e5e7eb',
  padding: '8px 0',
};
const commentMetaStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#6b7280',
  marginBottom: 4,
};
const newCommentBoxStyle: React.CSSProperties = {
  marginTop: 12,
  display: 'grid',
  gap: 8,
};
const textareaStyle: React.CSSProperties = {
  width: '100%',
  font: 'inherit',
  borderRadius: 8,
  border: '1px solid #e5e7eb',
  padding: 8,
};
const buttonStyle: React.CSSProperties = {
  justifySelf: 'end',
  borderRadius: 8,
  border: '1px solid #d1d5db',
  background: 'white',
  padding: '6px 12px',
  cursor: 'pointer',
};

function buildThresholds(n: number) {
  const t: number[] = [];
  for (let i = 0; i <= n; i++) t.push(i / n);
  return t;
}
function clamp(x: number, a: number, b: number) {
  return Math.min(b, Math.max(a, x));
}