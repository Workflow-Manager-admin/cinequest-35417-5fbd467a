import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getPopularMovies, getPersonDetails, getPersonMovieCredits, isKollywoodOriginalMovie, getRomanizedTitle } from "./tmdbApi";

// Max number of unique director quizzes per session
const MAX_DIRECTOR_QUIZZES = 6;

// Demo directors pool - for real app, expand with more entries
const directors = {
  hollywood: [
    {
      name: "Christopher Nolan",
      personId: 525,
      image: "https://image.tmdb.org/t/p/w185/6C4QPGIExnqkzl6LVIqyn5n4yhz.jpg",
      correctMovies: [
        "Inception", "Interstellar", "Dunkirk", "Memento"
      ]
    }
  ],
  kollywood: [
    {
      name: "Mani Ratnam",
      personId: 127934,
      image: "https://image.tmdb.org/t/p/w185/c8TIWrGV6A0XRw2OCn9SWzJom82.jpg",
      correctMovies: [
        "Roja", "Alaipayuthey", "Guru", "Kannathil Muthamittal"
      ]
    }
  ]
};

const distractorPopularMovies = {
  hollywood: ["Pulp Fiction", "Titanic", "The Godfather", "Forrest Gump"],
  kollywood: ["Baahubali", "Sivaji", "Kabali", "Enthiran"]
};

// Robust TMDB image loader (for poster), fallback to 🎬 placeholder if not found
function getTMDBPosterUrl(poster_path) {
  return poster_path
    ? `https://image.tmdb.org/t/p/w185${poster_path}`
    : null;
}

// Helper for shuffling (Fisher-Yates)
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; --i) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// PUBLIC_INTERFACE
export default function GameDirectorsMovies({ section }) {
  // Session state: quiz progress and director pool for session
  const [directorPool, setDirectorPool] = useState([]); // array of directors for session (max 6)
  const [quizIdx, setQuizIdx] = useState(0); // current director question (0-based)
  const [movies, setMovies] = useState([]); // choices for current quiz: array of { title, poster_path, isCorrect }
  const [choice, setChoice] = useState([]);
  const [resultMsg, setResultMsg] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [autoAdvancing, setAutoAdvancing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionComplete, setSessionComplete] = useState(false);

  const navigate = useNavigate();
  const timeoutRef = useRef(null);

  // On mount/section change: set up 6 unique directors for session from pool (expandable for prod)
  useEffect(() => {
    setLoading(true);
    setSessionComplete(false);
    setQuizIdx(0);
    setChoice([]);
    setResultMsg("");
    setShowResult(false);
    setMovies([]);
    setAutoAdvancing(false);

    // For extensibility: if multiple candidates, do shuffle & select; else just one
    let dirArr = Array.isArray(directors[section]) ? directors[section] : [];
    const uniqueSessionPool = shuffleArray(dirArr).slice(0, Math.min(MAX_DIRECTOR_QUIZZES, dirArr.length));
    setDirectorPool(uniqueSessionPool);
    // After director pool is ready, quizIdx effect will build first director's options
  }, [section]);

  // Build next quiz's movie set each time quizIdx or directors pool changes
  useEffect(() => {
    setChoice([]);
    setResultMsg("");
    setShowResult(false);
    setAutoAdvancing(false);

    // If session is complete, do not build more options
    if (!directorPool.length || quizIdx >= directorPool.length) {
      setSessionComplete(true);
      setLoading(false);
      return;
    }
    setLoading(true);

    const pick = directorPool[quizIdx];
    // Build distractors eliminating correct movies
    const correctSet = new Set(pick.correctMovies);
    const distractors = distractorPopularMovies[section].filter(t => !correctSet.has(t));

    // Get posters for all options
    async function buildOptions() {
      let allOpts = [];
      for (const t of pick.correctMovies.concat(distractors)) {
        try {
          const r = await getPopularMovies({
            region: section === "kollywood" ? "IN" : "US",
            language: section === "hollywood" ? "en" : "ta",
            include_adult: false,
          });
          let results = r.results || [];
          if (section === "kollywood") {
            results = results.filter(isKollywoodOriginalMovie);
          }
          // Kollywood: match against romanized, else normal
          let found;
          if (section === "kollywood") {
            found = results.find(
              m =>
                getRomanizedTitle(m)
                  .toLowerCase()
                  .replace(/[^a-z0-9]/g, "") ===
                t.toLowerCase().replace(/[^a-z0-9]/g, "")
            );
          } else {
            found = results.find(
              m =>
                m.title.toLowerCase().replace(/[^a-z0-9]/g, "") ===
                t.toLowerCase().replace(/[^a-z0-9]/g, "")
            );
          }
          allOpts.push({
            title: section === "kollywood" ? getRomanizedTitle({ title: t, original_title: t }) : t,
            poster_path: found && found.poster_path,
            isCorrect: pick.correctMovies.includes(t)
          });
        } catch {
          allOpts.push({
            title: section === "kollywood" ? getRomanizedTitle({ title: t, original_title: t }) : t,
            poster_path: "",
            isCorrect: pick.correctMovies.includes(t)
          });
        }
      }
      allOpts = shuffleArray(allOpts);
      setMovies(allOpts);
      setLoading(false);
    }
    buildOptions();

    // Clean up any timeout if quiz index changes abruptly
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [quizIdx, directorPool, section]);

  function toggle(title) {
    setChoice(ch =>
      ch.includes(title)
        ? ch.filter(t => t !== title)
        : [...ch, title]
    );
  }

  // When the user checks answer, show result then auto-advance to next director quiz (with delay)
  function checkAnswer() {
    if (!directorPool.length || quizIdx >= directorPool.length) return;
    const director = directorPool[quizIdx];
    const expected = new Set(director.correctMovies);
    const correct = choice.every(t => expected.has(t)) && choice.length === expected.size;
    setResultMsg(
      correct
        ? "🎉 Correct! These are all directed by " + director.name
        : "❌ Some choices were wrong or missing. Correct: " +
            director.correctMovies.join(", ")
    );
    setShowResult(true);
    setAutoAdvancing(true);

    // Progress automatically to the next quiz after feedback for this answer
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setShowResult(false);
      setResultMsg("");
      setChoice([]);
      if (quizIdx + 1 < directorPool.length) {
        setQuizIdx(idx => idx + 1);
      } else {
        setSessionComplete(true);
      }
      setAutoAdvancing(false);
    }, 1200);
  }

  function handleRestart() {
    setQuizIdx(0);
    setChoice([]);
    setResultMsg("");
    setSessionComplete(false);
    setShowResult(false);
    setMovies([]);
    setAutoAdvancing(false);
    // Director pool recalculated only on section change (as above)
  }

  // Current director for this quiz
  const director = directorPool[quizIdx];

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
        disabled={loading || autoAdvancing}
      >
        ← Back
      </button>
      <h2 style={{ color: "#d505ff" }}>Director's Movies Game</h2>
      {/* Progress: show Question and out of session limit */}
      <div style={{
        margin: "6px 0 18px 0",
        color: "#101",
        fontSize: 18,
        textAlign: "center",
        fontWeight: 500
      }}>
        {sessionComplete || !directorPool.length
          ? null
          : `Question: ${Math.min(quizIdx + 1, directorPool.length)} / ${directorPool.length}`}
      </div>
      {loading ? (
        <div>Loading…</div>
      ) : sessionComplete ? (
        <div style={{ textAlign: "center", marginTop: 38 }}>
          <div style={{ color: "#0d0d0d", fontWeight: 700, fontSize: 20, margin: "20px 0" }}>
            Quiz Complete!
          </div>
          <button
            className="btn"
            style={{
              background: "#f3e7fa",
              color: "#d505ff",
              fontWeight: 600,
              border: "1px solid #d505ff69"
            }}
            onClick={handleRestart}
          >
            Play Again
          </button>
        </div>
      ) : (
        <div style={{ textAlign: "center" }}>
          {director && (
            <>
              <img
                src={director.image}
                alt={director.name}
                style={{
                  width: 110, height: 124,
                  borderRadius: 14,
                  margin: "0 auto 15px"
                }}
              />
              <div style={{
                fontWeight: 600, color: "#4a0153",
                marginBottom: 10, fontSize: 18
              }}>
                Select all movies directed by {director.name}
              </div>
            </>
          )}
          <div
            style={{
              display: "flex",
              gap: 18,
              flexWrap: "wrap",
              justifyContent: "center",
              marginBottom: 18
            }}>
            {movies.map(m => (
              <div
                key={m.title}
                tabIndex={0}
                onClick={() => !showResult && !autoAdvancing && toggle(m.title)}
                onKeyDown={e => { if (e.key === "Enter" && !showResult && !autoAdvancing) toggle(m.title); }}
                style={{
                  background: choice.includes(m.title)
                    ? "#d505ff"
                    : "#f9f9fb",
                  color: choice.includes(m.title)
                    ? "#fff"
                    : "#101",
                  borderRadius: 11,
                  padding: 7,
                  width: 96,
                  boxShadow: "0 2px 10px #d505ff17",
                  border: choice.includes(m.title)
                    ? "1.5px solid #8f00ba"
                    : "1.5px solid #eee",
                  cursor: showResult || autoAdvancing ? "not-allowed" : "pointer",
                  marginBottom: 5,
                  opacity: showResult || autoAdvancing ? 0.7 : 1
                }}>
                {getTMDBPosterUrl(m.poster_path) ? (
                  <img
                    src={getTMDBPosterUrl(m.poster_path)}
                    style={{
                      width: 82,
                      height: 115,
                      objectFit: "cover",
                      borderRadius: 7,
                      marginBottom: 4,
                      background: "#d3cdf2"
                    }}
                    alt={m.title}
                    loading="lazy"
                    onError={e => {
                      // On poster fail, fallback to icon and hide image
                      e.target.onerror = null;
                      e.target.style.display = "none";
                      const fallback = e.target.nextSibling;
                      if (fallback) fallback.style.display = "flex";
                    }}
                  />
                ) : null}
                {/* Always render fallback */}
                {!getTMDBPosterUrl(m.poster_path) && (
                  <div style={{
                    width: 82, height: 115, background: "#ccc",
                    borderRadius: 7, marginBottom: 4, display: "flex",
                    alignItems: "center", justifyContent: "center", fontSize: 20
                  }}>🎬</div>
                )}
                <div style={{
                  fontWeight: 600,
                  fontSize: 13.2
                }}>
                  {section === "kollywood"
                    ? getRomanizedTitle({ title: m.title, original_title: m.title })
                    : m.title}
                </div>
              </div>
            ))}
          </div>
          <button className="btn"
            style={{
              background: "#d505ff",
              color: "#fff",
              opacity: showResult || autoAdvancing ? 0.5 : 1
            }}
            onClick={checkAnswer}
            disabled={showResult || autoAdvancing}
          >Check Answer</button>
          <div style={{
            marginTop: 18,
            minHeight: 24,
            color: showResult && resultMsg.startsWith("🎉") ? "#38c172" : showResult ? "#c00" : "#222",
            fontWeight: showResult ? 600 : "normal"
          }}>
            {showResult ? resultMsg : null}
          </div>
          {autoAdvancing && (
            <div style={{ marginTop: 10, color: "#999" }}>Next coming…</div>
          )}
        </div>
      )}
    </div>
  );
}
