import katex from 'katex';
import 'katex/dist/katex.min.css';
import DOMPurify from 'dompurify';

/**
 * Renders LaTeX code to HTML string
 * @param latex - LaTeX code to render
 * @returns HTML string or error message
 */
/**
 * Preprocesses LaTeX content to handle common issues
 */
const preprocessLatex = (latex: string): string => {
  return (
    latex
      // Remplace les sauts de ligne backslash par des espaces
      .replace(/\\\s*\n/g, ' ')
      .replace(/\\\s*$/g, ' ')
      // Nettoie les espaces multiples
      .replace(/\s+/g, ' ')
      .trim()
  );
};

/**
 * Renders mixed text with LaTeX math expressions
 * Handles text with $...$ delimited math expressions
 */
const renderMixedLatex = (text: string): string => {
  try {
    // Vérifier s'il y a des délimiteurs $
    if (!text.includes('$')) {
      // Pas de délimiteurs, traiter comme du LaTeX pur
      return katex.renderToString(text, {
        throwOnError: false,
        displayMode: false,
        strict: 'ignore',
        trust: false,
        output: 'html',
        fleqn: false,
        macros: {
          '\\R': '\\mathbb{R}',
          '\\N': '\\mathbb{N}',
          '\\Z': '\\mathbb{Z}',
          '\\Q': '\\mathbb{Q}',
          '\\C': '\\mathbb{C}',
          '\\K': '\\mathbb{K}',
        },
      });
    }

    // Séparer le texte et les expressions mathématiques
    const parts: string[] = [];
    let currentPos = 0;
    let inMath = false;
    let mathStart = 0;

    for (let i = 0; i < text.length; i++) {
      if (text[i] === '$' && (i === 0 || text[i - 1] !== '\\')) {
        if (!inMath) {
          // Début de math - ajouter le texte précédent
          if (i > currentPos) {
            parts.push(text.substring(currentPos, i));
          }
          mathStart = i;
          inMath = true;
        } else {
          // Fin de math - ajouter l'expression mathématique
          parts.push(text.substring(mathStart, i + 1));
          currentPos = i + 1;
          inMath = false;
        }
      }
    }

    // Ajouter le reste du texte
    if (currentPos < text.length) {
      parts.push(text.substring(currentPos));
    }

    return parts
      .map(part => {
        if (part.startsWith('$') && part.endsWith('$')) {
          // Expression mathématique - enlever les $ et rendre avec KaTeX
          const mathContent = part.slice(1, -1);
          try {
            return katex.renderToString(mathContent, {
              throwOnError: false,
              displayMode: false,
              strict: 'ignore',
              trust: false,
              output: 'html',
              fleqn: false,
              macros: {
                '\\R': '\\mathbb{R}',
                '\\N': '\\mathbb{N}',
                '\\Z': '\\mathbb{Z}',
                '\\Q': '\\mathbb{Q}',
                '\\C': '\\mathbb{C}',
                '\\K': '\\mathbb{K}',
              },
            });
          } catch {
            return `<span style="color: #dc2626;">[Math Error: ${mathContent}]</span>`;
          }
        } else {
          // Texte normal - échapper les caractères HTML et préserver la mise en forme
          return part
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
        }
      })
      .join('');
  } catch (error) {
    console.warn('LaTeX rendering error:', error);
    return `<span style="color: #dc2626; font-family: monospace;">[LaTeX Error: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}]</span>`;
  }
};

export const renderLatex = (latex: string): string => {
  try {
    const processedLatex = preprocessLatex(latex);
    const html = renderMixedLatex(processedLatex);
    return DOMPurify.sanitize(html);
  } catch (error) {
    console.warn('LaTeX rendering error:', error);
    console.warn('Contenu LaTeX problématique:', latex);
    return `<span style="color: #dc2626; font-family: monospace;">[LaTeX Error: ${latex.substring(0, 50)}${latex.length > 50 ? '...' : ''}]</span>`;
  }
};
