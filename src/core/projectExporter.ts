import { CharacterSheet, SceneShot } from './types';

export interface ProjectBundle {
  version: '1.0.0';
  exportedAt: string;
  character: CharacterSheet;
  shots: SceneShot[];
}

/**
 * Download a file in the browser using a Blob and anchor click
 */
function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export complete project as structured JSON
 */
export function exportProjectJson(character: CharacterSheet, shots: SceneShot[]) {
  const project: ProjectBundle = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    character,
    shots,
  };

  const filename = `storyboard_${character.id}_${Date.now()}.json`;
  triggerDownload(JSON.stringify(project, null, 2), filename, 'application/json');
}

/**
 * Export compiled prompts for Google Flow into a sequenced text file
 */
export function exportFlowPromptsText(
  character: CharacterSheet, 
  shots: SceneShot[], 
  compiledPrompts: Record<string, string>
) {
  let doc = `# GOOGLE FLOW PROMPT SEQUENCE\n`;
  doc += `# Character: ${character.name}\n`;
  doc += `# Exported: ${new Date().toLocaleString()}\n`;
  doc += `# Total Shots: ${shots.length}\n\n`;
  doc += `------------------------------------------------------------\n\n`;

  shots.forEach((shot, index) => {
    const prompt = compiledPrompts[shot.id] || '';
    doc += `[SCENE #${index + 1}: ${shot.title.toUpperCase()}]\n`;
    doc += `Aspect Ratio: ${shot.aspectRatio}\n`;
    doc += `Framing: ${shot.framing}\n`;
    if (shot.cameraAngle) {
      doc += `Camera Angle: ${shot.cameraAngle}\n`;
    }
    if (shot.lighting) {
      doc += `Lighting: ${shot.lighting}\n`;
    }
    if (shot.environment) {
      doc += `Environment: ${shot.environment}\n`;
    }
    if (shot.action) {
      doc += `Action: ${shot.action}\n`;
    }
    doc += `\n>>> FLOW PROMPT (EN):\n${prompt}\n\n`;
    if (character.negativePromptEn) {
      doc += `>>> NEGATIVE PROMPT:\n${character.negativePromptEn}\n\n`;
    }
    doc += `------------------------------------------------------------\n\n`;
  });

  const filename = `flow_prompts_${character.id}_${Date.now()}.txt`;
  triggerDownload(doc, filename, 'text/plain;charset=utf-8');
}

/**
 * Validate and parse an imported project JSON
 */
export function parseProjectJson(jsonString: string): { character?: CharacterSheet; shots?: SceneShot[] } {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Arquivo JSON inválido.');
    }

    const result: { character?: CharacterSheet; shots?: SceneShot[] } = {};

    if (parsed.character && typeof parsed.character.id === 'string' && typeof parsed.character.name === 'string') {
      result.character = parsed.character as CharacterSheet;
    }

    if (Array.isArray(parsed.shots) && parsed.shots.length > 0) {
      result.shots = parsed.shots.map((s: any, idx: number) => ({
        id: s.id || `shot-${Date.now()}-${idx}`,
        title: s.title || `Cena ${idx + 1}`,
        framing: s.framing || 'A cinematic shot',
        cameraAngle: s.cameraAngle || 'eye level',
        lighting: s.lighting || 'natural lighting',
        environment: s.environment || 'minimal studio setting',
        action: s.action || '',
        aspectRatio: s.aspectRatio || '16:9',
        seed: s.seed,
        mediaUrl: s.mediaUrl,
        mediaType: s.mediaType,
        audioUrl: s.audioUrl,
        audioName: s.audioName,
      }));
    }

    return result;
  } catch (err: any) {
    throw new Error(`Falha ao ler projeto: ${err.message}`);
  }
}
