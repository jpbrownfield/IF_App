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

test('shows an empty library and filters the starter catalog', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Library', exact: true })).toBeVisible();
  await expect(page.getByText('Your library is empty')).toBeVisible();

  await page.getByRole('button', { name: 'Browse Library', exact: true }).click();
  await page.getByPlaceholder('Search online stories').fill('lost pig');

  await expect(page.getByRole('heading', { name: 'Lost Pig' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '9:05' })).toBeHidden();
});

test('imports a local story and serves it to Parchment from IndexedDB', async ({ page }) => {
  await page.getByRole('button', { name: 'Browse Library', exact: true }).click();
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

  await page.getByRole('button', { name: 'Browse Library', exact: true }).click();
  await page.getByRole('button', { name: 'Download 9:05' }).click();

  await expect(page.getByRole('heading', { name: 'Library', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '9:05' })).toBeVisible();
});

test('persists settings and passes reading preferences to Parchment', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('checkbox', { name: /Use custom keyboard/ }).check();
  await page.getByRole('checkbox', { name: /Glide typing/ }).check();
  await page.getByLabel('Story font size').fill('22');
  await page.getByRole('radio', { name: '#fef3c7' }).click();
  await page.getByLabel('Autosave frequency').selectOption('off');

  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: /Use custom keyboard/ })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: /Glide typing/ })).toBeChecked();
  await expect(page.getByLabel('Story font size')).toHaveValue('22');
  await expect(page.getByRole('radio', { name: '#fef3c7' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByLabel('Autosave frequency')).toHaveValue('off');

  await page.getByRole('button', { name: 'Browse Library', exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'settings-test.z5',
    mimeType: 'application/x-zmachine',
    buffer: Buffer.from([5, 6, 7, 8]),
  });
  await page.getByRole('button', { name: 'Start' }).click();

  const frameUrl = await page.locator('iframe').getAttribute('src');
  expect(frameUrl).toContain('do_vm_autosave=0');
  expect(frameUrl).toContain('font_size=22');
  expect(frameUrl).toContain('background_color=%23fef3c7');
  await expect(page.getByText('Autosave is off')).toBeVisible();
  const playerRoot = page.frameLocator('iframe').locator('html');
  await expect(playerRoot).toHaveCSS('background-color', 'rgb(254, 243, 199)');
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
  await storyInput.fill('');
  await page.getByRole('button', { name: 'Examine', exact: true }).click();
  await expect(storyInput).toHaveValue('examine ');
  await page.getByLabel('Movement commands').getByRole('button', { name: 'N', exact: true }).click();
  await expect(playerRoot).toHaveAttribute('data-submitted', 'north:13');

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
