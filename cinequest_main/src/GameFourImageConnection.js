import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  getPopularMovies,
  getMovieDetails,
  getRomanizedTitle,
  getKollywoodOriginalMovies
} from "./tmdbApi";

// Max questions per session
const MAX_QUESTIONS = 15;

// Fetch four still (backdrop) images for a movie from TMDB.
async function fetchFourStillsForMovie(movieId) {
  try {
    const details = await getMovieDetails(movieId, { append_to_response: "images" });
    // Use images from backdrops (stills/scenes are there)
    const backdrops = (details.images && details.images.backdrops) ? details.images.backdrops : [];
    // Only unique file_paths, take up to 4
    const stills = [];
    const seen = new Set();
    for (let i = 0; i < backdrops.length && stills.length < 4; ++i) {
      const bp = backdrops[i];
      if (bp && bp.file_path && !seen.has(bp.file_path)) {
        stills.push({
          url: `https://image.tmdb.org/t/p/w500${bp.file_path}`,
          type: "Still"
        });
        seen.add(bp.file_path);
      }
    }
    return stills; // May be <4; in session, require 4
  } catch {
    return [];
  }
}

// Shuffle helper
function shuffleArray(arr) {
  const a = arr.slice();
  for(let i=a.length-1; i>0; --i) {
    const j = Math.floor(Math.random()*(i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// PUBLIC_INTERFACE
export default function GameFourImageConnection({ section }) {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(0);
  const [userGuess, setUserGuess] = useState("");
  const [msg, setMsg] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [error, setError] = useState("");
  const [sessionCompleted, setSessionCompleted] = useState(false);

  const navigate = useNavigate();
  const timeoutRef = useRef();

  // Build 15 unique questions with each using 4 stills
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setSessionCompleted(false);
    setScore(0);
    setCurrentIndex(0);
    setUserGuess("");
    setMsg("");
    setRevealed(false);
    setError("");
    setAutoAdvance(false);

    async function buildQuestions() {
      let movies = [];
      try {
        if (section === "kollywood") {
          // STRICT: Only genuine Kollywood originals via TMDB discover with with_original_language=ta
          let res = await getKollywoodOriginalMovies({ page: 1 });
          movies = (res.results || []).filter(
            (m) => m.poster_path && m.title && !m.adult
          );
        } else {
          // Hollywood logic unchanged
          const region = "US";
          const lang = "en";
          let res = await getPopularMovies({ region, language: lang, include_adult: false, page: 1 });
          movies = (res.results || []).filter(
            (m) => m.poster_path && m.title && !m.adult
          );
        }
        // Remove duplicates by id
        const seen = new Set();
        movies = movies.filter(m => {
          if (seen.has(m.id)) return false;
          seen.add(m.id);
          return true;
        });
        movies = shuffleArray(movies).slice(0, MAX_QUESTIONS * 4); // get more for filtering
      } catch {
        if (isMounted) {
          setError("Failed to load movies from TMDB.");
          setLoading(false);
        }
        return;
      }
      let builtQuestions = [];
      for (let idx = 0; idx < movies.length && builtQuestions.length < MAX_QUESTIONS; ++idx) {
        const m = movies[idx];
        const stills = await fetchFourStillsForMovie(m.id);
        if (stills.length === 4) {
          builtQuestions.push({
            movie: m,
            images: stills,
            answer: section === "kollywood" ? getRomanizedTitle(m) : m.title
          });
        }
      }
      builtQuestions = shuffleArray(builtQuestions).slice(0, MAX_QUESTIONS);
      if (isMounted) {
        setQuestions(builtQuestions);
        setLoading(false);
      }
    }
    buildQuestions();
    return () => {
      isMounted = false;
      clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line
  }, [section]);

  // Auto advance to next question after answer or reveal
  function triggerNext(delay = 1400) {
    setAutoAdvance(true);
    timeoutRef.current = setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(i => i + 1);
        setUserGuess("");
        setMsg("");
        setRevealed(false);
        setAutoAdvance(false);
      } else {
        setSessionCompleted(true);
        setAutoAdvance(false);
      }
    }, delay);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!questions.length || sessionCompleted) return;
    const q = questions[currentIndex];
    if (!q) return;
    const norm = s => (s||"").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    const correct = norm(userGuess) === norm(q.answer);
    if (correct) {
      setMsg("🎉 Correct! " + q.answer);
      setScore(s => s + 1);
    } else {
      setMsg("❌ Oops! This was: " + q.answer);
    }
    setRevealed(true);
    triggerNext();
  }

  // Needed for REVEAL mode/flow (if reveal was present)
  // This template does not have a Reveal button, but supporting an explicit reveal call.
  function handleReveal() {
    if (!questions.length || sessionCompleted) return;
    const q = questions[currentIndex];
    setMsg("😇 It's: " + q.answer);
    setRevealed(true);
    triggerNext();
  }

  function handleRestart() {
    setQuestions([]);
    setCurrentIndex(0);
    setScore(0);
    setUserGuess("");
    setMsg("");
    setRevealed(false);
    setAutoAdvance(false);
    setLoading(true);
    setSessionCompleted(false);
    setError("");
    // useEffect will refetch
  }

  // Main render
  const q = questions[currentIndex];

  return (
    <div className="container" style={{ marginTop: 100 }}>
      <button
        className="btn"
        style={{
          background: "#f1e4fa",
          color: "#d505ff",
          border: "1px solid #d505ff55",
          marginBottom: 18,
          fontWeight: 600,
        }}
        onClick={() => navigate("/section")}
        disabled={loading}
      >
        ← Back
      </button>
      <h2 style={{ color: "#d505ff" }}>4-Image Connection Game</h2>
      {/* Progress bar / stepper */}
      <div style={{
        margin: "10px 0 26px 0",
        color: "#101",
        fontSize: 18,
        textAlign: "center",
        fontWeight: 500
      }}>
        Score: {score} &nbsp; | &nbsp; Question: {questions.length ? Math.min(currentIndex + 1, questions.length) : 1} / {questions.length || MAX_QUESTIONS}
      </div>
      {!questions.length || loading ? (
        <div>{error ? error : "Loading questions from TMDB..."}</div>
      ) : sessionCompleted ? (
        <div style={{
          background: "#fff",
          color: "#0d0d0d",
          borderRadius: 14,
          textAlign: "center",
          padding: "30px 16px"
        }}>
          <div style={{
            fontWeight: 700,
            fontSize: 20,
            color: "#d505ff",
            marginBottom: 12
          }}>
            Game Complete!
          </div>
          <div style={{
            fontWeight: 600,
            fontSize: 16,
            marginBottom: 6
          }}>
            Final Score: {score} / {questions.length}
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
          textAlign: "center",
          background: "#fff",
          padding: "18px 12px",
          borderRadius: 14,
          color: "#0d0d0d",
          minHeight: 270,
        }}>
          <div style={{
            display: "flex",
            gap: 17,
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 10
          }}>
            {(q.images || []).map((img, idx) => (
              <div key={idx}
                style={{
                  minWidth: 92, minHeight: 105, borderRadius: 9,
                  overflow: "hidden", padding: 0, background: "#eee",
                  boxShadow: "0 2px 14px #d505ff1c"
                }}>
                <img
                  src={img.url}
                  alt={"Movie Still "+(idx+1)}
                  style={{
                    width: 92, height: 120, objectFit: "cover"
                  }}
                />
              </div>
            ))}
          </div>
          <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
            <input
              type="text"
              value={userGuess}
              placeholder="Movie name"
              style={inputStyle}
              onChange={e => setUserGuess(e.target.value)}
              disabled={revealed || autoAdvance}
              autoFocus
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 12 }}>
              <button
                className="btn"
                style={{
                  background: "#d505ff", color: "#fff",
                  opacity: revealed || autoAdvance ? 0.7 : 1
                }}
                type="submit"
                disabled={revealed || autoAdvance}
              >Submit</button>
              {/* VISIBLY show Reveal Answer button, always during quiz unless autoAdvance or already revealed */}
              <button
                className="btn"
                style={{
                  background: "#fff",
                  color: "#d505ff",
                  border: "1px solid #d505ff",
                  opacity: revealed || autoAdvance ? 0.5 : 1,
                  fontWeight: 600,
                  minWidth: 112,
                  display: "inline-block",
                }}
                type="button"
                disabled={revealed || autoAdvance}
                onClick={handleReveal}
              >
                Reveal Answer
              </button>
            </div>
          </form>
          <div style={{ marginTop: 13, minHeight: 32 }}>
            {msg}
          </div>
          {autoAdvance && (
            <div style={{ color: "#999", marginTop: 6 }}>Next coming…</div>
          )}
        </div>
      )}
    </div>
  );
}

// Same style as before for input
const inputStyle = {
  border: "1px solid #d505ff99",
  borderRadius: 6,
  fontSize: 17,
  padding: "12px 14px",
  width: 210,
  outline: "none",
  textAlign: "center"
};
