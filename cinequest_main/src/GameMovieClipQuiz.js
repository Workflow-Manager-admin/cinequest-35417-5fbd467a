import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getPopularMovies, isKollywoodOriginalMovie, getRomanizedTitle, getKollywoodOriginalMovies } from "./tmdbApi";

// Movie image for quiz, not a video; fallback sample for demo
const sampleMovies = [
  { title: "Inception", poster_path: "/edv5CZvWj09upOsy2Y6IwDhK8bt.jpg" },
  { title: "Parasite", poster_path: "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg" },
  { title: "Vikram", poster_path: "/7MdNGg6mUJf2Xz16GafVwHdLD6Q.jpg" },
  { title: "Interstellar", poster_path: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg" }
];

// Helper: get movies for section (Hollywood: TMDB popular; Kollywood: strict original language ta)
function getSectionMovies(section, cb) {
  if (section === "kollywood") {
    getKollywoodOriginalMovies({ page: 1 })
      .then(data => {
        let m = (data.results || []).filter(m => m.title && m.poster_path);
        // Already filtered by with_original_language=ta in getKollywoodOriginalMovies
        if (m.length > 18) m = m.slice(0, 18);
        cb(m);
      })
      .catch(() => cb([]));
  } else {
    getPopularMovies({
      region: "US",
      language: "en",
      include_adult: false
    }).then(data => {
      let m = (data.results || []).filter(m => m.title && m.poster_path);
      if (m.length > 18) m = m.slice(0, 18);
      cb(m);
    }).catch(() => cb([]));
  }
}

// PUBLIC_INTERFACE
export default function GameMovieClipQuiz({ section }) {
  const [movie, setMovie] = useState(null);
  const [showImage, setShowImage] = useState(true); // Show image for 5s first
  const [questionReady, setQuestionReady] = useState(false); // Show question
  const [revealed, setRevealed] = useState(false);
  const [resultMsg, setResultMsg] = useState("");
  const [input, setInput] = useState("");
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [usedIndices, setUsedIndices] = useState([]);
  const navigate = useNavigate();
  const timeoutRef = useRef();

  // Pick next unused movie (cycling if all used, for demo)
  function pickNextMovie(movies, prevUsed = []) {
    if (!movies.length) return null;
    // Pick a random index not in usedIndices; if all are used, reset usedIndices
    let unused = movies
      .map((_, idx) => idx)
      .filter(idx => !prevUsed.includes(idx));
    let useIndices = prevUsed.slice();
    if (unused.length === 0) {
      useIndices = [];
      unused = movies.map((_, idx) => idx);
    }
    const idx = unused[Math.floor(Math.random() * unused.length)];
    useIndices.push(idx);
    setUsedIndices(useIndices);
    return movies[idx];
  }

  // Loads a new random movie and resets states for image-to-question flow
  function advanceQuiz() {
    setShowImage(true);
    setQuestionReady(false);
    setRevealed(false);
    setResultMsg("");
    setInput("");
    setAutoAdvance(false);

    getSectionMovies(section, ms => {
      let pick;
      if (ms.length) {
        pick = pickNextMovie(ms, usedIndices);
      } else {
        // fallback to a demo sample if no movies found
        const idx = Math.floor(Math.random() * sampleMovies.length);
        pick = sampleMovies[idx];
      }
      setMovie(pick);
      timeoutRef.current = setTimeout(() => {
        setShowImage(false);
        setQuestionReady(true);
      }, 5000);
    });
  }

  // On section mount/change, or at end of advanceQuiz
  useEffect(() => {
    advanceQuiz();
    return () => clearTimeout(timeoutRef.current);
    // eslint-disable-next-line
  }, [section]);

  // If we advance after reveal (auto), reset new
  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  function check(e) {
    e.preventDefault();
    if (!movie) return;
    let answer = section === "kollywood" ? getRomanizedTitle(movie) : movie.title;
    if ((input || "").trim().toLowerCase() === (answer || "").trim().toLowerCase()) {
      setResultMsg("🎉 Correct! It's " + answer);
      setRevealed(true);
      // Short auto advance after showing correct
      setAutoAdvance(true);
      timeoutRef.current = setTimeout(() => advanceQuiz(), 1550);
    } else {
      setResultMsg("❌ Nope, this was: " + answer);
      setRevealed(true);
      setAutoAdvance(true);
      timeoutRef.current = setTimeout(() => advanceQuiz(), 1550);
    }
  }

  function handleReveal() {
    if (!movie) return;
    let answer = section === "kollywood" ? getRomanizedTitle(movie) : movie.title;
    setResultMsg("😇 It's: " + answer);
    setRevealed(true);
    setAutoAdvance(true);
    timeoutRef.current = setTimeout(() => advanceQuiz(), 1400);
  }

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
        onClick={() => navigate(-1)}
        disabled={autoAdvance}
      >
        ← Back
      </button>
      <h2 style={{ color: "#d505ff" }}>Movie Clip Quiz</h2>
      {!movie ? (
        <div>Loading Quiz…</div>
      ) : (
        <div style={{ textAlign: "center" }}>
          {/* Show the image phase for 5 seconds */}
          {showImage ? (
            <div>
              <div
                style={{
                  display: "inline-block",
                  borderRadius: 18,
                  overflow: "hidden",
                  boxShadow: "0 2px 20px #d505ff1a",
                  marginBottom: 14,
                  background: "#eee"
                }}
              >
                {movie.poster_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w400${movie.poster_path}`}
                    alt="Movie Poster"
                    style={{ width: 262, height: 390, objectFit: "cover", display: "block" }}
                  />
                ) : (
                  <div style={{
                    width: 262, height: 390, background: "#ccc",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 36, color: "#d505ff"
                  }}>🎬</div>
                )}
              </div>
              <div style={{ margin: "10px 0", color: "#aaa" }}>Memorize the movie poster!<br />Question will appear in 5 seconds…</div>
            </div>
          ) : questionReady && (
            <div>
              <form onSubmit={check}>
                <div style={{ fontWeight: 600, fontSize: 19, margin: "10px 0 19px 0" }}>
                  What is the title of this movie?
                </div>
                <input
                  type="text"
                  placeholder="Movie title?"
                  style={inputStyle}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  autoFocus
                  disabled={revealed || autoAdvance}
                />
                <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 13 }}>
                  <button className="btn"
                    style={{
                      background: "#d505ff",
                      color: "#fff",
                      opacity: revealed || autoAdvance ? 0.5 : 1
                    }}
                    type="submit"
                    disabled={revealed || autoAdvance}
                  >Submit</button>
                  {/* REVEAL ANSWER BUTTON */}
                  <button
                    className="btn"
                    style={{
                      background: "#fff",
                      color: "#d505ff",
                      border: "1px solid #d505ff",
                      minWidth: 112,
                      fontWeight: 600,
                      opacity: revealed || autoAdvance ? 0.5 : 1
                    }}
                    type="button"
                    onClick={handleReveal}
                    disabled={revealed || autoAdvance}
                  >
                    Reveal Answer
                  </button>
                </div>
              </form>
              <div style={{ marginTop: 16, minHeight: 24 }}>{resultMsg}</div>
              {autoAdvance && (
                <div style={{ color: "#999", marginTop: 6 }}>Next quiz coming…</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  border: "1px solid #d505ff66",
  borderRadius: 6,
  fontSize: 17,
  padding: "12px 14px",
  width: 220,
  outline: "none",
  textAlign: "center"
};
