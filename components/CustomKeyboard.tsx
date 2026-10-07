import { CornerDownLeft, Delete, Mic, MicOff, Space } from 'lucide-react';
import { PointerEvent, useEffect, useRef, useState } from 'react';

export type KeyboardAction = 'append' | 'backspace' | 'submit';

interface CustomKeyboardProps {
  color: string;
  shortcuts: boolean;
  swipeControls: boolean;
  onInput: (action: KeyboardAction, text?: string) => void;
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
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  processLocally?: boolean;
  onresult: ((event: SpeechRecognitionResultLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type SpeechRecognitionConstructor = {
  new (): SpeechRecognitionLike;
  available?: (options: { langs: string[]; processLocally: boolean }) => Promise<string>;
  install?: (options: { langs: string[]; processLocally: boolean }) => Promise<boolean>;
};

const LETTER_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
const MOVEMENT = [
  ['Go', 'go ', false], ['N', 'north', true], ['S', 'south', true],
  ['E', 'east', true], ['W', 'west', true], ['In', 'in', true],
  ['Out', 'out', true], ['Up', 'up', true], ['Down', 'down', true],
] as const;
const SHORTCUTS = [
  ['X', 'examine ', false, 'Examine'],
  ['I', 'inventory', true, 'Inventory'],
  ['T', 'talk to ', false, 'Talk to'],
  ['L', 'look', true, 'Look'],
  ['Z', 'wait', true, 'Wait'],
] as const;

function speechConstructor(): SpeechRecognitionConstructor | undefined {
  const speechWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
}

export default function CustomKeyboard({ color, shortcuts, swipeControls, onInput }: CustomKeyboardProps) {
  const [listening, setListening] = useState(false);
  const [speechMessage, setSpeechMessage] = useState<string | null>(null);
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const dictationEnabled = useRef(false);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);

  const sendCommand = (command: string, submit: boolean) =>
    onInput(submit ? 'submit' : 'append', command);

  useEffect(() => () => {
    dictationEnabled.current = false;
    recognition.current?.stop();
  }, []);

  const toggleDictation = async () => {
    if (dictationEnabled.current) {
      dictationEnabled.current = false;
      setListening(false);
      setSpeechMessage('Dictation stopped.');
      const activeRecognition = recognition.current;
      recognition.current = null;
      activeRecognition?.stop();
      return;
    }
    const Recognition = speechConstructor();
    if (!Recognition) {
      setSpeechMessage('Dictation is not available in this browser.');
      return;
    }
    dictationEnabled.current = true;
    setListening(true);
    try {
      const instance = new Recognition();
      const language = navigator.language || 'en-US';
      let localRecognition = false;
      if (Recognition.available) {
        try {
          const availability = await Recognition.available({ langs: [language], processLocally: true });
          if (availability === 'available') {
            localRecognition = true;
          } else if ((availability === 'downloadable' || availability === 'downloading') && Recognition.install) {
            setSpeechMessage('Preparing offline dictation language pack...');
            localRecognition = await Recognition.install({ langs: [language], processLocally: true });
          }
        } catch {
          // Experimental local recognition is optional; use the platform service below.
        }
      }
      if (!dictationEnabled.current) return;
      instance.continuous = true;
      instance.interimResults = false;
      instance.lang = language;
      if (localRecognition) instance.processLocally = true;
      instance.onresult = event => {
        const transcripts: string[] = [];
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          if (result.isFinal !== false) {
            const transcript = result[0]?.transcript?.trim();
            if (transcript) transcripts.push(transcript);
          }
        }
        if (transcripts.length) onInput('append', `${transcripts.join(' ')} `);
      };
      instance.onerror = event => {
        const fatalErrors = ['audio-capture', 'language-not-supported', 'network', 'not-allowed', 'service-not-allowed'];
        if (event.error && fatalErrors.includes(event.error)) {
          dictationEnabled.current = false;
          recognition.current = null;
          setListening(false);
          setSpeechMessage(event.error === 'not-allowed'
            ? 'Microphone permission was denied.'
            : 'Continuous dictation stopped because speech recognition is unavailable.');
        } else {
          setSpeechMessage('Listening...');
        }
      };
      instance.onend = () => {
        if (!dictationEnabled.current) return;
        window.setTimeout(() => {
          if (!dictationEnabled.current) return;
          try {
            instance.start();
          } catch {
            dictationEnabled.current = false;
            recognition.current = null;
            setListening(false);
            setSpeechMessage('Continuous dictation stopped. Tap the microphone to try again.');
          }
        }, 250);
      };
      recognition.current = instance;
      setSpeechMessage(localRecognition ? 'On-device dictation is active.' : 'Using the device speech service; internet may be required.');
      instance.start();
    } catch {
      dictationEnabled.current = false;
      recognition.current = null;
      setListening(false);
      setSpeechMessage('Dictation could not start. Check microphone permission.');
    }
  };

  const finishSwipe = (event: PointerEvent<HTMLDivElement>) => {
    if (!swipeControls || !pointerStart.current) return;
    const deltaX = event.clientX - pointerStart.current.x;
    const deltaY = event.clientY - pointerStart.current.y;
    pointerStart.current = null;
    if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 45) return;
    suppressClick.current = true;
    window.setTimeout(() => { suppressClick.current = false; }, 300);
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      sendCommand(deltaX > 0 ? 'east' : 'west', true);
    } else {
      sendCommand(deltaY > 0 ? 'south' : 'north', true);
    }
  };

  return (
    <div className="custom-keyboard" style={{ backgroundColor: color }}
      onPointerDown={event => { pointerStart.current = { x: event.clientX, y: event.clientY }; }}
      onPointerUp={finishSwipe} onPointerCancel={() => { pointerStart.current = null; }}
      onClickCapture={event => {
        if (!suppressClick.current) return;
        event.preventDefault();
        event.stopPropagation();
        suppressClick.current = false;
      }}>
      <div className="command-strip" aria-label="Movement commands">
        {MOVEMENT.map(([label, command, submit]) => (
          <button key={label} type="button" onClick={() => sendCommand(command, submit)}>{label}</button>
        ))}
      </div>
      {shortcuts && (
        <div className="command-strip shortcut-strip" aria-label="Command shortcuts">
          {SHORTCUTS.map(([label, command, submit, title]) => (
            <button key={label} type="button" title={title} aria-label={title}
              onClick={() => sendCommand(command, submit)}>{label}</button>
          ))}
        </div>
      )}
      <div className="letter-keys" aria-label="Custom story keyboard">
        {LETTER_ROWS.map(row => (
          <div className="letter-row" key={row}>
            {[...row].map(letter => (
              <button key={letter} type="button" onClick={() => onInput('append', letter.toLowerCase())}>{letter}</button>
            ))}
          </div>
        ))}
        <div className="letter-row utility-row">
          <button type="button" className={listening ? 'listening' : ''} aria-label={listening ? 'Stop dictation' : 'Start dictation'}
            aria-pressed={listening} onClick={toggleDictation}>
            {listening ? <MicOff aria-hidden="true" /> : <Mic aria-hidden="true" />}
          </button>
          <button type="button" className="space-key" aria-label="Space" onClick={() => onInput('append', ' ')}><Space aria-hidden="true" /></button>
          <button type="button" aria-label="Backspace" onClick={() => onInput('backspace')}><Delete aria-hidden="true" /></button>
          <button type="button" aria-label="Enter command" onClick={() => onInput('submit')}><CornerDownLeft aria-hidden="true" /></button>
        </div>
      </div>
      {swipeControls && <span className="swipe-hint">Glide typing enabled</span>}
      {speechMessage && <span className="keyboard-message" role="status">{speechMessage}</span>}
    </div>
  );
}
