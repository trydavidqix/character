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
  Plus, 
  Download, 
  RefreshCw, 
  Network, 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  Wand2, 
  X,
  Play,
  Settings,
  Clapperboard,
  Upload,
  Paperclip
} from 'lucide-react';
import { CharacterSheet, SceneShot } from './core/types';
import { defaultCharacters } from './core/defaultCharacters';
import { compileScenePrompt } from './core/promptCompiler';
import { exportProjectJson, exportFlowPromptsText, parseProjectJson } from './core/projectExporter';
import { buzzyWorkflowTemplates, BuzzyTemplate } from './core/buzzyTemplates';
import { generateStoryboardFromIdea, StoryPackage } from './core/storyboardGenerator';
import SceneCanvas from './components/SceneCanvas';
import TimelinePlayer from './components/TimelinePlayer';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'char';
  text: string;
  alternatives?: string[];
  activeAltIndex?: number;
  suggestedShot?: Partial<SceneShot>;
  storyPackage?: StoryPackage;
}

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

const initialShots: SceneShot[] = [
  {
    id: 'shot-1',
    title: 'Cena 1 (Scene 1): Retrato Histórico em Calcário',
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
    title: 'Cena 2 (Scene 2): Pôr do Sol na Piscina',
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
    title: 'Cena 3 (Scene 3): Foco Comercial em Estúdio',
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
  
  // Modals & Panels (Chatbot is the primary home screen)
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isCharacterEditorOpen, setIsCharacterEditorOpen] = useState(false);
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);

  const [shots, setShots] = useState<SceneShot[]>(initialShots);
  const [selectedShotId, setSelectedShotId] = useState<string>(initialShots[0].id);
  const [selectedShotIds, setSelectedShotIds] = useState<string[]>([initialShots[0].id]);

  const [editingCharacter, setEditingCharacter] = useState<CharacterSheet>(defaultCharacters[0]);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState<string | null>(null);

  const [voicePitch, setVoicePitch] = useState<number>(1.0);
  const [voiceRate, setVoiceRate] = useState<number>(1.0);

  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  const selectedCharacter = useMemo(() => {
    return characters.find(c => c.id === selectedCharId) || characters[0];
  }, [characters, selectedCharId]);

  // Load chat history from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem(`char_chat_${selectedCharId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const normalized: ChatMessage[] = parsed.map((m: any, idx: number) => ({
          id: m.id || `msg-${idx}-${Date.now()}`,
          sender: m.sender || 'char',
          text: m.text || '',
          alternatives: m.alternatives || [m.text || ''],
          activeAltIndex: m.activeAltIndex || 0,
          suggestedShot: m.suggestedShot,
        }));
        setChatMessages(normalized);
      } catch {
        setChatMessages([{
          id: `msg-${Date.now()}`,
          sender: 'char',
          text: selectedCharacter.greeting || 'Hello! Ready to develop our storyboard?',
          alternatives: [selectedCharacter.greeting || 'Hello! Ready to develop our storyboard?'],
          activeAltIndex: 0,
        }]);
      }
    } else {
      setChatMessages([{
        id: `msg-${Date.now()}`,
        sender: 'char',
        text: selectedCharacter.greeting || 'Hello! Ready to develop our storyboard?',
        alternatives: [selectedCharacter.greeting || 'Hello! Ready to plan our next cinematic storyboard?'],
        activeAltIndex: 0,
      }]);
    }
    if (selectedCharacter.voicePitch) setVoicePitch(selectedCharacter.voicePitch);
    if (selectedCharacter.voiceRate) setVoiceRate(selectedCharacter.voiceRate);
  }, [selectedCharId, selectedCharacter.greeting, selectedCharacter.voicePitch, selectedCharacter.voiceRate]);

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, streamingText]);

  // Global Keyboard Shortcut: 'H'
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

  const updateChat = (newMsgs: ChatMessage[]) => {
    setChatMessages(newMsgs);
    localStorage.setItem(`char_chat_${selectedCharId}`, JSON.stringify(newMsgs));
  };

  // Voice speech synthesis
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

  // Streaming effect
  const streamResponse = (fullText: string, messageId: string) => {
    setIsStreaming(true);
    setStreamingText('');
    let currentIdx = 0;
    const interval = setInterval(() => {
      currentIdx += 3;
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
    }, 15);
  };

  // Send message
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || chatInput).trim();
    if (!textToSend || isThinking || isStreaming) return;
    if (!customPrompt) setChatInput('');

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
    };

    const nextMessages = [...chatMessages, userMessage];
    updateChat(nextMessages);
    setIsThinking(true);

    // Check if user is asking to create a soap opera, story, script, or narrative
    const isFullStoryRequest = /novela|hist[oó]ria|story|storyboard|roteiro|epis[oó]dio|episode|drama|trama|short film|plot|synopsis|heist|serie|s[eé]rie/i.test(textToSend);
    let generatedStoryPackage: StoryPackage | undefined = undefined;

    if (isFullStoryRequest) {
      generatedStoryPackage = generateStoryboardFromIdea(selectedCharacter, textToSend);
    }

    // Build scene draft if the prompt is about drafting a single scene
    const isSceneRequest = !isFullStoryRequest && /scene|shot|film|ad|animation|cinematic|camera|video|action|look/i.test(textToSend);
    let draftShot: Partial<SceneShot> | undefined = undefined;

    if (isSceneRequest) {
      draftShot = {
        title: `${selectedCharacter.name}: Cena ${shots.length + 1} (Scene ${shots.length + 1})`,
        framing: 'Medium close-up portrait, chest up',
        cameraAngle: 'three-quarter view facing camera',
        cameraMovement: 'Dolly In (Push forward)',
        skillWorkflow: 'film',
        lighting: 'dramatic cinematic lighting with soft rim highlight',
        environment: 'historic limestone terrace with atmospheric depth',
        action: 'standing relaxed with confident guarded expression',
        dialogueLine: 'We have to capture this contrast before the light shifts.',
        aspectRatio: '16:9',
      };
    }

    try {
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterName: selectedCharacter.name,
          personality: selectedCharacter.personality,
          message: textToSend,
          history: nextMessages.map(m => ({ sender: m.sender, text: m.text })),
        }),
      });

      if (!response.ok) throw new Error('Bridge offline');
      const data = await response.json();
      let botReply = data.reply || selectedCharacter.greeting || 'Ready for the next shot!';
      if (generatedStoryPackage) {
        botReply = `*reviews the dramatic concept with a passionate smile* I've developed the entire storyboard for "${generatedStoryPackage.storyTitle}". All ${generatedStoryPackage.shots.length} scenes are laid out below with camera movements, dialogue, and Flow prompts ready.`;
      }

      const botMessageId = `char-${Date.now()}`;
      const newBotMsg: ChatMessage = {
        id: botMessageId,
        sender: 'char',
        text: '',
        alternatives: [botReply],
        activeAltIndex: 0,
        suggestedShot: draftShot,
        storyPackage: generatedStoryPackage,
      };

      updateChat([...nextMessages, newBotMsg]);
      setIsThinking(false);
      streamResponse(botReply, botMessageId);
    } catch {
      // Local intelligent response
      let botReply = '';
      if (generatedStoryPackage) {
        botReply = `*opens the production script with enthusiasm* I have developed the complete 3-scene storyboard for "${generatedStoryPackage.storyTitle}". Notice how the narrative builds from the establishing discovery to the dramatic climax below!`;
      } else {
        const fallbackReplies = [
          `*reviews the storyboard notes with confidence* I've drafted a new scene layout for our project below. Notice how the camera push highlights the face anchor.`,
          `*adjusts the lighting setup* Here is the scene draft. The 35mm optical fidelity ensures our accessories and facial features remain completely identical.`,
          `*points toward the horizon* Let's anchor this scene with a slow Dolly In. I have formatted the prompt with our mandatory face references ready for Flow.`
        ];
        botReply = fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
      }

      const botMessageId = `char-${Date.now()}`;
      const newBotMsg: ChatMessage = {
        id: botMessageId,
        sender: 'char',
        text: '',
        alternatives: [botReply],
        activeAltIndex: 0,
        suggestedShot: draftShot,
        storyPackage: generatedStoryPackage,
      };

      updateChat([...nextMessages, newBotMsg]);
      setIsThinking(false);
      streamResponse(botReply, botMessageId);
    }
  };

  // Swiping alternatives
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

  // Add scene from chat to project
  const handleAddShotToProject = (shotData: Partial<SceneShot>, customDialogue?: string) => {
    const newId = `shot-${Date.now()}`;
    const newShot: SceneShot = {
      id: newId,
      title: shotData.title || `Cena ${shots.length + 1} (Scene ${shots.length + 1})`,
      framing: shotData.framing || 'Medium close-up portrait',
      cameraAngle: shotData.cameraAngle || 'eye level',
      cameraMovement: shotData.cameraMovement || 'Dolly In (Push forward)',
      skillWorkflow: shotData.skillWorkflow || 'film',
      lighting: shotData.lighting || 'cinematic studio lighting with rim light',
      environment: shotData.environment || 'architectural space with natural light',
      action: shotData.action || 'poised natural posture facing camera',
      dialogueLine: customDialogue || shotData.dialogueLine || 'This is the key shot of the sequence.',
      aspectRatio: shotData.aspectRatio || '16:9',
    };

    setShots(prev => [...prev, newShot]);
    setSelectedShotId(newId);
    setSelectedShotIds([newId]);
  };

  // Load entire multi-scene story package into active storyboard
  const handleLoadEntireStoryPackage = (pkg: StoryPackage) => {
    setShots(pkg.shots);
    setSelectedShotId(pkg.shots[0].id);
    setSelectedShotIds([pkg.shots[0].id]);
  };

  // Attach synopsis or reference file directly into chat
  const handleAttachReferenceFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('text') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setChatInput(`Cria uma novela baseada nesta história: ${content.slice(0, 500)}`);
      };
      reader.readAsText(file);
    } else {
      setChatInput(`Cria uma novela baseada na referência: ${file.name}`);
    }
  };

  // Copy structured Flow prompt
  const handleCopyFlowPrompt = (shot: SceneShot) => {
    const compiled = compileScenePrompt(selectedCharacter, shot);
    navigator.clipboard.writeText(compiled.finalPrompt);
    setCopiedPromptId(shot.id);
    setTimeout(() => setCopiedPromptId(null), 2000);
  };

  // Toggle selection
  const toggleSelectAll = () => {
    if (selectedShotIds.length === shots.length && shots.length > 0) {
      setSelectedShotIds([selectedShotId]);
    } else {
      setSelectedShotIds(shots.map(s => s.id));
    }
  };

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
        if (selectedShotId === id && next.length > 0) setSelectedShotId(next[0]);
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

  const handleDeleteShot = (id: string) => {
    if (shots.length <= 1) return;
    const remaining = shots.filter(s => s.id !== id);
    setShots(remaining);
    setSelectedShotIds(prev => prev.filter(x => x !== id));
    if (selectedShotId === id) {
      setSelectedShotId(remaining[0].id);
      if (!selectedShotIds.includes(remaining[0].id)) setSelectedShotIds([remaining[0].id]);
    }
  };

  const handleUploadMedia = (shotId: string, file: File) => {
    const objectUrl = URL.createObjectURL(file);
    const mediaType = file.type.startsWith('video') ? 'video' : 'image';
    setShots(prev => prev.map(s => s.id === shotId ? { ...s, mediaUrl: objectUrl, mediaType } : s));
  };

  // Export Flow Prompts
  const handleExportFlowPrompts = () => {
    const compiledMap: Record<string, string> = {};
    shots.forEach(s => {
      compiledMap[s.id] = compileScenePrompt(selectedCharacter, s).finalPrompt;
    });
    exportFlowPromptsText(selectedCharacter, shots, compiledMap);
  };

  // Import Project
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

  // Load Buzzy Template
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

  // Save Persona
  const handleSaveCharacter = () => {
    setCharacters(prev => {
      const exists = prev.some(c => c.id === editingCharacter.id);
      return exists ? prev.map(c => c.id === editingCharacter.id ? editingCharacter : c) : [...prev, editingCharacter];
    });
    setSelectedCharId(editingCharacter.id);
    setIsCharacterEditorOpen(false);
  };

  // Create new character wizard
  const handleCreateNewCharacter = () => {
    const newChar: CharacterSheet = {
      id: `char-${Date.now()}`,
      name: 'Nova Persona',
      internalName: 'Nova Persona',
      gender: 'f',
      neverWriteNameInPrompt: false,
      tagline: 'Persona Criativa Personalizada',
      howToCite: 'the same person as in the reference images, face and features identical to the references, unchanged',
      identityBlockEn: 'natural facial features, clean studio styling, no tattoos, no piercings',
      fixedTraits: {
        hair: 'dark natural wavy hair',
        eyes: 'deep brown eyes',
        skin: 'natural realistic skin texture with visible pores',
      },
      forbiddenWords: ['tattoo', 'piercing', 'beauty filter'],
      negativePromptEn: 'no tattoos, no piercings, no beauty filter, no plastic skin',
      standardReferences: ['master_ref_01.png', 'master_ref_02.png'],
      greeting: "Olá! Sou sua nova persona. Vamos criar cenas e roteiros juntos!",
      personality: 'Creative, expressive, collaborative, and focused on filmic continuity.',
      voicePitch: 1.0,
      voiceRate: 1.0,
    };
    setEditingCharacter(newChar);
    setIsCharacterEditorOpen(true);
  };

  return (
    <div className="flex h-screen w-screen bg-zinc-950 text-zinc-100 select-none overflow-hidden font-sans">
      {/* ================= LEFT SIDEBAR: CHARACTERS & PROJECT STORYBOARD ================= */}
      <aside className="w-80 border-r border-zinc-800 bg-zinc-950/95 flex flex-col shrink-0 z-20">
        {/* App Branding */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center font-black text-black text-sm shadow-lg shadow-emerald-500/20">
              A
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                Antigravity Hub
              </h1>
              <p className="text-[10px] text-zinc-400">Estúdio Conversacional</p>
            </div>
          </div>

          <button
            onClick={() => setIsTemplateMenuOpen(prev => !prev)}
            title="Carregar Modelos de Roteiro Buzzy"
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <Wand2 className="w-4 h-4" />
          </button>
        </div>

        {/* Character Personas Section */}
        <div className="p-3 border-b border-zinc-800/80 space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              Personagens
            </span>
            <button
              onClick={handleCreateNewCharacter}
              className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-md"
            >
              <Plus className="w-3 h-3" />
              Novo Personagem
            </button>
          </div>

          <div className="space-y-1">
            {characters.map(char => (
              <div
                key={char.id}
                onClick={() => setSelectedCharId(char.id)}
                className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all border ${
                  char.id === selectedCharId
                    ? 'bg-zinc-900 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/20'
                    : 'bg-zinc-950/40 border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/40'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                    char.id === selectedCharId 
                      ? 'bg-emerald-600 text-black shadow-sm' 
                      : 'bg-zinc-800 text-zinc-300'
                  }`}>
                    {char.name[0]}
                  </div>
                  <div className="min-w-0 truncate">
                    <h4 className="text-xs font-bold text-white truncate">{char.name}</h4>
                    <p className="text-[10px] text-zinc-400 truncate">{char.tagline || char.personality}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSpeak(`Hello, I am ${char.name}.`);
                    }}
                    title="Ouvir Voz"
                    className="p-1 text-zinc-500 hover:text-emerald-400 rounded"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingCharacter({ ...char });
                      setIsCharacterEditorOpen(true);
                    }}
                    title="Editar Parâmetros do Personagem"
                    className="p-1 text-zinc-500 hover:text-zinc-200 rounded"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Project Storyboard & Scenes List */}
        <div className="flex-1 flex flex-col min-h-0 p-3 space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-emerald-400" />
              Roteiro ({shots.length})
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsCanvasOpen(true)}
                title="Abrir Grafo 2D de Cenas"
                className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded font-mono"
              >
                <Network className="w-3 h-3" />
                Grafo 2D
              </button>
            </div>
          </div>

          {/* Shot Cards list */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
            {shots.map((shot, idx) => (
              <div
                key={shot.id}
                onClick={() => {
                  setSelectedShotId(shot.id);
                  setSelectedShotIds([shot.id]);
                  setIsCanvasOpen(true);
                }}
                className={`p-2 rounded-xl border text-left cursor-pointer transition-all flex items-center gap-2.5 ${
                  shot.id === selectedShotId
                    ? 'bg-zinc-900 border-emerald-500/60 ring-1 ring-emerald-500/20'
                    : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                {/* Thumbnail / Media Badge */}
                <div className="w-12 h-10 rounded-lg bg-zinc-900 border border-zinc-800 shrink-0 overflow-hidden flex items-center justify-center">
                  {shot.mediaUrl ? (
                    shot.mediaType === 'video' ? (
                      <video src={shot.mediaUrl} className="w-full h-full object-cover" muted />
                    ) : (
                      <img src={shot.mediaUrl} alt={shot.title} className="w-full h-full object-cover" />
                    )
                  ) : (
                    <span className="text-[10px] font-mono text-zinc-500">#{idx + 1}</span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-white truncate">{shot.title}</h5>
                    <span className="text-[9px] font-mono text-zinc-400 bg-zinc-950 px-1 rounded">
                      {shot.aspectRatio}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 truncate mt-0.5">{shot.framing}</p>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyFlowPrompt(shot);
                  }}
                  title="Copiar Prompt do Flow"
                  className="p-1 text-zinc-500 hover:text-emerald-400 rounded shrink-0"
                >
                  {copiedPromptId === shot.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            ))}
          </div>

          {/* Quick Studio Actions */}
          <div className="pt-2 border-t border-zinc-800 space-y-1.5 shrink-0">
            <button
              onClick={() => setIsTimelineOpen(true)}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              Assistir Sequência do Filme
            </button>

            <div className="grid grid-cols-3 gap-1">
              <button
                onClick={handleExportFlowPrompts}
                className="py-1.5 px-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors"
                title="Exportar Prompts Sequenciais para o Google Flow"
              >
                <FileText className="w-3 h-3 text-emerald-400" />
                Flow
              </button>

              <button
                onClick={() => exportProjectJson(selectedCharacter, shots)}
                className="py-1.5 px-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors"
                title="Salvar Projeto JSON"
              >
                <Download className="w-3 h-3 text-emerald-400" />
                Salvar
              </button>

              <label 
                className="py-1.5 px-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                title="Carregar Projeto JSON Salvo"
              >
                <Upload className="w-3 h-3 text-emerald-400" />
                Carregar
                <input
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleImportProject}
                />
              </label>
            </div>
          </div>
        </div>
      </aside>

      {/* ================= MAIN CENTRAL CHATBOT WORKSPACE ================= */}
      <main className="flex-1 flex flex-col bg-zinc-950 min-w-0 relative">
        {/* Chatbot Header */}
        <header className="h-14 border-b border-zinc-800/80 bg-zinc-950/90 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 font-bold text-sm">
              {selectedCharacter.name[0]}
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                {selectedCharacter.name}
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </h2>
              <p className="text-[11px] text-zinc-400 truncate max-w-md">
                {selectedCharacter.tagline || selectedCharacter.personality}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Voice calibration quick controls */}
            <div className="hidden md:flex items-center gap-3 bg-zinc-900 px-3 py-1 rounded-xl border border-zinc-800">
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <span>Tom:</span>
                <span className="font-mono text-emerald-400 text-[11px]">{voicePitch.toFixed(1)}</span>
                <input
                  type="range"
                  min="0.6"
                  max="1.4"
                  step="0.05"
                  value={voicePitch}
                  onChange={(e) => setVoicePitch(parseFloat(e.target.value))}
                  className="w-16 accent-emerald-500"
                />
              </div>
              <div className="h-3 w-px bg-zinc-800" />
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <span>Velocidade:</span>
                <span className="font-mono text-emerald-400 text-[11px]">{voiceRate.toFixed(1)}</span>
                <input
                  type="range"
                  min="0.8"
                  max="1.3"
                  step="0.05"
                  value={voiceRate}
                  onChange={(e) => setVoiceRate(parseFloat(e.target.value))}
                  className="w-16 accent-emerald-500"
                />
              </div>
            </div>

            <button
              onClick={() => handleSpeak(chatMessages[chatMessages.length - 1]?.text || selectedCharacter.greeting || '')}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
              title="Falar Voz"
            >
              {isSpeaking ? <VolumeX className="w-4 h-4 text-emerald-400" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              onClick={() => updateChat([{
                id: `msg-${Date.now()}`,
                sender: 'char',
                text: selectedCharacter.greeting || 'Hello! Ready to develop our storyboard?',
                alternatives: [selectedCharacter.greeting || 'Hello! Ready to develop our storyboard?'],
                activeAltIndex: 0,
              }])}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
              title="Reiniciar Chat"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Chat Messages Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-4xl w-full mx-auto">
          {chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} group`}
            >
              <div
                className={`max-w-[90%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-none shadow-md'
                    : 'bg-zinc-900 text-zinc-200 border border-zinc-800 rounded-bl-none shadow-md'
                }`}
              >
                {msg.sender === 'char' ? (
                  <FormattedDialogueText text={msg.text} />
                ) : (
                  msg.text
                )}

                {/* Structured Interactive Scene Card generated in Chat */}
                {msg.suggestedShot && (
                  <div className="mt-3 p-3 rounded-xl bg-zinc-950/80 border border-emerald-500/40 space-y-2">
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-1.5">
                      <span className="text-[10px] font-mono font-bold uppercase text-emerald-400 flex items-center gap-1">
                        <Clapperboard className="w-3 h-3" />
                        {msg.suggestedShot.title || 'Cena Rascunhada'}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                        {msg.suggestedShot.aspectRatio || '16:9'}
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-300">
                      <strong className="text-zinc-400 font-medium">Enquadramento:</strong> {msg.suggestedShot.framing}
                    </p>
                    <p className="text-[11px] text-zinc-300">
                      <strong className="text-zinc-400 font-medium">Câmera:</strong> {msg.suggestedShot.cameraMovement}
                    </p>
                    {msg.suggestedShot.dialogueLine && (
                      <p className="text-[11px] text-emerald-300 italic">
                        "{msg.suggestedShot.dialogueLine}"
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/60">
                      <button
                        type="button"
                        onClick={() => handleAddShotToProject(msg.suggestedShot!, msg.text)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded-lg flex items-center gap-1 transition-all shadow-sm"
                      >
                        <Plus className="w-3 h-3" />
                        Adicionar ao Roteiro
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const tempShot: SceneShot = {
                            id: 'temp-shot',
                            title: msg.suggestedShot!.title || 'Draft',
                            framing: msg.suggestedShot!.framing || 'Medium close-up',
                            cameraAngle: msg.suggestedShot!.cameraAngle || 'eye level',
                            cameraMovement: msg.suggestedShot!.cameraMovement,
                            skillWorkflow: msg.suggestedShot!.skillWorkflow || 'film',
                            lighting: msg.suggestedShot!.lighting || 'cinematic lighting',
                            environment: msg.suggestedShot!.environment || 'historic limestone',
                            action: msg.suggestedShot!.action || 'poised posture',
                            dialogueLine: msg.suggestedShot!.dialogueLine,
                            aspectRatio: msg.suggestedShot!.aspectRatio || '16:9',
                          };
                          handleCopyFlowPrompt(tempShot);
                        }}
                        className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-[10px] rounded-lg flex items-center gap-1 transition-all"
                      >
                        <Copy className="w-3 h-3 text-emerald-400" />
                        Copiar Prompt Flow
                      </button>
                    </div>
                  </div>
                )}

                {/* Complete Storyboard Episode Package inside Chat */}
                {msg.storyPackage && (
                  <div className="mt-3 p-3.5 rounded-2xl bg-zinc-950/90 border border-emerald-500/50 space-y-3 shadow-xl text-left">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-emerald-400 font-mono tracking-wider flex items-center gap-1.5">
                          <Film className="w-3.5 h-3.5" />
                          Pacote de Roteiro Gerado • {msg.storyPackage.genre.toUpperCase()}
                        </span>
                        <h4 className="text-xs font-bold text-white mt-0.5">{msg.storyPackage.storyTitle}</h4>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                        {msg.storyPackage.shots.length} Cenas
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-300 italic">
                      "{msg.storyPackage.logline}"
                    </p>

                    {/* Sequential Scenes List */}
                    <div className="space-y-2">
                      {msg.storyPackage.shots.map((shot) => {
                        const compiledPrompt = compileScenePrompt(selectedCharacter, shot).finalPrompt;
                        return (
                          <div key={shot.id} className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                <Clapperboard className="w-3.5 h-3.5 text-emerald-400" />
                                {shot.title}
                              </span>
                              <span className="text-[9px] font-mono text-cyan-300 bg-cyan-950/50 border border-cyan-800/50 px-1.5 py-0.2 rounded">
                                🎥 {shot.cameraMovement}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-300">
                              <span className="text-zinc-500 font-medium">Enquadramento:</span> {shot.framing}
                            </p>
                            {shot.dialogueLine && (
                              <p className="text-[11px] text-emerald-300 italic">
                                "{shot.dialogueLine}"
                              </p>
                            )}
                            <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60">
                              <span className="text-[10px] text-zinc-400 truncate max-w-sm font-mono">
                                Flow: {compiledPrompt.slice(0, 60)}...
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyFlowPrompt(shot)}
                                className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 shrink-0 ml-2"
                              >
                                {copiedPromptId === shot.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                {copiedPromptId === shot.id ? 'Copiado!' : 'Copiar Prompt Flow'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Master Action Buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
                      <button
                        type="button"
                        onClick={() => handleLoadEntireStoryPackage(msg.storyPackage!)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-950 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Carregar Todas as {msg.storyPackage.shots.length} Cenas no Projeto
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          handleLoadEntireStoryPackage(msg.storyPackage!);
                          setIsTimelineOpen(true);
                        }}
                        className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-all"
                      >
                        <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                        Assistir no Modo Filme
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Character.ai Controls: Swipe Alternative & Quick Actions */}
              {msg.sender === 'char' && msg.text && (
                <div className="flex items-center gap-2 mt-1.5 px-1">
                  {msg.alternatives && msg.alternatives.length > 1 && (
                    <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-[10px] text-zinc-400">
                      <button
                        type="button"
                        onClick={() => handleSwipeAlternative(msg.id, 'prev')}
                        className="hover:text-emerald-400"
                        title="Resposta Alternativa Anterior"
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
                        title="Próxima Resposta Alternativa"
                      >
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {!msg.suggestedShot && !msg.storyPackage && (
                    <button
                      type="button"
                      onClick={() => handleAddShotToProject({}, msg.text)}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded transition-all"
                    >
                      <Plus className="w-3 h-3" />
                      Criar Cena a partir da Frase
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {streamingText !== null && (
            <div className="flex flex-col items-start animate-in fade-in duration-100">
              <div className="max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed bg-zinc-900 text-zinc-100 border border-emerald-500/40 rounded-bl-none shadow-md">
                <span className="whitespace-pre-wrap">{streamingText}</span>
                <span className="inline-block w-1.5 h-3.5 bg-emerald-400 ml-1 translate-y-0.5 animate-pulse" />
              </div>
            </div>
          )}

          {isThinking && (
            <div className="flex flex-col items-start">
              <div className="bg-zinc-900 border border-emerald-500/30 rounded-2xl px-4 py-2 text-[11px] text-emerald-400 flex items-center gap-2 animate-pulse">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                {selectedCharacter.name} está desenvolvendo o roteiro...
              </div>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Quick Creative Prompt Chips */}
        <div className="p-2 border-t border-zinc-800/80 bg-zinc-950/80 max-w-4xl w-full mx-auto flex gap-1.5 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => handleSendMessage('Cria uma novela dramática em 3 cenas com segredos e reviravoltas em uma mansão no Mediterrâneo.')}
            className="text-[11px] px-3 py-1 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 whitespace-nowrap border border-zinc-800 flex items-center gap-1.5"
          >
            📺 Criar Novela Dramática
          </button>
          <button
            type="button"
            onClick={() => handleSendMessage('Desenvolve um roteiro de curta-metragem de mistério cinematográfico com movimentos dramáticos de câmera.')}
            className="text-[11px] px-3 py-1 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 whitespace-nowrap border border-zinc-800 flex items-center gap-1.5"
          >
            🎬 Roteiro de Mistério Cinematográfico
          </button>
          <button
            type="button"
            onClick={() => handleSendMessage('Gera um comercial viral em 3 cenas de alta conversão para mobile no formato 9:16.')}
            className="text-[11px] px-3 py-1 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 whitespace-nowrap border border-zinc-800 flex items-center gap-1.5"
          >
            📢 Comercial Viral UGC
          </button>
          <button
            type="button"
            onClick={() => handleSendMessage('Produz um roteiro de sequência de ação anime estilizada com dinâmica de alta energia.')}
            className="text-[11px] px-3 py-1 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 whitespace-nowrap border border-zinc-800 flex items-center gap-1.5"
          >
            ✨ Roteiro Anime de Ação
          </button>
        </div>

        {/* Chat Input Bar with Reference Attachment */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950 max-w-4xl w-full mx-auto shrink-0">
          <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex gap-2">
            <label 
              title="Anexar sinopse, arquivo de texto ou imagem de referência" 
              className="p-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-emerald-400 cursor-pointer flex items-center justify-center transition-colors shrink-0"
            >
              <Paperclip className="w-4 h-4" />
              <input 
                type="file" 
                accept=".txt,.md,image/*" 
                className="hidden" 
                onChange={handleAttachReferenceFile}
              />
            </label>
            <input
              type="text"
              placeholder={`Fale com ${selectedCharacter.name}: ex. "Cria uma novela sobre...", ou anexe uma referência...`}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 placeholder:text-zinc-600 shadow-inner"
            />
            <button
              type="submit"
              disabled={isThinking || isStreaming}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs rounded-2xl flex items-center justify-center transition-all shadow-md shadow-emerald-600/20 shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </main>

      {/* ================= MODAL: 2D STORYBOARD CANVAS (BUZZY) ================= */}
      {isCanvasOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col">
          <div className="h-12 border-b border-zinc-800 px-6 flex items-center justify-between shrink-0 bg-zinc-950">
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Grafo 2D do Roteiro (Buzzy Canvas)
              </h3>
            </div>
            <button
              onClick={() => setIsCanvasOpen(false)}
              className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 relative overflow-hidden">
            <SceneCanvas
              shots={shots}
              selectedShotId={selectedShotId}
              selectedShotIds={selectedShotIds}
              onSelectShot={handleSelectShot}
              onToggleSelectShot={handleToggleSelectShot}
              onRangeSelectShot={handleRangeSelectShot}
              onDeleteShot={handleDeleteShot}
              onUploadMedia={handleUploadMedia}
            />
          </div>
        </div>
      )}

      {/* ================= MODAL: TIMELINE PLAYER (CONTINUOUS MOVIE) ================= */}
      <TimelinePlayer
        shots={shots}
        isOpen={isTimelineOpen}
        onClose={() => setIsTimelineOpen(false)}
        onSelectShot={setSelectedShotId}
      />

      {/* ================= MODAL: CHARACTER / PERSONA EDITOR ================= */}
      {isCharacterEditorOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-400" />
                Editor de Personagem & Persona
              </h3>
              <button onClick={() => setIsCharacterEditorOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-400">Nome do Personagem</label>
                <input
                  type="text"
                  value={editingCharacter.name}
                  onChange={(e) => setEditingCharacter({ ...editingCharacter, name: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-400">Papel / Descrição Rápida (Tagline)</label>
                <input
                  type="text"
                  value={editingCharacter.tagline || ''}
                  onChange={(e) => setEditingCharacter({ ...editingCharacter, tagline: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-400">Âncora de Consistência Facial (howToCite - em Inglês para o Flow)</label>
                <input
                  type="text"
                  value={editingCharacter.howToCite}
                  onChange={(e) => setEditingCharacter({ ...editingCharacter, howToCite: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-400">Bloco de Identidade e Acessórios Fixos (identityBlockEn)</label>
                <textarea
                  rows={2}
                  value={editingCharacter.identityBlockEn}
                  onChange={(e) => setEditingCharacter({ ...editingCharacter, identityBlockEn: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-400">Mensagem de Boas-vindas (Greeting)</label>
                <textarea
                  rows={2}
                  value={editingCharacter.greeting || ''}
                  onChange={(e) => setEditingCharacter({ ...editingCharacter, greeting: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setIsCharacterEditorOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveCharacter}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 shadow-md"
              >
                Salvar Personagem
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: BUZZY TEMPLATES MENU ================= */}
      {isTemplateMenuOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-emerald-400" />
                Modelos de Roteiro Buzzy
              </h3>
              <button onClick={() => setIsTemplateMenuOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {buzzyWorkflowTemplates.map(tmpl => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => handleLoadBuzzyTemplate(tmpl)}
                  className="w-full text-left p-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-900 transition-all group"
                >
                  <div className="text-xs font-bold text-white group-hover:text-emerald-400 flex items-center justify-between">
                    {tmpl.name}
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400">
                      {tmpl.shots.length} cenas
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
                    {tmpl.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
