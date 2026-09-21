import { useEffect, useMemo, useRef, useState } from 'react';
import * as tts from '../services/ttsService';

export function useVoices(languagePrefix) {
  const [allVoices, setAllVoices] = useState([]);
  const [voiceName, setVoiceName] = useState('');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const rememberedByLang = useRef({});

  useEffect(() => {
    let cancelled = false;
    if (tts.USE_BACKEND) {
      tts
        .fetchVoices()
        .then((list) => !cancelled && setAllVoices(list))
        .catch((err) => {
          if (cancelled) return;
          setAllVoices([]);
          // Without voices nothing can be generated, so say why instead of
          // leaving an empty dropdown.
          setError(err.message || 'Could not load the voice list.');
        });
      return () => {
        cancelled = true;
      };
    }
    const load = () => setAllVoices(tts.getBrowserVoices());
    load();
    return tts.onVoicesChanged(load);
  }, [attempt]);

  const voices = useMemo(
    () => allVoices.filter((v) => (v.lang || '').toLowerCase().startsWith(languagePrefix)),
    [allVoices, languagePrefix]
  );

  useEffect(() => {
    const remembered = rememberedByLang.current[languagePrefix];
    if (remembered && voices.some((v) => v.name === remembered)) setVoiceName(remembered);
    else if (voices.length) setVoiceName(voices[0].name);
    else setVoiceName('');
  }, [languagePrefix, voices]);

  const choose = (name) => {
    setVoiceName(name);
    rememberedByLang.current[languagePrefix] = name;
  };

  const selectedVoice = voices.find((v) => v.name === voiceName) || null;
  const retry = () => {
    setError('');
    setAttempt((n) => n + 1);
  };
  return { voices, voiceName, choose, selectedVoice, error, retry };
}