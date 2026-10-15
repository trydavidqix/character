import React, { useState, useMemo } from 'react';
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
  Download 
} from 'lucide-react';
import { CharacterSheet, SceneShot } from './core/types';
import { defaultCharacters } from './core/defaultCharacters';
import { compileScenePrompt } from './core/promptCompiler';

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
  
  const [shots, setShots] = useState<SceneShot[]>(initialShots);
  const [selectedShotId, setSelectedShotId] = useState<string>(initialShots[0].id);

  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedNeg, setCopiedNeg] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  // Chat State for Character.ai Simulator
  const selectedCharacter = useMemo(() => {
    return characters.find(c => c.id === selectedCharId) || characters[0];
  }, [characters, selectedCharId]);

  const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'char'; text: string }[]>([
    { sender: 'char', text: selectedCharacter.greeting || 'Olá! Pronta para planejar nossa próxima cena?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [newForbiddenTag, setNewForbiddenTag] = useState('');

  const activeShot = useMemo(() => {
    return shots.find(s => s.id === selectedShotId) || shots[0];
  }, [shots, selectedShotId]);

  // Live Compiled Result from the Consistency Engine
  const compilationResult = useMemo(() => {
    return compileScenePrompt(selectedCharacter, activeShot);
  }, [selectedCharacter, activeShot]);

  // Voice synthesis (Web Speech API)
  const handleSpeak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
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
    setChatMessages(updated);
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
        const reply = data.reply || 'Entendido! Vamos em frente.';
        setChatMessages(prev => [...prev, { sender: 'char' as const, text: reply }]);
        handleSpeak(reply);
      } else {
        throw new Error('Bridge error');
      }
    } catch {
      // Local fallback if bridge is offline
      let reply = `Entendido! Para manter a fidelidade visual, vou me ater aos traços de ${selectedCharacter.name}.`;
      if (userText.toLowerCase().includes('luz') || userText.toLowerCase().includes('sol')) {
        reply = 'A iluminação forte a 45º dá um contraste fantástico, destacando as sombras naturais sem perder textura!';
      } else if (userText.toLowerCase().includes('roupa') || userText.toLowerCase().includes('estilo')) {
        reply = 'Aprovado! Peças de linho e tons neutros funcionam muito bem com os tons quentes das nossas referências.';
      } else if (userText.toLowerCase().includes('cena')) {
        reply = 'Perfeito. Ajuste o enquadramento no Canvas e copie o prompt formatado em inglês para o Flow!';
      }
      setChatMessages(prev => [...prev, { sender: 'char' as const, text: reply }]);
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
      title: `Nova Cena ${shots.length + 1}`,
      framing: 'Medium waist-up shot',
      cameraAngle: 'Eye level, looking straight to lens',
      lighting: 'Warm cinematic sunset light',
      environment: 'Architectural outdoor terrace',
      action: 'Natural posture facing camera',
      aspectRatio: '9:16',
    };
    setShots([...shots, newShot]);
    setSelectedShotId(newId);
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="h-16 border-b border-zinc-800 bg-zinc-900/90 px-6 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Sparkles className="w-5 h-5 text-zinc-950 font-bold" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              Character & Buzzy Studio
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/30">
                v1.0 Cloud
              </span>
            </h1>
            <p className="text-xs text-zinc-400">Motor de consistência idêntica para Google Flow & Nano Banana</p>
          </div>
        </div>

        {/* Character Selector & Mode Switch */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-zinc-800 rounded-lg p-1 border border-zinc-700">
            <button
              onClick={() => setActiveTab('character')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'character'
                  ? 'bg-zinc-700 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <User className="w-3.5 h-3.5 text-emerald-400" />
              Character Lab
            </button>
            <button
              onClick={() => setActiveTab('canvas')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'canvas'
                  ? 'bg-zinc-700 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Film className="w-3.5 h-3.5 text-emerald-400" />
              Scene Canvas
            </button>
          </div>

          {/* Character Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">Personagem:</span>
            <select
              value={selectedCharId}
              onChange={(e) => {
                setSelectedCharId(e.target.value);
                const char = characters.find(c => c.id === e.target.value);
                if (char) {
                  setChatMessages([{ sender: 'char', text: char.greeting || 'Olá!' }]);
                }
              }}
              className="bg-zinc-800 text-xs font-semibold text-zinc-200 px-3 py-1.5 rounded-lg border border-zinc-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {characters.map(char => (
                <option key={char.id} value={char.id}>{char.name} ({char.gender === 'f' ? 'F' : 'M'})</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExportCharacter}
            title="Exportar Character Card JSON"
            className="p-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-300 transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden flex">
        {activeTab === 'character' ? (
          /* ================= CHARACTER LAB TAB (Character.ai) ================= */
          <div className="flex-1 grid grid-cols-12 overflow-y-auto">
            {/* Left: Persona Definition Sheet */}
            <div className="col-span-7 border-r border-zinc-800 p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <User className="w-5 h-5 text-emerald-400" />
                    Ficha de Identidade do Personagem
                  </h2>
                  <p className="text-xs text-zinc-400">Regras imutáveis que garantem que o rosto e os traços nunca mudem.</p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300">
                  ID: <code className="text-emerald-400 font-mono">{selectedCharacter.id}</code>
                </span>
              </div>

              {/* Anchor and Identity */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Âncora de Citação (howToCite) — Em Inglês
                  </label>
                  <p className="text-xs text-zinc-500 mb-1">Injetada obrigatoriamente para forçar o gerador a usar o rosto das referências.</p>
                  <input
                    type="text"
                    value={selectedCharacter.howToCite}
                    onChange={(e) => {
                      const updated = characters.map(c => c.id === selectedCharacter.id ? { ...c, howToCite: e.target.value } : c);
                      setCharacters(updated);
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Bloco de Acessórios & Identidade Fixa (identityBlockEn)
                  </label>
                  <textarea
                    rows={2}
                    value={selectedCharacter.identityBlockEn}
                    onChange={(e) => {
                      const updated = characters.map(c => c.id === selectedCharacter.id ? { ...c, identityBlockEn: e.target.value } : c);
                      setCharacters(updated);
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                {/* Fixed Traits Grid */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2 block">
                    Traços Físicos Fixos
                  </label>
                  <div className="grid grid-cols-2 gap-3 bg-zinc-900/60 p-4 rounded-xl border border-zinc-800/80">
                    {Object.entries(selectedCharacter.fixedTraits).map(([key, val]) => (
                      <div key={key} className="space-y-1">
                        <span className="text-[11px] font-mono uppercase text-emerald-400">{key}:</span>
                        <p className="text-xs text-zinc-300 font-medium">{val}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Forbidden Words Badges */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center justify-between mb-1">
                    <span>Palavras e Traços Proibidos ({selectedCharacter.forbiddenWords.length})</span>
                    <span className="text-[11px] text-zinc-500 font-normal">Pressione Enter para adicionar</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl min-h-[80px]">
                    {selectedCharacter.forbiddenWords.map(word => (
                      <span
                        key={word}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-950/40 text-red-300 border border-red-900/50 text-xs font-mono"
                      >
                        {word}
                        <button
                          type="button"
                          onClick={() => handleRemoveForbidden(word)}
                          className="hover:text-red-100"
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
                      className="bg-transparent text-xs text-zinc-200 px-2 py-1 focus:outline-none placeholder:text-zinc-600"
                    />
                  </div>
                </div>

                {/* Standard Reference Images Checklist */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1 block">
                    Arquivos de Referência Mestre Obrigatórios
                  </label>
                  <div className="flex gap-2">
                    {selectedCharacter.standardReferences.map(ref => (
                      <div key={ref} className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700/80 text-xs font-mono text-zinc-200 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        {ref}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Persona Dialogue Simulator */}
            <div className="col-span-5 flex flex-col bg-zinc-950/50 p-6">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-xs">
                    {selectedCharacter.name[0]}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{selectedCharacter.name}</h3>
                    <p className="text-[11px] text-zinc-400">{selectedCharacter.personality}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleSpeak(chatMessages[chatMessages.length - 1]?.text || '')}
                  className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white"
                  title="Ouvir voz da persona"
                >
                  {isSpeaking ? <VolumeX className="w-4 h-4 text-emerald-400" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>

              {/* Message List */}
              <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-2">
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-emerald-600 text-white rounded-br-none'
                          : 'bg-zinc-800/90 text-zinc-200 border border-zinc-700/60 rounded-bl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isThinking && (
                  <div className="flex flex-col items-start">
                    <div className="bg-zinc-800/80 border border-emerald-500/30 rounded-2xl px-4 py-2 text-xs text-emerald-400 flex items-center gap-2 animate-pulse">
                      <Sparkles className="w-3.5 h-3.5 animate-spin" />
                      {selectedCharacter.name} está pensando via AGY...
                    </div>
                  </div>
                )}
              </div>

              {/* Input Form */}
              <form onSubmit={handleSendMessage} className="mt-auto pt-3 border-t border-zinc-800 flex gap-2">
                <input
                  type="text"
                  placeholder={`Converse com ${selectedCharacter.name} sobre as cenas...`}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 placeholder:text-zinc-600"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-xl flex items-center justify-center transition-all shadow-md shadow-emerald-600/20"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* ================= SCENE & CANVAS STUDIO TAB (Buzzy.now) ================= */
          <div className="flex-1 grid grid-cols-12 overflow-hidden">
            {/* Left 4 cols: Storyboard Graph / Shot List */}
            <div className="col-span-3 border-r border-zinc-800 bg-zinc-900/40 p-5 flex flex-col space-y-4 overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  Storyboard de Tomadas
                </h3>
                <button
                  onClick={handleAddShot}
                  className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-md border border-emerald-500/30 text-xs flex items-center gap-1 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nova
                </button>
              </div>

              {/* Shot Cards */}
              <div className="space-y-2.5">
                {shots.map((shot, idx) => (
                  <div
                    key={shot.id}
                    onClick={() => setSelectedShotId(shot.id)}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                      selectedShotId === shot.id
                        ? 'bg-zinc-800/90 border-emerald-500/80 shadow-md shadow-emerald-500/5'
                        : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-mono text-emerald-400">#0{idx + 1}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-400 font-mono">
                        {shot.aspectRatio}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-white truncate">{shot.title}</h4>
                    <p className="text-[11px] text-zinc-400 truncate mt-1">{shot.framing}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Middle 5 cols: Scene Director & Parameters */}
            <div className="col-span-5 border-r border-zinc-800 p-6 overflow-y-auto space-y-5">
              <div className="border-b border-zinc-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  Direção da Tomada Atual
                </h3>
                <p className="text-xs text-zinc-400">Ajuste os parâmetros visuais da câmera e iluminação.</p>
              </div>

              {/* Title & Aspect Ratio */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-zinc-400 font-medium mb-1 block">Título da Tomada</label>
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
                <div>
                  <label className="text-xs text-zinc-400 font-medium mb-1 block">Proporção</label>
                  <select
                    value={activeShot.aspectRatio}
                    onChange={(e) => {
                      const updated = shots.map(s => s.id === activeShot.id ? { ...s, aspectRatio: e.target.value as any } : s);
                      setShots(updated);
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="9:16">9:16 (Stories/Reels)</option>
                    <option value="16:9">16:9 (Cinema)</option>
                    <option value="2:3">2:3 (Editorial)</option>
                    <option value="1:1">1:1 (Quadrado)</option>
                  </select>
                </div>
              </div>

              {/* Framing Preset / Input */}
              <div>
                <label className="text-xs text-zinc-400 font-medium mb-1 block">Enquadramento (Framing)</label>
                <input
                  type="text"
                  value={activeShot.framing}
                  onChange={(e) => {
                    const updated = shots.map(s => s.id === activeShot.id ? { ...s, framing: e.target.value } : s);
                    setShots(updated);
                  }}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Camera Angle */}
              <div>
                <label className="text-xs text-zinc-400 font-medium mb-1 block">Ângulo e Posição da Câmera</label>
                <input
                  type="text"
                  value={activeShot.cameraAngle}
                  onChange={(e) => {
                    const updated = shots.map(s => s.id === activeShot.id ? { ...s, cameraAngle: e.target.value } : s);
                    setShots(updated);
                  }}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Lighting */}
              <div>
                <label className="text-xs text-zinc-400 font-medium mb-1 block">Iluminação (Lighting & Contrast)</label>
                <input
                  type="text"
                  value={activeShot.lighting}
                  onChange={(e) => {
                    const updated = shots.map(s => s.id === activeShot.id ? { ...s, lighting: e.target.value } : s);
                    setShots(updated);
                  }}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Environment */}
              <div>
                <label className="text-xs text-zinc-400 font-medium mb-1 block">Cenário / Ambiente (Environment)</label>
                <textarea
                  rows={2}
                  value={activeShot.environment}
                  onChange={(e) => {
                    const updated = shots.map(s => s.id === activeShot.id ? { ...s, environment: e.target.value } : s);
                    setShots(updated);
                  }}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Action and Attire */}
              <div>
                <label className="text-xs text-zinc-400 font-medium mb-1 block">Vestimenta & Pose da Ação</label>
                <textarea
                  rows={2}
                  value={activeShot.action}
                  onChange={(e) => {
                    const updated = shots.map(s => s.id === activeShot.id ? { ...s, action: e.target.value } : s);
                    setShots(updated);
                  }}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Right 4 cols: Live Flow/Nano Banana Output */}
            <div className="col-span-4 bg-zinc-950 p-6 flex flex-col space-y-4 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  Saída Pronta para o Flow
                </h3>
                <span className="text-[11px] text-zinc-500 font-mono">100% Consistente</span>
              </div>

              {/* Warnings & Sanitization Alerts */}
              {compilationResult.warnings.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-300 text-xs font-bold">
                    <ShieldAlert className="w-4 h-4" />
                    Auditoria de Consistência
                  </div>
                  {compilationResult.warnings.map((w, idx) => (
                    <p key={idx} className="text-[11px] text-amber-200/90 leading-tight">
                      • {w}
                    </p>
                  ))}
                </div>
              )}

              {/* Attached References required */}
              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1.5">
                  Imagens de Referência para Anexar:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {compilationResult.attachedReferences.map((ref) => (
                    <span
                      key={ref}
                      className="px-2.5 py-1 rounded-md bg-zinc-900 border border-emerald-500/40 text-emerald-300 text-xs font-mono"
                    >
                      {ref}
                    </span>
                  ))}
                </div>
              </div>

              {/* Final Prompt Box */}
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-zinc-400">Prompt Formatado (Inglês):</label>
                  <button
                    onClick={handleCopyPrompt}
                    className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                  >
                    {copiedPrompt ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedPrompt ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-200 leading-relaxed overflow-y-auto max-h-52 select-all">
                  {compilationResult.finalPrompt}
                </div>
              </div>

              {/* Negative Prompt Box */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-zinc-400">Prompt Negativo:</label>
                  <button
                    onClick={handleCopyNeg}
                    className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 font-medium"
                  >
                    {copiedNeg ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedNeg ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
                <div className="p-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-400 leading-normal select-all">
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
