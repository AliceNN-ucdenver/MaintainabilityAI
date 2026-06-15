import { describe, it, expect } from 'vitest';
import { PmatService } from '../PmatService';

describe('PmatService.isPmatVersionOutput', () => {
  it('accepts pmat\'s real version line', () => {
    expect(PmatService.isPmatVersionOutput('pmat 3.3.0\n')).toBe(true);
    expect(PmatService.isPmatVersionOutput('pmat v3.19.2')).toBe(true);
    expect(PmatService.isPmatVersionOutput('PMAT 3.3.0')).toBe(true); // case-insensitive
    expect(PmatService.isPmatVersionOutput('  pmat 3.3.0 (abc1234)  ')).toBe(true);
  });

  it('rejects the npm stub message (no version)', () => {
    expect(PmatService.isPmatVersionOutput(
      '❌ PMAT binary not found. Please reinstall: npm install -g pmat-agent',
    )).toBe(false);
  });

  it('rejects a stray version from a broken-node crash (the 19.3.0 false positive)', () => {
    expect(PmatService.isPmatVersionOutput(
      'dyld[80208]: Library not loaded: /opt/homebrew/opt/icu4c/lib/libicui18n.71.dylib\n' +
      '  Referenced from: /opt/homebrew/Cellar/node/19.3.0/bin/node',
    )).toBe(false);
  });

  it('rejects empty / unrelated output', () => {
    expect(PmatService.isPmatVersionOutput('')).toBe(false);
    expect(PmatService.isPmatVersionOutput('command not found: pmat')).toBe(false);
    expect(PmatService.isPmatVersionOutput('3.3.0')).toBe(false); // version without the pmat prefix
  });
});

describe('PmatService.pmatInstallCommand', () => {
  it('pins macOS and Windows to the known-good pre-prctl release', () => {
    // pmat 3.16+ pulls aprender-orchestrate (Linux-only libc::prctl), which
    // fails to compile off-Linux — so these platforms must install 3.15.0.
    expect(PmatService.pmatInstallCommand('darwin')).toBe('cargo install pmat@3.15.0 --locked');
    expect(PmatService.pmatInstallCommand('win32')).toBe('cargo install pmat@3.15.0 --locked');
  });

  it('lets Linux install the latest pmat (prctl is supported there)', () => {
    expect(PmatService.pmatInstallCommand('linux')).toBe('cargo install pmat --locked');
  });
});
