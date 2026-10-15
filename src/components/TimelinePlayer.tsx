import { useState, useEffect, useRef } from 'react';
import { SceneShot } from '../core/types';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, X, Film, Volume2, VolumeX } from 'lucide-react';

interface TimelinePlayerProps {
  shots: SceneShot[];
  isOpen: boolean;
  onClose: () => void;
  onSelectShot?: (id: string) => void;
}

export default function TimelinePlayer({ shots, isOpen, onClose, onSelectShot }: TimelinePlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentShot = shots[currentIndex] || shots[0];
  const isVideo = currentShot?.mediaUrl && currentShot?.mediaType === 'video';
  const hasAudio = !!currentShot?.audioUrl;

  // Synchronize custom scene audio track
  useEffect(() => {
    if (!isOpen) {
      audioRef.current?.pause();
      return;
    }

    if (currentShot?.audioUrl && isPlaying) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.muted = isMuted;
        audioRef.current.play().catch(() => {});
      }
    } else {
      audioRef.current?.pause();
    }
  }, [isOpen, isPlaying, currentIndex, currentShot?.audioUrl, isMuted]);

  // Reset index when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setIsPlaying(true);
      setProgress(0);
    }
  }, [isOpen]);

  // Handle keyboard shortcuts (Esc to close, Space to toggle play)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, shots.length]);

  // Timer for non-video shots (images or placeholder storyboard cards)
  useEffect(() => {
    if (!isOpen || !isPlaying || isVideo) return;

    setProgress(0);
    const durationMs = 3500;
    const intervalMs = 50;
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += intervalMs;
      setProgress(Math.min(100, (elapsed / durationMs) * 100));

      if (elapsed >= durationMs) {
        clearInterval(timer);
        handleNext();
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isOpen, isPlaying, currentIndex, isVideo]);

  // Video time update listener
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideo) return;

    const handleTimeUpdate = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [currentIndex, isVideo]);

  const handleNext = () => {
    if (currentIndex < shots.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
    } else {
      setIsPlaying(false);
      setProgress(100);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setProgress(0);
    setIsPlaying(true);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  const jumpToShot = (idx: number) => {
    setCurrentIndex(idx);
    setProgress(0);
    setIsPlaying(true);
    if (onSelectShot && shots[idx]) {
      onSelectShot(shots[idx].id);
    }
  };

  if (!isOpen || !currentShot) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col justify-between select-none animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-950/80">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/50">
                Cena {currentIndex + 1} de {shots.length}
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                {currentShot.aspectRatio}
              </span>
            </div>
            <h2 className="text-sm font-bold text-white mt-0.5">{currentShot.title}</h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasAudio && (
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {currentShot.audioName || 'Locução Neural'}
            </span>
          )}

          {(isVideo || hasAudio) && (
            <button
              onClick={() => setIsMuted(prev => !prev)}
              className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 border border-zinc-800 transition-colors"
              title={isMuted ? 'Ativar Áudio' : 'Mutar Áudio'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
          )}

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 border border-zinc-800 transition-colors"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Hidden Audio Player for scene voiceover */}
      {currentShot.audioUrl && (
        <audio ref={audioRef} src={currentShot.audioUrl} preload="auto" />
      )}

      {/* Main Viewport Stage */}
      <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">
        <div 
          className="relative max-h-full max-w-5xl w-full aspect-video rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-2xl flex items-center justify-center"
        >
          {isVideo ? (
            <video
              ref={videoRef}
              key={currentShot.mediaUrl}
              src={currentShot.mediaUrl}
              autoPlay={isPlaying}
              muted={isMuted}
              playsInline
              onEnded={handleNext}
              className="w-full h-full object-contain"
            />
          ) : currentShot.mediaUrl ? (
            <img
              key={currentShot.mediaUrl}
              src={currentShot.mediaUrl}
              alt={currentShot.title}
              className="w-full h-full object-contain animate-in fade-in duration-300"
            />
          ) : (
            /* Storyboard Card fallback when no video uploaded yet */
            <div className="flex flex-col items-center justify-center p-8 text-center max-w-xl">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 text-zinc-500">
                <Film className="w-8 h-8 text-emerald-500" />
              </div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 mb-1">
                Aguardando Mídia do Google Flow
              </span>
              <h3 className="text-xl font-bold text-white mb-2">{currentShot.title}</h3>
              <p className="text-xs text-zinc-400 mb-4 line-clamp-3">{currentShot.framing}</p>
              <div className="px-3 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-800 text-[11px] text-zinc-500 font-mono">
                Transição automática em 3.5s (ou avance com as setas do teclado)
              </div>
            </div>
          )}

          {/* Subtitle / Camera Overlay (Buzzy + Character.ai) */}
          <div className="absolute bottom-4 left-4 right-4 bg-zinc-950/85 backdrop-blur-md border border-zinc-800/80 rounded-xl p-3 flex flex-col pointer-events-none">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 max-w-2xl truncate">
                <span className="text-[10px] uppercase font-bold text-emerald-400 font-mono">Cena {currentIndex + 1}:</span>
                <span className="text-xs text-zinc-200 font-medium truncate">{currentShot.framing}</span>
                {currentShot.cameraMovement && (
                  <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-800/60 px-1.5 py-0.5 rounded">
                    🎥 {currentShot.cameraMovement}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-zinc-400 font-mono">
                Proporção: {currentShot.aspectRatio}
              </span>
            </div>
            {currentShot.dialogueLine && (
              <p className="text-xs text-emerald-300 italic font-medium mt-1 truncate">
                "{currentShot.dialogueLine}"
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Timeline Controls and Filmstrip */}
      <div className="px-6 py-4 border-t border-zinc-800/80 bg-zinc-950/90 space-y-3">
        {/* Progress Bar */}
        <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden border border-zinc-800/60">
          <div 
            className="bg-emerald-500 h-full transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Playback Transport Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleRestart}
              className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 border border-zinc-800 transition-colors"
              title="Reiniciar Linha do Tempo"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 border border-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Cena Anterior"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsPlaying(prev => !prev)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg shadow-emerald-950 transition-colors"
              title="Reproduzir / Pausar (Espaço)"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
              <span className="text-xs">{isPlaying ? 'Pausar' : 'Reproduzir'}</span>
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex === shots.length - 1}
              className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 border border-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Próxima Cena"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Filmstrip / Thumbnail Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-xl py-1">
            {shots.map((shot, idx) => (
              <button
                key={shot.id}
                onClick={() => jumpToShot(idx)}
                className={`relative flex-shrink-0 w-16 h-10 rounded border overflow-hidden transition-all text-left ${
                  idx === currentIndex
                    ? 'border-emerald-500 ring-2 ring-emerald-500/50 scale-105'
                    : 'border-zinc-800 opacity-60 hover:opacity-100'
                }`}
                title={`Ir para Cena ${idx + 1}: ${shot.title}`}
              >
                {shot.mediaUrl ? (
                  shot.mediaType === 'video' ? (
                    <video src={shot.mediaUrl} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={shot.mediaUrl} alt={shot.title} className="w-full h-full object-cover" />
                  )
                ) : (
                  <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-[10px] font-mono text-zinc-500">
                    #{idx + 1}
                  </div>
                )}
                <span className="absolute bottom-0 right-0 bg-black/80 px-1 text-[8px] font-mono text-white">
                  {idx + 1}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
