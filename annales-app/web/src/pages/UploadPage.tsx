import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, CheckCircle } from 'lucide-react';
import FileDrop from '../components/FileDrop';
import { useAuthStore } from '../stores/authStore';
import { useInstance } from '../hooks/useInstance';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { showValidationError, showError } from '../utils/swal';
import { apiFetch } from '../utils/api';

export default function UploadPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { maxFileSizeMB } = useInstance();
  const [title, setTitle] = useState('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [module, setModule] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  function handleFileSelect(files: File[]) {
    if (files.length > 0) {
      setSelectedFile(files[0]);
      setUploadSuccess(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!user) {
      await showValidationError(t('exams.upload.validation.not_logged_in'));
      return;
    }

    if (!selectedFile) {
      await showValidationError(t('exams.upload.validation.no_file'));
      return;
    }

    if (!title.trim()) {
      await showValidationError(t('exams.upload.validation.no_title'));
      return;
    }

    if (!year) {
      await showValidationError(t('exams.upload.validation.no_year'));
      return;
    }

    if (!module.trim()) {
      await showValidationError(t('exams.upload.validation.no_module'));
      return;
    }

    try {
      setIsUploading(true);
      const fd = new FormData();
      fd.append('file', selectedFile);
      fd.append('title', title);
      fd.append('year', String(year));
      fd.append('module', module);

      const response = await apiFetch('/api/files/upload', {
        method: 'POST',
        body: fd,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || t('exams.upload.error_message'));
      }

      setUploadSuccess(true);
      setTitle('');
      setYear(new Date().getFullYear());
      setModule('');
      setSelectedFile(null);

      setTimeout(() => setUploadSuccess(false), 5000);
    } catch (error) {
      console.error('Upload error:', error);
      const message = error instanceof Error ? error.message : t('exams.upload.error_message');
      await showError(t('exams.upload.error_title'), message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
          <Upload className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-secondary-dark mb-2">
          {t('exams.upload.title')}
        </h1>
        <p className="text-sm md:text-base text-secondary">{t('exams.upload.subtitle')}</p>
      </div>

      {/* Success message */}
      {uploadSuccess && (
        <div className="bg-success-bg border border-success/20 rounded-xl p-4 flex items-center gap-3 animate-in slide-in-from-top-2 duration-200">
          <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
          <p className="text-sm text-success font-medium">{t('exams.upload.success')}</p>
        </div>
      )}

      {/* Upload form */}
      <div className="bg-white border border-border rounded-xl p-6 md:p-8 shadow-xl shadow-black/5">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <Input
            label={t('exams.upload.title_label')}
            id="title"
            name="title"
            type="text"
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={t('exams.upload.title_placeholder')}
          />

          {/* Year and Module */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={t('exams.upload.year_label')}
              id="year"
              name="year"
              type="number"
              required
              min={1900}
              max={new Date().getFullYear() + 1}
              value={year}
              onChange={e => {
                const val = e.target.value;
                if (val === '') {
                  setYear(new Date().getFullYear());
                } else {
                  const num = Number(val);
                  if (!isNaN(num) && num >= 1900) {
                    setYear(num);
                  }
                }
              }}
              placeholder={t('exams.upload.year_placeholder')}
            />
            <Input
              label={t('exams.upload.module_label')}
              id="module"
              name="module"
              type="text"
              required
              value={module}
              onChange={e => setModule(e.target.value)}
              placeholder={t('exams.upload.module_placeholder')}
            />
          </div>

          {/* File drop */}
          <div>
            <label className="block text-sm font-medium text-secondary-dark mb-2">
              {t('exams.upload.file_label')}
            </label>
            <FileDrop onFiles={handleFileSelect} maxSizeMB={maxFileSizeMB} />
            {selectedFile && (
              <p className="mt-2 text-sm text-secondary">
                {t('exams.upload.selected_file', { name: selectedFile.name })}
              </p>
            )}
          </div>

          {/* Submit button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full gap-2 shadow-lg shadow-primary/20"
            disabled={
              isUploading ||
              !title.trim() ||
              !year ||
              year < 1900 ||
              year > new Date().getFullYear() + 1 ||
              !module.trim() ||
              !selectedFile
            }
          >
            {isUploading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{t('exams.upload.uploading')}</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                <span>{t('exams.upload.button')}</span>
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
