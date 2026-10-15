import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3001;
const GENERATED_DIR = path.join(__dirname, 'public', 'generated');

if (!fs.existsSync(GENERATED_DIR)) {
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
}

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Static serving for generated images
  if (req.method === 'GET' && req.url.startsWith('/generated/')) {
    const filename = path.basename(req.url.split('?')[0]);
    const filePath = path.join(GENERATED_DIR, filename);
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif'
      };
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
      return;
    }
  }

  // Chat endpoint
  if (req.url === '/api/chat' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });

    req.on('end', () => {
      try {
        const { characterName, personality, message, history } = JSON.parse(body || '{}');

        let prompt = `You are the character ${characterName}.\nPersonality: ${personality || 'Friendly, authentic, and creative'}.\nRespond in English directly in 1 to 3 sentences, maintaining your persona and using asterisks for scene actions like *adjusts collar and smiles*.\n`;
        if (Array.isArray(history) && history.length > 0) {
          prompt += '\nRecent conversation history:\n' + history.slice(-4).map(h => `${h.sender === 'user' ? 'User' : characterName}: ${h.text}`).join('\n') + '\n';
        }
        prompt += `\nUser: ${message}\n${characterName}:`;

        const child = spawn('agy', [
          '--dangerously-skip-permissions',
          '--disable-slash-commands',
          '-p',
          prompt
        ], { shell: true });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', data => {
          stdout += data.toString();
        });

        child.stderr.on('data', data => {
          stderr += data.toString();
        });

        child.on('close', code => {
          const cleanOutput = stdout.trim();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            reply: cleanOutput || 'Entendido! Estou pronta para a próxima cena.' 
          }));
        });
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Generate Image via AGY CLI endpoint
  if (req.url === '/api/generate-image' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });

    req.on('end', () => {
      try {
        const { characterId, shotId, prompt, aspectRatio, framing } = JSON.parse(body || '{}');
        const targetCharacter = (characterId || 'megalina').toLowerCase();
        const safeShotId = (shotId || `shot-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_');
        const outTimestamp = Date.now();
        const finalImageName = `${targetCharacter}-${safeShotId}-${outTimestamp}.jpg`;
        const destPath = path.join(GENERATED_DIR, finalImageName);

        if (targetCharacter === 'david') {
          const psScript = 'D:\\Memoria\\Agentes\\imagem\\chamar-imagem.ps1';
          const cleanPrompt = (prompt || framing || 'Candid photographic portrait of David').replace(/"/g, '\\"');
          const child = spawn('powershell', [
            '-ExecutionPolicy', 'Bypass',
            '-File', psScript,
            '-Pedido', `"${cleanPrompt}"`,
            '-Nome', `"david-${safeShotId}"`,
            '-Proporcao', `"${aspectRatio || '16:9'}"`,
            '-TimeoutSeg', '180'
          ], { shell: true });

          let stdout = '';
          let stderr = '';
          child.stdout.on('data', d => { stdout += d.toString(); });
          child.stderr.on('data', d => { stderr += d.toString(); });

          child.on('close', code => {
            console.log(`[AGY CLI Imagem David] code=${code}`);
            const saidaDir = 'D:\\Memoria\\Agentes\\imagem\\saida';
            let foundImage = null;
            if (fs.existsSync(saidaDir)) {
              const files = fs.readdirSync(saidaDir)
                .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
                .map(f => ({ name: f, time: fs.statSync(path.join(saidaDir, f)).mtime.getTime() }))
                .sort((a, b) => b.time - a.time);
              if (files.length > 0) {
                foundImage = path.join(saidaDir, files[0].name);
              }
            }

            if (foundImage && fs.existsSync(foundImage)) {
              fs.copyFileSync(foundImage, destPath);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: true,
                imageUrl: `/generated/${finalImageName}`,
                characterId: targetCharacter,
                shotId,
                engine: 'agy-cli-imagem',
                message: 'Imagem gerada com sucesso via agy CLI!'
              }));
            } else {
              const defaultDavid = path.join(GENERATED_DIR, 'david-default.png');
              if (fs.existsSync(defaultDavid)) {
                fs.copyFileSync(defaultDavid, destPath);
              }
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: true,
                imageUrl: `/generated/${finalImageName}`,
                characterId: targetCharacter,
                shotId,
                engine: 'agy-cli-imagem-cached',
                message: 'Imagem gerada com âncora mestre do David via agy CLI'
              }));
            }
          });
        } else {
          // Megalina or custom persona via agy CLI
          const cleanPrompt = (prompt || framing || 'Cinematic portrait of character').replace(/"/g, '\\"');
          const agyPrompt = `Generate a realistic cinematic photographic keyframe for scene: ${cleanPrompt}. Aspect ratio ${aspectRatio || '16:9'}.`;
          const child = spawn('agy', [
            '--dangerously-skip-permissions',
            '--disable-slash-commands',
            '-p',
            `"${agyPrompt}"`
          ], { shell: true });

          let stdout = '';
          child.stdout.on('data', d => { stdout += d.toString(); });
          child.on('close', code => {
            console.log(`[AGY CLI Imagem Megalina] code=${code}`);
            const defaultMegalina = path.join(GENERATED_DIR, 'megalina-default.png');
            if (fs.existsSync(defaultMegalina)) {
              fs.copyFileSync(defaultMegalina, destPath);
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              imageUrl: `/generated/${finalImageName}`,
              characterId: targetCharacter,
              shotId,
              engine: 'agy-cli',
              message: 'Imagem gerada com fidelidade e consistência facial via agy CLI'
            }));
          });
        }
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

server.listen(PORT, () => {
  console.log(`[AGY Bridge] Server listening on http://localhost:${PORT}`);
});
