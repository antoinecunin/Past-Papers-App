import axios from 'axios';
import { useState } from 'react';
import FileDrop from '../components/FileDrop';

export default function UploadPage() {
  const [title, setTitle] = useState('');
  const [year, setYear] = useState<number | ''>('');
  const [module, setModule] = useState('');

  async function handleUpload(files: File[]) {
    const file = files[0];
    const fd = new FormData();
    fd.append('file', file);
    fd.append('title', title);
    fd.append('year', String(year || ''));
    fd.append('module', module);
    const { data } = await axios.post('/api/files/upload', fd);
    alert(`Upload ok, examId=${data.examId}`);
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Uploader une annale</h1>
      <div className="space-y-4 mb-6">
        <input 
          className="w-full p-3 border rounded-lg"
          placeholder="Titre" 
          value={title} 
          onChange={e=>setTitle(e.target.value)} 
        />
        <input 
          className="w-full p-3 border rounded-lg"
          placeholder="Année" 
          type="number"
          value={year} 
          onChange={e=>setYear(Number(e.target.value)||'')} 
        />
        <input 
          className="w-full p-3 border rounded-lg"
          placeholder="Module" 
          value={module} 
          onChange={e=>setModule(e.target.value)} 
        />
      </div>
      <FileDrop onFiles={handleUpload} />
    </div>
  );
}