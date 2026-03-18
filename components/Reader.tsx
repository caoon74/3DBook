
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, BookOpen, ArrowLeft, ArrowRight, Volume2, VolumeX, ZoomIn, ZoomOut, LogOut } from 'lucide-react';
import { PageData, BookMetadata } from '../types';

interface ReaderProps {
  pages: PageData[];
  metadata: BookMetadata | null;
  onExit: () => void;
}

// Advanced Procedural Audio Engine for Realistic Paper Physics
const playPaperFlipSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const t = ctx.currentTime;
    
    // Helper: Generate Pink Noise Buffer (Warmer, natural texture)
    const createPinkNoise = (duration: number) => {
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let b0=0, b1=0, b2=0, b3=0, b4=0, b5=0, b6=0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
      return buffer;
    };

    // Layer 1: Lift & Rustle - REMOVED per user request
    // Layer 2: Air Whoosh - REMOVED per user request
    
    // Layer 3: Soft Landing / Settle (Timed for 1.4s animation, landing around ~1.1s)
    // Gentle thud rather than a sharp snap
    const landTime = t + 1.1;
    const landBuffer = createPinkNoise(0.3);
    const landSrc = ctx.createBufferSource();
    landSrc.buffer = landBuffer;
    
    const landFilter = ctx.createBiquadFilter();
    landFilter.type = 'lowpass';
    landFilter.frequency.setValueAtTime(600, landTime);
    landFilter.frequency.exponentialRampToValueAtTime(150, landTime + 0.15); // Quick dampening

    const landGain = ctx.createGain();
    landGain.gain.setValueAtTime(0, landTime);
    // 볼륨을 0.2 -> 0.05로 대폭 감소 (거슬리지 않게)
    landGain.gain.linearRampToValueAtTime(0.05, landTime + 0.05); 
    landGain.gain.exponentialRampToValueAtTime(0.001, landTime + 0.2);

    landSrc.connect(landFilter);
    landFilter.connect(landGain);
    landGain.connect(ctx.destination);
    landSrc.start(landTime);

  } catch (e) {
    console.error("Audio play failed", e);
  }
};

const Reader: React.FC<ReaderProps> = ({ pages, metadata, onExit }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [isSpread, setIsSpread] = useState(window.innerWidth > 1024);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<'next' | 'prev' | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // 줌 및 팬(Pan) 상태 관리
  const [zoomScale, setZoomScale] = useState(1.0);
  const [panPos, setPanPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  // 드래그 시작 시점의 마우스 위치와 팬 위치 간의 차이를 저장
  const dragStartRef = useRef({ x: 0, y: 0 });
  const readerRef = useRef<HTMLDivElement>(null);
  
  // 자연스러운 슬로우 모션 (1.4초)
  const FLIP_DURATION = 1400;

  useEffect(() => {
    const handleResize = () => setIsSpread(window.innerWidth > 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 줌이 1.0 이하로 돌아오면 위치 초기화
  useEffect(() => {
    if (zoomScale <= 1.0) {
      setPanPos({ x: 0, y: 0 });
    }
  }, [zoomScale]);

  // 마우스 드래그 이벤트 핸들러 (전역 window 이벤트로 처리하여 끊김 방지)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const newX = e.clientX - dragStartRef.current.x;
      const newY = e.clientY - dragStartRef.current.y;
      setPanPos({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // 확대된 상태에서만 드래그 허용
    if (zoomScale > 1.0) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX - panPos.x,
        y: e.clientY - panPos.y
      };
    }
  };

  const totalPages = pages.length;

  const handleNext = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    // We can go next as long as the last page hasn't reached the left side.
    // The last page (index totalPages - 1) is on the left when currentPage = totalPages.
    if (isAnimating || currentPage >= totalPages) return;
    
    if (soundEnabled) playPaperFlipSound();
    
    setDirection('next');
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentPage(prev => {
        if (isSpread) {
          return Math.min(prev + 2, totalPages);
        }
        return Math.min(prev + 1, totalPages);
      });
      setIsAnimating(false);
      setDirection(null);
    }, FLIP_DURATION);
  }, [isAnimating, isSpread, currentPage, totalPages, soundEnabled]);

  const handlePrev = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isAnimating || currentPage <= 0) return;
    
    if (soundEnabled) playPaperFlipSound();

    setDirection('prev');
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentPage(prev => {
        if (isSpread) {
          // If we are at an odd page (the end of an odd-paged book), go back by 1 to get to the even spread
          if (prev % 2 !== 0) return prev - 1;
          return Math.max(0, prev - 2);
        }
        return Math.max(0, prev - 1);
      });
      setIsAnimating(false);
      setDirection(null);
    }, FLIP_DURATION);
  }, [isAnimating, isSpread, currentPage, soundEnabled]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    // 휠로 줌 조절
    const sensitivity = 0.001;
    const delta = -e.deltaY * sensitivity;
    setZoomScale(prev => Math.min(Math.max(prev + delta, 0.5), 3.0));
  }, []);

  const leftThickness = Math.min((currentPage / totalPages) * 12, 12);
  const rightThickness = Math.min(((totalPages - currentPage) / totalPages) * 12, 12);

  const renderPageImage = (index: number, side: 'left' | 'right', extraClasses: string = "") => {
    if (index < 0 || index >= totalPages) {
      // Return a white background for "empty" pages as requested
      return <div className={`w-full h-full bg-[#ffffff] ${extraClasses}`} />;
    }
    
    return (
      <div className={`w-full h-full bg-[#fdfcf9] relative overflow-hidden shadow-sm ${extraClasses}`}>
        <img 
          src={pages[index].imageUrl} 
          className="w-full h-full object-contain select-none pointer-events-none" // 이미지 자체 드래그 방지
          // imageRendering 속성 제거하여 브라우저의 고품질 보간 사용
          alt={`Page ${index + 1}`} 
        />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')] opacity-[0.05] pointer-events-none mix-blend-multiply" />
        
        {/* Spine Gradient */}
        <div 
          className={`absolute inset-y-0 ${side === 'left' ? 'right-0 w-[8%]' : 'left-0 w-[8%]'} pointer-events-none`}
          style={{
            background: side === 'left' 
              ? 'linear-gradient(to left, rgba(0,0,0,0.15) 0%, transparent 100%)'
              : 'linear-gradient(to right, rgba(0,0,0,0.15) 0%, transparent 100%)'
          }}
        />
        <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(139,69,19,0.03)] pointer-events-none" />
      </div>
    );
  };

  return (
    <div 
      ref={readerRef} 
      className={`flex flex-col h-full bg-[#111] text-white overflow-hidden select-none touch-none font-inter ${zoomScale > 1.0 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 bg-black/60 backdrop-blur-xl border-b border-white/5 z-[100]">
        <div className="flex items-center gap-4">
          <BookOpen className="w-5 h-5 text-indigo-400" />
          <h2 className="text-sm font-semibold text-slate-100 book-font italic tracking-wide truncate max-w-[250px]">
            {metadata?.title || 'Digital Folio'}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white/5 rounded-full px-3 py-1 mr-2 border border-white/10">
             <ZoomOut className="w-3 h-3 text-slate-400 cursor-pointer hover:text-white" onClick={() => setZoomScale(s => Math.max(0.5, s - 0.2))} />
             <span className="text-[10px] font-mono text-slate-300 mx-2 w-8 text-center">{Math.round(zoomScale * 100)}%</span>
             <ZoomIn className="w-3 h-3 text-slate-400 cursor-pointer hover:text-white" onClick={() => setZoomScale(s => Math.min(3.0, s + 0.2))} />
          </div>
          <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-2 hover:bg-white/10 rounded-full transition-all text-slate-400 hover:text-white">
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button onClick={() => isFullScreen ? document.exitFullscreen() : readerRef.current?.requestFullscreen()} className="p-2 hover:bg-white/10 rounded-full transition-all text-slate-400 hover:text-white">
            {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 3D Stage */}
      <div className="flex-1 relative flex items-center justify-center p-4 md:p-16 overflow-hidden bg-[radial-gradient(circle_at_center,#1a1c23_0%,#000000_100%)]" style={{ perspective: '3000px' }}>
        
        <div 
          className="relative transition-transform duration-100 ease-out will-change-transform"
          style={{ 
            // translate를 먼저 적용하고 scale을 적용하여 직관적인 움직임 구현
            transform: `translate3d(${panPos.x}px, ${panPos.y}px, 0) scale(${zoomScale})`, 
            transformStyle: 'preserve-3d' 
          }}
        >
          <div 
            className={`relative flex ${isSpread ? 'w-[min(94vw,1100px)]' : 'w-[min(88vw,480px)]'} aspect-[1.414/1] bg-transparent`} 
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Spine Sides (두께) */}
            <div 
              className="absolute top-[1px] bottom-[1px] right-full bg-[#e8e6e1] origin-right transition-all duration-500 ease-out border-l border-black/10"
              style={{ 
                width: `${Math.max(2, leftThickness)}px`,
                transform: `rotateY(-15deg) translateZ(-0.5px)`,
                background: `repeating-linear-gradient(90deg, #fdfcf9 0px, #e8e6e1 1px, #d4d2cd 2px)`
              }}
            >
               <div className="absolute inset-0 bg-black/10" />
            </div>
            <div 
              className="absolute top-[1px] bottom-[1px] left-full bg-[#e8e6e1] origin-left transition-all duration-500 ease-out border-r border-black/10"
              style={{ 
                width: `${Math.max(2, rightThickness)}px`,
                transform: `rotateY(15deg) translateZ(-0.5px)`,
                background: `repeating-linear-gradient(90deg, #fdfcf9 0px, #e8e6e1 1px, #d4d2cd 2px)`
              }}
            >
               <div className="absolute inset-0 bg-black/10" />
            </div>

            {/* 1. Base Layer (Underneath during animation) */}
            <div className="absolute inset-0 flex z-0 shadow-2xl" style={{ transformStyle: 'preserve-3d', transform: 'translateZ(-1px)' }}>
               <div className="w-1/2 h-full relative rounded-l-sm bg-[#fdfcf9]">
                 {isAnimating && direction === 'prev' ? renderPageImage(currentPage - 3, 'left') : renderPageImage(currentPage - 1, 'left')}
               </div>
               <div className="w-1/2 h-full relative rounded-r-sm bg-[#fdfcf9]">
                 {isAnimating && direction === 'next' ? renderPageImage(currentPage + 2, 'right') : renderPageImage(currentPage, 'right')}
               </div>
            </div>

            {/* 2. Flipping Page (Animation Layer) */}
            {isAnimating && (
              <div 
                className={`absolute top-0 bottom-0 w-1/2 z-[50] ${direction === 'next' ? 'right-0 origin-left animate-flip-next' : 'left-0 origin-right animate-flip-prev'}`}
                style={{ 
                  transformStyle: 'preserve-3d', 
                  animationDuration: `${FLIP_DURATION}ms`,
                  // 부드러운 시작과 끝 (S-Curve)
                  animationTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)' 
                }}
              >
                {/* [앞면] - Current visible page being flipped */}
                <div className="absolute inset-0 backface-hidden z-20 shadow-xl bg-[#fdfcf9]">
                  {direction === 'next' ? renderPageImage(currentPage, 'right') : renderPageImage(currentPage - 1, 'left')}
                  
                  <div 
                    className={`absolute inset-0 pointer-events-none ${direction === 'next' ? 'animate-curl-shadow-next' : 'animate-curl-shadow-prev'}`} 
                    style={{ animationDuration: `${FLIP_DURATION}ms` }}
                  />
                  
                  <div className="absolute inset-0 animate-specular-sheen" style={{ animationDuration: `${FLIP_DURATION}ms` }} />
                </div>

                {/* [뒷면] - Next page being revealed on the back of the flip */}
                <div 
                  className="absolute inset-0 backface-hidden z-10 bg-[#fdfcf9]" 
                  style={{ transform: 'rotateY(180deg)' }}
                >
                  <div className="w-full h-full">
                    {direction === 'next' ? renderPageImage(currentPage + 1, 'left') : renderPageImage(currentPage - 2, 'right')}
                  </div>
                  
                  <div 
                    className="absolute inset-0 bg-black/5 animate-flip-shadow" 
                    style={{ animationDuration: `${FLIP_DURATION}ms` }} 
                  />
                </div>
              </div>
            )}

            {/* 3. Static Overlay (Visible when not animating) */}
            {!isAnimating && (
              <div className="absolute inset-0 flex z-40" style={{ transformStyle: 'preserve-3d' }}>
                <div className="w-1/2 h-full relative border-r border-black/5">
                  {renderPageImage(currentPage - 1, 'left')}
                </div>
                <div className="w-1/2 h-full relative">
                  {renderPageImage(currentPage, 'right')}
                </div>
              </div>
            )}

            {/* Center Spine Shadow Overlay */}
            <div className="absolute left-1/2 top-0 bottom-0 w-[60px] -translate-x-1/2 z-[60] pointer-events-none"
              style={{
                background: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.25) 50%, rgba(0,0,0,0.1) 60%, transparent 100%)',
                mixBlendMode: 'multiply'
              }}
            />

            {/* Navigation Controls (Floating Arrows) */}
            {!isAnimating && (
              <div className="absolute inset-0 z-[110] pointer-events-none">
                {currentPage > 0 && (
                  <button 
                    onClick={handlePrev} 
                    className="absolute bottom-8 left-8 w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center pointer-events-auto shadow-2xl hover:bg-indigo-500 hover:border-indigo-400 transition-all active:scale-90 group"
                  >
                    <ArrowLeft className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                  </button>
                )}
                {currentPage < (isSpread ? totalPages : totalPages - 1) && (
                  <button 
                    onClick={handleNext} 
                    className="absolute bottom-8 right-8 w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center pointer-events-auto shadow-2xl hover:bg-indigo-500 hover:border-indigo-400 transition-all active:scale-90 group"
                  >
                    <ArrowRight className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Progress */}
      <div className="bg-black/80 backdrop-blur-xl border-t border-white/5 p-6 z-[100]">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Progress</span>
            <div className="flex items-center gap-2 mt-1">
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-xs font-bold text-slate-300">
                {isSpread 
                  ? (currentPage === 0 ? "1" : (currentPage >= totalPages ? `${totalPages}` : `${currentPage} - ${Math.min(currentPage + 1, totalPages)}`))
                  : (currentPage + 1)} / {totalPages}
              </span>
            </div>
          </div>
          
          <div className="flex-1 mx-12 h-1 bg-white/10 rounded-full overflow-hidden">
             <div 
               className="h-full bg-indigo-500 transition-all duration-500"
               style={{ width: `${Math.min(100, ((isSpread ? (currentPage === 0 ? 1 : currentPage) : currentPage + 1) / totalPages) * 100)}%` }}
             />
          </div>

          <div className="flex gap-2 items-center">
            <button onClick={handlePrev} disabled={isAnimating || currentPage === 0} className="p-3 bg-white/5 rounded-xl hover:bg-white/10 disabled:opacity-10 transition-all">
              <ChevronLeft className="w-5 h-5 text-slate-400" />
            </button>
            <button onClick={handleNext} disabled={isAnimating || currentPage >= (isSpread ? totalPages : totalPages - 1)} className="p-3 bg-white/5 rounded-xl hover:bg-white/10 disabled:opacity-10 transition-all">
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
            
            <div className="h-6 w-[1px] bg-white/10 mx-1" /> {/* Divider */}

            <button 
              onClick={onExit} 
              className="p-3 bg-red-500/10 rounded-xl hover:bg-red-500/20 border border-red-500/10 transition-all group"
              title="Exit to Home"
            >
              <LogOut className="w-5 h-5 text-red-400 group-hover:text-red-300" />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        /* 페이지 턴 애니메이션 */
        @keyframes flip-next {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(-180deg); }
        }

        @keyframes flip-prev {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(180deg); }
        }

        @keyframes curl-shadow-next {
          0% { background: linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 100%); }
          15% { background: linear-gradient(90deg, rgba(0,0,0,0.05) 80%, rgba(0,0,0,0.2) 100%); }
          50% { background: linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0) 100%); }
          100% { background: linear-gradient(90deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0) 20%); }
        }

        @keyframes curl-shadow-prev {
          0% { background: linear-gradient(-90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 100%); }
          15% { background: linear-gradient(-90deg, rgba(0,0,0,0.05) 80%, rgba(0,0,0,0.2) 100%); }
          50% { background: linear-gradient(-90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0) 100%); }
          100% { background: linear-gradient(-90deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0) 20%); }
        }

        @keyframes specular-sheen {
          0% { background: linear-gradient(90deg, transparent 0%, transparent 100%); }
          50% { background: linear-gradient(90deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%); }
          100% { background: linear-gradient(90deg, transparent 0%, transparent 100%); }
        }

        @keyframes flip-shadow {
          0% { opacity: 0; }
          20% { opacity: 0.1; }
          100% { opacity: 0; }
        }

        .animate-flip-next { animation-name: flip-next; animation-fill-mode: forwards; }
        .animate-flip-prev { animation-name: flip-prev; animation-fill-mode: forwards; }
        .animate-curl-shadow-next { animation-name: curl-shadow-next; animation-fill-mode: forwards; }
        .animate-curl-shadow-prev { animation-name: curl-shadow-prev; animation-fill-mode: forwards; }
        .animate-specular-sheen { animation-name: specular-sheen; animation-fill-mode: forwards; }
        .animate-flip-shadow { animation-name: flip-shadow; animation-fill-mode: forwards; }

        .backface-hidden {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
      `}</style>
    </div>
  );
};

export default Reader;
