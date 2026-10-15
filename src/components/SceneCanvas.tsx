import { useMemo } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap, 
  Node, 
  Edge, 
  Handle, 
  Position, 
  BackgroundVariant 
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { SceneShot } from '../core/types';
import { Video, Trash2, CheckCircle2, Sparkles, Loader2 } from 'lucide-react';

interface SceneCanvasProps {
  shots: SceneShot[];
  selectedShotId: string;
  selectedShotIds: string[];
  onSelectShot: (id: string) => void;
  onToggleSelectShot: (id: string) => void;
  onRangeSelectShot?: (id: string) => void;
  onDeleteShot: (id: string) => void;
  onUploadMedia: (shotId: string, file: File) => void;
  onGenerateImage?: (shotId: string) => void;
  generatingShotId?: string | null;
}

// Custom Node for the 2D Storyboard Canvas
const ShotNodeComponent = ({ data }: { data: any }) => {
  const shot: SceneShot = data.shot;
  const isActive: boolean = data.isActive;
  const isSelected: boolean = data.isSelected;

  return (
    <div 
      onClick={(e) => {
        if (e.ctrlKey || e.metaKey) {
          // Multi-selection with Ctrl/Cmd key
          data.onToggleSelect(shot.id);
        } else if (e.shiftKey && data.onRangeSelect) {
          // Range selection with Shift key
          data.onRangeSelect(shot.id);
        } else {
          // Single select focused card
          data.onSelect(shot.id);
        }
      }}
      title="Clique para selecionar. Segure Ctrl para selecionar múltiplos cards ou Shift para intervalo."
      className={`w-72 rounded-xl bg-zinc-900/95 border text-left p-3 shadow-xl backdrop-blur transition-all cursor-pointer select-none ${
        isActive 
          ? 'border-emerald-500 shadow-emerald-500/20 ring-2 ring-emerald-500/40' 
          : isSelected
          ? 'border-emerald-500/60 ring-1 ring-emerald-500/30 bg-emerald-950/20'
          : 'border-zinc-800 hover:border-zinc-700'
      }`}
    >
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-emerald-500 border-2 border-zinc-950" />

      {/* Node Header with Select and Delete buttons */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              data.onToggleSelect(shot.id);
            }}
            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border transition-all flex items-center gap-1 ${
              isSelected 
                ? 'bg-emerald-500 text-zinc-950 border-emerald-400 font-extrabold shadow-sm' 
                : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white hover:bg-zinc-700'
            }`}
            title="Alternar seleção do card (Segure Ctrl no card ou pressione H)"
          >
            {isSelected ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-zinc-950" />
                {isActive ? 'Ativa' : 'Selecionada'}
              </>
            ) : (
              'Selecionar'
            )}
          </button>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-400 font-mono">
            {shot.aspectRatio}
          </span>
          {shot.skillWorkflow && (
            <span className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded border ${
              shot.skillWorkflow === 'film' 
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                : shot.skillWorkflow === 'ads'
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                : 'bg-pink-500/20 text-pink-300 border-pink-500/40'
            }`}>
              {shot.skillWorkflow === 'film' ? 'Filme IA' : shot.skillWorkflow === 'ads' ? 'Anúncio IA' : 'Animação IA'}
            </span>
          )}
        </div>

        {data.totalShots > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              data.onDelete(shot.id);
            }}
            title="Excluir esta cena"
            className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-950/40 rounded transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Video or Image Preview */}
      <div className="w-full h-36 bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800/80 mb-2 relative group flex items-center justify-center">
        {shot.mediaUrl ? (
          <>
            {shot.mediaType === 'video' ? (
              <video 
                src={shot.mediaUrl} 
                autoPlay 
                loop 
                muted 
                playsInline 
                className="w-full h-full object-cover" 
              />
            ) : (
              <img 
                src={shot.mediaUrl} 
                alt={shot.title} 
                className="w-full h-full object-cover" 
              />
            )}
            {data.onGenerate && (
              <button
                type="button"
                title="Regerar Imagem via AGY CLI"
                disabled={data.isGenerating}
                onClick={(e) => {
                  e.stopPropagation();
                  data.onGenerate(shot.id);
                }}
                className="absolute top-2 right-2 p-1.5 bg-zinc-950/80 hover:bg-zinc-900 text-emerald-400 hover:text-emerald-300 rounded-lg border border-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity shadow-md flex items-center gap-1 text-[10px] font-bold"
              >
                {data.isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-zinc-600 gap-1.5 p-3 text-center">
            <Video className="w-5 h-5 text-zinc-700" />
            <span className="text-[10px] font-medium text-zinc-500">
              Aguardando vídeo gerado no Flow
            </span>
            {data.onGenerate && (
              <button
                type="button"
                disabled={data.isGenerating}
                onClick={(e) => {
                  e.stopPropagation();
                  data.onGenerate(shot.id);
                }}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-md text-[10px] font-bold flex items-center gap-1 shadow-md shadow-emerald-950 transition-all mt-0.5"
                title="Gerar Imagem de alta fidelidade usando o agy CLI"
              >
                {data.isGenerating ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Gerando (AGY)...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    Gerar Imagem (AGY CLI)
                  </>
                )}
              </button>
            )}
            <label 
              onClick={(e) => e.stopPropagation()}
              className="cursor-pointer text-[10px] text-zinc-400 hover:text-zinc-200 underline mt-0.5"
            >
              Ou enviar arquivo
              <input 
                type="file" 
                accept="video/*,image/*" 
                className="hidden" 
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    data.onUpload(shot.id, e.target.files[0]);
                  }
                }}
              />
            </label>
          </div>
        )}
      </div>

      {/* Camera Movement Tag (Buzzy Motion Control) */}
      {shot.cameraMovement && (
        <div className="mb-1">
          <span className="text-[9px] font-mono font-medium text-cyan-300 bg-cyan-950/50 border border-cyan-800/50 px-1.5 py-0.5 rounded inline-block max-w-full truncate">
            🎥 {shot.cameraMovement}
          </span>
        </div>
      )}

      {/* Shot Title and Details */}
      <h4 className="text-xs font-bold text-white truncate">{shot.title}</h4>
      <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">{shot.framing}</p>

      {/* Character.ai Spoken Dialogue Quote */}
      {shot.dialogueLine && (
        <div className="mt-1.5 p-1.5 rounded bg-emerald-950/20 border border-emerald-900/30">
          <p className="text-[10px] text-emerald-300 italic line-clamp-1">
            "{shot.dialogueLine}"
          </p>
        </div>
      )}

      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-emerald-500 border-2 border-zinc-950" />
    </div>
  );
};

export default function SceneCanvas({ 
  shots, 
  selectedShotId, 
  selectedShotIds,
  onSelectShot, 
  onToggleSelectShot,
  onRangeSelectShot,
  onDeleteShot, 
  onUploadMedia,
  onGenerateImage,
  generatingShotId
}: SceneCanvasProps) {
  const nodeTypes = useMemo(() => ({ shotNode: ShotNodeComponent }), []);

  // Transform shots into ReactFlow nodes
  const nodes: Node[] = useMemo(() => {
    return shots.map((shot, index) => ({
      id: shot.id,
      type: 'shotNode',
      position: { x: index * 340 + 50, y: 120 },
      selected: selectedShotIds.includes(shot.id),
      data: {
        shot,
        index,
        totalShots: shots.length,
        isActive: shot.id === selectedShotId,
        isSelected: selectedShotIds.includes(shot.id),
        isGenerating: generatingShotId === shot.id,
        onSelect: onSelectShot,
        onToggleSelect: onToggleSelectShot,
        onRangeSelect: onRangeSelectShot,
        onDelete: onDeleteShot,
        onUpload: onUploadMedia,
        onGenerate: onGenerateImage,
      },
    }));
  }, [shots, selectedShotId, selectedShotIds, generatingShotId, onSelectShot, onToggleSelectShot, onRangeSelectShot, onDeleteShot, onUploadMedia, onGenerateImage]);

  // Connect shots sequentially with edges
  const edges: Edge[] = useMemo(() => {
    const list: Edge[] = [];
    for (let i = 0; i < shots.length - 1; i++) {
      list.push({
        id: `e-${shots[i].id}-${shots[i + 1].id}`,
        source: shots[i].id,
        target: shots[i + 1].id,
        animated: true,
        style: { stroke: '#10b981', strokeWidth: 2 },
      });
    }
    return list;
  }, [shots]);

  return (
    <div className="w-full h-full bg-zinc-950 relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        className="bg-zinc-950"
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.5} color="#27272a" />
        <Controls className="bg-zinc-900 border border-zinc-800 text-white rounded-lg shadow-xl" />
        <MiniMap 
          nodeColor="#10b981" 
          maskColor="rgba(9, 9, 11, 0.8)" 
          className="bg-zinc-900 border border-zinc-800 rounded-lg" 
        />
      </ReactFlow>
    </div>
  );
}
