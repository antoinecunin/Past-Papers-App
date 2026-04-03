import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';
import { FileUp, Upload } from 'lucide-react';

export default function FileDrop({ onFiles }: { onFiles: (files: File[]) => void }) {
  const { t } = useTranslation();
  const onDrop = useCallback((accepted: File[]) => onFiles(accepted), [onFiles]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
  });
  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-8 md:p-12 cursor-pointer text-center transition-all duration-150 ${
        isDragActive
          ? 'border-primary bg-primary-light/30'
          : 'border-border hover:border-primary/50 bg-bg-secondary'
      }`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-3">
        {isDragActive ? (
          <>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileUp className="w-6 h-6 text-primary" />
            </div>
            <p className="text-primary font-medium">{t('exams.filedrop.drop_hint')}</p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
              <Upload className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <p className="text-secondary-dark font-medium mb-1">
                {t('exams.filedrop.drag_hint')}
              </p>
              <p className="text-xs md:text-sm text-secondary">
                {t('exams.filedrop.format_info')}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
