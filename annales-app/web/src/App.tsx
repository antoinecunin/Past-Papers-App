import { useState } from 'react'
import UploadPage from './pages/UploadPage'
import './App.css'

function App() {
  const [page, setPage] = useState('upload')

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b p-4">
        <div className="max-w-6xl mx-auto flex gap-4">
          <button 
            onClick={() => setPage('upload')}
            className={`px-4 py-2 rounded ${page === 'upload' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Upload
          </button>
          <button 
            onClick={() => setPage('exams')}
            className={`px-4 py-2 rounded ${page === 'exams' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Examens
          </button>
        </div>
      </nav>
      
      <main className="max-w-6xl mx-auto p-4">
        {page === 'upload' && <UploadPage />}
        {page === 'exams' && <div>Liste des examens (à implémenter)</div>}
      </main>
    </div>
  )
}

export default App
