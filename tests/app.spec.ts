import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    localStorage.clear();
    const databases = await indexedDB.databases();
    await Promise.all(databases.map(database => new Promise<void>(resolve => {
      if (!database.name) return resolve();
      const request = indexedDB.deleteDatabase(database.name);
      request.onsuccess = request.onerror = request.onblocked = () => resolve();
    })));
  });
  await page.reload();
});

test('custom keyboard observer ignores unrelated Parchment DOM churn', async ({ page }) => {
  await page.addInitScript(() => {
    (window as typeof window & { keyboardReadyMessages?: number }).keyboardReadyMessages = 0;
    window.addEventListener('message', event => {
      if (event.data?.type === 'fableforge-keyboard-ready') {
        (window as typeof window & { keyboardReadyMessages: number }).keyboardReadyMessages += 1;
      }
    });
  });
  await page.goto('/parchment.html?custom_keyboard=1&autoplay=0');

  const readyMessages = await page.evaluate(async () => {
    const input = document.createElement('textarea');
    input.className = 'Input LineInput';
    input.setAttribute('aria-hidden', 'false');
    document.body.append(input);
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);

    const unrelatedElement = document.createElement('div');
    document.body.append(unrelatedElement);
    for (let index = 0; index < 20; index += 1) {
      unrelatedElement.setAttribute('data-render-pass', String(index));
      await new Promise(requestAnimationFrame);
    }

    return (window as typeof window & { keyboardReadyMessages: number }).keyboardReadyMessages;
  });

  expect(readyMessages).toBe(1);
});

test('Parchment automation silently writes the reserved autosave slot and preserves a draft', async ({ page }) => {
  await page.goto('/parchment.html?autoplay=0&fableforge_autosave=1');
  await page.evaluate(() => {
    const root = document.documentElement as HTMLElement & { dataset: DOMStringMap & { autosaveResult?: string } };
    window.addEventListener('message', event => {
      if (event.data?.type === 'fableforge-autosave-result') {
        root.dataset.autosaveResult = String(event.data.success);
      }
    });
    const input = document.createElement('textarea');
    input.className = 'Input LineInput';
    input.setAttribute('aria-hidden', 'false');
    input.value = 'unfinished command';
    const transcript = document.createElement('div');
    transcript.className = 'BufferWindowInner';
    const commandLine = document.createElement('div');
    commandLine.className = 'BufferLine';
    commandLine.innerHTML = '<span>&gt;</span>';
    commandLine.append(input);
    transcript.append(commandLine);
    document.body.append(transcript);
    input.onkeypress = event => {
      if (event.keyCode !== 13 || input.value !== 'save') return;
      commandLine.innerHTML = '<span>&gt;</span><span class="Style_input">save</span>';
      const dialog = document.createElement('dialog');
      dialog.className = 'asyncglk_file_dialog';
      dialog.open = true;
      dialog.innerHTML = '<div id="title">Save a savefile</div><textarea id="filename_input"></textarea><button class="submit">Save</button><button class="close">Cancel</button>';
      dialog.querySelector('button.submit')?.addEventListener('click', () => {
        root.dataset.savedName = (dialog.querySelector('#filename_input') as HTMLTextAreaElement).value;
        transcript.insertAdjacentHTML('beforeend', '<div class="BufferLine"><span class="Style_normal">Ok.</span></div>');
        input.value = '';
        const newPrompt = document.createElement('div');
        newPrompt.className = 'BufferLine';
        newPrompt.innerHTML = '<span>&gt;</span>';
        newPrompt.append(input);
        transcript.append(newPrompt);
        dialog.remove();
      });
      document.body.append(dialog);
    };
  });

  await page.evaluate(() => window.postMessage({ type: 'fableforge-autosave', reason: 'focus-loss' }, window.location.origin));
  await expect(page.locator('html')).toHaveAttribute('data-autosave-result', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-saved-name', 'autosave');
  await expect(page.locator('textarea.Input')).toHaveValue('unfinished command');
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await expect(page.locator('.BufferLine').filter({ hasText: 'save' })).toBeHidden();
  await expect(page.locator('.BufferLine').filter({ hasText: 'Ok.' })).toBeHidden();
});

test('scheduled autosave waits while a command is being typed', async ({ page }) => {
  await page.goto('/parchment.html?autoplay=0&fableforge_autosave=1');
  await page.evaluate(() => {
    window.addEventListener('message', event => {
      if (event.data?.type === 'fableforge-autosave-result') {
        document.documentElement.dataset.autosaveSkipped = String(event.data.skipped);
      }
    });
    const input = document.createElement('textarea');
    input.className = 'Input LineInput';
    input.setAttribute('aria-hidden', 'false');
    input.value = 'unfinished command';
    document.body.append(input);
  });

  await page.evaluate(() => window.postMessage({ type: 'fableforge-autosave', reason: 'scheduled' }, window.location.origin));
  await expect(page.locator('html')).toHaveAttribute('data-autosave-skipped', 'true');
  await expect(page.locator('textarea.Input')).toHaveValue('unfinished command');
  await expect(page.locator('html')).not.toHaveClass(/fableforge-file-operation/);
});

test('Parchment automation selects and restores the reserved autosave slot', async ({ page }) => {
  await page.goto('/parchment.html?autoplay=0&fableforge_autosave=1&fableforge_restore=1');
  await page.evaluate(() => {
    const root = document.documentElement;
    window.addEventListener('message', event => {
      if (event.data?.type === 'fableforge-autorestore-result') {
        root.dataset.autorestoreResult = String(event.data.success);
      }
    });
    const input = document.createElement('textarea');
    input.className = 'Input LineInput';
    input.setAttribute('aria-hidden', 'false');
    input.onkeypress = event => {
      if (event.keyCode !== 13 || input.value !== 'restore') return;
      const dialog = document.createElement('dialog');
      dialog.className = 'asyncglk_file_dialog';
      dialog.open = true;
      dialog.innerHTML = '<div id="title">Open a savefile</div><button role="option" data-fullpath="/usr/test/autosave.glksave">autosave.glksave</button><button class="submit">Open</button><button class="close">Cancel</button>';
      dialog.querySelector('button[role="option"]')?.addEventListener('click', () => {
        root.dataset.autosaveSelected = 'true';
      });
      dialog.querySelector('button.submit')?.addEventListener('click', () => {
        if (root.dataset.autosaveSelected !== 'true') return;
        input.value = '';
        dialog.remove();
      });
      document.body.append(dialog);
    };
    document.body.append(input);
  });

  await expect(page.locator('html')).toHaveAttribute('data-autosave-selected', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-autorestore-result', 'true');
  await expect(page.locator('dialog[open]')).toHaveCount(0);
});

test('Parchment hides Bocfel history playback boundary notices', async ({ page }) => {
  await page.goto('/parchment.html?autoplay=0&fableforge_autosave=1');
  await page.evaluate(async () => {
    const transcript = document.createElement('div');
    transcript.className = 'BufferWindowInner';
    transcript.innerHTML = '<div class="BufferLine">[Starting history playback]</div><div class="BufferLine">A restored story line.</div><div class="BufferLine">[End of history playback]</div>';
    document.body.append(transcript);
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
  });

  await expect(page.locator('.BufferLine').filter({ hasText: 'Starting history playback' })).toBeHidden();
  await expect(page.locator('.BufferLine').filter({ hasText: 'End of history playback' })).toBeHidden();
  await expect(page.getByText('A restored story line.')).toBeVisible();
});

test('shows an empty library and filters the starter catalog', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Library', exact: true })).toBeVisible();
  await expect(page.getByText('Your library is empty')).toBeVisible();

  await page.getByRole('button', { name: 'Browse Stories', exact: true }).click();
  await page.getByPlaceholder('Search online stories').fill('lost pig');

  await expect(page.getByRole('heading', { name: 'Lost Pig' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '9:05' })).toBeHidden();
});

test('imports a local story and serves it to Parchment from IndexedDB', async ({ page }) => {
  await page.getByRole('button', { name: 'Browse Stories', exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'test-story.z5',
    mimeType: 'application/x-zmachine',
    buffer: Buffer.from([1, 2, 3, 4]),
  });

  await expect(page.getByRole('heading', { name: 'test story' })).toBeVisible();
  const gameId = await page.evaluate(() => {
    const library = JSON.parse(localStorage.getItem('fableforge.library.v2') ?? '[]');
    return library[0]?.id as string | undefined;
  });
  expect(gameId).toBeTruthy();

  await page.getByRole('button', { name: 'Start' }).click();
  const frame = page.locator('iframe');
  await expect(frame).toHaveAttribute('src', new RegExp(`local-game%2F${gameId}%2Ftest-story\\.z5`));

  const bytes = await page.evaluate(async id => {
    const response = await fetch(`./local-game/${encodeURIComponent(id)}/test-story.z5`);
    return Array.from(new Uint8Array(await response.arrayBuffer()));
  }, gameId!);
  expect(bytes).toEqual([1, 2, 3, 4]);
});

test('downloads an online catalog story into the library', async ({ page }) => {
  await page.route('https://ifarchive.org/if-archive/games/zcode/905.z5', route =>
    route.fulfill({ body: Buffer.from([5, 6, 7, 8]), contentType: 'application/x-zmachine' }));

  await page.getByRole('button', { name: 'Browse Stories', exact: true }).click();
  await page.getByRole('button', { name: 'Download 9:05' }).click();

  await expect(page.getByRole('heading', { name: 'Library', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '9:05' })).toBeVisible();
});

test('saves the active story when the app loses focus', async ({ page }) => {
  await page.getByRole('button', { name: 'Browse Stories', exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'focus-save-test.z5',
    mimeType: 'application/x-zmachine',
    buffer: Buffer.from([1, 2, 3, 4]),
  });
  await page.getByRole('button', { name: 'Start' }).click();
  const playerRoot = page.frameLocator('iframe').locator('html');
  const playerBody = page.frameLocator('iframe').locator('body');
  await playerBody.waitFor();
  await playerBody.evaluate(body => {
    const root = body.ownerDocument.documentElement;
    const input = body.ownerDocument.createElement('textarea');
    input.className = 'Input LineInput';
    input.setAttribute('aria-hidden', 'false');
    input.onkeypress = event => {
      if (event.keyCode !== 13 || input.value !== 'save') return;
      const countKey = 'fableforge.test.focusSaveCount';
      localStorage.setItem(countKey, String(Number(localStorage.getItem(countKey) || '0') + 1));
      const dialog = body.ownerDocument.createElement('dialog');
      dialog.className = 'asyncglk_file_dialog';
      dialog.open = true;
      dialog.innerHTML = '<div id="title">Save a savefile</div><textarea id="filename_input"></textarea><button class="submit">Save</button><button class="close">Cancel</button>';
      dialog.querySelector('button.submit')?.addEventListener('click', () => {
        root.dataset.focusSavedName = (dialog.querySelector('#filename_input') as HTMLTextAreaElement).value;
        input.value = '';
        dialog.remove();
      });
      body.append(dialog);
    };
    body.append(input);
  });

  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(playerRoot).toHaveAttribute('data-focus-saved-name', 'autosave');
  await expect.poll(() => page.evaluate(() => Object.keys(localStorage).some(key => key.startsWith('fableforge.autosave.v1:'))))
    .toBe(true);
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.waitForTimeout(200);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('fableforge.test.focusSaveCount'))).toBe('1');
});

test('keyboard shortcuts toggle controls only the movement button bar', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('checkbox', { name: /Use custom keyboard/ }).check();
  await page.getByRole('checkbox', { name: /Keyboard shortcuts/ }).uncheck();

  await page.getByRole('button', { name: 'Browse Stories', exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'shortcut-setting-test.z5',
    mimeType: 'application/x-zmachine',
    buffer: Buffer.from([5, 6, 7, 8]),
  });
  await page.getByRole('button', { name: 'Start' }).click();

  await expect(page.getByLabel('Custom story keyboard')).toBeVisible();
  await expect(page.getByLabel('Movement commands')).toHaveCount(0);
});

test('persists settings and passes reading preferences to Parchment', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('checkbox', { name: /Use custom keyboard/ }).check();
  await expect(page.getByRole('checkbox', { name: /Keyboard shortcuts/ })).toBeChecked();
  await page.getByRole('checkbox', { name: /Glide typing/ }).check();
  await page.getByLabel('Story font size').fill('22');
  await page.getByRole('radio', { name: '#fef3c7' }).click();
  await page.getByLabel('Autosave frequency').selectOption('off');

  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: /Use custom keyboard/ })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: /Keyboard shortcuts/ })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: /Glide typing/ })).toBeChecked();
  await expect(page.getByLabel('Story font size')).toHaveValue('22');
  await expect(page.getByRole('radio', { name: '#fef3c7' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByLabel('Autosave frequency')).toHaveValue('off');

  await page.getByRole('button', { name: 'Browse Stories', exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'settings-test.z5',
    mimeType: 'application/x-zmachine',
    buffer: Buffer.from([5, 6, 7, 8]),
  });
  await page.getByRole('button', { name: 'Start' }).click();

  const frameUrl = await page.locator('iframe').getAttribute('src');
  expect(frameUrl).toContain('do_vm_autosave=0');
  expect(frameUrl).toContain('fableforge_autosave=0');
  expect(frameUrl).toContain('font_size=22');
  expect(frameUrl).toContain('background_color=%23fef3c7');
  await expect(page.getByText('Autosave is off')).toBeVisible();
  const playerRoot = page.frameLocator('iframe').locator('html');
  await expect(playerRoot).toHaveCSS('background-color', 'rgb(254, 243, 199)');
  await expect(page.frameLocator('iframe').locator('#gameport')).toHaveCSS('max-width', 'none');
  expect(await playerRoot.evaluate(element =>
    getComputedStyle(element).getPropertyValue('--glkote-buffer-size').trim())).toBe('22px');

  await playerRoot.evaluate(element => {
    const input = element.ownerDocument.createElement('textarea');
    input.className = 'Input LineInput';
    input.setAttribute('aria-hidden', 'false');
    input.onkeypress = event => {
      element.dataset.submitted = `${input.value}:${event.keyCode}`;
    };
    element.append(input);
  });
  const storyInput = page.frameLocator('iframe').locator('textarea.Input').last();
  await page.getByRole('button', { name: 'Q', exact: true }).click();
  await expect(storyInput).toHaveValue('q');
  await expect(page.getByLabel('Movement commands').getByRole('button', { name: 'Go', exact: true })).toHaveCount(0);
  await page.getByLabel('Movement commands').getByRole('button', { name: 'Go north', exact: true }).click();
  await expect(playerRoot).toHaveAttribute('data-submitted', 'north:13');

  await storyInput.fill('');
  await page.keyboard.down('q');
  await expect(page.getByRole('button', { name: 'Q', exact: true })).toHaveClass(/key-pressed/);
  await page.keyboard.up('q');
  await expect(storyInput).toHaveValue('q');
  await expect(page.getByRole('button', { name: 'Q', exact: true })).not.toHaveClass(/key-pressed/);

  await page.getByRole('button', { name: 'Minimize keyboard' }).click();
  await expect(page.getByLabel('Custom story keyboard')).toBeHidden();
  await page.getByRole('button', { name: 'Expand keyboard' }).click();
  await expect(page.getByLabel('Custom story keyboard')).toBeVisible();

  await page.evaluate(() => {
    class FakeSpeechRecognition {
      static available() { return Promise.resolve('available'); }
      continuous = false;
      interimResults = false;
      lang = '';
      processLocally = false;
      onresult = null;
      onerror = null;
      onend: (() => void) | null = null;
      start() {}
      stop() { this.onend?.(); }
    }
    (window as unknown as { SpeechRecognition: typeof FakeSpeechRecognition }).SpeechRecognition = FakeSpeechRecognition;
  });
  const startDictation = page.getByRole('button', { name: 'Start dictation' });
  await startDictation.click();
  const stopDictation = page.getByRole('button', { name: 'Stop dictation' });
  await expect(stopDictation).toHaveAttribute('aria-pressed', 'true');
  await stopDictation.click();
  await expect(page.getByRole('button', { name: 'Start dictation' })).toHaveAttribute('aria-pressed', 'false');
});
