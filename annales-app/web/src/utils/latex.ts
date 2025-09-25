import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * Renders LaTeX code to HTML string
 * @param latex - LaTeX code to render
 * @returns HTML string or error message
 */
export const renderLatex = (latex: string): string => {
  try {
    return katex.renderToString(latex, {
      throwOnError: false,
      displayMode: false,
      strict: false,
    });
  } catch (error) {
    console.warn('Erreur de rendu LaTeX:', error);
    return `<span style="color: #dc2626; font-family: monospace;">[Erreur LaTeX: ${latex}]</span>`;
  }
};
