import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

export default function FileDrop({ onFiles }: { onFiles: (files: File[]) => void }) {
  const onDrop = useCallback((accepted: File[]) => onFiles(accepted), [onFiles]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
  });
  return (
    <div
      {...getRootProps()}
      className="border-2 border-dashed border-gray-300 p-8 rounded-lg cursor-pointer text-center hover:border-blue-500 transition-colors"
    >
      <input {...getInputProps()} />
      <div className="text-gray-600">
        {isDragActive ? (
          <p className="text-blue-500">📄 Dépose le PDF ici</p>
        ) : (
          <div>
            <p className="mb-2">📁 Glisse un PDF ici ou clique pour sélectionner</p>
            <p className="text-sm text-gray-400">Formats acceptés: PDF • Taille max: 50MB</p>
          </div>
        )}
      </div>
    </div>
  );
}
