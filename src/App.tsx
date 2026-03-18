
import React, { useState, useCallback } from 'react';
import { Upload, FileText, Info, AlertCircle, BookOpen, X, Compass, Feather, Library } from 'lucide-react';
import { AppState, PageData, BookMetadata } from './types';
import { loadPdfPages } from './services/pdfService';
import Reader from './components/Reader';

const App: React.FC = () => {
  console.log('LuminaBook: App component rendering');
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [pages, setPages] = useState<PageData[]>([]);
  const [metadata, setMetadata] = useState<BookMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const processFile = async (file: File) => {
    // Improved PDF detection: check MIME type OR file extension
    const isPdf = file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
    
    if (!file || !isPdf) {
      setError('Please select a valid PDF file.');
      return;
    }

    try {
      setState(AppState.LOADING);
      setError(null);

      const loadedPages = await loadPdfPages(file);
      setPages(loadedPages);

      // Set basic metadata from file name
      setMetadata({
        title: file.name.replace('.pdf', ''),
        author: 'Unknown Author',
        summary: '',
        genre: '',
        keyTakeaways: []
      });

      setState(AppState.READING);
    } catch (err) {
      console.error(err);
      setError('An error occurred while processing the PDF.');
      setState(AppState.ERROR);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const reset = () => {
    setState(AppState.IDLE);
    setPages([]);
    setMetadata(null);
    setError(null);
  };

  if (state === AppState.READING) {
    return (
      <div className="flex h-screen bg-[#08090b] overflow-hidden font-inter selection:bg-indigo-500/30">
        {/* Main Reader View */}
        <div className="flex-1 flex flex-col min-w-0">
          <Reader pages={pages} metadata={metadata} onExit={reset} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08090b] flex flex-col items-center justify-center p-8 md:p-12 relative overflow-hidden font-inter">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-600/10 blur-[150px] rounded-full -z-10 animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[120px] rounded-full -z-10" />
      
      <div className="max-w-3xl w-full text-center space-y-12">
        <div className="space-y-6">
          <div className="inline-flex relative group">
            <div className="absolute inset-0 bg-indigo-500/30 blur-2xl rounded-full scale-110 group-hover:scale-125 transition-transform" />
            <div className="relative w-20 h-20 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] flex items-center justify-center text-indigo-400 shadow-2xl">
              <BookOpen className="w-10 h-10" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-5xl md:text-7xl font-bold text-white book-font italic tracking-tight">
              LuminaBook
            </h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.5em] mt-4">
              Digital Manuscript Laboratory
            </p>
          </div>
          <p className="text-slate-400 text-lg md:text-xl font-medium max-w-xl mx-auto leading-relaxed opacity-80">
            Transmute static documents into soulful, 3D interactive experiences.
          </p>
        </div>

        <div className="relative group max-w-xl mx-auto">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/20 to-transparent blur-3xl rounded-[3rem] -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          
          <div className="bg-white/5 backdrop-blur-2xl p-1 md:p-2 rounded-[2.5rem] border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.4)]">
            {error && (
              <div className="m-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-xs font-bold uppercase tracking-wider animate-in fade-in slide-in-from-top-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {state === AppState.LOADING ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-8">
                <div className="relative">
                  <div className="w-24 h-24 border-2 border-indigo-500/20 border-t-indigo-400 rounded-full animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Feather className="w-8 h-8 text-indigo-400 animate-pulse" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white book-font italic">Transmuting Folio</h3>
                  <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em]">Preparing your digital manuscript</p>
                </div>
              </div>
            ) : (
              <div className="p-4">
                <label 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative group/zone flex flex-col items-center justify-center w-full h-80 border-2 border-dashed rounded-[2rem] transition-all duration-500 cursor-pointer overflow-hidden ${
                    isDraggingOver 
                      ? 'border-indigo-400 bg-indigo-500/10 scale-[0.98]' 
                      : 'border-white/10 hover:border-indigo-500/50 hover:bg-white/5'
                  }`}
                >
                  <input 
                    type="file" 
                    accept="application/pdf" 
                    onChange={handleFileUpload}
                    className="hidden" 
                  />
                  
                  <div className={`flex flex-col items-center justify-center space-y-6 transition-all duration-500 ${
                    isDraggingOver ? 'text-indigo-300 scale-110' : 'text-slate-500 group-hover/zone:text-indigo-400'
                  }`}>
                    <div className={`p-6 bg-white/5 rounded-full border border-white/5 transition-transform duration-500 ${
                      isDraggingOver ? 'scale-110 bg-indigo-500/20' : 'group-hover/zone:scale-110'
                    }`}>
                      <Upload className="w-10 h-10" />
                    </div>
                    <div className="text-center space-y-2">
                      <span className="text-lg font-bold text-slate-300 block">
                        {isDraggingOver ? 'Release to Summon' : 'Summon Your Document'}
                      </span>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">
                        {isDraggingOver ? 'Drop PDF Now' : 'PDF Archive Required'}
                      </p>
                    </div>
                  </div>
                </label>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 opacity-60 hover:opacity-100 transition-opacity">
          <FeatureCard 
            icon={<Library className="w-5 h-5" />}
            title="Archives"
            desc="High-fidelity PDF processing"
          />
          <FeatureCard 
            icon={<Compass className="w-5 h-5" />}
            title="Navigation"
            desc="Fluid 3D interaction model"
          />
        </div>

        <div className="pt-12">
           <p className="text-slate-600 text-[9px] font-black uppercase tracking-[0.4em] flex items-center justify-center gap-3">
             <span className="w-8 h-[1px] bg-slate-800" />
             3D Manuscript Reader
             <span className="w-8 h-[1px] bg-slate-800" />
           </p>
        </div>
      </div>

      <style>{`
        .book-font {
          font-family: 'Crimson Pro', serif;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 10px;
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.2; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 5s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

const FeatureCard: React.FC<{ icon: React.ReactNode, title: string, desc: string }> = ({ icon, title, desc }) => (
  <div className="flex flex-col items-center p-6 rounded-3xl bg-white/5 border border-white/5 text-center group hover:bg-white/10 transition-all cursor-default">
    <div className="text-indigo-400 mb-3 group-hover:scale-110 transition-transform">{icon}</div>
    <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">{title}</h4>
    <p className="text-[11px] text-slate-500 mt-2 font-medium italic">{desc}</p>
  </div>
);

export default App;
