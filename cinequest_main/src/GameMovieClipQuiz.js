import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  getPopularMovies,
  getMovieDetails,
  isKollywoodOriginalMovie,
  getRomanizedTitle,
  getKollywoodOriginalMovies
} from "./tmdbApi";

// Pick a random "harder" (less iconic) backdrop from TMDB backdrops
function pickRandomBackdrop(backdrops) {
  if (!Array.isArray(backdrops) || !backdrops.length) return null;
  if (backdrops.length === 1) return backdrops[0]?.file_path || null;

  // Heuristic:
  // 1. Favor backdrops in the middle or latter half of the TMDB array (first = iconic/poster, later = harder scenes)
  // 2. Randomly sample from indices >= ceil(length/2), otherwise from whole array
  const start = Math.floor(backdrops.length / 2);
  const candidates = backdrops.slice(start);
  // Remove any that look like logo overlays or extremely dark/blank images (by width/height or vote_average if present)
  const filtered = candidates.filter(b => (
    !!b.file_path &&
    (!b.aspect_ratio || b.aspect_ratio > 1.5) &&
    (!b.vote_average || b.vote_average < 7.8)
  ));

  const validArr = filtered.length ? filtered : candidates.length ? candidates : backdrops;
  return validArr[Math.floor(Math.random() * validArr.length)]?.file_path || null;
}

// Helper: shuffle array shallow copy
function shuffleArray(arr) {
  const a = arr.slice();
  for(let i=a.length-1; i>0; --i) {
    const j = Math.floor(Math.random()*(i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * PUBLIC_INTERFACE
 * For a shown movie scene, generates a single randomly chosen question of these types:
 * (1) "What is the movie title?" — answer is the movie title (English or romanized for Kollywood)
 * (2) "Who is the director?" — answer is the director's real name from TMDB crew
 * (3) "Who is the hero?" — answer is main actor's real name (first from TMDB cast.name)
 *
 * All answers are pulled directly from the TMDB data for the shown scene/movie.
 * If a field is unavailable, rotate to another available type among these three, prioritized randomly.
 */
function generateSceneQuizQuestion(movieDetails, section) {
  if (!movieDetails) return null;
  let questionTypes = [];

  // (1) Movie Title (always available in filtered data)
  let movieTitle;
  if (section === "kollywood") {
    movieTitle = getRomanizedTitle(movieDetails);
  } else {
    movieTitle = movieDetails.title;
  }
  if (movieTitle && movieTitle.trim().length > 1) {
    questionTypes.push({
      type: "movie-title",
      question: "What is the movie title?",
      answer: movieTitle
    });
  }

  // (2) Director
  if (
    movieDetails.credits &&
    Array.isArray(movieDetails.credits.crew)
  ) {
    const director = movieDetails.credits.crew.find(c => c.job === "Director");
    if (director && director.name) {
      questionTypes.push({
        type: "director",
        question: "Who is the director?",
        answer: director.name
      });
    }
  }

  // (3) Hero/main actor
  if (
    movieDetails.credits &&
    Array.isArray(movieDetails.credits.cast) &&
    movieDetails.credits.cast.length > 0
  ) {
    const mainActor = movieDetails.credits.cast[0];
    if (mainActor && mainActor.name) {
      questionTypes.push({
        type: "hero",
        question: "Who is the hero?",
        answer: mainActor.name
      });
    }
  }

  // If none available, return null
  if (questionTypes.length === 0) return null;

  // Pick one randomly
  return questionTypes[Math.floor(Math.random() * questionTypes.length)];
}

const MAX_QUESTIONS = 15;

/**
 * Fetch session movies WITH available backdrops only.
 * Only include movies where at least one backdrop image exists.
 */
async function fetchSessionMoviesWithBackdrop(section) {
  let data, movies = [];
  if (section === "kollywood") {
    data = await getKollywoodOriginalMovies({ page: 1 });
  } else {
    data = await getPopularMovies({ region: "US", language: "en", include_adult: false });
  }
  // Only take unique movies with id/title/poster
  const seen = new Set();
  const filtered = (data.results || []).filter(m => {
    if (!m.title || !m.poster_path || seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
  // Fetch details to check for at least one backdrop
  let moviesWithScenes = [];
  for (let i = 0; i < filtered.length && moviesWithScenes.length < MAX_QUESTIONS * 2; ++i) {
    try {
      const details = await getMovieDetails(filtered[i].id, { append_to_response: "images" });
      const hasBackdrop = details?.images?.backdrops?.length > 0;
      if (hasBackdrop) {
        moviesWithScenes.push({
          movie: filtered[i],
          details: details,
          scenePath: pickRandomBackdrop(details.images.backdrops)
        });
      }
      // Stop early if we've gathered enough
      if (moviesWithScenes.length >= MAX_QUESTIONS) break;
    } catch { /* skip this entry if it errors */ }
  }
  return moviesWithScenes.slice(0, MAX_QUESTIONS);
}

// PUBLIC_INTERFACE
export default function GameMovieClipQuiz({ section }) {
  const [quizList, setQuizList] = useState([]); // [{movie, details, questionObj, scenePath}] - for session summary/history
  const [questionIdx, setQuestionIdx] = useState(0); // 0-based
  const [userAnswers, setUserAnswers] = useState([]); // [{user, correct, expected}]
  const [currentInput, setCurrentInput] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [quizPhase, setQuizPhase] = useState("scene"); // scene | question | summary
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const timeoutRef = useRef();

  // SESSION (on mount or section change): generate session quizList array
  useEffect(() => {
    setWaiting(true);
    setLoading(true);
    setQuizList([]);
    setUserAnswers([]);
    setQuestionIdx(0);
    setQuizPhase("scene");
    setFeedbackMsg("");
    setCurrentInput("");
    setRevealed(false);
    setAutoAdvance(false);

    // Build up quizList array: each with movie, details, question, and guaranteed scenePath
    async function buildQuizList() {
      const sceneMovies = await fetchSessionMoviesWithBackdrop(section);
      const quizzes = [];
      for (let i = 0; i < sceneMovies.length && quizzes.length < MAX_QUESTIONS; ++i) {
        const { movie, details, scenePath } = sceneMovies[i];
        if (!scenePath) continue; // safeguard (shouldn't happen)
        // Each question: randomly from character, director, or hero
        const questionObj = generateSceneQuizQuestion(details, section);
        // If not available (shouldn't happen), fallback to next
        if (!questionObj) continue;
        quizzes.push({
          movie,
          details,
          questionObj,
          scenePath
        });
      }
      setQuizList(quizzes.slice(0, MAX_QUESTIONS));
      setWaiting(false);
      setLoading(false);
    }

    buildQuizList();
    // cleanup
    return () => {
      clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line
  }, [section]);

  // Start round: (for questionIdx, reset input/revealed/phase)
  useEffect(() => {
    setCurrentInput("");
    setFeedbackMsg("");
    setRevealed(false);
    setAutoAdvance(false);
    setWaiting(false);
    // If summary phase, handle that
    if (quizList.length && questionIdx >= quizList.length) {
      setQuizPhase("summary");
    } else {
      setQuizPhase("scene");
      if (quizList.length) {
        // Switch to question after 5 sec
        timeoutRef.current = setTimeout(() => {
          setQuizPhase("question");
        }, 5000);
      }
    }
    return () => clearTimeout(timeoutRef.current);
    // eslint-disable-next-line
  }, [questionIdx, quizList.length]);

  // Submit user answer for current question
  function handleSubmit(e) {
    e && e.preventDefault && e.preventDefault();
    if (quizPhase !== "question" || !quizList[questionIdx]) return;

    const { questionObj } = quizList[questionIdx];
    const norm = s => (s||"").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    const _user = norm(currentInput);
    const _expected = norm(questionObj.answer);

    let correct = false;
    // For multi word answers (movie titles etc), allow partial match for tough trivia
    if (_expected.length >= 3 && _user.length > 2 && (_user === _expected || _expected.includes(_user))) {
      correct = true;
    } else if (_user === _expected) correct = true;

    setRevealed(true);

    if (correct) {
      setFeedbackMsg(`🎉 Correct! ${questionObj.answer}`);
    } else {
      setFeedbackMsg(`❌ Not quite. The correct answer was: ${questionObj.answer}`);
    }
    setUserAnswers(prev => ([
      ...prev,
      {
        user: currentInput,
        correct,
        expected: questionObj.answer,
        question: questionObj.question
      }
    ]));
    setAutoAdvance(true);
    timeoutRef.current = setTimeout(() => {
      setAutoAdvance(false);
      setQuestionIdx(idx => idx+1);
    }, 1550);
  }

  // Reveal handler
  function handleReveal() {
    if (quizPhase !== "question" || !quizList[questionIdx]) return;
    const { questionObj } = quizList[questionIdx];
    setRevealed(true);
    setFeedbackMsg(`😇 It's: ${questionObj.answer}`);
    setUserAnswers(prev => ([
      ...prev,
      {
        user: currentInput,
        correct: false,
        expected: questionObj.answer,
        question: questionObj.question,
        revealed: true
      }
    ]));
    setAutoAdvance(true);
    timeoutRef.current = setTimeout(() => {
      setAutoAdvance(false);
      setQuestionIdx(idx => idx+1);
    }, 1300);
  }

  // Replay quiz
  function restartQuiz() {
    // Just re-trigger section useEffect
    setLoading(true);
    setQuizList([]);
    setUserAnswers([]);
    setQuestionIdx(0);
    setQuizPhase("scene");
    setFeedbackMsg("");
    setCurrentInput("");
    setRevealed(false);
    setAutoAdvance(false);
    setWaiting(true);
  }

  // Render Answer History Table
  function renderSummary() {
    return (
      <div style={{marginTop:34, background: "#fff", borderRadius: 16, padding:"26px 20px", maxWidth: 600, marginLeft: "auto", marginRight:"auto"}}>
        <div style={{fontWeight:700, color:"#d505ff", fontSize: "19px", marginBottom: 6}}>Quiz Complete!</div>
        <div style={{fontWeight:600, color:"#222", marginBottom:12}}>Score: {userAnswers.filter(a => a.correct).length} / {quizList.length}</div>
        <table style={{borderCollapse: "collapse", width: "100%", fontSize: 15, color: "#101", marginBottom:14}}>
          <thead>
            <tr style={{background:"#e5d2fa"}}>
              <th style={{padding:6, textAlign:"left"}}>#</th>
              <th style={{padding:6, textAlign:"left"}}>Question</th>
              <th style={{padding:6, textAlign:"left"}}>Your Answer</th>
              <th style={{padding:6, textAlign:"left"}}>Correct Answer</th>
              <th style={{padding:6, textAlign:"center"}}>✔/✗</th>
            </tr>
          </thead>
          <tbody>
            {userAnswers.map((entry, i) => (
              <tr key={i} style={{background: i%2===0 ? "#f7f3fd" : "#fff"}}>
                <td style={{padding:5}}>{i+1}</td>
                <td style={{padding:5, maxWidth:180, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{entry.question}</td>
                <td style={{padding:5, color: entry.correct ? "#263" : "#c00", fontWeight:500}}>{entry.user}{entry.revealed ? " (Revealed)" : ""}</td>
                <td style={{padding:5}}>{entry.expected}</td>
                <td style={{textAlign:"center", fontWeight:700, color: entry.correct ? "#25B219" : "#c00"}}>{entry.correct ? "✔" : "✗"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          className="btn"
          style={{
            background: "#f3e7fa",
            color: "#d505ff",
            fontWeight: 600,
            border: "1px solid #d505ff69",
            marginRight: 8
          }}
          onClick={restartQuiz}
        >
          Play Again
        </button>
      </div>
    );
  }


  // MAIN
  const current = quizList[questionIdx] || {};
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
      {/* Progress Summary */}
      <div style={{
        margin: "10px 0 26px 0",
        color: "#101",
        fontSize: 18,
        textAlign: "center",
        fontWeight: 500
      }}>
        {!loading && quizPhase !== "summary" &&
          <>
            Score: {userAnswers.filter(a => a.correct).length} &nbsp; | &nbsp; Question: {Math.min(questionIdx + 1, quizList.length) || 1} / {quizList.length || MAX_QUESTIONS}
          </>
        }
      </div>
      {loading || waiting ? (
        <div>Loading Quiz…</div>
      ) : quizPhase === "summary" ? (
        renderSummary()
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
                {current.scenePath ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w780${current.scenePath}`}
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
              <div style={{ margin: "10px 0", color: "#aaa" }}>Memorize this (random) movie scene!<br />Question will appear in 5 seconds…</div>
            </div>
          ) : (
            current.questionObj && (
              <div>
                <form onSubmit={handleSubmit}>
                  <div style={{ fontWeight: 600, fontSize: 18, margin: "10px 0 19px 0", color: "#000" }}>
                    {current.questionObj.question}
                  </div>
                  <input
                    type="text"
                    placeholder="Your answer…"
                    style={inputStyle}
                    value={currentInput}
                    onChange={e => setCurrentInput(e.target.value)}
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
