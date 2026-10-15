import { describe, it, expect } from 'vitest';
import { parseProjectJson } from '../src/core/projectExporter';
import { defaultCharacters } from '../src/core/defaultCharacters';
import { SceneShot } from '../src/core/types';

describe('Project Exporter and Importer', () => {
  const megalina = defaultCharacters[0];
  const sampleShots: SceneShot[] = [
    {
      id: 'shot-1',
      title: 'Cena 1',
      framing: 'Close up',
      cameraAngle: 'eye level',
      lighting: 'soft daylight',
      environment: 'outdoor garden',
      action: 'smiling gently',
      aspectRatio: '16:9',
      mediaUrl: 'blob:test-url',
      mediaType: 'video',
    },
    {
      id: 'shot-2',
      title: 'Cena 2',
      framing: 'Wide shot',
      cameraAngle: 'low angle',
      lighting: 'sunset golden hour',
      environment: 'beachside promenade',
      action: 'walking towards horizon',
      aspectRatio: '9:16',
    }
  ];

  it('successfully parses valid project bundle JSON', () => {
    const rawJson = JSON.stringify({
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      character: megalina,
      shots: sampleShots,
    });

    const parsed = parseProjectJson(rawJson);
    expect(parsed.character).toBeDefined();
    expect(parsed.character?.id).toBe('megalina');
    expect(parsed.shots?.length).toBe(2);
    expect(parsed.shots?.[0].title).toBe('Cena 1');
    expect(parsed.shots?.[0].mediaType).toBe('video');
  });

  it('handles partial JSON gracefully with fallback fields', () => {
    const rawJson = JSON.stringify({
      shots: [
        { title: 'Cena sem id nem framing' }
      ]
    });

    const parsed = parseProjectJson(rawJson);
    expect(parsed.shots?.length).toBe(1);
    expect(parsed.shots?.[0].title).toBe('Cena sem id nem framing');
    expect(parsed.shots?.[0].framing).toBe('A cinematic shot');
    expect(parsed.shots?.[0].aspectRatio).toBe('16:9');
    expect(parsed.character).toBeUndefined();
  });

  it('throws descriptive error on invalid JSON string', () => {
    expect(() => parseProjectJson('{ not valid json }')).toThrow('Falha ao ler projeto');
  });
});
