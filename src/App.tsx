import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Camera, 
  Plus, 
  Download, 
  RefreshCw, 
  Trash2, 
  CheckCircle2, 
  Upload, 
  Video, 
  Sliders, 
  Network, 
  Music, 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  Wand2, 
  Edit3, 
  X
} from 'lucide-react';
import { CharacterSheet, SceneShot, SkillWorkflowType } from './core/types';
import { defaultCharacters } from './core/defaultCharacters';
import { compileScenePrompt } from './core/promptCompiler';
import { exportProjectJson, exportFlowPromptsText, parseProjectJson } from './core/projectExporter';
import { buzzyWorkflowTemplates, BuzzyTemplate } from './core/buzzyTemplates';
import SceneCanvas from './components/SceneCanvas';
import TimelinePlayer from './components/TimelinePlayer';

// Chat message interface with Character.ai swipe support
export interface ChatMessage {
  id: string;
  sender: 'user' | 'char';
  text: string;
  alternatives?: string[];
  activeAltIndex?: number;
}

// Buzzy Camera Movements (Buzzy Pro Motion Engine)
export const buzzyCameraMovements = [
  'Static / None',
  'Dolly In (Push forward)',
  'Dolly Out (Pull back)',
  'Orbit 360 (Circular rotation)',
  'FPV Drone (Dynamic flythrough)',
  'Low-Angle Hero (Upward power shot)',
  'Cinematic Pan (Smooth lateral sweep)',
  'Crane / Boom Down (High to eye-level)',
  'Handheld Documentary (Realistic shake)',
];

// Buzzy Pre-built Skills
export const buzzySkillsList: { id: SkillWorkflowType; label: string; icon: string; desc: string }[] = [
  { id: 'film', label: 'AI Film', icon: '🎬', desc: 'Cinematic storytelling, 35mm filmic lighting, master color grading' },
  { id: 'ads', label: 'AI Ads', icon: '📢', desc: 'High-conversion viral commercial hooks, vibrant studio marketing aesthetic' },
  { id: 'animation', label: 'AI Animation', icon: '✨', desc: 'Expressive anime dynamics, cel-shaded rendering, vibrant keyframes' },
  { id: 'custom', label: 'Custom', icon: '⚙️', desc: 'Full manual control over scene framing and aesthetics' },
];

const initialShots: SceneShot[] = [
  {
    id: 'shot-1',
    title: 'Historic Limestone Portrait',
    framing: 'A medium close-up, waist-up portrait',
    cameraAngle: 'chest facing camera, head turned forty-five degrees to the right',
    cameraMovement: 'Dolly In (Push forward)',
    skillWorkflow: 'film',
    lighting: 'bright single-source direct hard sunlight at 45-degree angle casting harsh deep black shadows with specular highlights',
    environment: 'warm light beige raw-cut limestone environment with a massive rough-pitted carved stone pillar base on the right and weathered facade on the left',
    action: 'wearing an off-white wrinkly linen shirt deeply unbuttoned with a thin gold chain, relaxed posture, confident guarded expression',
    dialogueLine: 'We have to capture this light before the sun dips behind the facade.',
    aspectRatio: '16:9',
  },
  {
    id: 'shot-2',
    title: 'Poolside Sunset Glow',
    framing: 'Medium portrait framing from chest up',
    cameraAngle: 'three-quarter view looking slightly away from lens',
    cameraMovement: 'Cinematic Pan (Smooth lateral sweep)',
    skillWorkflow: 'film',
    lighting: 'warm golden hour sun low on horizon, gentle rim light illuminating hair waves',
    environment: 'luxury outdoor infinity pool edge overlooking distant terracotta tiled villas',
    action: 'natural spontaneous gentle smile, arms leaning on stone pool railing, wind blowing loose strands of hair',
    dialogueLine: 'The contrast right here is completely unmatched.',
    aspectRatio: '9:16',
  },
  {
    id: 'shot-3',
    title: 'Commercial Studio Focus',
    framing: 'Close-up headshot tack sharp on eyes and accessories',
    cameraAngle: 'straight on at eye level',
    cameraMovement: 'Orbit 360 (Circular rotation)',
    skillWorkflow: 'ads',
    lighting: 'dramatic split studio lighting with high contrast and deep shadows',
    environment: 'neutral textured charcoal grey matte backdrop',
    action: 'direct piercing gaze into camera lens, composed neutral expression with subtle poise',
    dialogueLine: 'Check the link below to experience the full workflow.',
    aspectRatio: '1:1',
  }
];

// Rich dialogue renderer separating *actions* from spoken lines (Character.ai style)
function FormattedDialogueText({ text }: { text: string }) {
  const parts = text.split(/(\*[^*]+\*)/g);
  return (
    <div className="leading-relaxed whitespace-pre-wrap">
      {parts.map((part, i) => {
        if (part.startsWith('*') && part.endsWith('*')) {
          const actionText = part.slice(1, -1);
          return (
            <span 
              key={i} 
              className="inline-block text-emerald-400 italic bg-emerald-950/40 border border-emerald-800/40 px-1.5 py-0.5 rounded text-[11px] font-medium mx-0.5"
            >
              *{actionText}*
            </span>
          );
        }
        return <span key={i} className="text-zinc-100">{part}</span>;
      })}
    </div>
  );
}

export default function App() {
  const [characters, setCharacters] = useState<CharacterSheet[]>(defaultCharacters);
  const [selectedCharId, setSelectedCharId] = useState<string>('megalina');
  const [activeTab, setActiveTab] = useState<'character' | 'canvas'>('canvas');
  const [canvasViewMode, setCanvasViewMode] = useState<'graph' | 'director'>('graph');
  
  const [shots, setShots] = useState<SceneShot[]>(initialShots);
  const [selectedShotId, setSelectedShotId] = useState<string>(initialShots[0].id);
  const [selectedShotIds, setSelectedShotIds] = useState<string[]>([initialShots[0].id]);

  // Buzzy Skills Workflow filter
  const [activeSkillFilter, setActiveSkillFilter] = useState<SkillWorkflowType | 'all'>('all');
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);

  // Character.ai Persona Editor modal
  const [isCharacterEditorOpen, setIsCharacterEditorOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<CharacterSheet>(defaultCharacters[0]);

  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedNeg, setCopiedNeg] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);

  // Streaming Typewriter state (Character.ai style)
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Voice Settings for Character.ai
  const [voicePitch, setVoicePitch] = useState<number>(1.0);
  const [voiceRate, setVoiceRate] = useState<number>(1.0);

  // Selected Character
  const selectedCharacter = useMemo(() => {
    return characters.find(c => c.id === selectedCharId) || characters[0];
  }, [characters, selectedCharId]);

  // Persistent Chat History per Character (LocalStorage) with Swipe support
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [newForbiddenTag, setNewForbiddenTag] = useState('');

  // Auto-scroll chat to bottom on new messages or streaming tokens
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, streamingText]);

  // Load chat history from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem(`char_chat_${selectedCharId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Normalize messages to ChatMessage interface
        const normalized: ChatMessage[] = parsed.map((m: any, idx: number) => ({
          id: m.id || `msg-${idx}-${Date.now()}`,
          sender: m.sender || 'char',
          text: m.text || '',
          alternatives: m.alternatives || [m.text || ''],
          activeAltIndex: m.activeAltIndex || 0,
        }));
        setChatMessages(normalized);
      } catch {
        setChatMessages([{
          id: `msg-${Date.now()}`,
          sender: 'char',
          text: selectedCharacter.greeting || 'Hello! Ready to shoot the next scene?',
          alternatives: [selectedCharacter.greeting || 'Hello! Ready to shoot the next scene?'],
          activeAltIndex: 0,
        }]);
      }
    } else {
      setChatMessages([{
        id: `msg-${Date.now()}`,
        sender: 'char',
        text: selectedCharacter.greeting || 'Hello! Ready to plan our next cinematic storyboard?',
        alternatives: [selectedCharacter.greeting || 'Hello! Ready to plan our next cinematic storyboard?'],
        activeAltIndex: 0,
      }]);
    }
    if (selectedCharacter.voicePitch) setVoicePitch(selectedCharacter.voicePitch);
    if (selectedCharacter.voiceRate) setVoiceRate(selectedCharacter.voiceRate);
  }, [selectedCharId, selectedCharacter.greeting, selectedCharacter.voicePitch, selectedCharacter.voiceRate]);

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
  const updateChat = (newMsgs: ChatMessage[]) => {
    setChatMessages(newMsgs);
    localStorage.setItem(`char_chat_${selectedCharId}`, JSON.stringify(newMsgs));
  };

  const activeShot = useMemo(() => {
    return shots.find(s => s.id === selectedShotId) || shots[0] || initialShots[0];
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

    const cleanText = text.replace(/\*(.*?)\*/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.pitch = voicePitch;
    utterance.rate = voiceRate;
    utterance.lang = 'en-US';

    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en') && (selectedCharacter.gender === 'f' ? v.name.includes('Female') || v.name.includes('Zira') || v.name.includes('Samantha') : true));
    if (englishVoice) utterance.voice = englishVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // Typewriter streaming effect for Character.ai dialogue
  const streamResponse = (fullText: string, messageId: string) => {
    setIsStreaming(true);
    setStreamingText('');
    let currentIdx = 0;
    const interval = setInterval(() => {
      currentIdx += 2;
      if (currentIdx >= fullText.length) {
        clearInterval(interval);
        setStreamingText(null);
        setIsStreaming(false);
        setChatMessages(prev => {
          const next = prev.map(m => m.id === messageId ? { ...m, text: fullText } : m);
          localStorage.setItem(`char_chat_${selectedCharId}`, JSON.stringify(next));
          return next;
        });
      } else {
        setStreamingText(fullText.slice(0, currentIdx));
      }
    }, 18);
  };

  // Send message to Character dialogue server (or local persona generator)
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || isThinking || isStreaming) return;

    const userText = chatInput.trim();
    setChatInput('');

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userText,
    };

    const nextMessages = [...chatMessages, userMessage];
    updateChat(nextMessages);
    setIsThinking(true);

    try {
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character: selectedCharacter,
          messages: nextMessages.map(m => ({ sender: m.sender, text: m.text })),
          prompt: userText,
        }),
      });

      if (!response.ok) throw new Error('Bridge offline');
      const data = await response.json();
      const botReply = data.reply || selectedCharacter.greeting || 'Ready for the next shot!';

      const botMessageId = `char-${Date.now()}`;
      const newBotMsg: ChatMessage = {
        id: botMessageId,
        sender: 'char',
        text: '',
        alternatives: [botReply],
        activeAltIndex: 0,
      };

      updateChat([...nextMessages, newBotMsg]);
      setIsThinking(false);
      streamResponse(botReply, botMessageId);
    } catch {
      // Local fallback with roleplay actions and natural speech
      const fallbackOptions = [
        `*adjusts the collar and looks at the camera* We should definitely use directional 45-degree sunlight here for maximum facial sharpness.`,
        `*checks the viewfinder with a focused smile* The 35mm filmic depth of field will keep our facial features crisp while softening the background.`,
        `*points toward the courtyard* Let's anchor the shot with a slow Dolly In to build suspense and dramatic focus.`
      ];
      const botReply = fallbackOptions[Math.floor(Math.random() * fallbackOptions.length)];
      const botMessageId = `char-${Date.now()}`;
      const newBotMsg: ChatMessage = {
        id: botMessageId,
        sender: 'char',
        text: '',
        alternatives: fallbackOptions,
        activeAltIndex: 0,
      };

      updateChat([...nextMessages, newBotMsg]);
      setIsThinking(false);
      streamResponse(botReply, botMessageId);
    }
  };

  // Character.ai Swipe Mechanism: Swipe between alternative replies
  const handleSwipeAlternative = (messageId: string, direction: 'prev' | 'next') => {
    setChatMessages(prev => {
      const updated = prev.map(m => {
        if (m.id !== messageId || !m.alternatives || m.alternatives.length === 0) return m;
        const total = m.alternatives.length;
        let nextIndex = (m.activeAltIndex || 0) + (direction === 'next' ? 1 : -1);
        if (nextIndex < 0) nextIndex = total - 1;
        if (nextIndex >= total) nextIndex = 0;
        return {
          ...m,
          activeAltIndex: nextIndex,
          text: m.alternatives[nextIndex],
        };
      });
      localStorage.setItem(`char_chat_${selectedCharId}`, JSON.stringify(updated));
      return updated;
    });
  };

  // Character.ai Dialogue to Buzzy Scene Shot Bridge: Create card from spoken line
  const handleAddShotFromDialogue = (dialogueText: string) => {
    const actionMatch = dialogueText.match(/\*(.*?)\*/);
    const actionText = actionMatch ? actionMatch[1].trim() : 'delivering dialogue with expressive emotion';
    const cleanDialogue = dialogueText.replace(/\*(.*?)\*/g, '').trim();

    const newShot: SceneShot = {
      id: `shot-${Date.now()}`,
      title: `${selectedCharacter.name}: Scene ${shots.length + 1}`,
      framing: 'A medium close-up, chest-up portrait',
      cameraAngle: 'straight on eye level with crisp focus on subject',
      cameraMovement: 'Dolly In (Push forward)',
      skillWorkflow: 'film',
      lighting: activeShot.lighting || 'bright single-source direct sunlight casting sharp shadows',
      environment: activeShot.environment || 'historic limestone architecture with clean lighting',
      action: actionText,
      dialogueLine: cleanDialogue,
      aspectRatio: activeShot.aspectRatio || '16:9',
    };

    setShots(prev => [...prev, newShot]);
    setSelectedShotId(newShot.id);
    setSelectedShotIds([newShot.id]);
    setActiveTab('canvas');
  };

  // Load Buzzy Pre-built Storyboard Template
  const handleLoadBuzzyTemplate = (template: BuzzyTemplate) => {
    const newShots: SceneShot[] = template.shots.map((s, idx) => ({
      ...s,
      id: `shot-${Date.now()}-${idx}`,
    }));
    setShots(newShots);
    setSelectedShotId(newShots[0].id);
    setSelectedShotIds([newShots[0].id]);
    setIsTemplateMenuOpen(false);
  };

  // Copy Prompt
  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(compilationResult.finalPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  // Copy Negative Prompt
  const handleCopyNeg = () => {
    navigator.clipboard.writeText(compilationResult.negativePrompt);
    setCopiedNeg(true);
    setTimeout(() => setCopiedNeg(false), 2000);
  };

  // Selection toggles
  const handleSelectShot = (id: string) => {
    setSelectedShotId(id);
    setSelectedShotIds([id]);
  };

  const handleToggleSelectShot = (id: string) => {
    setSelectedShotIds(prev => {
      const alreadySelected = prev.includes(id);
      if (alreadySelected) {
        if (prev.length === 1) return prev;
        const next = prev.filter(x => x !== id);
        if (selectedShotId === id && next.length > 0) {
          setSelectedShotId(next[0]);
        }
        return next;
      } else {
        setSelectedShotId(id);
        return [...prev, id];
      }
    });
  };

  const handleRangeSelectShot = (targetId: string) => {
    const currentIndex = shots.findIndex(s => s.id === selectedShotId);
    const targetIndex = shots.findIndex(s => s.id === targetId);
    if (currentIndex === -1 || targetIndex === -1) {
      handleSelectShot(targetId);
      return;
    }
    const start = Math.min(currentIndex, targetIndex);
    const end = Math.max(currentIndex, targetIndex);
    const rangeIds = shots.slice(start, end + 1).map(s => s.id);
    setSelectedShotIds(Array.from(new Set([...selectedShotIds, ...rangeIds])));
    setSelectedShotId(targetId);
  };

  const toggleSelectAll = () => {
    if (selectedShotIds.length === shots.length && shots.length > 0) {
      setSelectedShotIds([selectedShotId]);
    } else {
      setSelectedShotIds(shots.map(s => s.id));
    }
  };

  // Add new shot
  const handleAddShot = () => {
    const newId = `shot-${Date.now()}`;
    const newShot: SceneShot = {
      id: newId,
      title: `Scene ${shots.length + 1}`,
      framing: 'Medium close-up, chest-up framing',
      cameraAngle: 'three-quarter view facing camera',
      cameraMovement: 'Cinematic Pan (Smooth lateral sweep)',
      skillWorkflow: activeSkillFilter !== 'all' ? activeSkillFilter : 'film',
      lighting: 'soft natural daylight with gentle rim light',
      environment: 'outdoor terrace overlooking architectural landscape',
      action: 'standing poised with natural confident expression',
      aspectRatio: activeShot.aspectRatio || '16:9',
    };
    setShots(prev => [...prev, newShot]);
    setSelectedShotId(newId);
    setSelectedShotIds([newId]);
  };

  // Delete shot
  const handleDeleteShot = (id: string) => {
    if (shots.length <= 1) return;
    const remaining = shots.filter(s => s.id !== id);
    setShots(remaining);
    setSelectedShotIds(prev => prev.filter(x => x !== id));
    if (selectedShotId === id) {
      setSelectedShotId(remaining[0].id);
      if (!selectedShotIds.includes(remaining[0].id)) {
        setSelectedShotIds([remaining[0].id]);
      }
    }
  };

  // Delete multiple selected shots
  const handleDeleteSelected = () => {
    if (shots.length <= 1 || selectedShotIds.length === 0) return;
    const remaining = shots.filter(s => !selectedShotIds.includes(s.id));
    if (remaining.length === 0) {
      const fallback = shots.find(s => !selectedShotIds.includes(s.id)) || shots[0];
      setShots([fallback]);
      setSelectedShotId(fallback.id);
      setSelectedShotIds([fallback.id]);
    } else {
      setShots(remaining);
      setSelectedShotId(remaining[0].id);
      setSelectedShotIds([remaining[0].id]);
    }
  };

  // Media upload handlers
  const handleUploadMedia = (shotId: string, file: File) => {
    const objectUrl = URL.createObjectURL(file);
    const mediaType = file.type.startsWith('video') ? 'video' : 'image';
    setShots(prev => prev.map(s => s.id === shotId ? { ...s, mediaUrl: objectUrl, mediaType } : s));
  };

  const handleRemoveMedia = (shotId: string) => {
    setShots(prev => prev.map(s => s.id === shotId ? { ...s, mediaUrl: undefined, mediaType: undefined } : s));
  };

  const handleUploadAudio = (shotId: string, file: File) => {
    const objectUrl = URL.createObjectURL(file);
    setShots(prev => prev.map(s => s.id === shotId ? { ...s, audioUrl: objectUrl, audioName: file.name } : s));
  };

  const handleRemoveAudio = (shotId: string) => {
    setShots(prev => prev.map(s => s.id === shotId ? { ...s, audioUrl: undefined, audioName: undefined } : s));
  };

  // Project Import/Export
  const handleImportProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = parseProjectJson(event.target?.result as string);
        if (parsed.shots && parsed.shots.length > 0) {
          setShots(parsed.shots);
          setSelectedShotId(parsed.shots[0].id);
          setSelectedShotIds([parsed.shots[0].id]);
        }
        if (parsed.character) {
          setCharacters(prev => {
            const exists = prev.some(c => c.id === parsed.character!.id);
            return exists ? prev.map(c => c.id === parsed.character!.id ? parsed.character! : c) : [...prev, parsed.character!];
          });
          setSelectedCharId(parsed.character.id);
        }
      } catch (err: any) {
        alert(`Error importing project: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleExportFlowPrompts = () => {
    const compiledMap: Record<string, string> = {};
    shots.forEach(s => {
      compiledMap[s.id] = compileScenePrompt(selectedCharacter, s).finalPrompt;
    });
    exportFlowPromptsText(selectedCharacter, shots, compiledMap);
  };

  // Add/remove forbidden words
  const handleAddForbidden = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newForbiddenTag.trim()) {
      e.preventDefault();
      const tag = newForbiddenTag.trim().toLowerCase();
      if (!selectedCharacter.forbiddenWords.includes(tag)) {
        const updated = characters.map(c => c.id === selectedCharacter.id ? { ...c, forbiddenWords: [...c.forbiddenWords, tag] } : c);
        setCharacters(updated);
      }
      setNewForbiddenTag('');
    }
  };

  const handleRemoveForbidden = (tag: string) => {
    const updated = characters.map(c => c.id === selectedCharacter.id ? { ...c, forbiddenWords: c.forbiddenWords.filter(w => w !== tag) } : c);
    setCharacters(updated);
  };

  // Character Editor Save
  const handleSaveCharacter = () => {
    setCharacters(prev => prev.map(c => c.id === editingCharacter.id ? editingCharacter : c));
    setIsCharacterEditorOpen(false);
  };

  // Filtered shots for display
  const displayedShots = useMemo(() => {
    if (activeSkillFilter === 'all') return shots;
    return shots.filter(s => s.skillWorkflow === activeSkillFilter);
  }, [shots, activeSkillFilter]);

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 select-none overflow-hidden font-sans">
      {/* Top Header Bar */}
      <header className="h-14 border-b border-zinc-800 bg-zinc-950/90 px-5 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-black text-black text-sm shadow-lg shadow-emerald-500/20">
            A
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              Antigravity Studio
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono border border-emerald-500/20">
                Buzzy + Character.ai Engine
              </span>
            </h1>
            <p className="text-[11px] text-zinc-400 hidden sm:block">
              Zero-Hardware Cloud Consistency for Google Flow
            </p>
          </div>
        </div>

        {/* Studio Navigation Tabs */}
        <div className="flex bg-zinc-900/90 p-1 rounded-xl border border-zinc-800">
          <button
            onClick={() => setActiveTab('character')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'character'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Character Lab (Character.ai)
          </button>
          <button
            onClick={() => setActiveTab('canvas')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'canvas'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            Buzzy Canvas & Storyboard
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
              onChange={(e) => setSelectedCharId(e.target.value)}
              className="bg-transparent text-xs font-semibold text-zinc-100 focus:outline-none cursor-pointer pr-1"
            >
              {characters.map(char => (
                <option key={char.id} value={char.id} className="bg-zinc-900 text-white">
                  {char.name} ({char.gender === 'f' ? 'Female' : 'Male'})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setEditingCharacter({ ...selectedCharacter });
              setIsCharacterEditorOpen(true);
            }}
            title="Edit Persona Parameters"
            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 rounded-lg text-zinc-300 hover:text-white transition-colors"
          >
            <Edit3 className="w-4 h-4" />
          </button>

          <button
            onClick={() => exportProjectJson(selectedCharacter, shots)}
            title="Export Project JSON"
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
                    Consistency Sheet — {selectedCharacter.name}
                  </h2>
                  <p className="text-xs text-zinc-400">Fixed identity parameters forcing Google Flow to maintain strict facial consistency.</p>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-emerald-400">
                  id: {selectedCharacter.id}
                </span>
              </div>

              {/* howToCite Anchor */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Face Consistency Anchor (howToCite) — English
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
                  Fixed Identity & Mandatory Accessories Block
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
                  Frozen Physical Traits
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

              {/* Voice Calibration & Neural Presets (Character.ai) */}
              <div className="space-y-3 p-3.5 bg-zinc-900/40 rounded-xl border border-zinc-800/80">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                    Voice Calibration (Character.ai Neural Synthesis)
                  </label>
                  {isSpeaking && (
                    <div className="flex items-center gap-1 h-3 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800/50">
                      <span className="w-1 h-3 bg-emerald-400 animate-pulse" />
                      <span className="w-1 h-2 bg-emerald-400 animate-pulse delay-75" />
                      <span className="w-1 h-3.5 bg-emerald-400 animate-pulse delay-150" />
                      <span className="w-1 h-2.5 bg-emerald-400 animate-pulse delay-100" />
                      <span className="text-[10px] font-mono text-emerald-400 ml-1">Speaking...</span>
                    </div>
                  )}
                </div>

                {/* Voice Presets */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { name: 'Natural Female', pitch: 1.15, rate: 1.05 },
                    { name: 'Deep Male', pitch: 0.85, rate: 0.95 },
                    { name: 'Cinema Narrator', pitch: 0.9, rate: 0.9 },
                    { name: 'Energetic / Anime', pitch: 1.3, rate: 1.15 },
                  ].map(preset => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => {
                        setVoicePitch(preset.pitch);
                        setVoiceRate(preset.rate);
                      }}
                      className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                        voicePitch === preset.pitch && voiceRate === preset.rate
                          ? 'bg-emerald-600 text-white border-emerald-500 font-semibold'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:bg-zinc-800'
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleSpeak(`Hello! I am ${selectedCharacter.name}. Ready to shoot our next scene.`)}
                    className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 flex items-center gap-1 font-semibold ml-auto"
                  >
                    <Volume2 className="w-3 h-3" />
                    Test Voice
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                      <span>Pitch:</span>
                      <span className="font-mono text-emerald-400">{voicePitch.toFixed(2)}</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.5" 
                      max="1.5" 
                      step="0.05" 
                      value={voicePitch} 
                      onChange={(e) => setVoicePitch(parseFloat(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                      <span>Speed Rate:</span>
                      <span className="font-mono text-emerald-400">{voiceRate.toFixed(2)}</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.8" 
                      max="1.4" 
                      step="0.05" 
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
                  <span>Forbidden Terms ({selectedCharacter.forbiddenWords.length})</span>
                  <span className="text-[11px] text-zinc-500 lowercase font-normal">Type and press Enter</span>
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
                    placeholder="Add forbidden word..."
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
                  Mandatory Master Reference Images
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

            {/* Right: Character.ai Chat Simulator with Persistent Memory & Swiping */}
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
                    <p className="text-[11px] text-zinc-400 line-clamp-1">{selectedCharacter.tagline || selectedCharacter.personality}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateChat([{
                      id: `msg-${Date.now()}`,
                      sender: 'char',
                      text: selectedCharacter.greeting || 'Hello!',
                      alternatives: [selectedCharacter.greeting || 'Hello!'],
                      activeAltIndex: 0,
                    }])}
                    title="Clear Conversation History"
                    className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleSpeak(chatMessages[chatMessages.length - 1]?.text || '')}
                    className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white"
                    title="Speak Latest Message"
                  >
                    {isSpeaking ? <VolumeX className="w-3.5 h-3.5 text-emerald-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Chat Stream with Character.ai Roleplay formatting and Swiping */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} group`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-emerald-600 text-white rounded-br-none shadow-sm'
                          : 'bg-zinc-900 text-zinc-200 border border-zinc-800 rounded-bl-none shadow-sm'
                      }`}
                    >
                      {msg.sender === 'char' ? (
                        <FormattedDialogueText text={msg.text} />
                      ) : (
                        msg.text
                      )}
                    </div>

                    {/* Character.ai Controls: Alternative Swiper & Add to Scene Canvas */}
                    {msg.sender === 'char' && msg.text && (
                      <div className="flex items-center gap-2 mt-1 px-1">
                        {/* Swiper controls */}
                        {msg.alternatives && msg.alternatives.length > 1 && (
                          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-[10px] text-zinc-400">
                            <button
                              type="button"
                              onClick={() => handleSwipeAlternative(msg.id, 'prev')}
                              className="hover:text-emerald-400"
                              title="Previous Alternative Reply"
                            >
                              <ChevronLeft className="w-3 h-3" />
                            </button>
                            <span className="font-mono text-zinc-300">
                              {(msg.activeAltIndex || 0) + 1} / {msg.alternatives.length}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleSwipeAlternative(msg.id, 'next')}
                              className="hover:text-emerald-400"
                              title="Next Alternative Reply"
                            >
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        {/* Add to Storyboard Scene Card */}
                        <button
                          type="button"
                          onClick={() => handleAddShotFromDialogue(msg.text)}
                          className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded transition-all shadow-sm"
                          title="Generate a 2D storyboard scene card using this dialogue and action"
                        >
                          <Plus className="w-3 h-3" />
                          Create Scene Shot
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {streamingText !== null && (
                  <div className="flex flex-col items-start animate-in fade-in duration-100">
                    <div className="max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed bg-zinc-900 text-zinc-100 border border-emerald-500/40 rounded-bl-none shadow-sm">
                      <span className="whitespace-pre-wrap">{streamingText}</span>
                      <span className="inline-block w-1.5 h-3.5 bg-emerald-400 ml-1 translate-y-0.5 animate-pulse" />
                    </div>
                  </div>
                )}

                {isThinking && (
                  <div className="flex flex-col items-start">
                    <div className="bg-zinc-900 border border-emerald-500/30 rounded-2xl px-3 py-1.5 text-[11px] text-emerald-400 flex items-center gap-2 animate-pulse">
                      <Sparkles className="w-3 h-3 animate-spin" />
                      {selectedCharacter.name} is thinking...
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Quick Prompt Chips */}
              <div className="px-4 py-2 border-t border-zinc-800/80 bg-zinc-900/30 flex gap-1.5 overflow-x-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setChatInput('Which lighting angle works best for our next shot?')}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 whitespace-nowrap border border-zinc-700/50"
                >
                  💡 Lighting advice
                </button>
                <button
                  type="button"
                  onClick={() => setChatInput('How do we compose the action to maintain consistency?')}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 whitespace-nowrap border border-zinc-700/50"
                >
                  👗 Action & wardrobe rules
                </button>
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-zinc-800 flex gap-2 shrink-0">
                <input
                  type="text"
                  placeholder={`Chat with ${selectedCharacter.name}...`}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 placeholder:text-zinc-600"
                />
                <button
                  type="submit"
                  disabled={isThinking || isStreaming}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs rounded-xl flex items-center justify-center transition-all shadow-md shadow-emerald-600/20"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* ================= BUZZY CANVAS TAB (Buzzy.now with 2D Nodes & Skills Engine) ================= */
          <div className="flex-1 flex overflow-hidden">
            {/* Left/Center Workspace: 2D Canvas OR Director Controls */}
            <div className="flex-1 flex flex-col overflow-hidden border-r border-zinc-800/80">
              {/* Canvas Sub-Header: Buzzy Skills Workflow Bar */}
              <div className="h-11 border-b border-zinc-800/80 bg-zinc-900/60 px-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  {/* View Mode Toggle */}
                  <div className="flex bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
                    <button
                      onClick={() => setCanvasViewMode('graph')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all ${
                        canvasViewMode === 'graph' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Network className="w-3 h-3 text-emerald-400" />
                      2D Canvas (Buzzy)
                    </button>
                    <button
                      onClick={() => setCanvasViewMode('director')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all ${
                        canvasViewMode === 'director' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Camera className="w-3 h-3 text-emerald-400" />
                      Director Studio
                    </button>
                  </div>

                  {/* Buzzy Workflow Skills Tabs */}
                  <div className="hidden lg:flex items-center gap-1 bg-zinc-950/80 p-0.5 rounded-lg border border-zinc-800">
                    <button
                      onClick={() => setActiveSkillFilter('all')}
                      className={`px-2 py-0.5 text-[11px] font-medium rounded ${
                        activeSkillFilter === 'all' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      All Skills
                    </button>
                    {buzzySkillsList.slice(0, 3).map(skill => (
                      <button
                        key={skill.id}
                        onClick={() => setActiveSkillFilter(skill.id)}
                        className={`px-2 py-0.5 text-[11px] font-medium rounded flex items-center gap-1 ${
                          activeSkillFilter === skill.id ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-white'
                        }`}
                        title={skill.desc}
                      >
                        <span>{skill.icon}</span>
                        {skill.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Buzzy Pre-built Storyboard Templates Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setIsTemplateMenuOpen(prev => !prev)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-zinc-900 border border-zinc-700 hover:border-emerald-500/50 text-emerald-400 flex items-center gap-1.5 transition-all"
                      title="Load pre-built multi-scene workflows from Buzzy Skills"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>Buzzy Templates</span>
                    </button>

                    {isTemplateMenuOpen && (
                      <div className="absolute right-0 top-full mt-1.5 w-72 rounded-xl bg-zinc-900 border border-zinc-700 shadow-2xl p-2 z-50">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-2 py-1">
                          Select Buzzy Skill Workflow
                        </div>
                        {buzzyWorkflowTemplates.map(tmpl => (
                          <button
                            key={tmpl.id}
                            type="button"
                            onClick={() => handleLoadBuzzyTemplate(tmpl)}
                            className="w-full text-left p-2 rounded-lg hover:bg-zinc-800/80 transition-colors group"
                          >
                            <div className="text-xs font-bold text-white group-hover:text-emerald-400 flex items-center justify-between">
                              {tmpl.name}
                              <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400">
                                {tmpl.shots.length} shots
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-2">
                              {tmpl.description}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Keyboard shortcut hint */}
                  <span className="text-[11px] text-zinc-500 font-medium hidden xl:inline">
                    <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-300 font-mono text-[10px]">Ctrl</kbd> + click for multi
                  </span>

                  {/* Select All Toggle [H] */}
                  <button
                    onClick={toggleSelectAll}
                    title="Press 'H' to toggle selection on all scenes. Hold Ctrl and click cards for multi-selection."
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 ${
                      selectedShotIds.length === shots.length && shots.length > 0
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                        : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:text-white hover:bg-zinc-800'
                    }`}
                  >
                    <CheckCircle2 className={`w-3.5 h-3.5 ${selectedShotIds.length === shots.length && shots.length > 0 ? 'text-white' : 'text-emerald-400'}`} />
                    {selectedShotIds.length === shots.length && shots.length > 0 ? 'Deselect All [H]' : 'Select All [H]'}
                  </button>

                  {/* Delete Selected */}
                  {shots.length > 1 && (
                    <button
                      onClick={handleDeleteSelected}
                      disabled={selectedShotIds.length === 0}
                      title={selectedShotIds.length > 0 ? `Delete ${selectedShotIds.length} selected scene(s)` : 'No scene selected'}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                        selectedShotIds.length > 0
                          ? 'bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-900/50 cursor-pointer'
                          : 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete ({selectedShotIds.length})
                    </button>
                  )}

                  <button
                    onClick={handleAddShot}
                    className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-lg border border-emerald-500/30 text-xs font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Shot
                  </button>

                  <div className="h-4 w-px bg-zinc-800 mx-0.5" />

                  {/* Timeline Sequencer (Buzzy continuous movie player) */}
                  <button
                    onClick={() => setIsTimelineOpen(true)}
                    title="Continuous Movie Sequence Player (Buzzy Timeline Player)"
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg border bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <Film className="w-3.5 h-3.5" />
                    Play Movie
                  </button>

                  {/* Flow Prompts TXT Export */}
                  <button
                    onClick={handleExportFlowPrompts}
                    title="Export Sequenced Prompts for Google Flow (TXT)"
                    className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/80 rounded-lg text-xs flex items-center gap-1 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="hidden xl:inline text-[11px]">Flow Prompts</span>
                  </button>

                  {/* Import Project JSON */}
                  <label 
                    title="Import Saved Project JSON"
                    className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/80 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="hidden xl:inline text-[11px]">Load</span>
                    <input
                      type="file"
                      accept=".json,application/json"
                      className="hidden"
                      onChange={handleImportProject}
                    />
                  </label>
                </div>
              </div>

              {/* Workspace Content */}
              <div className="flex-1 overflow-hidden relative">
                {canvasViewMode === 'graph' ? (
                  /* 2D Interactive React Flow Canvas */
                  <SceneCanvas
                    shots={displayedShots}
                    selectedShotId={selectedShotId}
                    selectedShotIds={selectedShotIds}
                    onSelectShot={handleSelectShot}
                    onToggleSelectShot={handleToggleSelectShot}
                    onRangeSelectShot={handleRangeSelectShot}
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
                          Director Shot Calibration — {activeShot.title}
                        </h3>
                        <p className="text-xs text-zinc-400">Configure framing, camera motion, and dialogue for Google Flow.</p>
                      </div>

                      {/* Aspect Ratio Selector */}
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
                            title="Delete Current Shot"
                            className="p-1.5 hover:bg-zinc-800 text-zinc-500 hover:text-red-400 rounded-lg border border-zinc-800 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Title & Buzzy Skill Workflow Row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Scene Title</label>
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

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Buzzy Skill Workflow</label>
                        <select
                          value={activeShot.skillWorkflow || 'film'}
                          onChange={(e) => {
                            const updated = shots.map(s => s.id === activeShot.id ? { ...s, skillWorkflow: e.target.value as SkillWorkflowType } : s);
                            setShots(updated);
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-emerald-400 focus:outline-none focus:border-emerald-500 font-semibold cursor-pointer"
                        >
                          <option value="film">🎬 AI Film (Cinematic Narrative)</option>
                          <option value="ads">📢 AI Ads (Viral Commercial)</option>
                          <option value="animation">✨ AI Animation (Anime Dynamics)</option>
                          <option value="custom">⚙️ Custom Manual Workflow</option>
                        </select>
                      </div>
                    </div>

                    {/* Camera Movement (Buzzy Motion Control) */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                        <span>Camera Movement (Buzzy Motion Engine)</span>
                        <span className="text-[10px] text-cyan-400 font-mono">Injected into Flow prompt</span>
                      </label>
                      <select
                        value={activeShot.cameraMovement || 'Static / None'}
                        onChange={(e) => {
                          const updated = shots.map(s => s.id === activeShot.id ? { ...s, cameraMovement: e.target.value } : s);
                          setShots(updated);
                        }}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-cyan-300 focus:outline-none focus:border-cyan-500 font-mono cursor-pointer"
                      >
                        {buzzyCameraMovements.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>

                    {/* Spoken Dialogue Line (Character.ai Integration) */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                        <span>Spoken Dialogue Line (Character.ai)</span>
                        <span className="text-[10px] text-emerald-400 font-mono">Natural lip sync cue</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. We have to capture this light before the sun dips."
                        value={activeShot.dialogueLine || ''}
                        onChange={(e) => {
                          const updated = shots.map(s => s.id === activeShot.id ? { ...s, dialogueLine: e.target.value } : s);
                          setShots(updated);
                        }}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-emerald-300 italic focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Framing */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Framing</label>
                        <div className="flex gap-1 text-[10px]">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = shots.map(s => s.id === activeShot.id ? { ...s, framing: 'A medium close-up, waist-up portrait' } : s);
                              setShots(updated);
                            }}
                            className="text-zinc-400 hover:text-emerald-400"
                          >
                            [Medium Close-up]
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
                            [Full Body]
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
                      <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Camera Angle</label>
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
                      <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Lighting & Contrast</label>
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
                      <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Environment & Backdrop</label>
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
                      <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Wardrobe & Action</label>
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
                  Ready for Google Flow
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-mono border border-emerald-500/20">
                  Consistent
                </span>
              </div>

              {/* Uploaded Video/Image Display Section */}
              <div className="space-y-2 p-3 bg-zinc-900/60 rounded-xl border border-zinc-800">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-emerald-400" />
                    Google Flow Generated Media
                  </label>
                  {activeShot.mediaUrl && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(activeShot.id)}
                      className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                      Remove
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
                      Upload video or image generated in Flow
                    </span>
                    <span className="text-[10px] text-zinc-600">MP4, WebM, PNG or JPG</span>
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

              {/* Uploaded Audio Track Section */}
              <div className="space-y-2 p-3 bg-zinc-900/60 rounded-xl border border-zinc-800">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                    <Music className="w-3.5 h-3.5 text-emerald-400" />
                    Scene Voiceover Audio Track
                  </label>
                  {activeShot.audioUrl && (
                    <button
                      type="button"
                      onClick={() => handleRemoveAudio(activeShot.id)}
                      className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                      Remove
                    </button>
                  )}
                </div>

                {activeShot.audioUrl ? (
                  <div className="p-2.5 bg-black/60 rounded-lg border border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate">
                      <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-xs font-mono text-zinc-300 truncate">
                        {activeShot.audioName || 'voiceover.mp3'}
                      </span>
                    </div>
                    <audio src={activeShot.audioUrl} controls className="h-7 max-w-[140px]" />
                  </div>
                ) : (
                  <label className="w-full h-16 border-2 border-dashed border-zinc-800 hover:border-emerald-500/50 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all bg-zinc-950/40 p-2 text-center group">
                    <span className="text-[10px] font-medium text-emerald-400 group-hover:underline flex items-center gap-1">
                      <Upload className="w-3 h-3" /> Attach MP3/WAV Audio (ElevenLabs / Kokoro)
                    </span>
                    <span className="text-[9px] text-zinc-500 mt-0.5">
                      Automatically synced in Movie Mode
                    </span>
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleUploadAudio(activeShot.id, e.target.files[0]);
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
                    Identity Guard Active
                  </div>
                  {compilationResult.warnings.map((w, idx) => (
                    <p key={idx} className="text-[10px] text-amber-200/90 leading-tight">
                      • {w}
                    </p>
                  ))}
                </div>
              )}

              {/* Attached Master References */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-400 block">
                  Attach in Google Flow:
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
                  <label className="text-[11px] font-bold text-zinc-400">Structured Prompt (English):</label>
                  <button
                    onClick={handleCopyPrompt}
                    className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-bold"
                  >
                    {copiedPrompt ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedPrompt ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="flex-1 p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-200 leading-relaxed overflow-y-auto select-all max-h-48">
                  {compilationResult.finalPrompt}
                </div>
              </div>

              {/* Negative Prompt */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-zinc-400">Negative Prompt:</label>
                  <button
                    onClick={handleCopyNeg}
                    className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white font-medium"
                  >
                    {copiedNeg ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedNeg ? 'Copied!' : 'Copy'}
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

      {/* Character.ai Persona Editor Modal */}
      {isCharacterEditorOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-400" />
                Edit Character Persona (Character.ai)
              </h3>
              <button
                onClick={() => setIsCharacterEditorOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-400">Character Name</label>
                <input
                  type="text"
                  value={editingCharacter.name}
                  onChange={(e) => setEditingCharacter({ ...editingCharacter, name: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-400">Tagline / Role</label>
                <input
                  type="text"
                  value={editingCharacter.tagline || ''}
                  onChange={(e) => setEditingCharacter({ ...editingCharacter, tagline: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-400">Greeting Message</label>
                <textarea
                  rows={2}
                  value={editingCharacter.greeting || ''}
                  onChange={(e) => setEditingCharacter({ ...editingCharacter, greeting: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-400">Personality & Background</label>
                <textarea
                  rows={2}
                  value={editingCharacter.personality || ''}
                  onChange={(e) => setEditingCharacter({ ...editingCharacter, personality: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-400">Face Consistency Anchor (howToCite)</label>
                <input
                  type="text"
                  value={editingCharacter.howToCite}
                  onChange={(e) => setEditingCharacter({ ...editingCharacter, howToCite: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setIsCharacterEditorOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCharacter}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 shadow-md"
              >
                Save Persona
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timeline Sequencer Modal (Buzzy continuous movie player) */}
      <TimelinePlayer
        shots={shots}
        isOpen={isTimelineOpen}
        onClose={() => setIsTimelineOpen(false)}
        onSelectShot={setSelectedShotId}
      />
    </div>
  );
}
