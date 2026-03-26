import React, { useState, useEffect } from 'react';
import { ProcessState, BatchItem } from './types';
import Dropzone from './components/Dropzone';
import Button from './components/Button';
import Editor from './components/Editor';
import { fileToBase64, loadImage, removeColorBackground } from './utils/imageUtils';
import { processImageWithGemini } from './services/geminiService';

const App: React.FC = () => {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Queue Processor
  useEffect(() => {
    const processNext = async () => {
      if (isProcessingQueue) return;

      const nextItemIndex = items.findIndex(i => i.status === ProcessState.QUEUED);
      if (nextItemIndex === -1) return; // Nothing to process

      setIsProcessingQueue(true);
      
      // Update status to processing
      setItems(prev => prev.map((item, idx) => 
        idx === nextItemIndex ? { ...item, status: ProcessState.PROCESSING } : item
      ));

      const currentItem = items[nextItemIndex];

      try {
        // 1. Prepare
        const base64 = await fileToBase64(currentItem.file);
        
        // 2. Gemini AI
        const aiResponseBase64 = await processImageWithGemini(base64);
        
        // 3. Canvas Logic
        const aiImage = await loadImage(`data:image/jpeg;base64,${aiResponseBase64}`);
        const transparentPngUrl = removeColorBackground(aiImage);

        // Update success
        setItems(prev => prev.map((item) => 
          item.id === currentItem.id ? { ...item, status: ProcessState.SUCCESS, processedUrl: transparentPngUrl } : item
        ));

      } catch (error: any) {
        console.error("Batch Item Error", error);
        setItems(prev => prev.map((item) => 
          item.id === currentItem.id ? { ...item, status: ProcessState.ERROR, errorMessage: error.message } : item
        ));
      } finally {
        setIsProcessingQueue(false);
      }
    };

    processNext();
  }, [items, isProcessingQueue]);


  const handleFilesSelect = (files: File[]) => {
    const newItems: BatchItem[] = files.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      originalUrl: URL.createObjectURL(file),
      processedUrl: null,
      status: ProcessState.QUEUED
    }));
    
    setItems(prev => [...prev, ...newItems]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleEditSave = (id: string, newUrl: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, processedUrl: newUrl } : item
    ));
    setEditingItemId(null);
  };

  const handleClearAll = () => {
    if (confirm("Clear all images?")) {
      setItems([]);
    }
  };

  const getEditingItem = () => items.find(i => i.id === editingItemId);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Editor Overlay */}
      {editingItemId && getEditingItem() && (
        <Editor 
          originalUrl={getEditingItem()!.originalUrl}
          processedUrl={getEditingItem()!.processedUrl!}
          onSave={(url) => handleEditSave(editingItemId, url)}
          onCancel={() => setEditingItemId(null)}
        />
      )}

      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
                <path fillRule="evenodd" d="M9.315 7.584C12.195 3.883 16.695 1.5 21.75 1.5a.75.75 0 01.75.75c0 5.056-2.383 9.555-6.084 12.436h.004c-3.268 2.544-7.407 4.093-11.85 4.316a.75.75 0 01-.734-.969 16.92 16.92 0 004.417-10.457.75.75 0 01.968-.001zM3 15c0 1.662.636 3.155 1.666 4.284A.75.75 0 014.25 20.25 15.002 15.002 0 012.062 5.023a.75.75 0 01.879.444 14.966 14.966 0 00.12 9.533z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="font-bold text-xl tracking-tight">MagicRemover</span>
          </div>
          <div className="flex items-center gap-4">
             {items.length > 0 && (
               <div className="text-sm font-medium text-slate-400">
                 {items.filter(i => i.status === ProcessState.SUCCESS).length} / {items.length} Done
               </div>
             )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">
        
        {items.length === 0 ? (
           <div className="max-w-xl mx-auto mt-12">
            <div className="text-center mb-10">
              <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white to-purple-300 mb-4">
                Batch Background Remover
              </h1>
              <p className="text-slate-400 text-lg">
                Upload multiple photos. Edit results manually. 100% Automatic.
              </p>
            </div>
            <Dropzone onFilesSelect={handleFilesSelect} />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
               <h2 className="text-2xl font-semibold">Your Images</h2>
               <div className="flex gap-2">
                 <Button variant="outline" onClick={handleClearAll} className="!py-2">Clear All</Button>
                 <div className="relative overflow-hidden inline-block">
                    <Button variant="secondary" className="!py-2">Add More</Button>
                    <input type="file" multiple accept="image/*" onChange={(e) => {
                       if (e.target.files) handleFilesSelect(Array.from(e.target.files));
                    }} className="absolute inset-0 opacity-0 cursor-pointer" />
                 </div>
               </div>
            </div>

            {/* List View */}
            <div className="grid grid-cols-1 gap-4">
              {items.map((item) => (
                <div key={item.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col md:flex-row items-center gap-6 shadow-sm">
                  
                  {/* Thumbnail */}
                  <div className="w-full md:w-48 h-48 md:h-32 bg-slate-900 rounded-lg overflow-hidden transparency-grid flex-shrink-0 relative border border-slate-700">
                    <img 
                      src={item.status === ProcessState.SUCCESS ? item.processedUrl! : item.originalUrl} 
                      className="w-full h-full object-contain relative z-10"
                      alt="Thumbnail"
                    />
                    {item.status === ProcessState.PROCESSING && (
                      <div className="absolute inset-0 bg-slate-900/80 z-20 flex items-center justify-center">
                        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 w-full text-center md:text-left">
                    <p className="font-medium text-slate-200 truncate max-w-xs mx-auto md:mx-0">
                      {item.file.name}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {(item.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <div className="mt-3">
                       {item.status === ProcessState.QUEUED && <span className="px-2 py-1 rounded bg-slate-700 text-xs text-slate-300">Queued</span>}
                       {item.status === ProcessState.PROCESSING && <span className="px-2 py-1 rounded bg-indigo-900/50 text-indigo-300 text-xs animate-pulse">Processing...</span>}
                       {item.status === ProcessState.SUCCESS && <span className="px-2 py-1 rounded bg-green-900/30 text-green-400 text-xs">Completed</span>}
                       {item.status === ProcessState.ERROR && <span className="px-2 py-1 rounded bg-red-900/30 text-red-400 text-xs">Error: {item.errorMessage}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 w-full md:w-auto justify-center">
                    {item.status === ProcessState.SUCCESS && (
                      <>
                        <Button 
                          variant="secondary" 
                          onClick={() => setEditingItemId(item.id)}
                          className="!py-2 !px-4 text-sm"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                          </svg>
                          Edit
                        </Button>
                        <a 
                          href={item.processedUrl!} 
                          download={`removed-${item.file.name.replace(/\.[^/.]+$/, "")}.png`}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 transition-all text-sm"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                          </svg>
                          Download
                        </a>
                      </>
                    )}
                    <button 
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                      title="Remove"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;