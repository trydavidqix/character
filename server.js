import http from 'node:http';
import { spawn } from 'node:child_process';

const PORT = 3001;

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

  if (req.url === '/api/chat' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });

    req.on('end', () => {
      try {
        const { characterName, personality, message, history } = JSON.parse(body || '{}');

        let prompt = `Você é o personagem ${characterName}.\nPersonalidade: ${personality || 'Amigável e criativo'}.\nResponda em português (PT-BR) de forma direta, autêntica, em 1 a 3 frases, mantendo a persona.\n`;
        if (Array.isArray(history) && history.length > 0) {
          prompt += '\nHistórico recente:\n' + history.slice(-4).map(h => `${h.sender === 'user' ? 'Usuário' : characterName}: ${h.text}`).join('\n') + '\n';
        }
        prompt += `\nUsuário: ${message}\n${characterName}:`;

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

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

server.listen(PORT, () => {
  console.log(`[AGY Bridge] Server listening on http://localhost:${PORT}`);
});
