import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const candidates = process.platform === 'win32'
  ? ['python', 'python3', 'py']
  : ['python3', 'python'];

function findPythonCommand() {
  for (const cmd of candidates) {
    try {
      const check = spawnSync(cmd, ['--version'], { stdio: 'ignore' });
      if (check.status === 0 && !check.error) {
        return cmd;
      }
    } catch {
      // Continue to next candidate
    }
  }
  return null;
}

const pythonCmd = findPythonCommand();

if (!pythonCmd) {
  console.error('[run-python] Error: Neither python3 nor python was found in PATH or able to execute.');
  process.exit(1);
}

const result = spawnSync(pythonCmd, args, { stdio: 'inherit' });
if (result.error) {
  console.error(`[run-python] Error running ${pythonCmd}:`, result.error);
  process.exit(1);
}

process.exit(result.status ?? 0);
