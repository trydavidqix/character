import React, { useState, useMemo, useEffect } from 'react';
import { 
  User, 
  Film, 
  Sparkles, 
  Copy, 
  Check, 
  Volume2, 
  VolumeX, 
  Send, 
  ShieldAlert, 
  Layers, 
  Camera, 
  Plus, 
  Download, 
  RefreshCw,
  Trash2,
  CheckCircle2,
  Upload,
  Video,
  Sliders,
  Network
} from 'lucide-react';
import { CharacterSheet, SceneShot } from './core/types';
import { defaultCharacters } from './core/defaultCharacters';
import { compileScenePrompt } from './core/promptCompiler';
import SceneCanvas from './components/SceneCanvas';

const initialShots: SceneShot[] = [
  {
    id: 'shot-1',
    title: 'Historic Limestone Portrait',
    framing: 'A medium close-up, waist-up portrait',
    cameraAngle: 'chest facing camera, head turned forty-five degrees to the right',
    lighting: 'bright single-source direct hard sunlight at 45-degree angle casting harsh deep black shadows with specular highlights',
    environment: 'warm light beige raw-cut limestone environment with a massive rough-pitted carved stone pillar base on the right and weathered facade on the left',
    action: 'wearing an off-white wrinkly linen shirt deeply unbuttoned with a thin gold chain, relaxed posture, confident guarded expression',
    aspectRatio: '2:3',
  },
  {
    id: 'shot-2',
    title: 'Poolside Sunset Glow',
    framing: 'Medium portrait framing from chest up',
    cameraAngle: 'three-quarter view looking slightly away from lens',
    lighting: 'warm golden hour sun low on horizon, gentle rim light illuminating hair waves',
    environment: 'luxury outdoor infinity pool edge overlooking distant terracotta tiled villas',
    action: 'natural spontaneous gentle smile, arms leaning on stone pool railing, wind blowing loose strands of hair',
    aspectRatio: '9:16',
  },
  {
    id: 'shot-3',
    title: 'Editorial Studio Focus',
    framing: 'Close-up headshot tack sharp on eyes and accessories',
    cameraAngle: 'straight on at eye level',
    lighting: 'dramatic split studio lighting with high contrast and deep shadows',
    environment: 'neutral textured charcoal grey matte backdrop',
    action: 'direct piercing gaze into camera lens, composed neutral expression with subtle poise',
    aspectRatio: '1:1',
  }
];

export default function App() {
  const [characters, setCharacters] = useState<CharacterSheet[]>(defaultCharacters);
  const [selectedCharId, setSelectedCharId] = useState<string>('megalina');
  const [activeTab, setActiveTab] = useState<'character' | 'canvas'>('canvas');
  const [canvasViewMode, setCanvasViewMode] = useState<'graph' | 'director'>('graph');
  
  const [shots, setShots] = useState<SceneShot[]>(initialShots);
  const [selectedShotId, setSelectedShotId] = useState<string>(initialShots[0].id);
  const [selectedShotIds, setSelectedShotIds] = useState<string[]>([initialShots[0].id]);

  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedNeg, setCopiedNeg] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  // Voice Settings for Character.ai
  const [voicePitch, setVoicePitch] = useState<number>(1.0);
  const [voiceRate, setVoiceRate] = useState<number>(1.0);

  // Selected Character
  const selectedCharacter = useMemo(() => {
    return characters.find(c => c.id === selectedCharId) || characters[0];
  }, [characters, selectedCharId]);

  // Persistent Chat History per Character (LocalStorage)
  const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'char'; text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [newForbiddenTag, setNewForbiddenTag] = useState('');

  // Load chat history from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem(`char_chat_${selectedCharId}`);
    if (saved) {
      try {
        setChatMessages(JSON.parse(saved));
      } catch {
        setChatMessages([{ sender: 'char', text: selectedCharacter.greeting || 'Olá!' }]);
      }
    } else {
      setChatMessages([{ sender: 'char', text: selectedCharacter.greeting || 'Olá! Pronta para planejar nossa próxima cena?' }]);
    }
  }, [selectedCharId, selectedCharacter.greeting]);

  // Global Keyboard Shortcut: 'H' toggles Select All / Deselect All
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.key.toLowerCase() === 'h') {
        e.preventDefault();
        toggleSelectAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shots, selectedShotIds, selectedShotId]);

  // Helper to update and persist chat
  const updateChat = (newMsgs: { sender: 'user' | 'char'; text: string }[]) => {
    setChatMessages(newMsgs);
    localStorage.setItem(`char_chat_${selectedCharId}`, JSON.stringify(newMsgs));
  };

  const activeShot = useMemo(() => {
    return shots.find(s => s.id === selectedShotId) || shots[0];
  }, [shots, selectedShotId]);

  // Live Compiled Result from the Consistency Engine
  const compilationResult = useMemo(() => {
    return compileScenePrompt(selectedCharacter, activeShot);
  }, [selectedCharacter, activeShot]);

  // Voice synthesis (Web Speech API) with custom pitch and rate
  const handleSpeak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.pitch = voicePitch;
    utterance.rate = voiceRate;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isThinking) return;

    const userText = chatInput.trim();
    const updated = [...chatMessages, { sender: 'user' as const, text: userText }];
    updateChat(updated);
    setChatInput('');
    setIsThinking(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterName: selectedCharacter.name,
          personality: selectedCharacter.personality,
          message: userText,
          history: updated
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const reply = data.reply || 'Entendido! Vamos em frente com a cena.';
        const withReply = [...updated, { sender: 'char' as const, text: reply }];
        updateChat(withReply);
        handleSpeak(reply);
      } else {
        throw new Error('Bridge error');
      }
    } catch {
      // Offline fallback
      let reply = `Entendido! Para manter a fidelidade visual, vou me ater aos traços de ${selectedCharacter.name}.`;
      if (userText.toLowerCase().includes('luz') || userText.toLowerCase().includes('sol')) {
        reply = 'A iluminação forte a 45º dá um contraste fantástico, destacando as sombras naturais sem perder textura!';
      } else if (userText.toLowerCase().includes('roupa') || userText.toLowerCase().includes('estilo')) {
        reply = 'Aprovado! Peças de linho e tons neutros funcionam perfeitamente com os tons quentes das nossas referências.';
      } else if (userText.toLowerCase().includes('cena')) {
        reply = 'Perfeito. Ajuste o enquadramento no Canvas e copie o prompt formatado em inglês para o Flow!';
      }
      const withReply = [...updated, { sender: 'char' as const, text: reply }];
      updateChat(withReply);
      handleSpeak(reply);
    } finally {
      setIsThinking(false);
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(compilationResult.finalPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleCopyNeg = () => {
    navigator.clipboard.writeText(compilationResult.negativePrompt);
    setCopiedNeg(true);
    setTimeout(() => setCopiedNeg(false), 2000);
  };

  const handleAddForbidden = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newForbiddenTag.trim()) {
      e.preventDefault();
      const word = newForbiddenTag.trim().toLowerCase();
      if (!selectedCharacter.forbiddenWords.includes(word)) {
        const updated = characters.map(c => {
          if (c.id === selectedCharacter.id) {
            return { ...c, forbiddenWords: [...c.forbiddenWords, word] };
          }
          return c;
        });
        setCharacters(updated);
      }
      setNewForbiddenTag('');
    }
  };

  const handleRemoveForbidden = (word: string) => {
    const updated = characters.map(c => {
      if (c.id === selectedCharacter.id) {
        return { ...c, forbiddenWords: c.forbiddenWords.filter(w => w !== word) };
      }
      return c;
    });
    setCharacters(updated);
  };

  const handleAddShot = () => {
    const newId = `shot-${Date.now()}`;
    const newShot: SceneShot = {
      id: newId,
      title: `Nova Tomada ${shots.length + 1}`,
      framing: 'Medium waist-up shot',
      cameraAngle: 'Eye level, looking straight to lens',
      lighting: 'Warm cinematic sunset light with natural contrast',
      environment: 'Architectural outdoor terrace with clean background',
      action: 'Natural confident posture, neutral expression',
      aspectRatio: '9:16',
    };
    setShots([...shots, newShot]);
    setSelectedShotId(newId);
  };

  const handleDeleteShot = (shotId: string) => {
    if (shots.length <= 1) return;
    const remaining = shots.filter(s => s.id !== shotId);
    setShots(remaining);
    setSelectedShotIds(prev => prev.filter(id => id !== shotId));
    if (selectedShotId === shotId) {
      setSelectedShotId(remaining[0].id);
    }
  };

  // Toggle selection for all shots with H shortcut (liga/desliga)
  const toggleSelectAll = () => {
    if (selectedShotIds.length === shots.length) {
      // Turn OFF -> deselect all
      setSelectedShotIds([]);
    } else {
      // Turn ON -> select all
      setSelectedShotIds(shots.map(s => s.id));
    }
  };

  const handleToggleSelectShot = (shotId: string) => {
    if (selectedShotIds.includes(shotId)) {
      setSelectedShotIds(selectedShotIds.filter(id => id !== shotId));
    } else {
      setSelectedShotIds([...selectedShotIds, shotId]);
    }
    setSelectedShotId(shotId);
  };

  const handleDeleteSelected = () => {
    if (selectedShotIds.length === 0) return;
    if (shots.length <= 1) return;
    const remaining = shots.filter(s => !selectedShotIds.includes(s.id));
    if (remaining.length === 0) {
      const resetShot = [{ ...shots[0], title: 'Cena 1', mediaUrl: undefined, mediaType: undefined }];
      setShots(resetShot);
      setSelectedShotId(resetShot[0].id);
      setSelectedShotIds([resetShot[0].id]);
      return;
    }
    setShots(remaining);
    setSelectedShotId(remaining[0].id);
    setSelectedShotIds([remaining[0].id]);
  };

  // Upload handler for user generated videos/images from Google Flow
  const handleUploadMedia = (shotId: string, file: File) => {
    const isVideo = file.type.startsWith('video');
    const url = URL.createObjectURL(file);
    const updated = shots.map(s => {
      if (s.id === shotId) {
        return {
          ...s,
          mediaUrl: url,
          mediaType: isVideo ? ('video' as const) : ('image' as const)
        };
      }
      return s;
    });
    setShots(updated);
  };

  const handleRemoveMedia = (shotId: string) => {
    const updated = shots.map(s => {
      if (s.id === shotId) {
        return { ...s, mediaUrl: undefined, mediaType: undefined };
      }
      return s;
    });
    setShots(updated);
  };

  const handleExportCharacter = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(selectedCharacter, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${selectedCharacter.id}_character_card.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden select-none">
      {/* Top Navbar */}
      <header className="h-14 border-b border-zinc-800/80 bg-zinc-900/95 px-5 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-white tracking-tight">Character & Buzzy Studio</h1>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              AGY Ativo
            </span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-zinc-950/80 rounded-lg p-0.5 border border-zinc-800">
          <button
            onClick={() => setActiveTab('character')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'character'
                ? 'bg-zinc-800 text-white shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <User className="w-3.5 h-3.5 text-emerald-400" />
            Character Lab
          </button>
          <button
            onClick={() => setActiveTab('canvas')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'canvas'
                ? 'bg-zinc-800 text-white shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Film className="w-3.5 h-3.5 text-emerald-400" />
            Buzzy Canvas
          </button>
        </div>

        {/* Character Switcher & Export */}
        <div className="flex items-center space-x-2.5">
          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-700/80 rounded-lg px-2.5 py-1">
            <div className="w-5 h-5 rounded-full bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-[10px] font-bold text-emerald-300">
              {selectedCharacter.name[0]}
            </div>
            <select
              value={selectedCharId}
              onChange={(e) => {
                setSelectedCharId(e.target.value);
              }}
              className="bg-transparent text-xs font-semibold text-zinc-100 focus:outline-none cursor-pointer pr-1"
            >
              {characters.map(char => (
                <option key={char.id} value={char.id} className="bg-zinc-900 text-white">
                  {char.name} ({char.gender === 'f' ? 'Feminino' : 'Masculino'})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExportCharacter}
            title="Exportar Character Card JSON"
            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 rounded-lg text-zinc-300 transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Studio Body */}
      <main className="flex-1 overflow-hidden flex">
        {activeTab === 'character' ? (
          /* ================= CHARACTER LAB TAB (Character.ai) ================= */
          <div className="flex-1 flex overflow-hidden">
            {/* Left: Persona Identity Sheet */}
            <div className="w-[58%] border-r border-zinc-800/80 overflow-y-auto p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-400" />
                    Ficha de Consistência — {selectedCharacter.name}
                  </h2>
                  <p className="text-xs text-zinc-400">Regras imutáveis que forçam o Google Flow a manter o mesmo rosto.</p>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-emerald-400">
                  id: {selectedCharacter.id}
                </span>
              </div>

              {/* howToCite Anchor */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Âncora de Rosto (howToCite) — Em Inglês
                </label>
                <input
                  type="text"
                  value={selectedCharacter.howToCite}
                  onChange={(e) => {
                    const updated = characters.map(c => c.id === selectedCharacter.id ? { ...c, howToCite: e.target.value } : c);
                    setCharacters(updated);
                  }}
                  className="w-full bg-zinc-900/90 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Identity Block */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Acessórios e Traços Fixos de Identidade
                </label>
                <textarea
                  rows={2}
                  value={selectedCharacter.identityBlockEn}
                  onChange={(e) => {
                    const updated = characters.map(c => c.id === selectedCharacter.id ? { ...c, identityBlockEn: e.target.value } : c);
                    setCharacters(updated);
                  }}
                  className="w-full bg-zinc-900/90 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Fixed Traits Grid */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Traços Físicos Congelados
                </label>
                <div className="grid grid-cols-2 gap-2.5 bg-zinc-900/50 p-3.5 rounded-xl border border-zinc-800/80">
                  {Object.entries(selectedCharacter.fixedTraits).map(([key, val]) => (
                    <div key={key} className="space-y-0.5">
                      <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold">{key}:</span>
                      <p className="text-xs text-zinc-300 font-medium truncate">{val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Voice Calibration (Character.ai) */}
              <div className="space-y-2 p-3.5 bg-zinc-900/40 rounded-xl border border-zinc-800/80">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                  Calibração de Voz da Persona
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                      <span>Tom (Pitch):</span>
                      <span className="font-mono text-emerald-400">{voicePitch.toFixed(1)}</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.5" 
                      max="1.5" 
                      step="0.1" 
                      value={voicePitch} 
                      onChange={(e) => setVoicePitch(parseFloat(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                      <span>Velocidade (Rate):</span>
                      <span className="font-mono text-emerald-400">{voiceRate.toFixed(1)}</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.8" 
                      max="1.4" 
                      step="0.1" 
                      value={voiceRate} 
                      onChange={(e) => setVoiceRate(parseFloat(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Forbidden Words Badges */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                  <span>Traços Proibidos ({selectedCharacter.forbiddenWords.length})</span>
                  <span className="text-[11px] text-zinc-500 lowercase font-normal">Digite e aperte Enter</span>
                </label>
                <div className="flex flex-wrap gap-1.5 p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl min-h-[70px]">
                  {selectedCharacter.forbiddenWords.map(word => (
                    <span
                      key={word}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-red-950/40 text-red-300 border border-red-900/50 text-xs font-mono"
                    >
                      {word}
                      <button
                        type="button"
                        onClick={() => handleRemoveForbidden(word)}
                        className="hover:text-red-100 ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder="Adicionar traço proibido..."
                    value={newForbiddenTag}
                    onChange={(e) => setNewForbiddenTag(e.target.value)}
                    onKeyDown={handleAddForbidden}
                    className="bg-transparent text-xs text-zinc-200 px-2 py-0.5 focus:outline-none placeholder:text-zinc-600"
                  />
                </div>
              </div>

              {/* Required Standard References */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Fotos de Referência Mestre Obrigatórias
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedCharacter.standardReferences.map(ref => (
                    <div key={ref} className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700/80 text-xs font-mono text-zinc-200 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      {ref}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Character.ai Chat Simulator with Persistent Memory */}
            <div className="w-[42%] flex flex-col bg-zinc-950/80">
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 font-bold text-sm">
                    {selectedCharacter.name[0]}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                      {selectedCharacter.name}
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    </h3>
                    <p className="text-[11px] text-zinc-400 line-clamp-1">{selectedCharacter.personality}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateChat([{ sender: 'char', text: selectedCharacter.greeting || 'Olá!' }])}
                    title="Limpar Histórico Salvo"
                    className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleSpeak(chatMessages[chatMessages.length - 1]?.text || '')}
                    className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white"
                    title="Ouvir voz"
                  >
                    {isSpeaking ? <VolumeX className="w-3.5 h-3.5 text-emerald-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Chat Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-emerald-600 text-white rounded-br-none shadow-sm'
                          : 'bg-zinc-900 text-zinc-200 border border-zinc-800 rounded-bl-none shadow-sm'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isThinking && (
                  <div className="flex flex-col items-start">
                    <div className="bg-zinc-900 border border-emerald-500/30 rounded-2xl px-3 py-1.5 text-[11px] text-emerald-400 flex items-center gap-2 animate-pulse">
                      <Sparkles className="w-3 h-3 animate-spin" />
                      {selectedCharacter.name} está pensando via AGY...
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Prompt Chips */}
              <div className="px-4 py-2 border-t border-zinc-800/80 bg-zinc-900/30 flex gap-1.5 overflow-x-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setChatInput('Qual luz fica melhor na próxima cena?')}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 whitespace-nowrap border border-zinc-700/50"
                >
                  💡 Sugestão de iluminação
                </button>
                <button
                  type="button"
                  onClick={() => setChatInput('Como compor o look e acessórios para manter consistência?')}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 whitespace-nowrap border border-zinc-700/50"
                >
                  👗 Regras do look
                </button>
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-zinc-800 flex gap-2 shrink-0">
                <input
                  type="text"
                  placeholder={`Converse com ${selectedCharacter.name}...`}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 placeholder:text-zinc-600"
                />
                <button
                  type="submit"
                  disabled={isThinking}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs rounded-xl flex items-center justify-center transition-all shadow-md shadow-emerald-600/20"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* ================= BUZZY CANVAS TAB (Buzzy.now with 2D Nodes & Flow Upload) ================= */
          <div className="flex-1 flex overflow-hidden">
            {/* Left/Center Workspace: 2D Canvas OR Director Controls */}
            <div className="flex-1 flex flex-col overflow-hidden border-r border-zinc-800/80">
              {/* Canvas Sub-Header Controls */}
              <div className="h-10 border-b border-zinc-800/80 bg-zinc-900/60 px-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    Modo de Edição:
                  </span>
                  <div className="flex bg-zinc-950 p-0.5 rounded border border-zinc-800">
                    <button
                      onClick={() => setCanvasViewMode('graph')}
                      className={`px-2.5 py-0.5 text-xs font-medium rounded flex items-center gap-1 ${
                        canvasViewMode === 'graph' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Network className="w-3 h-3 text-emerald-400" />
                      Canvas 2D de Nós (Buzzy)
                    </button>
                    <button
                      onClick={() => setCanvasViewMode('director')}
                      className={`px-2.5 py-0.5 text-xs font-medium rounded flex items-center gap-1 ${
                        canvasViewMode === 'director' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Camera className="w-3 h-3 text-emerald-400" />
                      Diretor de Parâmetros
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Atalho H: Selecionar Tudo (Liga/Desliga) */}
                  <button
                    onClick={toggleSelectAll}
                    title="Pressione 'H' para selecionar ou desmarcar todas as cenas"
                    className={`px-2.5 py-1 text-xs font-semibold rounded border transition-all flex items-center gap-1.5 ${
                      selectedShotIds.length === shots.length && shots.length > 0
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                        : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:text-white hover:bg-zinc-800'
                    }`}
                  >
                    <CheckCircle2 className={`w-3.5 h-3.5 ${selectedShotIds.length === shots.length && shots.length > 0 ? 'text-white' : 'text-emerald-400'}`} />
                    {selectedShotIds.length === shots.length && shots.length > 0 ? 'Desmarcar Tudo [H]' : 'Selecionar Tudo [H]'}
                  </button>

                  {/* Quick Select Dropdown */}
                  <div className="flex items-center gap-1 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                    <select
                      value={selectedShotId}
                      onChange={(e) => {
                        setSelectedShotId(e.target.value);
                        if (!selectedShotIds.includes(e.target.value)) {
                          setSelectedShotIds([...selectedShotIds, e.target.value]);
                        }
                      }}
                      className="bg-transparent text-xs font-semibold text-emerald-400 focus:outline-none cursor-pointer pr-1"
                    >
                      {shots.map((s, idx) => (
                        <option key={s.id} value={s.id} className="bg-zinc-900 text-white">
                          #{idx + 1} — {s.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Delete Selected (Apagar Marcadas) */}
                  {shots.length > 1 && (
                    <button
                      onClick={handleDeleteSelected}
                      disabled={selectedShotIds.length === 0}
                      title={selectedShotIds.length > 0 ? `Apagar ${selectedShotIds.length} cena(s) marcada(s)` : 'Nenhuma cena marcada para apagar'}
                      className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
                        selectedShotIds.length > 0
                          ? 'bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-900/50 cursor-pointer'
                          : 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Apagar ({selectedShotIds.length})
                    </button>
                  )}

                  <button
                    onClick={handleAddShot}
                    className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded border border-emerald-500/30 text-xs font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nova Cena
                  </button>
                </div>
              </div>

              {/* Workspace Content */}
              <div className="flex-1 overflow-hidden relative">
                {canvasViewMode === 'graph' ? (
                  /* 2D Interactive React Flow Canvas */
                  <SceneCanvas
                    shots={shots}
                    selectedShotId={selectedShotId}
                    selectedShotIds={selectedShotIds}
                    onSelectShot={setSelectedShotId}
                    onToggleSelectShot={handleToggleSelectShot}
                    onDeleteShot={handleDeleteShot}
                    onUploadMedia={handleUploadMedia}
                  />
                ) : (
                  /* Director Form Inspector */
                  <div className="p-6 overflow-y-auto h-full space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <Camera className="w-4 h-4 text-emerald-400" />
                          Direção da Tomada — {activeShot.title}
                        </h3>
                        <p className="text-xs text-zinc-400">Ajuste os parâmetros visuais para alimentar o Google Flow.</p>
                      </div>

                      {/* Aspect Ratio Selector & Delete */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                          {(['2:3', '9:16', '16:9', '1:1'] as const).map(ratio => (
                            <button
                              key={ratio}
                              type="button"
                              onClick={() => {
                                const updated = shots.map(s => s.id === activeShot.id ? { ...s, aspectRatio: ratio } : s);
                                setShots(updated);
                              }}
                              className={`px-2 py-0.5 text-[11px] font-mono font-medium rounded ${
                                activeShot.aspectRatio === ratio
                                  ? 'bg-emerald-600 text-white'
                                  : 'text-zinc-400 hover:text-white'
                              }`}
                            >
                              {ratio}
                            </button>
                          ))}
                        </div>
                        {shots.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteShot(activeShot.id)}
                            title="Excluir Tomada Atual"
                            className="p-1.5 hover:bg-zinc-800 text-zinc-500 hover:text-red-400 rounded-lg border border-zinc-800 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Title Input */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Título da Cena</label>
                      <input
                        type="text"
                        value={activeShot.title}
                        onChange={(e) => {
                          const updated = shots.map(s => s.id === activeShot.id ? { ...s, title: e.target.value } : s);
                          setShots(updated);
                        }}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Framing */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Enquadramento (Framing)</label>
                        <div className="flex gap-1 text-[10px]">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = shots.map(s => s.id === activeShot.id ? { ...s, framing: 'A medium close-up, waist-up portrait' } : s);
                              setShots(updated);
                            }}
                            className="text-zinc-400 hover:text-emerald-400"
                          >
                            [Plano Médio]
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = shots.map(s => s.id === activeShot.id ? { ...s, framing: 'Close-up headshot tack sharp on eyes' } : s);
                              setShots(updated);
                            }}
                            className="text-zinc-400 hover:text-emerald-400"
                          >
                            [Close-up]
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = shots.map(s => s.id === activeShot.id ? { ...s, framing: 'Full body shot from head to toe' } : s);
                              setShots(updated);
                            }}
                            className="text-zinc-400 hover:text-emerald-400"
                          >
                            [Corpo Inteiro]
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={activeShot.framing}
                        onChange={(e) => {
                          const updated = shots.map(s => s.id === activeShot.id ? { ...s, framing: e.target.value } : s);
                          setShots(updated);
                        }}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>

                    {/* Camera Angle */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Ângulo da Câmera</label>
                      <input
                        type="text"
                        value={activeShot.cameraAngle}
                        onChange={(e) => {
                          const updated = shots.map(s => s.id === activeShot.id ? { ...s, cameraAngle: e.target.value } : s);
                          setShots(updated);
                        }}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>

                    {/* Lighting */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Iluminação e Contraste</label>
                      <input
                        type="text"
                        value={activeShot.lighting}
                        onChange={(e) => {
                          const updated = shots.map(s => s.id === activeShot.id ? { ...s, lighting: e.target.value } : s);
                          setShots(updated);
                        }}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>

                    {/* Environment */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Cenário / Ambiente</label>
                      <textarea
                        rows={2}
                        value={activeShot.environment}
                        onChange={(e) => {
                          const updated = shots.map(s => s.id === activeShot.id ? { ...s, environment: e.target.value } : s);
                          setShots(updated);
                        }}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>

                    {/* Action */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Vestimenta & Ação</label>
                      <textarea
                        rows={2}
                        value={activeShot.action}
                        onChange={(e) => {
                          const updated = shots.map(s => s.id === activeShot.id ? { ...s, action: e.target.value } : s);
                          setShots(updated);
                        }}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Column 3: Live Flow Output & Video Upload Panel (400px) */}
            <div className="w-[400px] bg-zinc-950 p-5 flex flex-col space-y-4 shrink-0 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  Pronto para o Google Flow
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-mono border border-emerald-500/20">
                  Consistente
                </span>
              </div>

              {/* Uploaded Video/Image Display Section (User generated in Google Flow) */}
              <div className="space-y-2 p-3 bg-zinc-900/60 rounded-xl border border-zinc-800">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-emerald-400" />
                    Mídia Gerada no Google Flow
                  </label>
                  {activeShot.mediaUrl && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(activeShot.id)}
                      className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                      Remover
                    </button>
                  )}
                </div>

                {activeShot.mediaUrl ? (
                  <div className="w-full h-40 rounded-lg overflow-hidden border border-zinc-700 bg-black flex items-center justify-center">
                    {activeShot.mediaType === 'video' ? (
                      <video 
                        src={activeShot.mediaUrl} 
                        controls 
                        loop 
                        autoPlay 
                        className="w-full h-full object-contain" 
                      />
                    ) : (
                      <img 
                        src={activeShot.mediaUrl} 
                        alt="Preview Flow" 
                        className="w-full h-full object-contain" 
                      />
                    )}
                  </div>
                ) : (
                  <label className="w-full h-24 border-2 border-dashed border-zinc-800 hover:border-emerald-500/50 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all bg-zinc-950/40 p-2 text-center group">
                    <Upload className="w-5 h-5 text-zinc-500 group-hover:text-emerald-400 mb-1" />
                    <span className="text-[11px] text-zinc-400 group-hover:text-zinc-200 font-medium">
                      Clique para enviar o vídeo/imagem gerado no Flow
                    </span>
                    <span className="text-[10px] text-zinc-600">MP4, WebM, PNG ou JPG</span>
                    <input 
                      type="file" 
                      accept="video/*,image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleUploadMedia(activeShot.id, e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Warnings Box */}
              {compilationResult.warnings.length > 0 && (
                <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-800/60 space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-300 text-[11px] font-bold">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Proteção de Identidade Ativa
                  </div>
                  {compilationResult.warnings.map((w, idx) => (
                    <p key={idx} className="text-[10px] text-amber-200/90 leading-tight">
                      • {w}
                    </p>
                  ))}
                </div>
              )}

              {/* Attached References required */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-400 block">
                  Fotos para Anexar no Flow:
                </label>
                <div className="flex flex-wrap gap-1">
                  {compilationResult.attachedReferences.map((ref) => (
                    <span
                      key={ref}
                      className="px-2 py-0.5 rounded bg-zinc-900 border border-emerald-500/40 text-emerald-300 text-[11px] font-mono"
                    >
                      {ref}
                    </span>
                  ))}
                </div>
              </div>

              {/* Prompt Output */}
              <div className="flex-1 flex flex-col min-h-0 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-zinc-400">Prompt Montado (Inglês):</label>
                  <button
                    onClick={handleCopyPrompt}
                    className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-bold"
                  >
                    {copiedPrompt ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedPrompt ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
                <div className="flex-1 p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-200 leading-relaxed overflow-y-auto select-all max-h-48">
                  {compilationResult.finalPrompt}
                </div>
              </div>

              {/* Negative Prompt */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-zinc-400">Prompt Negativo:</label>
                  <button
                    onClick={handleCopyNeg}
                    className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white font-medium"
                  >
                    {copiedNeg ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedNeg ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
                <div className="p-2 bg-zinc-900/60 border border-zinc-800 rounded-xl text-[11px] font-mono text-zinc-400 leading-normal select-all">
                  {compilationResult.negativePrompt}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
