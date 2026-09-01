const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');

const root = path.resolve(__dirname, '..');
const url = 'http://127.0.0.1:5173/';
const logDir = path.join(root, 'logs');
const logFile = path.join(logDir, 'launcher.log');
const ready = () => new Promise(resolve => {
  const req = http.get(url, res => { res.resume(); resolve(true); });
  req.on('error', () => resolve(false));
  req.setTimeout(800, () => { req.destroy(); resolve(false); });
});
const sleep = ms => new Promise(r => setTimeout(r, ms));
const writeLog = v => { fs.mkdirSync(logDir, { recursive: true }); fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${v}\n`); };
const openWorkspace = () => spawn('cmd.exe', ['/d', '/s', '/c', `start "" "${url}"`], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
const showError = () => spawn('cmd.exe', ['/d', '/s', '/c', 'start "Shadow Security COO OS" cmd /k "echo The workspace could not start. See D:\\ShadowSecurity\\COO-OS\\logs\\launcher.log"'], { detached: true, stdio: 'ignore' }).unref();

(async () => {
  try {
    if (await ready()) { openWorkspace(); return; }
    const viteCli = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
    if (!fs.existsSync(viteCli)) { writeLog('Vite is missing. Run npm install in the project folder.'); showError(); return; }
    fs.mkdirSync(logDir, { recursive: true });
    const output = fs.openSync(logFile, 'a');
    writeLog('Starting the workspace on 127.0.0.1:5173');
    const child = spawn(process.execPath, [viteCli, '--host', '127.0.0.1', '--port', '5173'], {
      cwd: root, detached: true, windowsHide: true, stdio: ['ignore', output, output],
    });
    child.on('error', error => writeLog(`Vite spawn failed: ${error.stack || error}`));
    child.unref();
    for (let i = 0; i < 60; i++) {
      await sleep(250);
      if (await ready()) { writeLog('Workspace ready; opening it.'); openWorkspace(); return; }
    }
    writeLog('Workspace did not become ready within 15 seconds.');
    showError();
  } catch (error) { writeLog(error.stack || String(error)); showError(); }
})();
