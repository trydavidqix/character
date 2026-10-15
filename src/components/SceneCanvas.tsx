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
import { Video } from 'lucide-react';

interface SceneCanvasProps {
  shots: SceneShot[];
  selectedShotId: string;
  onSelectShot: (id: string) => void;
  onUploadMedia: (shotId: string, file: File) => void;
}

// Custom Node for the 2D Storyboard Canvas
const ShotNodeComponent = ({ data }: { data: any }) => {
  const shot: SceneShot = data.shot;
  const isSelected: boolean = data.isSelected;

  return (
    <div 
      onClick={() => data.onSelect(shot.id)}
      className={`w-72 rounded-xl bg-zinc-900/95 border text-left p-3 shadow-xl backdrop-blur transition-all cursor-pointer ${
        isSelected 
          ? 'border-emerald-500 shadow-emerald-500/20 ring-2 ring-emerald-500/40' 
          : 'border-zinc-800 hover:border-zinc-700'
      }`}
    >
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-emerald-500 border-2 border-zinc-950" />

      {/* Node Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          CENA {data.index + 1}
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-400 font-mono">
          {shot.aspectRatio}
        </span>
      </div>

      {/* Video or Image Preview */}
      <div className="w-full h-36 bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800/80 mb-2 relative group flex items-center justify-center">
        {shot.mediaUrl ? (
          shot.mediaType === 'video' ? (
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
          )
        ) : (
          <div className="flex flex-col items-center justify-center text-zinc-600 gap-1.5 p-4 text-center">
            <Video className="w-6 h-6 text-zinc-700" />
            <span className="text-[10px] font-medium text-zinc-500">
              Aguardando vídeo gerado no Flow
            </span>
            <label className="cursor-pointer text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold underline mt-0.5">
              Enviar arquivo
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

      {/* Shot Title and Details */}
      <h4 className="text-xs font-bold text-white truncate">{shot.title}</h4>
      <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">{shot.framing}</p>

      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-emerald-500 border-2 border-zinc-950" />
    </div>
  );
};

export default function SceneCanvas({ shots, selectedShotId, onSelectShot, onUploadMedia }: SceneCanvasProps) {
  const nodeTypes = useMemo(() => ({ shotNode: ShotNodeComponent }), []);

  // Transform shots into ReactFlow nodes
  const nodes: Node[] = useMemo(() => {
    return shots.map((shot, index) => ({
      id: shot.id,
      type: 'shotNode',
      position: { x: index * 340 + 50, y: 120 },
      data: {
        shot,
        index,
        isSelected: shot.id === selectedShotId,
        onSelect: onSelectShot,
        onUpload: onUploadMedia,
      },
    }));
  }, [shots, selectedShotId, onSelectShot, onUploadMedia]);

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
