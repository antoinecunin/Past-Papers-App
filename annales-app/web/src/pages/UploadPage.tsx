import axios from 'axios';
import { useState } from 'react';
import FileDrop from '../components/FileDrop';
import { useAuthStore } from '../stores/authStore';

export default function UploadPage() {
  const { token } = useAuthStore();
  const [title, setTitle] = useState('');
  const [year, setYear] = useState<number | ''>('');
  const [module, setModule] = useState('');

  async function handleUpload(files: File[]) {
    if (!token) {
      alert('Vous devez être connecté pour uploader un fichier');
      return;
    }

    try {
      const file = files[0];
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', title);
      fd.append('year', String(year || ''));
      fd.append('module', module);

      const { data } = await axios.post('/api/files/upload', fd, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      alert(`Upload réussi ! ID de l'examen: ${data.examId}`);
    } catch (error) {
      console.error('Erreur upload:', error);
      if (axios.isAxiosError(error)) {
        alert(`Erreur d'upload: ${error.response?.data?.error || error.message}`);
      } else {
        alert('Erreur inattendue lors de l\'upload');
      }
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Uploader une annale</h1>
      <div className="space-y-4 mb-6">
        <input
          className="w-full p-3 border rounded-lg"
          placeholder="Titre"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <input
          className="w-full p-3 border rounded-lg"
          placeholder="Année"
          type="number"
          value={year}
          onChange={e => setYear(Number(e.target.value) || '')}
        />
        <input
          className="w-full p-3 border rounded-lg"
          placeholder="Module"
          value={module}
          onChange={e => setModule(e.target.value)}
        />
      </div>
      <FileDrop onFiles={handleUpload} />
    </div>
  );
}
