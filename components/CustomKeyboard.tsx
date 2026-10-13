import { ChevronDown, ChevronUp, CornerDownLeft, Delete, Mic, MicOff, Space } from 'lucide-react';
import { PointerEvent, useEffect, useRef, useState } from 'react';
import { decodeGlide, GlidePoint } from '../services/glide-decoder';

export type KeyboardAction = 'append' | 'backspace' | 'submit' | 'replace-tail';

interface CustomKeyboardProps {
  color: string;
  pressedKeys: ReadonlySet<string>;
  keyboardShortcuts: boolean;
  glideTyping: boolean;
  onInput: (action: KeyboardAction, text?: string, previous?: string) => void;
}

interface SpeechRecognitionResultLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: { isFinal?: boolean; [index: number]: { transcript: string } };
  };
}

interface SpeechRecognitionErrorLike {
  error?: string;
  message?: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionResultLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type SpeechRecognitionConstructor = {
  new (): SpeechRecognitionLike;
};

const LETTER_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
const MOVEMENT = [
  ['N', 'north'], ['S', 'south'], ['E', 'east'], ['W', 'west'],
  ['In', 'in'], ['Out', 'out'], ['Up', 'up'], ['Down', 'down'],
] as const;
function speechConstructor(): SpeechRecognitionConstructor | undefined {
  const speechWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
}

export default function CustomKeyboard({ color, pressedKeys, keyboardShortcuts, glideTyping, onInput }: CustomKeyboardProps) {
  const [minimized, setMinimized] = useState(false);
  const [listening, setListening] = useState(false);
  const [dictationError, setDictationError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<{ options: string[]; accepted: string } | null>(null);
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const dictationEnabled = useRef(false);
  const restartTimer = useRef<number | null>(null);
  const glide = useRef<{ pointerId: number; startX: number; startY: number; letters: string[]; points: GlidePoint[] } | null>(null);
  const suppressClick = useRef(false);

  const sendCommand = (command: string, submit: boolean) => {
    setSuggestions(null);
    onInput(submit ? 'submit' : 'append', command);
  };

  const sendKey = (action: KeyboardAction, text?: string) => {
    setSuggestions(null);
    onInput(action, text);
  };

  useEffect(() => () => {
    dictationEnabled.current = false;
    if (restartTimer.current !== null) window.clearTimeout(restartTimer.current);
    try { recognition.current?.stop(); } catch { /* Recognition may already have ended. */ }
  }, []);

  const toggleDictation = () => {
    setDictationError(null);
    if (dictationEnabled.current) {
      dictationEnabled.current = false;
      setListening(false);
      if (restartTimer.current !== null) window.clearTimeout(restartTimer.current);
      const activeRecognition = recognition.current;
      recognition.current = null;
      try { activeRecognition?.stop(); } catch { /* Recognition may already have ended. */ }
      return;
    }
    const Recognition = speechConstructor();
    if (!Recognition) {
      setDictationError('Dictation is not available in this browser. Try Chrome or the Android app.');
      return;
    }
    dictationEnabled.current = true;
    try {
      const instance = new Recognition();
      instance.continuous = true;
      instance.interimResults = false;
      instance.lang = navigator.language || 'en-US';
      instance.onresult = event => {
        const transcripts: string[] = [];
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          if (result.isFinal !== false) {
            const transcript = result[0]?.transcript?.trim();
            if (transcript) transcripts.push(transcript);
          }
        }
        if (transcripts.length) sendKey('append', `${transcripts.join(' ')} `);
      };
      instance.onerror = event => {
        if (!dictationEnabled.current || recognition.current !== instance) return;
        if (event.error === 'no-speech' || event.error === 'aborted') return;
        dictationEnabled.current = false;
        recognition.current = null;
        setListening(false);
        const messages: Record<string, string> = {
          'audio-capture': 'Microphone unavailable. Check that another app is not using it.',
          'not-allowed': 'Microphone permission was denied. Allow it in your browser or app settings.',
          'service-not-allowed': 'Speech recognition is blocked on this device or browser.',
          'network': 'Speech recognition needs a connection on this device. Check your network.',
          'language-not-supported': 'Speech recognition does not support this language on this device.',
          'language-unavailable': 'The speech language pack is unavailable on this device.',
        };
        const code = event.error || 'unknown';
        const explanation = messages[code] || 'Dictation failed. Try again.';
        setDictationError(`${explanation} (Code: ${code}${event.message ? `; ${event.message}` : ''})`);
      };
      instance.onend = () => {
        if (!dictationEnabled.current || recognition.current !== instance) return;
        restartTimer.current = window.setTimeout(() => {
          restartTimer.current = null;
          if (!dictationEnabled.current || recognition.current !== instance) return;
          try {
            instance.start();
          } catch {
            dictationEnabled.current = false;
            recognition.current = null;
            setListening(false);
            setDictationError('Dictation stopped unexpectedly. Tap the microphone to try again.');
          }
        }, 700);
      };
      recognition.current = instance;
      instance.start();
      setListening(true);
    } catch {
      dictationEnabled.current = false;
      recognition.current = null;
      setListening(false);
      setDictationError('Could not start dictation. Check microphone permissions and try again.');
    }
  };

  const trackLetter = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = glide.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const lastPoint = gesture.points[gesture.points.length - 1];
    if (Math.hypot(event.clientX - lastPoint.x, event.clientY - lastPoint.y) >= 3) {
      gesture.points.push({ x: event.clientX, y: event.clientY });
    }
    const letter = document.elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLButtonElement>('button[data-letter]')?.dataset.letter;
    if (letter && gesture.letters[gesture.letters.length - 1] !== letter) gesture.letters.push(letter);
  };

  const finishGlide = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = glide.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    trackLetter(event);
    glide.current = null;
    if (gesture.letters.length < 2 ||
      Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) < 12) return;
    suppressClick.current = true;
    window.setTimeout(() => { suppressClick.current = false; }, 300);
    const layout = Object.fromEntries([...event.currentTarget.querySelectorAll<HTMLButtonElement>('button[data-letter]')]
      .map(button => {
        const bounds = button.getBoundingClientRect();
        return [button.dataset.letter!, { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }];
      }));
    const options = decodeGlide(gesture.points, gesture.letters, layout);
    if (!options.length) return;
    setSuggestions({ options, accepted: options[0] });
    onInput('append', `${options[0]} `);
  };

  return (
    <div className={`custom-keyboard${minimized ? ' minimized' : ''}`} style={{ backgroundColor: color }}
      onClickCapture={event => {
        if (!suppressClick.current || !(event.target as Element).closest('button[data-letter]')) return;
        event.preventDefault();
        event.stopPropagation();
        suppressClick.current = false;
      }}>
      <button type="button" className="keyboard-collapse-button"
        aria-label={minimized ? 'Expand keyboard' : 'Minimize keyboard'}
        aria-expanded={!minimized} onClick={() => setMinimized(value => !value)}>
        {minimized ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
      </button>
      {!minimized && <>
      {keyboardShortcuts && (
        <div className="command-strip" aria-label="Movement commands">
          {MOVEMENT.map(([label, command]) => (
            <button key={label} type="button" title={`Go ${command}`} aria-label={`Go ${command}`}
              onClick={() => sendCommand(command, true)}>{label}</button>
          ))}
        </div>
      )}
      {suggestions && (
        <div className="glide-suggestions" aria-label="Glide suggestions">
          {suggestions.options.map(word => (
            <button key={word} type="button" aria-pressed={suggestions.accepted === word}
              onClick={() => {
                if (suggestions.accepted === word) return;
                onInput('replace-tail', `${word} `, `${suggestions.accepted} `);
                setSuggestions(current => current && { ...current, accepted: word });
              }}>{word}</button>
          ))}
        </div>
      )}
      {dictationError && <div className="dictation-error" role="alert">{dictationError}</div>}
      <div className="letter-keys" aria-label="Custom story keyboard"
        onPointerDown={event => {
          if (!glideTyping) return;
          const key = (event.target as Element).closest<HTMLButtonElement>('button[data-letter]');
          if (!key?.dataset.letter) return;
          glide.current = {
            pointerId: event.pointerId, startX: event.clientX, startY: event.clientY,
            letters: [key.dataset.letter], points: [{ x: event.clientX, y: event.clientY }],
          };
          key.setPointerCapture(event.pointerId);
        }}
        onPointerMove={trackLetter}
        onPointerUp={finishGlide}
        onPointerCancel={() => { glide.current = null; }}>
        {LETTER_ROWS.map((row, rowIndex) => (
          <div className="letter-row" key={row}>
            {[...row].map(letter => (
              <button key={letter} type="button" data-letter={letter.toLowerCase()}
                className={pressedKeys.has(letter.toLowerCase()) ? 'key-pressed' : ''}
                onClick={() => sendKey('append', letter.toLowerCase())}>{letter}</button>
            ))}
            {rowIndex === 0 && (
              <button type="button" className={`backspace-key${pressedKeys.has('backspace') ? ' key-pressed' : ''}`}
                aria-label="Backspace" onClick={() => sendKey('backspace')}><Delete aria-hidden="true" /></button>
            )}
          </div>
        ))}
        <div className="letter-row utility-row">
          <button type="button" className={listening ? 'listening' : ''} aria-label={listening ? 'Stop dictation' : 'Start dictation'}
            aria-pressed={listening} onClick={toggleDictation}>
            {listening ? <MicOff aria-hidden="true" /> : <Mic aria-hidden="true" />}
          </button>
          <button type="button" className={`space-key${pressedKeys.has(' ') ? ' key-pressed' : ''}`} aria-label="Space" onClick={() => sendKey('append', ' ')}><Space aria-hidden="true" /></button>
          <button type="button" className={pressedKeys.has('enter') ? 'key-pressed' : ''} aria-label="Enter command" onClick={() => sendKey('submit')}><CornerDownLeft aria-hidden="true" /></button>
        </div>
      </div>
      </>}
    </div>
  );
}
