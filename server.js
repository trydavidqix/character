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

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

server.listen(PORT, () => {
  console.log(`[AGY Bridge] Server listening on http://localhost:${PORT}`);
});
