import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPopularMovies, getRomanizedTitle } from "./tmdbApi";

// Max 15 unique questions per session
const MAX_QUIZZES = 15;

const dialogueDataset = [
  // Example pairs: dialogue -> movie
  {
    movie: "The Godfather",
    dialogue: "I'm gonna make him an offer he can't refuse."
  },
  {
    movie: "Baasha",
    dialogue: "Naan oru thadavai sonna, nooru thadavai sonna madhiri."
  },
  {
    movie: "Pulp Fiction",
    dialogue: "Say 'what' again. I dare you."
  },
  {
    movie: "Sivaji",
    dialogue: "Vaaji Vaaji Sivaji!"
  },
];

function getSectionChoices(section) {
  return section === "hollywood"
    ? dialogueDataset.filter(d => ["The Godfather", "Pulp Fiction"].includes(d.movie))
    : dialogueDataset.filter(d => ["Baasha", "Sivaji"].includes(d.movie));
}

// Helper to randomize array (shallow copy)
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; --i) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// PUBLIC_INTERFACE
export default function GameFamousDialogueMatch({ section }) {
  // Unique quiz sequence for session
  const [quizSet, setQuizSet] = useState([]);
  const [quizIdx, setQuizIdx] = useState(0); // index for current quiz
  const [picked, setPicked] = useState(""); // chosen answer for this quiz
  const [resultMsg, setResultMsg] = useState(""); // score/result for this quiz
  const [movieImages, setMovieImages] = useState({}); // movie: poster_path
  const [score, setScore] = useState(0);
  const [revealed, setRevealed] = useState(false); // disables input after answer
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  // Build a set of MAX_QUIZZES unique dialogues per session and preload posters
  useEffect(() => {
    setLoading(true);
    setQuizIdx(0);
    setScore(0);
    setResultMsg("");
    setPicked("");
    setRevealed(false);

    // Get candidate set and shuffle
    let candidates = getSectionChoices(section);
    // Repeat dataset if less than MAX_QUIZZES (for true code would need >15, but use duplicates if needed)
    let sessionSet = [];
    if (candidates.length >= MAX_QUIZZES) {
      sessionSet = shuffleArray(candidates).slice(0, MAX_QUIZZES);
    } else {
      let times = Math.ceil(MAX_QUIZZES / candidates.length);
      let pool = [];
      for (let t = 0; t < times; ++t) pool = pool.concat(shuffleArray(candidates));
      sessionSet = pool.slice(0, MAX_QUIZZES);
    }
    setQuizSet(sessionSet);

    // Preload poster images for all movies in quizSet
    const moviesToGet = Array.from(new Set(sessionSet.map(d => d.movie)));
    async function fetchImgs() {
      let res = {};
      for (const t of moviesToGet) {
        try {
          const sr = await getPopularMovies({
            region: section === "kollywood" ? "IN" : "US",
            include_adult: false,
          });
          // Find movie by normalized title
          const found = (sr.results || []).find(
            m =>
              m.title.toLowerCase().replace(/[^a-z0-9]/g, "") ===
              t.toLowerCase().replace(/[^a-z0-9]/g, "")
          );
          if (found && found.poster_path) res[t] = found.poster_path;
        } catch { /* ignore errors */ }
      }
      setMovieImages(res);
    }
    fetchImgs().then(() => setLoading(false));
  // eslint-disable-next-line
  }, [section]);

  // Shuffle answer options for each question
  function getOptions() {
    if (!quizSet.length) return [];
    let candidates = getSectionChoices(section);
    // All options must be in this section; shuffle order
    return shuffleArray([...candidates]);
  }

  // Quiz scoring/answer flow
  function checkMatch(title) {
    // Only allow if not answered/revealed
    if (revealed || loading) return;
    setPicked(title);
    const isKollywood = section === "kollywood";
    const correctMovie =
      isKollywood
        ? getRomanizedTitle({ title: quizSet[quizIdx].movie, original_title: quizSet[quizIdx].movie })
        : quizSet[quizIdx].movie;

    const correct = isKollywood
      ? title === correctMovie
      : title === correctMovie;

    let showTitle = correctMovie;
    if (correct) {
      setScore(s => s + 1);
      setResultMsg("🎉 Correct! Score: " + (score + 1));
    } else {
      setResultMsg(
        "❌ Oops, the correct answer was: " + showTitle + " | Score: " + score
      );
    }
    setRevealed(true);
  }

  // Move to next quiz, or finish
  function handleNext() {
    setResultMsg("");
    setPicked("");
    setRevealed(false);
    if (quizIdx + 1 < quizSet.length) {
      setQuizIdx(i => i + 1);
    } else {
      // done; stays on last
      setRevealed(true);
    }
  }

  function handleRestart() {
    // Re-run effect by resetting section (triggers new session)
    setQuizIdx(0);
    setScore(0);
    setResultMsg("");
    setPicked("");
    setRevealed(false);
    setLoading(true);

    // This will re-fetch posters, but that's ok for session restart
    let candidates = getSectionChoices(section);
    let sessionSet = [];
    if (candidates.length >= MAX_QUIZZES) {
      sessionSet = shuffleArray(candidates).slice(0, MAX_QUIZZES);
    } else {
      let times = Math.ceil(MAX_QUIZZES / candidates.length);
      let pool = [];
      for (let t = 0; t < times; ++t) pool = pool.concat(shuffleArray(candidates));
      sessionSet = pool.slice(0, MAX_QUIZZES);
    }
    setQuizSet(sessionSet);

    const moviesToGet = Array.from(new Set(sessionSet.map(d => d.movie)));
    async function fetchImgs() {
      let res = {};
      for (const t of moviesToGet) {
        try {
          const sr = await getPopularMovies({
            region: section === "kollywood" ? "IN" : "US",
            include_adult: false,
          });
          const found = (sr.results || []).find(
            m =>
              m.title.toLowerCase().replace(/[^a-z0-9]/g, "") ===
              t.toLowerCase().replace(/[^a-z0-9]/g, "")
          );
          if (found && found.poster_path) res[t] = found.poster_path;
        } catch {}
      }
      setMovieImages(res);
      setLoading(false);
    }
    fetchImgs();
  }

  // Current quiz content
  const currentPair = quizSet[quizIdx] || null;
  const options = getOptions();

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
      >
        ← Back
      </button>
      <h2 style={{ color: "#d505ff" }}>Famous Dialogue Match</h2>
      <div style={{
        margin: "8px 0 14px 0", color: "#101",
        fontSize: 18, textAlign: "center", fontWeight: 500
      }}>
        Score: {score} &nbsp; | &nbsp; Question: {quizSet.length ? Math.min(quizIdx + 1, quizSet.length) : 1} / {quizSet.length || MAX_QUIZZES}
      </div>
      {loading || !currentPair ? (
        <div>Loading Game…</div>
      ) : (
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              background: "#fff",
              color: "#0d0d0d",
              borderRadius: 12,
              display: "inline-block",
              padding: "19px 26px",
              minWidth: 340,
              maxWidth: 440,
              fontWeight: 600,
              fontSize: 18,
              marginBottom: 20,
            }}
          >
            “{currentPair.dialogue}”
          </div>
          <div style={{
            display: "flex",
            gap: 16,
            justifyContent: "center",
            marginTop: 10,
            flexWrap: "wrap"
          }}>
            {options.map(opt => {
              const optMovie = section === "kollywood"
                ? getRomanizedTitle({ title: opt.movie, original_title: opt.movie })
                : opt.movie;
              const isPicked = picked === optMovie;
              // During review mode, highlight the correct answer green, incorrect red
              const isThisCorrect =
                (section === "kollywood"
                  ? getRomanizedTitle({ title: currentPair.movie, original_title: currentPair.movie })
                  : currentPair.movie) === optMovie;
              return (
                <div
                  key={opt.movie}
                  tabIndex={0}
                  onClick={() => !revealed && checkMatch(optMovie)}
                  onKeyDown={e => {
                    if (!revealed && e.key === "Enter") checkMatch(optMovie);
                  }}
                  style={{
                    background:
                      revealed && isThisCorrect
                        ? "#25B219"
                        : isPicked
                        ? revealed
                          ? "#c00"
                          : "#d505ff"
                        : "#f9f9fb",
                    color:
                      revealed && (isThisCorrect || isPicked)
                        ? "#fff"
                        : "#101",
                    borderRadius: 10,
                    padding: 14,
                    minWidth: 98,
                    cursor: revealed ? "default" : "pointer",
                    boxShadow: "0 1.5px 8px #d505ff1e",
                    outline: isPicked ? "2.5px solid #8f00aa" : "none",
                    marginBottom: 8,
                    position: "relative",
                    border: revealed && isThisCorrect
                      ? "2.5px solid #25B219"
                      : revealed && isPicked
                      ? "2px solid #c00"
                      : "1px solid #eee",
                    opacity: revealed && !isPicked && !isThisCorrect ? 0.72 : 1,
                  }}>
                  {movieImages[opt.movie] ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w185${movieImages[opt.movie]}`}
                      style={{
                        width: 70,
                        height: 98,
                        objectFit: "cover",
                        borderRadius: 6,
                        marginBottom: 5,
                        background: "#ccc"
                      }}
                      alt={opt.movie}
                    />
                  ) : (
                    <div style={{
                      width: 70, height: 98, background: "#ddd",
                      borderRadius: 6, margin: "0 auto 5px", display: "flex",
                      alignItems: "center", justifyContent: "center", fontSize: 22
                    }}>🎥</div>
                  )}
                  <div style={{ fontWeight: 500 }}>
                    {optMovie}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 22, minHeight: 24 }}>
            {resultMsg}
          </div>
          {revealed && (
            <div style={{
              marginTop: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 16
            }}>
              {quizIdx + 1 < quizSet.length ? (
                <button
                  className="btn"
                  style={{
                    background: "#d505ff",
                    color: "#fff",
                    fontWeight: 600,
                    borderRadius: 6,
                    minWidth: 120
                  }}
                  onClick={handleNext}
                >
                  Next
                </button>
              ) : (
                <button
                  className="btn"
                  style={{
                    background: "#f3e7fa",
                    color: "#d505ff",
                    fontWeight: 600,
                    borderRadius: 6,
                    minWidth: 120
                  }}
                  onClick={handleRestart}
                >
                  Play Again
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
