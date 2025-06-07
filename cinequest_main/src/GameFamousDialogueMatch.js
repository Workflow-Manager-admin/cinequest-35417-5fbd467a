import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPopularMovies, getRomanizedTitle } from "./tmdbApi";

// Max 15 unique questions per session
const MAX_QUIZZES = 15;

// Demo dialogue set; production code could use a much larger set
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

// Array shuffle helper (returns new array)
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; --i) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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

  // On mount/section change, build unique, shuffled quiz dataset and load movie posters
  useEffect(() => {
    setLoading(true);
    setQuizIdx(0);
    setScore(0);
    setResultMsg("");
    setPicked("");
    setRevealed(false);
    setOptions([]);
    setPosterChoicesCache({});

    // Robust: Only use TMDB movies with valid posters for ALL options (answer + distractors)
    async function setupSession() {
      // Get TMDB movies for section (two pages for better coverage)
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
          tmdbMovies = tmdbMovies.filter(m =>
            m.poster_path && ["Baasha", "Sivaji"].includes(m.title) // titles in dataset
          );
        } else {
          tmdbMovies = tmdbMovies.filter(m =>
            m.poster_path && ["The Godfather", "Pulp Fiction"].includes(m.title)
          );
        }
      } catch {
        tmdbMovies = [];
      }

      // Compose movieTitle -> poster_path for only those present
      const tmdbPosterMap = {};
      tmdbMovies.forEach(m => {
        tmdbPosterMap[m.title] = m.poster_path;
      });

      // Compose usable dialogue questions: must have TMDB poster available for the movie
      const candidates = getSectionChoices(section).filter(
        d => !!tmdbPosterMap[d.movie]
      );
      // If not enough for 15, just use as many as possible (with enforced uniqueness)
      const sessionSet = shuffleArray(candidates).slice(0, Math.min(MAX_QUIZZES, candidates.length));
      setQuizSet(sessionSet);

      // Record posters for the session candidates only (and all possible options from TMDB for distractors)
      setMoviePosters(tmdbPosterMap);

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

  // Quiz flow: selecting a choice
  function checkMatch(movieTitle) {
    if (revealed || loading) return;
    setPicked(movieTitle);
    const correctMovie = quizSet[quizIdx]?.movie;

    if (movieTitle === correctMovie) {
      setScore(s => s + 1);
      setResultMsg("🎉 Correct! Score: " + (score + 1));
    } else {
      setResultMsg(
        "❌ Oops, the correct answer was: " + correctMovie + " | Score: " + score
      );
    }
    setRevealed(true);
  }

  function handleNext() {
    setResultMsg("");
    setPicked("");
    setRevealed(false);
    if (quizIdx + 1 < quizSet.length) {
      setQuizIdx(i => i + 1);
    } else {
      setRevealed(true);
    }
  }

  function handleRestart() {
    // Triggers fresh session via reset effect
    setQuizIdx(0);
    setScore(0);
    setResultMsg("");
    setPicked("");
    setRevealed(false);
    setOptions([]);
    setPosterChoicesCache({});
    setLoading(true);

    // Redo session selection and poster preload (simplest to rely on effect)
    // PRODUCTION: Here you might want to cache TMDB calls for performance
    let candidates = getSectionChoices(section);
    let sessionSet = shuffleArray(candidates).slice(0, Math.min(MAX_QUIZZES, candidates.length));
    setQuizSet(sessionSet);

    // Trigger poster reload on restart (simulate fresh play)
    // But if moviePosters not changed for this session, reuse
    // Otherwise, effect will run and refill options
    // (moviePosters and quizSet effect together trigger options update)
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
                  {opt.poster_path ? (
                    <img
                      // TMDB poster images do NOT require API key in URL
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
                    />
                  ) : (
                    <div style={{
                      width: 85, height: 120, background: "#ddd",
                      borderRadius: 7, margin: "0 auto 6px", display: "flex",
                      alignItems: "center", justifyContent: "center", fontSize: 22
                    }}>🎬</div>
                  )}
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
          {revealed && (
            <div style={{
              marginTop: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 17
            }}>
              {quizIdx + 1 < quizSet.length ? (
                <button
                  className="btn"
                  style={{
                    background: "#d505ff",
                    color: "#fff",
                    fontWeight: 600,
                    borderRadius: 8,
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
                    borderRadius: 8,
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
