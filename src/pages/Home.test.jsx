// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from './Home';
import * as tts from '../services/ttsService';

// ttsService is the page's only I/O boundary, so the whole UI runs for real
// against this stand-in for the API.
vi.mock('../services/ttsService', () => ({
  USE_BACKEND: true,
  API_URL: 'http://api.test',
  fetchVoices: vi.fn(),
  generateSpeech: vi.fn(),
  fetchAudioBlob: vi.fn(),
  checkHealth: vi.fn(),
  speak: vi.fn(),
  cancelBrowser: vi.fn(),
  pauseBrowser: vi.fn(),
  resumeBrowser: vi.fn(),
}));

const VOICES = [
  { name: 'Ava', lang: 'en-US', gender: 'Female', native: null },
  { name: 'Ryan', lang: 'en-US', gender: 'Male', native: null },
  { name: 'Denise', lang: 'fr-FR', gender: 'Female', native: null },
  { name: 'Henri', lang: 'fr-FR', gender: 'Male', native: null },
];

const RESULT = {
  audioUrl: 'http://api.test/audio/clip-1.mp3',
  fileName: 'clip-1.mp3',
  sizeBytes: 20480,
  spokenText: 'Hello world.',
  translated: false,
  language: 'en-US',
};

// jsdom has no media playback, so track play/pause state on the element.
const playing = new WeakSet();

beforeEach(() => {
  tts.fetchVoices.mockResolvedValue(VOICES);
  tts.checkHealth.mockResolvedValue({ status: 'ok', audioTtlMinutes: 30 });
  tts.generateSpeech.mockResolvedValue(RESULT);

  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function play() {
    playing.add(this);
    this.dispatchEvent(new Event('play'));
    return Promise.resolve();
  });
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function pause() {
    playing.delete(this);
    this.dispatchEvent(new Event('pause'));
  });
  Object.defineProperty(HTMLMediaElement.prototype, 'paused', {
    configurable: true,
    get() {
      return !playing.has(this);
    },
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

const generateButton = () => screen.getByRole('button', { name: /Generate Studio Speech|Generating/ });
const textBox = () => screen.getByLabelText(/Your text script/);

async function renderWithVoices() {
  const user = userEvent.setup();
  render(<Home />);
  // Wait for the voice list so requests carry a voice, as they do for real.
  await screen.findByRole('option', { name: /Ava/ });
  return user;
}

async function generate(user, text = 'Hello world') {
  await user.type(textBox(), text);
  await user.click(generateButton());
  return screen.findByText('Generated audio');
}

describe('text input', () => {
  test('empty and whitespace-only input cannot be generated', async () => {
    const user = await renderWithVoices();
    expect(generateButton()).toBeDisabled();

    await user.type(textBox(), '   ');
    expect(generateButton()).toBeDisabled();
    expect(tts.generateSpeech).not.toHaveBeenCalled();
  });

  test('counts characters and words as you type', async () => {
    const user = await renderWithVoices();
    await user.type(textBox(), 'Hello there world');
    expect(screen.getByText('17 / 5,000')).toBeInTheDocument();
    expect(screen.getByText('3', { selector: 'strong' })).toBeInTheDocument();
  });

  test('text over the limit shows an error and blocks generation', async () => {
    await renderWithVoices();
    fireEvent.change(textBox(), { target: { value: 'a'.repeat(5001) } });

    expect(screen.getByRole('alert')).toHaveTextContent('1 characters over the 5000 limit');
    expect(generateButton()).toBeDisabled();
  });

  test('text at the limit is accepted, with a warning', async () => {
    await renderWithVoices();
    fireEvent.change(textBox(), { target: { value: 'a'.repeat(5000) } });

    expect(screen.getByText(/close to the 5000-character limit/)).toBeInTheDocument();
    expect(generateButton()).toBeEnabled();
  });
});

describe('language and voice selection', () => {
  test('voices follow the chosen language', async () => {
    const user = await renderWithVoices();
    const voiceSelect = screen.getByLabelText('Voice persona');
    expect(voiceSelect).toHaveValue('Ava');

    await user.selectOptions(screen.getByLabelText(/Language/), 'fr-FR');

    expect(voiceSelect).toHaveValue('Denise');
    expect(screen.queryByRole('option', { name: /Ava/ })).not.toBeInTheDocument();
    expect(screen.getByText('Auto-translate on')).toBeInTheDocument();
  });

  test('the chosen language and voice are sent with the request', async () => {
    const user = await renderWithVoices();
    await user.selectOptions(screen.getByLabelText(/Language/), 'fr-FR');
    await user.selectOptions(screen.getByLabelText('Voice persona'), 'Henri');
    await generate(user, 'Bonjour');

    expect(tts.generateSpeech).toHaveBeenCalledWith({
      text: 'Bonjour',
      language: 'fr-FR',
      voice: 'Henri',
      rate: 1,
      pitch: 0,
    });
  });

  test('a failed voice list can be retried', async () => {
    tts.fetchVoices.mockRejectedValueOnce(new Error('The server is unreachable.'));
    const user = userEvent.setup();
    render(<Home />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Voices could not be loaded.');
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByRole('option', { name: /Ava/ })).toBeInTheDocument();
    expect(tts.fetchVoices).toHaveBeenCalledTimes(2);
  });
});

describe('generating speech', () => {
  test('shows a loading state until the audio arrives', async () => {
    let finish;
    tts.generateSpeech.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const user = await renderWithVoices();

    await user.type(textBox(), 'Hello world');
    await user.click(generateButton());

    expect(generateButton()).toHaveTextContent('Generating…');
    expect(generateButton()).toBeDisabled();
    expect(screen.getByText('Generating your audio…')).toBeInTheDocument();

    finish(RESULT);
    expect(await screen.findByText('Generated audio')).toBeInTheDocument();
    expect(generateButton()).toBeEnabled();
  });

  test('Ctrl+Enter generates from inside the text box', async () => {
    const user = await renderWithVoices();
    await user.type(textBox(), 'Hello world');
    await user.keyboard('{Control>}{Enter}{/Control}');

    await screen.findByText('Generated audio');
    expect(tts.generateSpeech).toHaveBeenCalledTimes(1);
  });

  test('shows the server error and lets you try again', async () => {
    tts.generateSpeech.mockRejectedValueOnce(
      new Error('The speech service is temporarily unavailable.')
    );
    const user = await renderWithVoices();
    await user.type(textBox(), 'Hello world');
    await user.click(generateButton());

    expect(await screen.findByRole('alert')).toHaveTextContent('temporarily unavailable');
    expect(screen.getByText('Your audio will appear here')).toBeInTheDocument();
    expect(generateButton()).toBeEnabled();

    await user.click(generateButton());
    await screen.findByText('Generated audio');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('audio playback', () => {
  test('a new clip loads and starts playing', async () => {
    const user = await renderWithVoices();
    await generate(user);

    const audio = document.querySelector('audio');
    expect(audio).toHaveAttribute('src', RESULT.audioUrl);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    expect(await screen.findByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText('MP3 · 20 KB')).toBeInTheDocument();
  });

  test('play and pause toggle the audio', async () => {
    const user = await renderWithVoices();
    await generate(user);

    await user.click(await screen.findByRole('button', { name: 'Pause' }));
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Play' }));
    expect(await screen.findByRole('button', { name: 'Pause' })).toBeInTheDocument();
  });

  test('an expired clip shows a playback error', async () => {
    const user = await renderWithVoices();
    await generate(user);

    fireEvent.error(document.querySelector('audio'));
    expect(await screen.findByText(/may have expired/)).toBeInTheDocument();
  });

  test('earlier clips can be replayed from history', async () => {
    const user = await renderWithVoices();
    await generate(user, 'First clip');
    tts.generateSpeech.mockResolvedValueOnce({
      ...RESULT,
      audioUrl: 'http://api.test/audio/clip-2.mp3',
      fileName: 'clip-2.mp3',
    });
    await user.clear(textBox());
    await user.type(textBox(), 'Second clip');
    await user.click(generateButton());
    await waitFor(() =>
      expect(document.querySelector('audio')).toHaveAttribute('src', 'http://api.test/audio/clip-2.mp3')
    );

    await user.click(screen.getByRole('button', { name: 'Play Ava: First clip' }));
    expect(document.querySelector('audio')).toHaveAttribute('src', RESULT.audioUrl);
  });
});

describe('download', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:clip');
    URL.revokeObjectURL = vi.fn();
  });

  test('saves the clip under its file name', async () => {
    tts.fetchAudioBlob.mockResolvedValue(new Blob(['mp3'], { type: 'audio/mpeg' }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const user = await renderWithVoices();
    await generate(user);

    await user.click(screen.getByRole('button', { name: /Download/ }));

    expect(tts.fetchAudioBlob).toHaveBeenCalledWith(RESULT.audioUrl);
    expect(click).toHaveBeenCalledTimes(1);
    const link = click.mock.contexts[0];
    expect(link.download).toBe('clip-1.mp3');
    expect(link.href).toBe('blob:clip');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:clip');
    expect(await screen.findByText('Saved to your downloads.')).toBeInTheDocument();
  });

  test('a failed download says so and re-enables the button', async () => {
    tts.fetchAudioBlob.mockRejectedValue(new Error('404'));
    const user = await renderWithVoices();
    await generate(user);

    await user.click(screen.getByRole('button', { name: /Download/ }));

    expect(await screen.findByText(/Could not download that clip/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download/ })).toBeEnabled();
  });
});
