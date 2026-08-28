'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type BoardKey = 'A' | 'B';
type Mode = 'party' | 'calm';
type Category = { id: string; name: string; short: string; color: string; icon: string; description: string };
type HistoryItem = Category & { round: number; board: BoardKey };

const BOARDS: Record<BoardKey, Category[]> = {
  A: [
    { id: 'a1', name: 'Rok wydania ±4', short: '±4 lata', color: '#ffbf47', icon: '📅', description: 'Podaj rok wydania utworu. Możesz pomylić się o maksymalnie 4 lata.' },
    { id: 'a2', name: 'Rok wydania ±2', short: '±2 lata', color: '#55c8ff', icon: '🎯', description: 'Podaj rok wydania utworu. Tolerancja wynosi tylko 2 lata.' },
    { id: 'a3', name: 'Dekada', short: 'Dekada', color: '#c59bff', icon: '🕰️', description: 'Wskaż dekadę, w której utwór został wydany, np. lata 80.' },
    { id: 'a4', name: 'Przed czy po 2000?', short: 'Rok 2000?', color: '#ff79ab', icon: '⚖️', description: 'Zdecyduj, czy utwór pochodzi sprzed roku 2000, czy z roku 2000 lub później.' },
    { id: 'a5', name: 'Solo czy zespół?', short: 'Kto gra?', color: '#5ee3a2', icon: '🎤', description: 'Rozpoznaj, czy wykonawcą jest artysta solowy, czy zespół.' },
  ],
  B: [
    { id: 'b1', name: 'Tytuł utworu', short: 'Tytuł', color: '#ffbf47', icon: '🎵', description: 'Podaj dokładny tytuł odtwarzanego utworu.' },
    { id: 'b2', name: 'Wykonawca', short: 'Wykonawca', color: '#55c8ff', icon: '🌟', description: 'Podaj imię i nazwisko wykonawcy lub pełną nazwę zespołu.' },
    { id: 'b3', name: 'Dekada', short: 'Dekada', color: '#c59bff', icon: '🕰️', description: 'Podaj dekadę wydania utworu, np. lata 90.' },
    { id: 'b4', name: 'Dokładny rok', short: 'Rok', color: '#ff79ab', icon: '📅', description: 'Podaj dokładny rok pierwszego wydania utworu.' },
    { id: 'b5', name: 'Rok wydania ±3', short: '±3 lata', color: '#5ee3a2', icon: '🎯', description: 'Podaj rok wydania utworu z tolerancją 3 lat.' },
  ],
};
const WHEEL = 'conic-gradient(from -36deg, #ffbf47 0deg 72deg, #55c8ff 72deg 144deg, #c59bff 144deg 216deg, #ff79ab 216deg 288deg, #5ee3a2 288deg 360deg)';

function shuffle(values: number[]) {
  const next = [...values];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const random = Math.floor(Math.random() * (index + 1));
    [next[index], next[random]] = [next[random], next[index]];
  }
  return next;
}

function playTone(kind: 'start' | 'finish' | 'tick') {
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const tones = kind === 'finish' ? [523, 659, 784] : [kind === 'tick' ? 920 : 220];
  tones.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.connect(gain); gain.connect(context.destination); oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(kind === 'tick' ? 0.035 : 0.08, context.currentTime + index * 0.11);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + index * 0.11 + 0.18);
    oscillator.start(context.currentTime + index * 0.11); oscillator.stop(context.currentTime + index * 0.11 + 0.2);
  });
}

export default function Home() {
  const [board, setBoard] = useState<BoardKey>('A');
  const [mode, setMode] = useState<Mode>('party');
  const [round, setRound] = useState(0);
  const [selected, setSelected] = useState<Category | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sound, setSound] = useState(true);
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [timerDuration, setTimerDuration] = useState(30);
  const [timerLeft, setTimerLeft] = useState(30);
  const [timerRunning, setTimerRunning] = useState(false);
  const deckRef = useRef<number[]>([]);
  const lastIndexRef = useRef<number | null>(null);
  const wheelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const categories = BOARDS[board];
  const spinDuration = mode === 'party' ? 3600 : 2200;
  const wheelStyle = useMemo(() => ({ background: WHEEL, transform: `rotate(${rotation}deg)`, transitionDuration: spinning ? `${spinDuration}ms` : '0ms' }), [rotation, spinning, spinDuration]);

  useEffect(() => {
    const saved = window.localStorage.getItem('muzyczne-bingo-settings');
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as { sound?: boolean; timerEnabled?: boolean; timerDuration?: number; mode?: Mode };
      if (typeof parsed.sound === 'boolean') setSound(parsed.sound);
      if (typeof parsed.timerEnabled === 'boolean') setTimerEnabled(parsed.timerEnabled);
      if (typeof parsed.timerDuration === 'number') { setTimerDuration(parsed.timerDuration); setTimerLeft(parsed.timerDuration); }
      if (parsed.mode === 'party' || parsed.mode === 'calm') setMode(parsed.mode);
    } catch { /* Invalid settings are ignored. */ }
  }, []);
  useEffect(() => { window.localStorage.setItem('muzyczne-bingo-settings', JSON.stringify({ sound, timerEnabled, timerDuration, mode })); }, [sound, timerEnabled, timerDuration, mode]);
  useEffect(() => {
    if (!timerRunning) return;
    const interval = window.setInterval(() => setTimerLeft((current) => {
      if (current <= 1) { setTimerRunning(false); if (sound) playTone('finish'); return 0; }
      if (sound && current <= 6) playTone('tick');
      return current - 1;
    }), 1000);
    return () => window.clearInterval(interval);
  }, [timerRunning, sound]);
  useEffect(() => () => { if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current); }, []);

  const reveal = useCallback((category: Category, index: number) => {
    setRound((current) => {
      const nextRound = current + 1;
      setHistory((items) => [{ ...category, round: nextRound, board }, ...items]);
      return nextRound;
    });
    setSelected(category); setSelectedIndex(index); setTimerRunning(false); setTimerLeft(timerDuration);
  }, [board, timerDuration]);

  const spin = useCallback(() => {
    if (spinning) return;
    if (deckRef.current.length === 0) {
      deckRef.current = shuffle([0, 1, 2, 3, 4]);
      if (deckRef.current[0] === lastIndexRef.current) [deckRef.current[0], deckRef.current[1]] = [deckRef.current[1], deckRef.current[0]];
    }
    const index = deckRef.current.shift() ?? 0;
    lastIndexRef.current = index;
    const targetCenter = index * 72 + 36;
    const currentMod = ((rotation % 360) + 360) % 360;
    const extra = ((360 - targetCenter - currentMod) + 720) % 360;
    const nextRotation = rotation + 5 * 360 + extra;
    setSpinning(true); setSelected(null); setSelectedIndex(null); setTimerRunning(false);
    if (sound) playTone('start');
    requestAnimationFrame(() => setRotation(nextRotation));
    wheelTimeoutRef.current = setTimeout(() => { setSpinning(false); reveal(categories[index], index); if (sound) playTone('finish'); }, spinDuration + 80);
  }, [categories, reveal, rotation, sound, spinDuration, spinning]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.code === 'Space' && !['INPUT', 'BUTTON', 'SELECT'].includes(target.tagName) && !settingsOpen && !historyOpen) { event.preventDefault(); spin(); }
      if (event.code === 'Escape') { setSettingsOpen(false); setHistoryOpen(false); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [historyOpen, settingsOpen, spin]);

  const resetGame = () => {
    if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
    setRound(0); setSelected(null); setSelectedIndex(null); setRotation(0); setSpinning(false); setHistory([]); setTimerRunning(false); setTimerLeft(timerDuration);
    deckRef.current = []; lastIndexRef.current = null;
  };
  const changeBoard = (next: BoardKey) => {
    setBoard(next); setSelected(null); setSelectedIndex(null); setTimerRunning(false); setTimerLeft(timerDuration); deckRef.current = []; lastIndexRef.current = null;
  };
  const selectManually = (category: Category, index: number) => { if (!spinning) reveal(category, index); };
  const timerProgress = timerDuration === 0 ? 0 : (timerLeft / timerDuration) * 100;
  const timerColor = timerLeft <= 5 ? '#ff6689' : timerLeft <= 10 ? '#ffbf47' : '#55c8ff';

  return (
    <main className={`app ${mode}`}>
      <header className="topbar">
        <div className="brand" aria-label="Muzyczne Bingo"><span className="brand-mark" aria-hidden="true">♪</span><span><strong>Muzyczne Bingo</strong><small>gra na lekcję muzyki</small></span></div>
        <nav className="board-tabs" aria-label="Wybór planszy"><button className={board === 'A' ? 'active' : ''} onClick={() => changeBoard('A')}>Plansza A</button><button className={board === 'B' ? 'active' : ''} onClick={() => changeBoard('B')}>Plansza B</button></nav>
        <div className="header-actions">
          <button className="icon-button" onClick={() => setHistoryOpen(true)} aria-label={`Historia losowań: ${history.length}`} title="Historia"><span aria-hidden="true">☷</span>{history.length > 0 && <b>{history.length}</b>}</button>
          <button className="icon-button" onClick={() => setSettingsOpen(true)} aria-label="Ustawienia" title="Ustawienia"><span aria-hidden="true">⚙</span></button>
          <button className="icon-button fullscreen" onClick={() => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()} aria-label="Pełny ekran" title="Pełny ekran"><span aria-hidden="true">⛶</span></button>
        </div>
      </header>

      <section className="pixel-hero">
        <div className="pixel-hero-copy">
          <span className="hero-kicker">♪ Gotowi na muzyczną przygodę?</span>
          <h1>Posłuchaj.<br /><em>Zakręć.</em> Zgadnij!</h1>
          <p>Włącz fragment piosenki, zakręć kołem i pozwól klasie zdobyć punkt.</p>
          <div className="hero-steps" aria-label="Jak prowadzić grę">
            <span><b>1</b> Odtwórz</span><span><b>2</b> Losuj</span><span><b>3</b> Odpowiadaj</span>
          </div>
        </div>
        <div className="pixel-stage" aria-hidden="true">
          <img src="/dancing-animals.avif" alt="" />
          <i className="floating-note note-one">♪</i><i className="floating-note note-two">♫</i><i className="floating-note note-three">♪</i>
        </div>
      </section>

      <div className="game-layout">
        <section className="wheel-section" aria-label="Koło kategorii">
          <div className="wheel-stage"><div className="wheel-pointer" aria-hidden="true" /><div className={`wheel ${spinning ? 'is-spinning' : ''}`} style={wheelStyle} aria-label="Koło z pięcioma kategoriami"><div className="wheel-lines" aria-hidden="true" /></div><div className="wheel-hub" aria-hidden="true"><span>{spinning ? '···' : 'SPIN'}</span></div></div>
          <button className="spin-button" onClick={spin} disabled={spinning}><span aria-hidden="true">{spinning ? '◌' : '▶'}</span> {spinning ? 'Losowanie…' : 'Start losowania'}</button>
          <p className="keyboard-hint">Możesz też nacisnąć spację</p>
          <div className="legend" aria-label="Kategorie planszy">{categories.map((category, index) => <button key={category.id} className={selectedIndex === index ? 'chosen' : ''} onClick={() => selectManually(category, index)} disabled={spinning} title={`Wybierz ręcznie: ${category.name}`}><span className="legend-dot" style={{ background: category.color }} /><span aria-hidden="true">{category.icon}</span> {category.short}</button>)}</div>
        </section>

        <section className="result-section" aria-live="polite">
          <div className="round-header"><span>Runda {round === 0 ? 1 : round}</span><small>{round === 0 ? 'Wszystko gotowe. Zaczynamy?' : `Plansza ${board}`}</small></div>
          <div className={`result-card ${selected ? 'has-result' : ''}`} style={selected ? { '--accent': selected.color } as React.CSSProperties : undefined}>
            {selected ? <><div className="result-kicker"><span>{selected.icon}</span> Wylosowana kategoria</div><h1>{selected.name}</h1><p>{selected.description}</p><div className="result-meta"><span>Plansza {board}</span><span>Runda {round}</span></div></> : <><div className="ready-icon" aria-hidden="true">♫</div><h1>{spinning ? 'Koło się kręci…' : 'Czas na muzykę!'}</h1><p>{spinning ? 'Za chwilę poznamy zadanie dla klasy.' : 'Włącz fragment utworu, a potem rozpocznij losowanie kategorii.'}</p></>}
          </div>
          {selected && timerEnabled && <div className="timer-card"><div className="timer-ring" style={{ '--progress': `${timerProgress * 3.6}deg`, '--timer-color': timerColor } as React.CSSProperties}><div><strong>{timerLeft}</strong><small>sek.</small></div></div><div className="timer-copy"><small>Czas na odpowiedź</small><strong>{timerRunning ? 'Odliczanie trwa' : timerLeft === 0 ? 'Czas minął!' : 'Gotowi?'}</strong></div><div className="timer-actions"><button onClick={() => { if (timerLeft === 0) setTimerLeft(timerDuration); setTimerRunning((current) => !current); }}>{timerRunning ? 'Pauza' : timerLeft === 0 ? 'Jeszcze raz' : 'Start'}</button><button className="secondary" onClick={() => { setTimerRunning(false); setTimerLeft(timerDuration); }}>Reset</button></div></div>}
          <div className="round-actions"><button className="reset-button" onClick={resetGame}>↺ Reset gry</button>{selected && <button className="next-button" onClick={() => { setSelected(null); setSelectedIndex(null); setTimerRunning(false); setTimerLeft(timerDuration); }}>Następna runda →</button>}</div>
        </section>
      </div>

      {(historyOpen || settingsOpen) && <button className="overlay" aria-label="Zamknij okno" onClick={() => { setHistoryOpen(false); setSettingsOpen(false); }} />}
      <aside className={`drawer ${historyOpen ? 'open' : ''}`} aria-hidden={!historyOpen}><div className="panel-header"><div><small>Przebieg lekcji</small><h2>Historia rund</h2></div><button onClick={() => setHistoryOpen(false)} aria-label="Zamknij">×</button></div><div className="history-list">{history.length === 0 ? <div className="empty-state"><span>☷</span><strong>Jeszcze nic tu nie ma</strong><p>Pierwsze losowanie pojawi się w historii.</p></div> : history.map((item, index) => <article key={`${item.round}-${index}`}><b>{item.round}</b><span className="history-icon" style={{ background: item.color }}>{item.icon}</span><div><strong>{item.name}</strong><small>Plansza {item.board}</small></div></article>)}</div></aside>
      <section className={`modal ${settingsOpen ? 'open' : ''}`} aria-hidden={!settingsOpen}><div className="panel-header"><div><small>Dopasuj do klasy</small><h2>Ustawienia gry</h2></div><button onClick={() => setSettingsOpen(false)} aria-label="Zamknij">×</button></div><div className="settings-body"><label className="setting-row"><span><strong>Tryb prezentacji</strong><small>Wybierz tempo animacji</small></span><select value={mode} onChange={(event) => setMode(event.target.value as Mode)}><option value="party">Energetyczny</option><option value="calm">Spokojny</option></select></label><label className="setting-row"><span><strong>Dźwięki</strong><small>Sygnał losowania i timera</small></span><input type="checkbox" checked={sound} onChange={(event) => setSound(event.target.checked)} /></label><label className="setting-row"><span><strong>Timer odpowiedzi</strong><small>Pokaż odliczanie po losowaniu</small></span><input type="checkbox" checked={timerEnabled} onChange={(event) => setTimerEnabled(event.target.checked)} /></label><label className="range-row"><span><strong>Czas na odpowiedź</strong><b>{timerDuration} sek.</b></span><input type="range" min="10" max="90" step="5" value={timerDuration} onChange={(event) => { const next = Number(event.target.value); setTimerDuration(next); setTimerLeft(next); setTimerRunning(false); }} disabled={!timerEnabled} /></label></div><button className="save-settings" onClick={() => setSettingsOpen(false)}>Gotowe</button></section>
    </main>
  );
}
