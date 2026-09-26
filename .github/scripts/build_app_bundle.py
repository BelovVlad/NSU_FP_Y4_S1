#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CORE = ROOT / 'docs/app-core.js'
OUTPUT = ROOT / 'docs/app.js'

AUDIO_SHIM = r'''

;(() => {
  'use strict';
  const base = new URL('./', document.currentScript.src);
  const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));
  const audioUrl = name => new URL('Karma/audio/' + name + '.wav', base).href;
  const warm = [];

  window.playSecretDashboardSound = (name, volume = 1, options = {}) => {
    const audio = new Audio(audioUrl(name));
    audio.preload = 'auto';
    audio.loop = !!options.loop;
    audio.volume = clamp(volume);
    audio.playbackRate = Math.max(.25, Math.min(4, Number(options.pitch) || 1));
    let stopped = false;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      audio.pause();
      try { audio.currentTime = 0; } catch {}
    };
    stop.set = (nextVolume, nextPitch) => {
      if (Number.isFinite(Number(nextVolume))) audio.volume = clamp(nextVolume);
      if (Number.isFinite(Number(nextPitch))) audio.playbackRate = Math.max(.25, Math.min(4, Number(nextPitch)));
    };
    audio.play().catch(() => {});
    return stop;
  };

  window.preloadKarmaSounds = () => {
    if (!warm.length) {
      for (const name of ['UIWood5','UIWoodHit','capBell2','karmaFuzz','karmaFuzz2','karmaRiseA','karmaWheelC_1','karmaWheelC_2','karmaWheelC_3','karmaWheelC_4','karmaWheelLow']) {
        const audio = new Audio(audioUrl(name));
        audio.preload = 'auto';
        try { audio.load(); } catch {}
        warm.push(audio);
      }
    }
    return Promise.resolve();
  };
})();
'''


def main():
    OUTPUT.write_text(CORE.read_text(encoding='utf-8').rstrip() + AUDIO_SHIM, encoding='utf-8')
    print(f'Built {OUTPUT.relative_to(ROOT)} from {CORE.relative_to(ROOT)} + Karma audio shim')


if __name__ == '__main__':
    main()
