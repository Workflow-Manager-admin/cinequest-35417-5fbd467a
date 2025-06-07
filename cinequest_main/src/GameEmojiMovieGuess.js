import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getKollywoodOriginalMovies, getRomanizedTitle } from "./tmdbApi";

// Demo data: Each question has a set of emojis and the movie title as answer
const EMOJI_QUESTIONS = [
  { emojis: "🦁👑", title: "The Lion King" },
  { emojis: "🌪️👠🦁🤖", title: "The Wizard of Oz" },
  { emojis: "❄️⛄👭", title: "Frozen" },
  { emojis: "🧑‍🚀🌌🤖", title: "Interstellar" },
  { emojis: "🦸🦸‍♂️🦸‍♀️⚡", title: "The Avengers" },
  { emojis: "🦇👨🌃", title: "The Dark Knight" },
  { emojis: "🐼🥋", title: "Kung Fu Panda" },
  { emojis: "🦖🏝️", title: "Jurassic Park" },
  { emojis: "🚢💑🧊", title: "Titanic" },
  { emojis: "👨‍🔬🧪👹", title: "Dr. Jekyll and Mr. Hyde" }
];

const MAX_QUESTIONS = 8; // How many per game session

/** 
 * Hardcoded emoji-to-Kollywood mapping.
 * This is a limited set for demonstration in Kollywood mode.
 * In production you can curate or crowdsource such emoji clues.
 * Emoji clues should be unique per answer and selected for well-known Tamil (Kollywood) movies only.
 */
const TAMIL_EMOJI_CLUES = [
  // Some popular Kollywood movies, with unique emoji clues
  { emojis: "🤖👦💔🚀", title: "Enthiran" },                            // Enthiran
  { emojis: "🕵️‍♂️🎩🔮", title: "Anniyan" },                           // Anniyan
  { emojis: "🕺💃❤️🎶", title: "Kadhalan" },                          // Kadhalan
  { emojis: "🚂💥🦸‍♂️", title: "Chennai Express" },                   // Actually Bollywood; skip in real use
  { emojis: "👧🎨🎬", title: "96" },                                   // 96
  { emojis: "🐅🌲🏹", title: "Aayirathil Oruvan" },                   // Aayirathil Oruvan
  { emojis: "🗡️👸🏻🤴🏻", title: "Baahubali" },                          // Baahubali (technically Telugu, often dubbed in Tamil)
  { emojis: "👮‍♂️🚨🔥", title: "Kaakha Kaakha" },                      // Kaakha Kaakha
  { emojis: "🍫👧", title: "Chocolat" },                               // Not Kollywood; placeholder, will get replaced
  { emojis: "🎤🧑‍🎤🎸", title: "Rockstar" }                            // Not Kollywood; placeholder
];

// For demo, only these titles will be mapped in Kollywood. Will cross-check via TMDB.
const HARDCODED_TAMIL_EMOJI_CLUES = [
  { emojis: "🤖👦💔🚀", tmdb_name: "Enthiran" },
  { emojis: "🕵️‍♂️🎩🔮", tmdb_name: "Anniyan" },
  { emojis: "🕺💃❤️🎶", tmdb_name: "Kadhalan" },
  { emojis: "👧🎨🎬", tmdb_name: "96" },
  { emojis: "🐅🌲🏹", tmdb_name: "Aayirathil Oruvan" },
  { emojis: "👮‍♂️🚨🔥", tmdb_name: "Kaakha Kaakha" }
];

// PUBLIC_INTERFACE
export default function GameEmojiMovieGuess({ section }) {
  const [sessionSet, setSessionSet] = useState([]);
  const [idx, setIdx] = useState(0); // Current question index
  const [guess, setGuess] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [msg, setMsg] = useState("");
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const timeoutRef = useRef();
  const navigate = useNavigate();

  // Helper to "normalize" answers for match
  function norm(str) {
    return (str || "").toLowerCase().replace(/[^a-z0-9]/gi, "");
  }

  // Only relevant for Kollywood mode (dynamic fetch)
  useEffect(() => {
    let ignore = false;
    async function loadTamilQuestions() {
      setLoading(true);
      setFetchError("");
      try {
        // Fetch original language Tamil movies; may paginate for more variety
        let { results } = await getKollywoodOriginalMovies({ page: 1 });
        // Use only those with title matching our hardcoded clues (case-insensitive substring), to ensure clue maps to real movie
        let clues = [];
        for (let mapped of HARDCODED_TAMIL_EMOJI_CLUES) {
          // Find in TMDB result set a movie matching by romanized title (ignoring case and leading articles)
          const match = results.find(m => {
            let romTitle = getRomanizedTitle(m).replace(/^the\s+/i, "").toLowerCase();
            let mappedName = mapped.tmdb_name.replace(/^the\s+/i, "").toLowerCase();
            return romTitle.includes(mappedName);
          });
          if (match) {
            clues.push({
              emojis: mapped.emojis,
              // Always present as getRomanizedTitle for answer
              title: getRomanizedTitle(match)
            });
          }
        }
        // For randomness, shuffle and pick as many as possible, up to MAX_QUESTIONS.
        for (let i = clues.length - 1; i > 0; --i) {
          const j = Math.floor(Math.random() * (i + 1));
          [clues[i], clues[j]] = [clues[j], clues[i]];
        }
        if (!ignore) {
          setSessionSet(clues.slice(0, Math.min(MAX_QUESTIONS, clues.length)));
          setIdx(0);
          setScore(0);
          setGuess("");
          setRevealed(false);
          setMsg("");
          setAutoAdvance(false);
          setLoading(false);
        }
      } catch (e) {
        if (!ignore) {
          setFetchError("Failed to load Kollywood emoji clues from TMDB.");
          setSessionSet([]);
          setLoading(false);
        }
      }
    }

    // Hollywood mode: use default hardcoded demo set.
    if (section === "kollywood") {
      loadTamilQuestions();
    } else {
      // Shuffle demo data for Hollywood or default
      const arr = EMOJI_QUESTIONS.slice();
      for (let i = arr.length - 1; i > 0; --i) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      setSessionSet(arr.slice(0, Math.min(MAX_QUESTIONS, arr.length)));
      setIdx(0);
      setScore(0);
      setGuess("");
      setRevealed(false);
      setMsg("");
      setAutoAdvance(false);
      setLoading(false);
      setFetchError("");
    }
    return () => { ignore = true; };
  }, [section]);

  // Cleanup timer on unmount
  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const q = sessionSet[idx] || null;

  function handleSubmit(e) {
    e.preventDefault();
    if (!q || revealed) return;
    const correct = norm(guess) === norm(q.title);
    if (correct) {
      setMsg("🎉 Correct!");
      setScore(s => s + 1);
    } else {
      setMsg(`❌ Oops! The answer was: ${q.title}`);
    }
    setRevealed(true);
    setAutoAdvance(true);
    timeoutRef.current = setTimeout(() => {
      if (idx + 1 < sessionSet.length) {
        setIdx(i => i + 1);
        setGuess("");
        setMsg("");
        setRevealed(false);
        setAutoAdvance(false);
      } else {
        setAutoAdvance(false);
      }
    }, 1500);
  }

  function handleReveal() {
    if (!q || revealed) return;
    setMsg(`😇 It's: ${q.title}`);
    setRevealed(true);
    setAutoAdvance(true);
    timeoutRef.current = setTimeout(() => {
      if (idx + 1 < sessionSet.length) {
        setIdx(i => i + 1);
        setGuess("");
        setMsg("");
        setRevealed(false);
        setAutoAdvance(false);
      } else {
        setAutoAdvance(false);
      }
    }, 1500);
  }

  function handleRestart() {
    // Hard restart: re-trigger loading of sessionSet for Kollywood, re-shuffle for Hollywood
    if (section === "kollywood") {
      setSessionSet([]);
      setIdx(0);
      setScore(0);
      setGuess("");
      setRevealed(false);
      setMsg("");
      setAutoAdvance(false);
      setLoading(false);
      setFetchError("");
      // Will re-trigger useEffect and reload
      setTimeout(() => {
        // allow useEffect above to fire on section
        setSessionSet([]);
      }, 10);
    } else {
      // Shuffle demo data for Hollywood
      const arr = EMOJI_QUESTIONS.slice();
      for (let i = arr.length - 1; i > 0; --i) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      setSessionSet(arr.slice(0, Math.min(MAX_QUESTIONS, arr.length)));
      setIdx(0);
      setScore(0);
      setGuess("");
      setRevealed(false);
      setMsg("");
      setAutoAdvance(false);
      setLoading(false);
      setFetchError("");
    }
  }

  // Main render logic
  return (
    <div className="container" style={{ marginTop: 100 }}>
      <button
        className="btn"
        style={{
          background: "#f1e4fa",
          color: "#d505ff",
          border: "1px solid #d505ff55",
          marginBottom: 18,
          fontWeight: 600
        }}
        onClick={() => navigate(-1)}
        disabled={autoAdvance || loading}
      >
        ← Back
      </button>
      <h2 style={{ color: "#d505ff" }}>Guess the Movie from the Emoji</h2>
      <div style={{
        margin: "8px 0 14px 0", color: "#101",
        fontSize: 18, textAlign: "center", fontWeight: 500
      }}>
        Score: {score} &nbsp; | &nbsp; Question: {sessionSet.length ? Math.min(idx + 1, sessionSet.length) : 1} / {sessionSet.length || MAX_QUESTIONS}
      </div>
      {loading ? (
        <div style={{
          background: "#fff",
          color: "#222",
          borderRadius: 14,
          textAlign: "center",
          padding: "30px 16px"
        }}>Loading Kollywood movies…</div>
      ) : fetchError ? (
        <div style={{
          background: "#fff",
          color: "#e11",
          borderRadius: 14,
          textAlign: "center",
          padding: "30px 16px"
        }}>{fetchError}</div>
      ) : !q ? (
        <div style={{
          background: "#fff",
          color: "#222",
          borderRadius: 14,
          textAlign: "center",
          padding: "30px 16px"
        }}>
          <div style={{ fontWeight: 700, fontSize: 20, color: "#d505ff", marginBottom: 12 }}>
            Game Complete!
          </div>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>
            Final Score: {score} / {sessionSet.length}
          </div>
          <button
            className="btn"
            style={{
              background: "#f3e7fa",
              color: "#d505ff",
              fontWeight: 600,
              border: "1px solid #d505ff69",
              marginTop: 15
            }}
            onClick={handleRestart}
          >
            Play Again
          </button>
        </div>
      ) : (
        <div style={{
          background: "#fff",
          color: "#111",
          borderRadius: 16,
          boxShadow: "0 2px 12px #d505ff1c",
          minHeight: 231,
          margin: "0 auto",
          padding: "44px 24px 30px 24px",
          maxWidth: 410,
          textAlign: "center"
        }}>
          <div style={{
            fontSize: 48,
            marginBottom: 26,
            letterSpacing: "0.11em",
            lineHeight: 1.1
          }}>
            {q.emojis}
          </div>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Your guess..."
              style={inputStyle}
              value={guess}
              onChange={e => setGuess(e.target.value)}
              disabled={revealed || autoAdvance}
              autoFocus
            />
            <div style={{ display: "flex", gap: 13, justifyContent: "center", marginTop: 16 }}>
              <button
                className="btn"
                style={{
                  background: "#d505ff",
                  color: "#fff",
                  opacity: revealed || autoAdvance ? 0.6 : 1
                }}
                type="submit"
                disabled={revealed || autoAdvance}
              >Submit</button>
              <button
                className="btn"
                style={{
                  background: "#fff",
                  color: "#d505ff",
                  border: "1px solid #d505ff",
                  fontWeight: 600,
                  minWidth: 98,
                  opacity: revealed || autoAdvance ? 0.5 : 1
                }}
                type="button"
                disabled={revealed || autoAdvance}
                onClick={handleReveal}
              >
                Reveal Answer
              </button>
            </div>
          </form>
          <div style={{ marginTop: 15, minHeight: 28, color: revealed ? "#d505ff" : "#991" }}>
            {msg}
          </div>
          {autoAdvance && (
            <div style={{ marginTop: 12, color: "#999" }}>Next coming…</div>
          )}
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  border: "1px solid #d505ff99",
  borderRadius: 6,
  fontSize: 19,
  padding: "13px 18px",
  width: 240,
  outline: "none",
  textAlign: "center",
  marginBottom: 2
};
