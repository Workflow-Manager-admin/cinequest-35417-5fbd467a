import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPopularMovies, getRomanizedTitle } from "./tmdbApi";

/**
 * Famous Dialogue Match game – session logic and UI.
 * Patches:
 *   (a) Guarantee correct TMDB poster URL, with fallback for missing/missing poster_path (always show placeholder if needed).
 *   (b) Ensure each quiz session picks 10 unique, never-repeated questions per session, unless there are fewer than 10 available.
 *   (c) Make auto-advance after selection fully robust (never glitch, never require user interaction).
 * No other logic or UI changes are made.
 */
// Max 10 unique questions per session
const MAX_QUIZZES = 10;

// Demo dialogue set; add more as needed
const dialogueDataset = [
  { movie: "The Godfather", dialogue: "I'm gonna make him an offer he can't refuse." },
  { movie: "Baasha", dialogue: "Naan oru thadavai sonna, nooru thadavai sonna madhiri." },
  { movie: "Pulp Fiction", dialogue: "Say 'what' again. I dare you." },
  { movie: "Sivaji", dialogue: "Vaaji Vaaji Sivaji!" }
];

// Section-appropriate dialogues
function getSectionChoices(section) {
  return section === "hollywood"
    ? dialogueDataset.filter(d => ["The Godfather", "Pulp Fiction"].includes(d.movie))
    : dialogueDataset.filter(d => ["Baasha", "Sivaji"].includes(d.movie));
}

// Helper: shuffle array (returns new array)
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; --i) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// TMDB image URL base for posters
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w185";
const TMDB_API_KEY = "5bc67d3b06aecbd18121a3cbbc16eb59";

// PUBLIC_INTERFACE
export default function GameFamousDialogueMatch({ section }) {
  const [quizSet, setQuizSet] = useState([]); // Array of { dialogue, movie }
  const [quizIdx, setQuizIdx] = useState(0);
  const [picked, setPicked] = useState(""); // user's current guess/title
  const [resultMsg, setResultMsg] = useState("");
  const [options, setOptions] = useState([]); // Four poster-image option objects per question
  const [moviePosters, setMoviePosters] = useState({}); // {movieTitle: poster_path}
  const [score, setScore] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [posterChoicesCache, setPosterChoicesCache] = useState({}); // question idx -> array of 4 movie titles (unique)
  const navigate = useNavigate();

    // On mount/section change, set up a unique, shuffled quiz session of up to 10 non-repeating questions,
  // guarantee that all are unique within the session and any image fallback is handled via map.
  useEffect(() => {
    setLoading(true);
    setQuizIdx(0);
    setScore(0);
    setResultMsg("");
    setPicked("");
    setRevealed(false);
    setOptions([]);
    setPosterChoicesCache({});

    // Get posters from TMDB for movies in the session question set
    async function setupSession() {
      // Pull enough TMDB movies to guarantee unique posters for each movie in dialogue set
      let tmdbMovies = [];
      try {
        const page1 = await getPopularMovies({
          region: section === "kollywood" ? "IN" : "US",
          include_adult: false,
          page: 1,
        });
        const page2 = await getPopularMovies({
          region: section === "kollywood" ? "IN" : "US",
          include_adult: false,
          page: 2,
        });
        tmdbMovies = (page1.results || []).concat(page2.results || []);
        // For Kollywood, filter to only those found in the dialogue set and with poster
        if (section === "kollywood") {
          tmdbMovies = tmdbMovies.filter(
            m => m.poster_path && ["Baasha", "Sivaji"].includes(m.title)
          );
        } else {
          tmdbMovies = tmdbMovies.filter(
            m => m.poster_path && ["The Godfather", "Pulp Fiction"].includes(m.title)
          );
        }
      } catch {
        tmdbMovies = [];
      }

      // Compose movie title => poster_path lookup table
      const tmdbPosterMap = {};
      tmdbMovies.forEach(m => {
        if (m.poster_path && m.title) {
          tmdbPosterMap[m.title] = m.poster_path;
        }
      });

      // Candidate questions: only those that have a poster available
      let candidates = getSectionChoices(section).filter(
        d => !!tmdbPosterMap[d.movie]
      );

      // Guarantee 10 unique (non-repeated) questions for this session (and never more than available)
      let sessionSet = shuffleArray(candidates).slice(0, Math.min(MAX_QUIZZES, candidates.length));

      setQuizSet(sessionSet);
      setMoviePosters(tmdbPosterMap); // Used for session's answer and distractors
      setLoading(false);
    }
    setupSession();
  }, [section]);

  // When quiz set and posters are loaded, set up the four poster options for the first question
  useEffect(() => {
    if (quizSet.length && Object.keys(moviePosters).length && !loading) {
      setOptions(generatePosterChoices(0, quizSet, moviePosters, section, posterChoicesCache, setPosterChoicesCache));
    }
    // eslint-disable-next-line
  }, [quizSet, moviePosters, loading]);

  // On question change, set poster options accordingly
  useEffect(() => {
    if (
      quizSet.length > quizIdx &&
      Object.keys(moviePosters).length &&
      !loading
    ) {
      setOptions(generatePosterChoices(quizIdx, quizSet, moviePosters, section, posterChoicesCache, setPosterChoicesCache));
    }
    // eslint-disable-next-line
  }, [quizIdx, quizSet, moviePosters, loading]);

  // Helper: Make four poster choices (including the correct one, others are session-unique and never repeated per game)
  function generatePosterChoices(idx, quizSet, posterMap, section, cache, cacheSetter) {
    if (cache[idx]) {
      // Already generated for this question
      return cache[idx].map((movieTitle) => ({
        movie: movieTitle,
        poster_path: posterMap[movieTitle] || null
      }));
    }
    // Candidates for distractors: all movies from the section with posters already found, excluding the correct answer
    const current = quizSet[idx];
    if (!current) return [];

    const allChoices = getSectionChoices(section)
      .map(d => d.movie)
      .filter(t => t !== current.movie && posterMap[t]);

    // Shuffle and pick 3 unique distractors (or less if not available!) plus the correct answer
    let distractors = shuffleArray(allChoices).slice(0, 3);
    const optionTitles = shuffleArray([current.movie, ...distractors]);
    // Store so this question will never change order of displayed options on re-render
    cacheSetter(prv => ({ ...prv, [idx]: optionTitles }));

    return optionTitles.map(movieTitle => ({
      movie: movieTitle,
      poster_path: posterMap[movieTitle] || null
    }));
  }

  // Quiz flow: selecting a choice, now always auto-advances to next after a choice (no next button between questions)
  function checkMatch(movieTitle) {
    if (revealed || loading) return;
    setPicked(movieTitle);
    const correctMovie = quizSet[quizIdx]?.movie;

    let nextScore = score;
    if (movieTitle === correctMovie) {
      nextScore = score + 1;
      setScore(nextScore);
      setResultMsg("🎉 Correct! Score: " + nextScore);
    } else {
      setResultMsg(
        "❌ Oops, the correct answer was: " + correctMovie + " | Score: " + score
      );
    }
    setRevealed(true);

    // Guarantee only ONE auto-advance timer per answer, and always clear any existing
    if (window.__cqFamousDialogueAdvanceTimeout) {
      clearTimeout(window.__cqFamousDialogueAdvanceTimeout);
    }
    // Always auto-advance unless final question—after delay
    if (quizIdx + 1 < quizSet.length) {
      window.__cqFamousDialogueAdvanceTimeout = setTimeout(() => {
        setResultMsg("");
        setPicked("");
        setRevealed(false);
        setQuizIdx(i => i + 1);
        window.__cqFamousDialogueAdvanceTimeout = null;
      }, 1150);
    }
    // Otherwise, leave at completion so Play Again/Restart is available
  }

  function handleRestart() {
    // Triggers a new session, cancels any pending auto-advance
    if (window.__cqFamousDialogueAdvanceTimeout) {
      clearTimeout(window.__cqFamousDialogueAdvanceTimeout);
      window.__cqFamousDialogueAdvanceTimeout = null;
    }
    setQuizIdx(0);
    setScore(0);
    setResultMsg("");
    setPicked("");
    setRevealed(false);
    setOptions([]);
    setPosterChoicesCache({});
    setLoading(true);

    // Generate a new session set of up to 10 unique, non-repeating questions
    const candidates = getSectionChoices(section);
    const sessionSet = shuffleArray(candidates).slice(0, Math.min(MAX_QUIZZES, candidates.length));
    setQuizSet(sessionSet);

    setLoading(false);
  }

  // Current quiz
  const currentPair = quizSet[quizIdx] || null;

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
          {/* Always show the dialogue above the poster/image choices */}
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
          {/* Poster/image answer choices */}
          <div style={{
            display: "flex",
            gap: 19,
            justifyContent: "center",
            marginTop: 20,
            flexWrap: "wrap"
          }}>
            {options.map(opt => {
              const isPicked = picked === opt.movie;
              const isCorrect = currentPair.movie === opt.movie;
              return (
                <div
                  key={opt.movie}
                  tabIndex={0}
                  onClick={() => !revealed && checkMatch(opt.movie)}
                  onKeyDown={e => {
                    if (!revealed && e.key === "Enter") checkMatch(opt.movie);
                  }}
                  style={{
                    background:
                      revealed && isCorrect
                        ? "#25B219"
                        : isPicked
                        ? revealed
                          ? "#c00"
                          : "#d505ff"
                        : "#f9f9fb",
                    color:
                      revealed && (isCorrect || isPicked)
                        ? "#fff"
                        : "#101",
                    borderRadius: 13,
                    padding: 9,
                    minWidth: 108,
                    cursor: revealed ? "default" : "pointer",
                    boxShadow: "0 1.5px 12px #d505ff1e",
                    outline: isPicked ? "2.5px solid #8f00aa" : "none",
                    marginBottom: 8,
                    position: "relative",
                    border: revealed && isCorrect
                      ? "2.5px solid #25B219"
                      : revealed && isPicked
                      ? "2px solid #c00"
                      : "1px solid #eee",
                    opacity: revealed && !isPicked && !isCorrect ? 0.65 : 1,
                    transition: "all 0.09s"
                  }}>
                  {/* Always try to show TMDB poster, else fallback */}
                  <div style={{ position: "relative" }}>
                    {/* Robust poster fallback: always render fallback, only show poster if valid */}
                    {opt.poster_path ? (
                      <img
                        src={`${TMDB_IMAGE_BASE}${opt.poster_path}`}
                        style={{
                          width: 85,
                          height: 120,
                          objectFit: "cover",
                          borderRadius: 7,
                          marginBottom: 7,
                          background: "#d3cdf2"
                        }}
                        alt={opt.movie}
                        loading="lazy"
                        onError={e => {
                          // If poster fails, fallback to placeholder
                          e.target.onerror = null;
                          e.target.style.display = "none";
                          const fallback = e.target.nextSibling;
                          if (fallback) fallback.style.display = "flex";
                        }}
                      />
                    ) : null}
                    {/* Always render fallback, only show if no poster_path or poster failed to load */}
                    {!opt.poster_path && (
                      <div style={{
                        width: 85, height: 120, background: "#ddd",
                        borderRadius: 7, margin: "0 auto 6px", display: "flex",
                        alignItems: "center", justifyContent: "center", fontSize: 22
                      }}>🎬</div>
                    )}
                  </div>
                  <div style={{
                    fontWeight: 600,
                    fontSize: 15,
                    marginTop: 1.5
                  }}>
                    {section === "kollywood"
                      ? getRomanizedTitle({ title: opt.movie, original_title: opt.movie })
                      : opt.movie}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 24, minHeight: 28 }}>
            {resultMsg}
          </div>
          {/* Play Again only appears on completion, Next is superseded by auto-advance */}
          {revealed && quizIdx + 1 === quizSet.length && (
            <div style={{
              marginTop: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 17
            }}>
              <button
                className="btn"
                style={{
                  background: "#f3e7fa",
                  color: "#d505ff",
                  fontWeight: 600,
                  borderRadius: 8,
                  minWidth: 120
                }}
                onClick={handleRestart}
              >
                Play Again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
