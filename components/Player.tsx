import { ArrowLeft, LoaderCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { hasGameFile } from '../services/db';
import { AppSettings, InstalledGame } from '../types';
import { storyFileName } from '../utils';
import CustomKeyboard, { KeyboardAction } from './CustomKeyboard';

interface PlayerProps {
  game: InstalledGame;
  settings: AppSettings;
  onExit: () => void;
}

export default function Player({ game, settings, onExit }: PlayerProps) {
  const [state, setState] = useState<'checking' | 'ready' | 'missing'>('checking');
  const iframe = useRef<HTMLIFrameElement>(null);
  const localStoryUrl = `local-game/${game.id}/${storyFileName(game)}`;
  const interpreterUrl = `./parchment.html?${new URLSearchParams({
    story: localStoryUrl,
    do_vm_autosave: settings.autosave === 'turn' ? '1' : '0',
    font_size: String(settings.fontSize),
    background_color: settings.backgroundColor,
    custom_keyboard: settings.customKeyboard ? '1' : '0',
  })}`;

  const sendKeyboardInput = (action: KeyboardAction, text?: string) => {
    iframe.current?.contentWindow?.postMessage({
      type: 'fableforge-keyboard-input',
      action,
      text,
    }, window.location.origin);
  };

  useEffect(() => {
    let active = true;
    const prepare = async () => {
      if (!('serviceWorker' in navigator)) return false;
      await navigator.serviceWorker.ready;
      return hasGameFile(game.id);
    };
    prepare()
      .then(ready => active && setState(ready ? 'ready' : 'missing'))
      .catch(() => active && setState('missing'));
    return () => { active = false; };
  }, [game.id]);

  return (
    <div className="player-shell">
      <header className="player-header">
        <button onClick={onExit} aria-label="Back to library"><ArrowLeft /></button>
        <div>
          <strong>{game.title}</strong>
          <span>{settings.autosave === 'turn' ? 'Progress saves after every turn' : 'Autosave is off'}</span>
        </div>
      </header>
      <div className="player-stage">
        {state === 'checking' && <div className="player-message"><LoaderCircle className="spin" /><p>Opening story…</p></div>}
        {state === 'missing' && <div className="player-message"><p>The story could not be opened. Check that offline storage is enabled, then add it again from Downloads.</p></div>}
        {state === 'ready' && (
          <iframe
            ref={iframe}
            title={`${game.title} interpreter`}
            src={interpreterUrl}
            sandbox="allow-scripts allow-same-origin allow-forms allow-downloads"
          />
        )}
      </div>
      {state === 'ready' && settings.customKeyboard && (
        <CustomKeyboard color={settings.keyboardColor} shortcuts={settings.keyboardShortcuts}
          swipeControls={settings.swipeControls} onInput={sendKeyboardInput} />
      )}
    </div>
  );
}
