import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import ValidNumber from '../models/ValidNumber.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..'); // from /src/routes to /backend

// === /random route ===
router.get('/random', async (req, res) => {
  try {
    const count = await ValidNumber.countDocuments();
    if (count === 0) {
      return res.status(404).json({ error: 'No numbers in database' });
    }
    const random = Math.floor(Math.random() * count);
    const randomNumber = await ValidNumber.findOne().skip(random);
    res.json({ target: randomNumber.number });
  } catch (err) {
    console.error('❌ [DEBUG] Random number fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch random number' });
  }
});

// === /check route ===
router.post('/check', (req, res) => {
  const { target, solution } = req.body;
  if (!target || !solution) {
    console.log('⚠️ Missing target or solution');
    return res.status(400).json({ error: 'Missing target or solution' });
  }

  const inputData = `${target}\n${solution}`;
  const exePath = path.join(rootDir, 'checker.exe');

  console.log('🛠 [DEBUG] Input to checker.exe:', JSON.stringify(inputData));
  console.log('🛠 [DEBUG] Executable path:', exePath);

  const checker = spawn(exePath, { shell: true });

  let stdout = '', stderr = '';
  checker.stdout.on('data', d => stdout += d.toString());
  checker.stderr.on('data', d => stderr += d.toString());
  checker.on('error', err => console.log('❌ [DEBUG] spawn error:', err));
  checker.on('close', code => {
    console.log(`🔔 [DEBUG] checker.exe exited with code ${code}`);
    console.log('🔔 [DEBUG] checker stdout:', JSON.stringify(stdout));
    console.log('🔔 [DEBUG] checker stderr:', JSON.stringify(stderr));

    if (code !== 0) {
      return res.status(500).json({
        error: 'Checker execution failed',
        details: stderr || `exit code ${code}`
      });
    }
    res.json({ verdict: stdout.trim() });
  });

  checker.stdin.write(inputData);
  checker.stdin.end();
});

// === /giveup route ===
router.post('/giveup', (req, res) => {
  const { target } = req.body;
  if (!target) {
    return res.status(400).json({ error: 'Missing target' });
  }

  const exePath = path.join(rootDir, 'solution.exe');
  const inputData = target + '\n';

  console.log('🎯 [DEBUG] Input to solution.exe:', inputData);
  console.log('⚙️ [DEBUG] Executable path:', exePath);

  const solver = spawn(exePath, { shell: true });

  let output = '', error = '';
  solver.stdout.on('data', d => output += d.toString());
  solver.stderr.on('data', d => error += d.toString());
  solver.on('error', err => console.log('❌ [DEBUG] solver spawn error:', err));
  solver.on('close', code => {
    console.log(`🔔 [DEBUG] solution.exe exited with code ${code}`);
    console.log('🔔 [DEBUG] stdout:', JSON.stringify(output));
    console.log('🔔 [DEBUG] stderr:', JSON.stringify(error));

    if (code !== 0 || !output.trim()) {
      return res.status(500).json({
        error: 'Solution generation failed',
        details: error || `exit code ${code}`
      });
    }
    res.json({ solution: output.trim() });
  });

  solver.stdin.write(inputData);
  solver.stdin.end();
});

export default router;
