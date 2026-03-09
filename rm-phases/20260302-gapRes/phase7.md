# Phase 7 — Real-Time Terraform Output Streaming via WebSocket
## GAP-007 · Medium · Replace buffered exec with line-by-line streaming for `apply` and `destroy`

**Priority**: P3 (UX improvement — users see no output during long-running apply/destroy steps)
**Effort**: 1 day
**Prerequisites**: None (independent of Phases 1-6)

---

## Objective

`terraformExecutor.runTerraform()` currently uses Node.js `child_process.exec` (buffered) to run all Terraform sub-commands. This means:

- Users watching the deployment progress see **no terminal output** during `apply` and `destroy` (which can run for 5-15+ minutes)
- All output appears at once only after the command completes
- If a deployment hangs, there is no live visibility into what Terraform is waiting on

This phase replaces the `exec`-based runner for `apply` and `destroy` with a **streaming** `child_process.spawn`-based implementation that emits each `stdout` / `stderr` line as it arrives via `websocketServer.emitDeploymentUpdate()`.

Fast commands (`init`, `validate`, `plan`, `output`, `show`) keep the existing buffered approach — they complete quickly and streaming adds no meaningful UX benefit.

---

## Tasks

### 7.1 — Add `_runTerraformStreaming()` Private Method
**File**: `backend/src/services/terraformExecutor.js`
**Location**: Add after the existing `runTerraform()` method

```javascript
const { spawn } = require('child_process');   // Add at top of file if not already present

/**
 * Run a Terraform command with live stdout/stderr streaming to the WebSocket.
 * Use for long-running commands: apply, destroy.
 *
 * @param {string}   deploymentId
 * @param {string[]} args          - Terraform arguments (e.g. ['apply', '-auto-approve', '-no-color'])
 * @param {string}   cwd           - Terraform working directory
 * @returns {Promise<{ exitCode: number, stdout: string, stderr: string }>}
 */
_runTerraformStreaming(deploymentId, args, cwd) {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      TF_IN_AUTOMATION: '1',
      TF_INPUT: '0',
    };

    logger.deployment(deploymentId, 'terraform', `Streaming: terraform ${args.join(' ')}`, { cwd });

    const child = spawn('terraform', args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';

    // ── stdout line-by-line streaming ──────────────────────────────────
    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;

      // Emit each line individually so the frontend LogViewer renders in real-time
      const lines = text.split('\n');
      for (const line of lines) {
        const trimmed = line.trimEnd();
        if (trimmed.length === 0) continue;

        websocketServer.emitDeploymentUpdate(deploymentId, 'log', {
          level: 'terraform-output',
          message: trimmed,
          source: 'terraform-stdout',
          timestamp: new Date().toISOString(),
        });
      }
    });

    // ── stderr line-by-line streaming ──────────────────────────────────
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;

      const lines = text.split('\n');
      for (const line of lines) {
        const trimmed = line.trimEnd();
        if (trimmed.length === 0) continue;

        // Terraform often writes progress/warnings to stderr; only flag as error if exit code is non-zero
        websocketServer.emitDeploymentUpdate(deploymentId, 'log', {
          level: 'terraform-stderr',
          message: trimmed,
          source: 'terraform-stderr',
          timestamp: new Date().toISOString(),
        });
      }
    });

    child.on('error', (err) => {
      logger.error(`[TerraformExecutor] spawn error: ${err.message}`, { deploymentId, args });
      reject(err);
    });

    child.on('close', (exitCode) => {
      logger.deployment(deploymentId, 'terraform', `Streaming command exited with code ${exitCode}`, { args });
      resolve({ exitCode: exitCode ?? 1, stdout, stderr });
    });
  });
}
```

---

### 7.2 — Route `apply` and `destroy` Through the Streaming Runner
**File**: `backend/src/services/terraformExecutor.js`
**Location**: `applyTerraform()` and `destroyTerraform()`

#### `applyTerraform()` — replace `runTerraform` call with streaming variant:

```javascript
// Before (buffered)
const result = await this.runTerraform(deploymentId, ['apply', '-auto-approve', '-no-color'], deploymentDir);

// After (streaming)
const result = await this._runTerraformStreaming(deploymentId, ['apply', '-auto-approve', '-no-color'], deploymentDir);
```

#### `destroyTerraform()` — same swap:

```javascript
// Before (buffered)
const result = await this.runTerraform(deploymentId, ['destroy', '-auto-approve', '-no-color'], deploymentDir);

// After (streaming)
const result = await this._runTerraformStreaming(deploymentId, ['destroy', '-auto-approve', '-no-color'], deploymentDir);
```

All other Terraform sub-commands (`init`, `validate`, `plan`, `output`, `show`) remain on the buffered `runTerraform()` path.

---

### 7.3 — Add Progress Detection to Streaming Lines
**File**: `backend/src/services/terraformExecutor.js`
**Location**: Inside the `child.stdout.on('data', ...)` handler

Terraform outputs structured lines that can be parsed for phase-update events:

```javascript
// Inside child.stdout.on('data', ...) after emitting the raw log line:
if (trimmed.startsWith('Plan:')) {
  // e.g. "Plan: 12 to add, 0 to change, 0 to destroy."
  websocketServer.emitDeploymentUpdate(deploymentId, 'phase-update', {
    phase: 'terraform-planning',
    detail: trimmed,
  });
}

if (trimmed.includes('Apply complete!') || trimmed.includes('Destroy complete!')) {
  websocketServer.emitDeploymentUpdate(deploymentId, 'phase-update', {
    phase: trimmed.includes('Apply') ? 'terraform-apply-complete' : 'terraform-destroy-complete',
    detail: trimmed,
  });
}

if (trimmed.match(/^[a-z].*: (Creating|Modifying|Destroying|Still creating|Still destroying)/i)) {
  // Individual resource progress
  websocketServer.emitDeploymentUpdate(deploymentId, 'progress-update', {
    resourceLine: trimmed,
  });
}
```

---

### 7.4 — Frontend: Handle `terraform-output` Log Level in `LogViewer`
**File**: `frontend/src/components/LogViewer.jsx`
**Location**: Log rendering logic (wherever `level` is used to style log entries)

The new `terraform-output` and `terraform-stderr` levels need CSS/MUI styling:

```jsx
// Add to the level → style mapping
const LOG_LEVEL_STYLES = {
  'info':             { color: 'text.primary',   fontWeight: 'normal' },
  'warn':             { color: 'warning.main',   fontWeight: 'normal' },
  'error':            { color: 'error.main',     fontWeight: 'bold'   },
  'terraform-output': { color: 'success.light',  fontFamily: 'monospace', fontSize: '0.8rem' },
  'terraform-stderr': { color: 'warning.light',  fontFamily: 'monospace', fontSize: '0.8rem' },
};
```

Terraform output lines are typically high-volume. Consider adding a toggle in `LogViewer` to show/hide them:

```jsx
const [showTerraformOutput, setShowTerraformOutput] = useState(true);

// In the filter logic:
const visibleLogs = logs.filter(log => {
  if (!showTerraformOutput && ['terraform-output', 'terraform-stderr'].includes(log.level)) return false;
  return true;
});
```

---

### 7.5 — Handle Long-Running Timeout
**File**: `backend/src/services/terraformExecutor.js`
**Location**: `_runTerraformStreaming()` — add a configurable timeout

Some cloud provider operations (e.g. Azure AKS provisioning) can exceed 30 minutes. Add a timeout guard:

```javascript
// At the top of _runTerraformStreaming, before spawn:
const timeoutMs = parseInt(process.env.TERRAFORM_STREAM_TIMEOUT_MS || '3600000', 10); // Default 60 min
let timeoutHandle;

// After spawn:
timeoutHandle = setTimeout(() => {
  logger.error(`[TerraformExecutor] Streaming timeout after ${timeoutMs}ms`, { deploymentId, args });
  child.kill('SIGTERM');
  reject(new Error(`Terraform command timed out after ${timeoutMs / 60_000} minutes`));
}, timeoutMs);

// Clear timeout on close:
child.on('close', (exitCode) => {
  clearTimeout(timeoutHandle);
  // ... existing resolve logic
});
```

Add `TERRAFORM_STREAM_TIMEOUT_MS` to `.env.example`:
```
# Terraform streaming timeout (ms). Default: 3600000 (60 min). Increase for slow cloud providers.
TERRAFORM_STREAM_TIMEOUT_MS=3600000
```

---

### 7.6 — Smoke Tests
**File**: `backend/src/services/__tests__/e2eDeploymentSmoke.test.js`

```javascript
describe('Terraform streaming: _runTerraformStreaming', () => {
  let executor;
  let emitSpy;

  beforeEach(() => {
    executor = new TerraformExecutor();
    emitSpy = jest.spyOn(websocketServer, 'emitDeploymentUpdate').mockImplementation(() => {});
  });

  it('emits terraform-output log events for each stdout line', async () => {
    // Mock spawn to emit a few lines then close
    const EventEmitter = require('events');
    const mockChild = new EventEmitter();
    mockChild.stdout = new EventEmitter();
    mockChild.stderr = new EventEmitter();
    jest.spyOn(require('child_process'), 'spawn').mockReturnValue(mockChild);

    const resultPromise = executor._runTerraformStreaming('dep-stream-1', ['apply', '-auto-approve'], '/tmp/dir');

    // Simulate Terraform output lines
    mockChild.stdout.emit('data', Buffer.from('aws_eks_cluster.main: Creating...\nPlan: 5 to add, 0 to change.\n'));
    mockChild.stderr.emit('data', Buffer.from(''));
    mockChild.emit('close', 0);

    const result = await resultPromise;
    expect(result.exitCode).toBe(0);

    const logCalls = emitSpy.mock.calls.filter(c => c[1] === 'log');
    expect(logCalls.some(c => c[2].level === 'terraform-output')).toBe(true);
    expect(logCalls.some(c => c[2].message.includes('Creating'))).toBe(true);
  });

  it('resolves with non-zero exit code on failure', async () => {
    const EventEmitter = require('events');
    const mockChild = new EventEmitter();
    mockChild.stdout = new EventEmitter();
    mockChild.stderr = new EventEmitter();
    jest.spyOn(require('child_process'), 'spawn').mockReturnValue(mockChild);

    const resultPromise = executor._runTerraformStreaming('dep-stream-2', ['apply', '-auto-approve'], '/tmp/dir');
    mockChild.stdout.emit('data', Buffer.from('Error: Access Denied\n'));
    mockChild.emit('close', 1);

    const result = await resultPromise;
    expect(result.exitCode).toBe(1);
  });

  it('applyTerraform uses streaming runner (not buffered runTerraform)', async () => {
    const streamSpy = jest.spyOn(executor, '_runTerraformStreaming').mockResolvedValue({ exitCode: 0, stdout: 'Apply complete!', stderr: '' });
    const bufferedSpy = jest.spyOn(executor, 'runTerraform');

    // Stub earlier steps (init, validate, plan)
    jest.spyOn(executor, 'initTerraform').mockResolvedValue({ exitCode: 0 });
    jest.spyOn(executor, 'validateTerraform').mockResolvedValue({ exitCode: 0 });
    jest.spyOn(executor, 'planTerraform').mockResolvedValue({ exitCode: 0, stdout: 'Plan: 1 to add.' });

    await executor.applyTerraform('dep-stream-3', '/tmp/dir');

    expect(streamSpy).toHaveBeenCalledWith('dep-stream-3', expect.arrayContaining(['apply']), '/tmp/dir');
    expect(bufferedSpy).not.toHaveBeenCalledWith('dep-stream-3', expect.arrayContaining(['apply']), expect.anything());
  });
});
```

---

## Files Modified

| File | Change |
|------|--------|
| `backend/src/services/terraformExecutor.js` | Add `_runTerraformStreaming()` private method with spawn-based streaming, progress detection, and timeout guard; swap `applyTerraform` and `destroyTerraform` to use it |
| `frontend/src/components/LogViewer.jsx` | Add `terraform-output` and `terraform-stderr` log level styles; add show/hide toggle for terraform output lines |
| `.env.example` | Add `TERRAFORM_STREAM_TIMEOUT_MS` with documentation comment |
| `backend/src/services/__tests__/e2eDeploymentSmoke.test.js` | Add Suite 19: streaming tests (emit verification, exit code propagation, apply routing) |

---

## Verification Checklist

- [ ] `_runTerraformStreaming` emits a `log` WebSocket event for each `stdout` line with level `terraform-output`
- [ ] `_runTerraformStreaming` emits a `log` event for `stderr` lines with level `terraform-stderr`
- [ ] `Plan:` line triggers a `phase-update` event
- [ ] `Apply complete!` triggers a `phase-update` event with `terraform-apply-complete`
- [ ] Individual resource progress lines trigger `progress-update` events
- [ ] `applyTerraform` calls `_runTerraformStreaming`, not `runTerraform`, for the apply step
- [ ] `destroyTerraform` calls `_runTerraformStreaming`, not `runTerraform`, for the destroy step
- [ ] `init`, `validate`, `plan`, `output` still use the buffered `runTerraform()` (no regression)
- [ ] Timeout kills the child process and rejects with a clear message
- [ ] Frontend `LogViewer` renders `terraform-output` lines in monospace at reduced font size
- [ ] Frontend toggle allows hiding terraform-level log noise
- [ ] All existing smoke tests pass (159+)
