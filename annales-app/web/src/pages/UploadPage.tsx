import axios from 'axios';
import { useState } from 'react';
import { Upload, CheckCircle } from 'lucide-react';
import FileDrop from '../components/FileDrop';
import { useAuthStore } from '../stores/authStore';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export default function UploadPage() {
  const { token } = useAuthStore();
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

    if (!token) {
      alert('Vous devez être connecté pour uploader un fichier');
      return;
    }

    if (!selectedFile) {
      alert('Veuillez sélectionner un fichier PDF');
      return;
    }

    if (!title.trim()) {
      alert('Veuillez renseigner un titre');
      return;
    }

    if (!year) {
      alert('Veuillez renseigner une année');
      return;
    }

    if (!module.trim()) {
      alert('Veuillez renseigner un module');
      return;
    }

    try {
      setIsUploading(true);
      const fd = new FormData();
      fd.append('file', selectedFile);
      fd.append('title', title);
      fd.append('year', String(year));
      fd.append('module', module);

      const { data } = await axios.post('/api/files/upload', fd, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUploadSuccess(true);
      setTitle('');
      setYear(new Date().getFullYear());
      setModule('');
      setSelectedFile(null);

      setTimeout(() => setUploadSuccess(false), 5000);
    } catch (error) {
      console.error('Erreur upload:', error);
      if (axios.isAxiosError(error)) {
        alert(`Erreur d'upload: ${error.response?.data?.error || error.message}`);
      } else {
        alert('Erreur inattendue lors de l\'upload');
      }
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
          Uploader une annale
        </h1>
        <p className="text-sm md:text-base text-secondary">
          Partagez vos examens avec la communauté
        </p>
      </div>

      {/* Success message */}
      {uploadSuccess && (
        <div className="bg-success-bg border border-success/20 rounded-xl p-4 flex items-center gap-3 animate-in slide-in-from-top-2 duration-200">
          <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
          <p className="text-sm text-success font-medium">
            Upload réussi ! Votre annale a été ajoutée.
          </p>
        </div>
      )}

      {/* Upload form */}
      <div className="bg-white border border-border rounded-xl p-6 md:p-8 shadow-xl shadow-black/5">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Titre */}
          <Input
            label="Titre de l'examen"
            id="title"
            name="title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Contrôle final Mathématiques"
          />

          {/* Année et Module */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Année"
              id="year"
              name="year"
              type="number"
              required
              min={1900}
              max={new Date().getFullYear() + 1}
              value={year}
              onChange={(e) => {
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
              placeholder="Ex: 2024"
            />
            <Input
              label="Module"
              id="module"
              name="module"
              type="text"
              required
              value={module}
              onChange={(e) => setModule(e.target.value)}
              placeholder="Ex: M12 - Algèbre"
            />
          </div>

          {/* File drop */}
          <div>
            <label className="block text-sm font-medium text-secondary-dark mb-2">
              Fichier PDF
            </label>
            <FileDrop onFiles={handleFileSelect} />
            {selectedFile && (
              <p className="mt-2 text-sm text-secondary">
                Fichier sélectionné : <span className="font-medium">{selectedFile.name}</span>
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
                <span>Upload en cours...</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                <span>Uploader l'annale</span>
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
