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
  const [exiting, setExiting] = useState(false);
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(() => new Set());
  const iframe = useRef<HTMLIFrameElement>(null);
  const pendingAutosave = useRef<((success: boolean) => void) | null>(null);
  const autosaveTimeout = useRef<number | null>(null);
  const autosaveInFlight = useRef(false);
  const lastAutosaveRequest = useRef(0);
  const lastAutosaveSuccess = useRef(0);
  const lastFocusSave = useRef(0);
  const localStoryUrl = `local-game/${game.id}/${storyFileName(game)}`;
  const autosaveEnabled = settings.autosave === 'five-minutes';
  const autosaveMarker = `fableforge.autosave.v1:${game.id}:${storyFileName(game)}`;
  const interpreterUrl = `./parchment.html?${new URLSearchParams({
    story: localStoryUrl,
    do_vm_autosave: '0',
    fableforge_autosave: autosaveEnabled ? '1' : '0',
    fableforge_restore: autosaveEnabled && localStorage.getItem(autosaveMarker) ? '1' : '0',
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

  const requestAutosave = (reason: 'scheduled' | 'focus-loss' | 'exit', waitForResult = false) => {
    if (!autosaveEnabled || !iframe.current?.contentWindow) return Promise.resolve(false);
    const now = Date.now();
    if (reason === 'exit' && now - lastAutosaveSuccess.current < 5000) return Promise.resolve(true);
    if (autosaveInFlight.current) {
      if (!waitForResult) return Promise.resolve(false);
      if (autosaveTimeout.current !== null) window.clearTimeout(autosaveTimeout.current);
      return new Promise<boolean>(resolve => {
        pendingAutosave.current = resolve;
        autosaveTimeout.current = window.setTimeout(() => {
          pendingAutosave.current = null;
          autosaveTimeout.current = null;
          resolve(false);
        }, 7000);
      });
    }
    if (reason !== 'exit' && now - lastAutosaveRequest.current < 5000) return Promise.resolve(false);
    autosaveInFlight.current = true;
    lastAutosaveRequest.current = now;
    if (!waitForResult) {
      iframe.current.contentWindow.postMessage({ type: 'fableforge-autosave', reason }, window.location.origin);
      if (autosaveTimeout.current !== null) window.clearTimeout(autosaveTimeout.current);
      autosaveTimeout.current = window.setTimeout(() => {
        autosaveInFlight.current = false;
        autosaveTimeout.current = null;
      }, 7000);
      return Promise.resolve(true);
    }
    if (autosaveTimeout.current !== null) window.clearTimeout(autosaveTimeout.current);
    return new Promise<boolean>(resolve => {
      pendingAutosave.current = resolve;
      autosaveTimeout.current = window.setTimeout(() => {
        pendingAutosave.current = null;
        autosaveTimeout.current = null;
        resolve(false);
      }, 7000);
      iframe.current?.contentWindow?.postMessage({ type: 'fableforge-autosave', reason }, window.location.origin);
    });
  };

  const exitStory = async () => {
    if (exiting) return;
    setExiting(true);
    await requestAutosave('exit', true);
    onExit();
  };

  useEffect(() => {
    const setKeyPressed = (key: string, pressed: boolean) => {
      const normalizedKey = key.toLowerCase();
      setPressedKeys(current => {
        const next = new Set(current);
        if (pressed) next.add(normalizedKey);
        else next.delete(normalizedKey);
        return next;
      });
    };
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== iframe.current?.contentWindow) return;
      if (event.data?.type === 'fableforge-physical-key') {
        setKeyPressed(String(event.data.key || ''), event.data.pressed === true);
      } else if (event.data?.type === 'fableforge-autosave-result') {
        const success = event.data.success === true;
        autosaveInFlight.current = false;
        if (success) {
          lastAutosaveSuccess.current = Date.now();
          localStorage.setItem(autosaveMarker, new Date().toISOString());
        }
        if (autosaveTimeout.current !== null) window.clearTimeout(autosaveTimeout.current);
        autosaveTimeout.current = null;
        if (pendingAutosave.current) {
          pendingAutosave.current(success);
          pendingAutosave.current = null;
        }
      } else if (event.data?.type === 'fableforge-autorestore-result') {
        if (event.data.success !== true) localStorage.removeItem(autosaveMarker);
        if (pendingAutosave.current) {
          pendingAutosave.current(false);
          pendingAutosave.current = null;
          if (autosaveTimeout.current !== null) window.clearTimeout(autosaveTimeout.current);
          autosaveTimeout.current = null;
        }
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || document.activeElement === iframe.current) return;
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, select, [contenteditable="true"]')) return;
      if (target?.matches('button') && (event.key === 'Enter' || event.key === ' ')) return;

      if (event.key === 'Backspace') {
        event.preventDefault();
        sendKeyboardInput('backspace');
      } else if (event.key === 'Enter') {
        event.preventDefault();
        sendKeyboardInput('submit');
      } else if (event.key.length === 1) {
        event.preventDefault();
        sendKeyboardInput('append', event.key);
      } else {
        return;
      }
      setKeyPressed(event.key, true);
    };
    const handleKeyUp = (event: KeyboardEvent) => setKeyPressed(event.key, false);
    const clearPressedKeys = () => setPressedKeys(new Set());
    window.addEventListener('message', handleMessage);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', clearPressedKeys);
    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', clearPressedKeys);
    };
  }, [autosaveMarker]);

  useEffect(() => {
    if (state !== 'ready' || !autosaveEnabled) return;
    const interval = window.setInterval(() => requestAutosave('scheduled'), 5 * 60 * 1000);
    const saveOnFocusLoss = () => {
      const now = Date.now();
      if (now - lastFocusSave.current < 1000) return;
      lastFocusSave.current = now;
      void requestAutosave('focus-loss');
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') saveOnFocusLoss();
    };
    window.addEventListener('blur', saveOnFocusLoss);
    window.addEventListener('pagehide', saveOnFocusLoss);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('blur', saveOnFocusLoss);
      window.removeEventListener('pagehide', saveOnFocusLoss);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [state, autosaveEnabled]);

  useEffect(() => () => {
    if (autosaveTimeout.current !== null) window.clearTimeout(autosaveTimeout.current);
  }, []);

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
        <button onClick={exitStory} disabled={exiting} aria-label="Back to library"><ArrowLeft /></button>
        <div>
          <strong>{game.title}</strong>
          <span>{autosaveEnabled ? (exiting ? 'Saving before exit…' : 'Autosaves every 5 minutes') : 'Autosave is off'}</span>
        </div>
      </header>
      <div className="player-stage">
        {state === 'checking' && <div className="player-message"><LoaderCircle className="spin" /><p>Opening story…</p></div>}
        {state === 'missing' && <div className="player-message"><p>The story could not be opened. Check that offline storage is enabled, then add it again from Browse Stories.</p></div>}
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
        <CustomKeyboard color={settings.keyboardColor} pressedKeys={pressedKeys}
          keyboardShortcuts={settings.keyboardShortcuts} swipeControls={settings.swipeControls}
          onInput={sendKeyboardInput} />
      )}
    </div>
  );
}
