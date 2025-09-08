import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import ValidNumber from '../models/ValidNumber.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

const games = {};
const GAME_TTL_MS = 1000 * 60 * 60 * 4;

// --- Helpers ---
function makeGameId() { return Math.random().toString(36).substring(2, 8); }
function sanitizeString(s) { return s ? String(s).trim() : ''; }
function gameExists(gameId) { return gameId && Object.prototype.hasOwnProperty.call(games, gameId); }
function cleanupExpiredGames() {
  const now = Date.now();
  for (const id of Object.keys(games)) if (now - games[id].createdAt > GAME_TTL_MS) delete games[id];
}
setInterval(cleanupExpiredGames, 1000 * 60 * 30);

// --- Socket.IO ---
let io = null;
export function setIo(serverIo) { io = serverIo; }
function emitRoomUpdate(gameId, event, payload) {
  if (!io) return;
  io.to(gameId).emit(event, payload);
}

// ================= Multiplayer =================

// Create game
router.post('/create', async (req, res) => {
  try {
    const count = await ValidNumber.countDocuments();
    if (!count) return res.status(404).json({ error: 'No numbers in DB' });

    const random = Math.floor(Math.random() * count);
    const randomNumber = await ValidNumber.findOne().skip(random);

    const gameId = makeGameId();
    games[gameId] = { target: String(randomNumber.number), players: [], createdAt: Date.now(), finished: false, winner: null, moves: [] };

    res.json({ message: 'Game created', gameId, target: games[gameId].target });
  } catch (err) {
    console.error('❌ Create game error:', err);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

// Join game
router.post('/join', (req, res) => {
  const gameId = sanitizeString(req.body?.gameId);
  const playerName = sanitizeString(req.body?.playerName);
  if (!gameId || !gameExists(gameId)) return res.status(404).json({ error: 'Game not found' });
  if (!playerName) return res.status(400).json({ error: 'Missing playerName' });

  const g = games[gameId];
  if (g.finished) return res.status(400).json({ error: 'Game finished' });
  if (!g.players.includes(playerName)) g.players.push(playerName);

  emitRoomUpdate(gameId, 'roomUpdate', g.players.slice());

  res.json({ message: `${playerName} joined`, game: { target: g.target, players: g.players.slice(), finished: g.finished, winner: g.winner } });
});

// Game info
router.get('/game-info', (req, res) => {
  const gameId = sanitizeString(req.query?.gameId);
  if (!gameExists(gameId)) return res.status(404).json({ error: 'Game not found' });
  const g = games[gameId];
  res.json({ target: g.target, players: g.players.slice(), finished: g.finished, winner: g.winner, moves: g.moves.slice() });
});

// Submit move
router.post('/move', (req, res) => {
  const gameId = sanitizeString(req.body?.gameId);
  const playerName = sanitizeString(req.body?.playerName);
  const solution = sanitizeString(req.body?.solution);
  if (!gameExists(gameId)) return res.status(404).json({ error: 'Game not found' });
  if (!playerName || !solution) return res.status(400).json({ error: 'Missing playerName or solution' });

  const g = games[gameId];
  if (g.finished) return res.status(400).json({ error: 'Game finished', winner: g.winner });

  const exePath = path.join(rootDir, 'checker.exe');
  const inputData = `${g.target}\n${solution}`;
  const checker = spawn(exePath, { shell: true });
  let stdout = '', stderr = '';

  checker.stdout.on('data', d => stdout += d.toString());
  checker.stderr.on('data', d => stderr += d.toString());

  checker.on('close', code => {
    if (code !== 0) return res.status(500).json({ error: 'Checker failed', details: stderr || code });

    const verdictRaw = stdout.trim();
    const verdict = verdictRaw.toUpperCase();
    g.moves.push({ player: playerName, solution, verdict: verdictRaw, time: Date.now() });
    const success = verdict.includes('VALID') || verdict.includes('CORRECT') || verdict === '1' || verdict === 'OK';

    emitRoomUpdate(gameId, 'playerMove', { 
    playerName, 
    solution, 
    verdict: verdictRaw, 
    gameFinished: success,
    winner: success ? playerName : null   // ✅ add this line
});

    if (success) {
      g.finished = true;
      g.winner = playerName;
      g.finishedAt = Date.now();
      return res.json({ player: playerName, verdict: verdictRaw, message: `${playerName} won`, winner: playerName, gameFinished: true });
    }

    res.json({ player: playerName, verdict: verdictRaw, gameFinished: false });
  });

  checker.stdin.write(inputData);
  checker.stdin.end();
});

// Give up multiplayer
router.post('/giveup-multi', (req, res) => {
  const gameId = sanitizeString(req.body?.gameId);
  const quitter = sanitizeString(req.body?.playerName || '');
  if (!gameExists(gameId)) return res.status(404).json({ error: 'Game not found' });

  const g = games[gameId];
  if (g.finished) return res.json({ message: 'Game finished', winner: g.winner, solution: null });

  const exePath = path.join(rootDir, 'solution.exe');
  const inputData = g.target + '\n';
  const solver = spawn(exePath, { shell: true });

  let output = '', error = '';
  solver.stdout.on('data', d => output += d.toString());
  solver.stderr.on('data', d => error += d.toString());

  solver.on('close', code => {
    if (code !== 0 || !output.trim()) return res.status(500).json({ error: 'Solution failed', details: error || code });

    const solution = output.trim();
    let winner = null;
    if (quitter) {
      const others = g.players.filter(p => p !== quitter);
      if (others.length >= 1) winner = others[0];
    }

    g.finished = true;
    g.winner = winner;
    g.finishedAt = Date.now();
    g.moves.push({ player: quitter || null, solution, verdict: 'GIVEUP_SOLUTION', time: Date.now() });

    emitRoomUpdate(gameId, 'playerGiveup', { quitter, solution, winner });
    res.json({ gameId, solution, winner, message: winner ? `${winner} wins (other player gave up)` : 'Game ended (no winner)' });
  });

  solver.stdin.write(inputData);
  solver.stdin.end();
});

// ================= Single-player =================

// Get random target
router.get('/random', async (req, res) => {
  try {
    const count = await ValidNumber.countDocuments();
    if (!count) return res.status(404).json({ error: 'No numbers in DB' });
    const random = Math.floor(Math.random() * count);
    const randomNumber = await ValidNumber.findOne().skip(random);
    res.json({ target: randomNumber.number });
  } catch (err) {
    console.error('❌ Random number fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch random number' });
  }
});

// Check solution
router.post('/check', (req, res) => {
  const target = sanitizeString(req.body?.target);
  const solution = sanitizeString(req.body?.solution);
  if (!target || !solution) return res.status(400).json({ error: 'Missing target or solution' });

  const exePath = path.join(rootDir, 'checker.exe');
  const inputData = `${target}\n${solution}`;
  const checker = spawn(exePath, { shell: true });
  let stdout = '', stderr = '';

  checker.stdout.on('data', d => stdout += d.toString());
  checker.stderr.on('data', d => stderr += d.toString());

  checker.on('close', code => {
    if (code !== 0) return res.status(500).json({ error: 'Checker failed', details: stderr || code });
    res.json({ verdict: stdout.trim() });
  });

  checker.stdin.write(inputData);
  checker.stdin.end();
});

// Give up single-player
router.post('/giveup', (req, res) => {
  const target = sanitizeString(req.body?.target);
  if (!target) return res.status(400).json({ error: 'Missing target' });

  const exePath = path.join(rootDir, 'solution.exe');
  const inputData = target + '\n';
  const solver = spawn(exePath, { shell: true });

  let output = '', error = '';
  solver.stdout.on('data', d => output += d.toString());
  solver.stderr.on('data', d => error += d.toString());

  solver.on('close', code => {
    if (code !== 0 || !output.trim()) return res.status(500).json({ error: 'Solution failed', details: error || code });
    res.json({ solution: output.trim() });
  });

  solver.stdin.write(inputData);
  solver.stdin.end();
});

export default router;
