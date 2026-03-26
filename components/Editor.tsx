import React, { useEffect, useRef, useState } from 'react';
import { BrushMode } from '../types';
import Button from './Button';

interface EditorProps {
  originalUrl: string;
  processedUrl: string;
  onSave: (newUrl: string) => void;
  onCancel: () => void;
}

const Editor: React.FC<EditorProps> = ({ originalUrl, processedUrl, onSave, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [brushMode, setBrushMode] = useState<BrushMode>(BrushMode.ERASE);
  const [brushSize, setBrushSize] = useState<number>(30);
  const [isDrawing, setIsDrawing] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  
  // Keep references to images for drawing logic
  const originalImgRef = useRef<HTMLImageElement | null>(null);
  const processedImgRef = useRef<HTMLImageElement | null>(null);

  // Initialize Canvas
  useEffect(() => {
    const loadImages = async () => {
      const orig = new Image();
      const proc = new Image();
      orig.crossOrigin = "anonymous";
      proc.crossOrigin = "anonymous";

      const p1 = new Promise((resolve) => (orig.onload = resolve));
      const p2 = new Promise((resolve) => (proc.onload = resolve));

      orig.src = originalUrl;
      proc.src = processedUrl;

      await Promise.all([p1, p2]);

      originalImgRef.current = orig;
      processedImgRef.current = proc;

      const canvas = canvasRef.current;
      if (canvas) {
        // Set canvas dimensions to match image natural size for max quality
        canvas.width = orig.naturalWidth;
        canvas.height = orig.naturalHeight;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(proc, 0, 0);
        }
        setImagesLoaded(true);
      }
    };
    loadImages();
  }, [originalUrl, processedUrl]);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    // Map screen coordinates to actual canvas resolution
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const draw = (x: number, y: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const origImg = originalImgRef.current;

    if (!canvas || !ctx || !origImg) return;

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.closePath();

    if (brushMode === BrushMode.ERASE) {
      // Erase: simple destination-out
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fill();
    } else {
      // Restore: Clip to the circle, then draw the ORIGINAL image at the exact same coordinates
      ctx.globalCompositeOperation = 'source-over';
      ctx.clip();
      // Draw the original image exactly where it belongs
      ctx.drawImage(origImg, 0, 0, canvas.width, canvas.height);
    }

    ctx.restore();
  };

  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    draw(x, y);
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault(); // Prevent scrolling on touch
    const { x, y } = getCoordinates(e);
    // Basic interpolation for smoother strokes could go here, 
    // but fast mouse move handles denseness well enough for simple mask editing
    draw(x, y);
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
  };

  const handleSave = () => {
    if (canvasRef.current) {
      onSave(canvasRef.current.toDataURL('image/png'));
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="h-16 border-b border-slate-700 bg-slate-800 px-4 flex items-center justify-between">
        <h2 className="text-white font-semibold">Manual Editor</h2>
        <div className="flex gap-2">
           <Button variant="outline" onClick={onCancel} className="!py-1 !px-3 text-sm">Cancel</Button>
           <Button variant="primary" onClick={handleSave} className="!py-1 !px-3 text-sm">Save Changes</Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="h-14 bg-slate-800/50 border-b border-slate-700 flex items-center justify-center gap-6 px-4">
        <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-lg border border-slate-700">
          <button 
            onClick={() => setBrushMode(BrushMode.ERASE)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${brushMode === BrushMode.ERASE ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Erase
          </button>
          <button 
            onClick={() => setBrushMode(BrushMode.RESTORE)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${brushMode === BrushMode.RESTORE ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Restore
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Size</span>
          <input 
            type="range" 
            min="5" 
            max="100" 
            value={brushSize} 
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-32 accent-indigo-500"
          />
          <span className="text-sm text-slate-300 w-8">{brushSize}px</span>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 overflow-auto bg-slate-950 flex items-center justify-center p-8 relative touch-none transparency-grid">
         {!imagesLoaded && <div className="text-indigo-400 animate-pulse">Loading editor...</div>}
         <canvas
            ref={canvasRef}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
            className={`max-w-full max-h-full border border-slate-700 shadow-2xl ${brushMode === BrushMode.ERASE ? 'cursor-crosshair' : 'cursor-cell'}`}
            style={{ 
              maxWidth: '90vw', 
              maxHeight: '75vh',
              display: imagesLoaded ? 'block' : 'none'
            }}
         />
      </div>
      
      <div className="bg-slate-800 py-2 text-center text-xs text-slate-400 border-t border-slate-700">
        Use <b>Erase</b> to make transparent. Use <b>Restore</b> to bring back original parts.
      </div>
    </div>
  );
};

export default Editor;