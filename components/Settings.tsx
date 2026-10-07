import { Check, Keyboard, Palette, RefreshCw, Save, Type } from 'lucide-react';
import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { AppSettings } from '../types';

interface SettingsProps {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
}

const BACKGROUNDS = [
  '#000000', '#18181b', '#27272a', '#3f3f46', '#44403c',
  '#450a0a', '#7f1d1d', '#7c2d12', '#713f12', '#365314',
  '#14532d', '#134e4a', '#164e63', '#0c4a6e', '#172554',
  '#1e1b4b', '#3b0764', '#4a044e', '#4c0519', '#78350f',
  '#f5f5f4', '#fef3c7', '#ecfccb', '#e0f2fe', '#fce7f3',
];

function Toggle({ checked, disabled = false, label, description, onChange }: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  description: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={`setting-row${disabled ? ' disabled' : ''}`}>
      <span><strong>{label}</strong><small>{description}</small></span>
      <input type="checkbox" checked={checked} disabled={disabled}
        onChange={event => onChange(event.target.checked)} />
    </label>
  );
}

export default function Settings({ settings, onChange }: SettingsProps) {
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    onChange({ ...settings, [key]: value });

  const checkForUpdates = async () => {
    setChecking(true);
    setUpdateStatus(null);
    try {
      if (Capacitor.isNativePlatform()) {
        setUpdateStatus('Android updates are delivered through the app store.');
        return;
      }
      if (!('serviceWorker' in navigator)) {
        setUpdateStatus('Updates are checked when you reload this browser.');
        return;
      }
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        setUpdateStatus('Update service is not ready yet. Reload and try again.');
        return;
      }
      await registration.update();
      setUpdateStatus(registration.installing || registration.waiting
        ? 'An update was found and will be ready shortly.'
        : 'You are using the latest available version.');
    } catch {
      setUpdateStatus('Could not check for updates. Check your connection and try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <section>
      <header className="page-header">
        <div><p className="eyebrow">Make it yours</p><h1>Settings</h1></div>
      </header>

      <div className="settings-section">
        <div className="settings-heading"><Keyboard aria-hidden="true" /><div><h2>Custom keyboard</h2><p>Controls for the in-game keyboard.</p></div></div>
        <Toggle checked={settings.customKeyboard} label="Use custom keyboard"
          description="Show the compact keyboard, movement bar, and dictation button."
          onChange={value => update('customKeyboard', value)} />
        <div className="nested-settings" aria-disabled={!settings.customKeyboard}>
          <Toggle checked={settings.keyboardShortcuts} disabled={!settings.customKeyboard}
            label="Keyboard shortcuts" description="Show shortcut commands above the keyboard."
            onChange={value => update('keyboardShortcuts', value)} />
          <Toggle checked={settings.swipeControls} disabled={!settings.customKeyboard}
            label="Glide typing" description="Trace across letter keys to compose words."
            onChange={value => update('swipeControls', value)} />
          <label className={`setting-row color-setting${!settings.customKeyboard ? ' disabled' : ''}`}>
            <span><strong>Keyboard color</strong><small>Choose the keyboard surface color.</small></span>
            <input aria-label="Keyboard color" type="color" value={settings.keyboardColor}
              disabled={!settings.customKeyboard} onChange={event => update('keyboardColor', event.target.value)} />
          </label>
        </div>
        <p className="settings-note">Dictation uses the browser or Android speech service when it is available.</p>
      </div>

      <div className="settings-section">
        <div className="settings-heading"><Type aria-hidden="true" /><div><h2>Reading</h2><p>Applied when a story opens.</p></div></div>
        <label className="slider-setting">
          <span><strong>Font size</strong><output>{settings.fontSize}px</output></span>
          <input aria-label="Story font size" type="range" min="12" max="28" step="1"
            value={settings.fontSize} onChange={event => update('fontSize', Number(event.target.value))} />
        </label>
        <div className="palette-setting">
          <div className="settings-heading compact"><Palette aria-hidden="true" /><div><h3>Background color</h3><p>Choose from 25 reading colors.</p></div></div>
          <div className="color-palette" role="radiogroup" aria-label="Story background color">
            {BACKGROUNDS.map(color => (
              <button key={color} type="button" role="radio" aria-label={color}
                aria-checked={settings.backgroundColor === color}
                className={settings.backgroundColor === color ? 'selected' : ''}
                style={{ backgroundColor: color }} onClick={() => update('backgroundColor', color)}>
                {settings.backgroundColor === color && <Check aria-hidden="true" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-heading"><Save aria-hidden="true" /><div><h2>Autosave</h2><p>Parchment restores the latest VM snapshot for each story.</p></div></div>
        <label className="select-setting">
          <span><strong>Frequency</strong><small>Every turn is Parchment's native, safest checkpoint.</small></span>
          <select aria-label="Autosave frequency" value={settings.autosave}
            onChange={event => update('autosave', event.target.value as AppSettings['autosave'])}>
            <option value="turn">Every turn</option>
            <option value="off">Off</option>
          </select>
        </label>
      </div>

      <div className="settings-section">
        <div className="settings-heading"><RefreshCw aria-hidden="true" /><div><h2>App updates</h2><p>Ask the service worker to check the deployed app.</p></div></div>
        <button className="secondary-button update-button" disabled={checking} onClick={checkForUpdates}>
          <RefreshCw className={checking ? 'spin' : ''} size={18} aria-hidden="true" />
          {checking ? 'Checking...' : 'Check for updates'}
        </button>
        {updateStatus && <p className="update-status" role="status">{updateStatus}</p>}
      </div>
    </section>
  );
}
