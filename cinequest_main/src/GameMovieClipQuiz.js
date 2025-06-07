import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  getPopularMovies,
  getMovieDetails,
  isKollywoodOriginalMovie,
  getRomanizedTitle,
  getKollywoodOriginalMovies
} from "./tmdbApi";

// Helper to randomly choose one item from an array
function pickOne(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

// Helper to pick a random element from an object { key: value, ... }
function pickRandomObjEntry(obj) {
  const keys = Object.keys(obj);
  if (keys.length === 0) return null;
  const key = pickOne(keys);
  return [key, obj[key]];
}

// -- Trivia Question Factory --
// Generates a list of possible interesting questions from TMDB data. Returns [{question, answer}...]
function generateQuestions(movieDetails, section) {
  if (!movieDetails) return [];

  const questions = [];
  const title = section === "kollywood"
    ? getRomanizedTitle(movieDetails)
    : movieDetails.title;
  if (!title) return [];

  // Plot/overview question
  if (movieDetails.overview && movieDetails.overview.length > 35) {
    questions.push({
      question: "Which movie has this plot? " + movieDetails.overview.slice(0, 160) + (movieDetails.overview.length > 160 ? "…" : ""),
      answer: title
    });
  }

  // Release year
  if (movieDetails.release_date) {
    const year = movieDetails.release_date.slice(0, 4);
    questions.push({
      question: `In which year was "${title}" released?`,
      answer: year
    });
  }

  // Director
  if (movieDetails.credits && movieDetails.credits.crew) {
    const director = movieDetails.credits.crew.find(
      c => c.job === "Director"
    );
    if (director && director.name) {
      questions.push({
        question: `Who directed the movie "${title}"?`,
        answer: director.name
      });
    }
  }

  // Lead actor
  if (movieDetails.credits && movieDetails.credits.cast && movieDetails.credits.cast.length > 0) {
    const actor = movieDetails.credits.cast[0];
    if (actor && actor.name) {
      questions.push({
        question: `Who played the lead role in "${title}"?`,
        answer: actor.name
      });
    }
  }

  // Genre
  if (movieDetails.genres && movieDetails.genres.length) {
    const genre = movieDetails.genres[0].name;
    questions.push({
      question: `What is the main genre of "${title}"?`,
      answer: genre
    });
  }

  // Language
  if (movieDetails.original_language) {
    questions.push({
      question: `What was the original language of release for "${title}"?`,
      answer: movieDetails.original_language === "ta" ? "Tamil" : movieDetails.original_language === "en" ? "English" : movieDetails.original_language
    });
  }

  // TMDB rating
  if (typeof movieDetails.vote_average === "number") {
    questions.push({
      question: `What is the TMDB average rating (to 1 decimal) for "${title}"?`,
      answer: String(Number(movieDetails.vote_average).toFixed(1))
    });
  }

  return questions;
}

// Pick an interesting question randomly each round
function pickQuestion(questions) {
  if (!questions || !questions.length) {
    return {question: "What is the title of this movie?", answer: null};
  }
  return pickOne(questions);
}

// Pick a random available backdrop still for the movie (prefers non-logo, largest size)
function getBestBackdrop(backdrops) {
  if (!Array.isArray(backdrops) || !backdrops.length) return null;
  // Filter out 'logos' and low-res, prefer 16:9 ratio
  const filtered = backdrops.filter(b =>
    !!b.file_path && (!b.aspect_ratio || b.aspect_ratio > 1.5)
  );
  const sorted = (filtered.length ? filtered : backdrops)
    .slice()
    .sort((a, b) => (b.width || 0) - (a.width || 0));
  return sorted[0]?.file_path || filtered[0]?.file_path || backdrops[0].file_path || null;
}

const MAX_QUESTIONS = 15;

// Helper to get MAX_QUESTIONS session-unique movies (no repeats)
async function fetchSessionMovies(section) {
  if (section === "kollywood") {
    const data = await getKollywoodOriginalMovies({ page: 1 });
    let movies = (data.results || []).filter(m => m.title && m.poster_path);
    if (movies.length > MAX_QUESTIONS) movies = movies.slice(0, MAX_QUESTIONS);
    return movies;
  } else {
    const data = await getPopularMovies({ region: "US", language: "en", include_adult: false });
    let movies = (data.results || []).filter(m => m.title && m.poster_path);
    if (movies.length > MAX_QUESTIONS) movies = movies.slice(0, MAX_QUESTIONS);
    return movies;
  }
}

// PUBLIC_INTERFACE
export default function GameMovieClipQuiz({ section }) {
  const [movie, setMovie] = useState(null);
  const [movieDetails, setMovieDetails] = useState(null);
  const [sessionMovies, setSessionMovies] = useState([]);
  const [usedIndices, setUsedIndices] = useState([]);
  const [sceneImagePath, setSceneImagePath] = useState(null); // renamed for clarity (was 'backdropPath')
  const [quizPhase, setQuizPhase] = useState("scene"); // "scene" | "question"
  const [questionObj, setQuestionObj] = useState(null);
  const [userInput, setUserInput] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const navigate = useNavigate();
  const timeoutRef = useRef();

  // Step 1: On mount & section change, fetch unique movie session set
  useEffect(() => {
    setSessionMovies([]);
    setUsedIndices([]);
    setMovie(null);
    setMovieDetails(null);
    setSceneImagePath(null);
    setQuizPhase("scene");
    setFeedbackMsg("");
    setUserInput("");
    setQuestionObj(null);
    setRevealed(false);
    setAutoAdvance(false);
    setWaiting(true);

    fetchSessionMovies(section).then(ms => {
      setSessionMovies(ms);
      setWaiting(false);
    });
    // cleanup
    return () => clearTimeout(timeoutRef.current);
    // eslint-disable-next-line
  }, [section]);

  // Step 2: Select next unused movie index for each round
  function pickSessionMovie() {
    if (!sessionMovies.length) return null;
    let unused = sessionMovies
      .map((m, idx) => idx)
      .filter(idx => !usedIndices.includes(idx));
    let nextUsed = [...usedIndices];
    if (unused.length === 0) {
      nextUsed = [];
      unused = sessionMovies.map((_, idx) => idx);
    }
    const idx = pickOne(unused);
    setUsedIndices([...nextUsed, idx]);
    return sessionMovies[idx];
  }

  // Step 3: Start each round
  function startRound() {
    setQuizPhase("scene");
    setMovie(null);
    setMovieDetails(null);
    setSceneImagePath(null);
    setFeedbackMsg("");
    setRevealed(false);
    setAutoAdvance(false);
    setUserInput("");
    setQuestionObj(null);
    setWaiting(true);

    const pick = pickSessionMovie();
    if (!pick) {
      setWaiting(true);
      return;
    }
    // Fetch movie details including images, credits for question info
    getMovieDetails(pick.id, { append_to_response: "images,credits" }).then(det => {
      setMovie(pick);
      setMovieDetails(det);

      // Get a scene (still/backdrop) image (prefer TMDB's backdrops, else fallback to backdrop_path, else fallback placeholder)
      let scenePath = null;

      // Try getting a random or best backdrop (scene/still)
      if (det.images && Array.isArray(det.images.backdrops) && det.images.backdrops.length > 0) {
        // Select at random or the largest image
        const nonLogo = det.images.backdrops.filter(b => !b.file_path?.includes("logo"));
        const selectedBackdrop = nonLogo.length > 0
          ? pickOne(nonLogo)
          : pickOne(det.images.backdrops);
        scenePath = selectedBackdrop?.file_path || null;
      }

      // If no images/backdrops found, try the standard backdrop_path at least
      if (!scenePath && det.backdrop_path) {
        scenePath = det.backdrop_path;
      }

      setSceneImagePath(scenePath);
      setWaiting(false);

      // Show scene for 5s, then question phase
      setQuizPhase("scene");
      timeoutRef.current = setTimeout(() => {
        setQuizPhase("question");
        // Pick trivia question for this round
        const qs = generateQuestions(det, section);
        setQuestionObj(pickQuestion(qs));
      }, 5000);
    }).catch(() => {
      // fallback: skip to next
      setFeedbackMsg("Could not load movie details.");
      setAutoAdvance(true);
      setTimeout(() => startRound(), 1400);
    });
  }

  // Step 4: Auto-begin first round when movies loaded
  useEffect(() => {
    if (sessionMovies.length) {
      startRound();
    }
    // eslint-disable-next-line
  }, [sessionMovies]);

  // Step 5: Guess/check logic
  function handleSubmit(e) {
    e.preventDefault();
    if (!movieDetails || !questionObj) return;
    // Normalize answer and input for loose matches
    const norm = s => (s || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    // If answer is numeric (e.g. year or rating), allow close numeric matches
    let correct =
      questionObj.answer &&
      (norm(userInput) === norm(questionObj.answer) ||
        // Accept if user provided movie title and answer is part of title
        (typeof questionObj.answer === "string" && norm(questionObj.answer).length > 2 &&
         norm(userInput).includes(norm(questionObj.answer))));
    setRevealed(true);
    if (correct) {
      setFeedbackMsg(`🎉 Correct! ${questionObj.answer}`);
    } else {
      setFeedbackMsg(`❌ Nope, correct answer was: ${questionObj.answer}`);
    }
    setAutoAdvance(true);
    timeoutRef.current = setTimeout(() => {
      setAutoAdvance(false);
      startRound();
    }, 1650);
  }

  function handleReveal() {
    if (!questionObj) return;
    setRevealed(true);
    setFeedbackMsg(`😇 It's: ${questionObj.answer}`);
    setAutoAdvance(true);
    timeoutRef.current = setTimeout(() => {
      setAutoAdvance(false);
      startRound();
    }, 1400);
  }

  // Clean up timer on unmount
  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  // MAIN RENDER
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
        disabled={autoAdvance || waiting}
      >
        ← Back
      </button>
      <h2 style={{ color: "#d505ff" }}>Movie Scene Quiz</h2>
      {waiting ? (
        <div>Loading Quiz…</div>
      ) : (
        <div style={{ textAlign: "center" }}>
          {quizPhase === "scene" ? (
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
                {sceneImagePath ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w780${sceneImagePath}`}
                    alt="Movie Scene"
                    style={{ width: 400, height: 220, objectFit: "cover", display: "block" }}
                  />
                ) : (
                  <div style={{
                    width: 400, height: 220, background: "#ccc",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 36, color: "#d505ff"
                  }}>🎬</div>
                )}
              </div>
              <div style={{ margin: "10px 0", color: "#aaa" }}>Memorize this movie scene!<br />Question will appear in 5 seconds…</div>
            </div>
          ) : (
            questionObj && (
              <div>
                <form onSubmit={handleSubmit}>
                  <div style={{ fontWeight: 600, fontSize: 18, margin: "10px 0 19px 0", color: "#000" }}>
                    {questionObj.question}
                  </div>
                  <input
                    type="text"
                    placeholder="Your answer…"
                    style={inputStyle}
                    value={userInput}
                    onChange={e => setUserInput(e.target.value)}
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
                <div style={{ marginTop: 16, minHeight: 24, color: revealed ? "#222" : undefined, fontWeight: revealed ? 600 : undefined }}>
                  {feedbackMsg}
                </div>
                {autoAdvance && (
                  <div style={{ color: "#999", marginTop: 6 }}>Next quiz coming…</div>
                )}
              </div>
            )
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
