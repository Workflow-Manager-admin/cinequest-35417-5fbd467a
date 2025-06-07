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
  // Prefer later backdrops, as above
  const start = Math.floor(backdrops.length / 2);
  const candidates = backdrops.slice(start);
  const filtered = candidates.filter(
    (b) =>
      !!b.file_path &&
      (!b.aspect_ratio || b.aspect_ratio > 1.5) &&
      (!b.vote_average || b.vote_average < 7.8)
  );
  const validArr =
    filtered.length ? filtered : candidates.length ? candidates : backdrops;
  return validArr[Math.floor(Math.random() * validArr.length)]?.file_path || null;
}

// Helper: shuffle array, shallow copy.
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; --i) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Helper: get plausible distractor characters from other movie casts
async function getDistractorCharacters(allMovies, correctMovieId, count = 3) {
  // Exclude movie with correctMovieId
  // For each candidate: get details, then character names from cast.
  const distractors = [];
  const excludeIds = new Set([correctMovieId]);
  const tries = 0;
  for (let m of shuffleArray(allMovies)) {
    if (excludeIds.has(m.id)) continue;
    try {
      // Fetch cast
      const det = await getMovieDetails(m.id, { append_to_response: "credits" });
      if (det.credits && Array.isArray(det.credits.cast)) {
        // Avoid obviously "Self"/"Himself"/etc generic names and duplicates
        for (let castEntry of shuffleArray(det.credits.cast)) {
          if (
            castEntry &&
            castEntry.character &&
            !/^(Self|Himself|Herself)$/i.test(castEntry.character.trim()) &&
            !distractors.some((name) => name === castEntry.character) &&
            castEntry.character.length > 2
          ) {
            distractors.push(castEntry.character);
            break;
          }
        }
      }
      if (distractors.length >= count) break;
    } catch {
      continue;
    }
  }
  // If not enough distractors, fill with "Unknown Character <n>"
  while (distractors.length < count) {
    distractors.push("Unknown Character " + (distractors.length + 1));
  }
  return distractors.slice(0, count);
}

/**
 * Build session questions: Each is
 *  {
 *    scenePath, // backdrop image path
 *    movie,     // TMDB movie object
 *    correctCharacter: string,
 *    choices: [array of 4 character names, shuffled],
 *  }
 * Only character questions.
 */
const MAX_QUESTIONS = 15;
async function buildMultipleChoiceCharacterQuestions(section) {
  // 1. Get movies for this section
  let data;
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

  // Now, gather up to MAX_QUESTIONS movies with at least 1 backdrop and cast
  let questionCandidates = [];
  let i = 0;
  for (; i < filtered.length && questionCandidates.length < MAX_QUESTIONS * 2; ++i) {
    try {
      const details = await getMovieDetails(filtered[i].id, { append_to_response: "images,credits" });
      const bds = details?.images?.backdrops;
      if (!(bds && bds.length && details.credits && Array.isArray(details.credits.cast) && details.credits.cast.length > 0)) continue;

      // Get a character name for the correct answer
      let charName = null;
      // Try to pick a main (non-generic) character
      for (let castEntry of details.credits.cast) {
        if (
          castEntry.character &&
          !/^(Self|Himself|Herself)$/i.test(castEntry.character.trim()) &&
          castEntry.character.length > 2
        ) {
          charName = castEntry.character;
          break;
        }
      }
      if (!charName) continue;

      questionCandidates.push({
        movie: filtered[i],
        scenePath: pickRandomBackdrop(bds),
        correctCharacter: charName,
        details,
      });

      if (questionCandidates.length >= MAX_QUESTIONS) break;
    } catch {
      continue;
    }
  }

  // Get distractors for each question by looking into other movies' casts.
  // Collect a broader pool of distractor sources up front.
  let distractorSourcePool = filtered;
  const result = [];
  for (let q of questionCandidates.slice(0, MAX_QUESTIONS)) {
    let dists = await getDistractorCharacters(distractorSourcePool, q.movie.id, 3);
    const choices = shuffleArray([q.correctCharacter, ...dists]);
    result.push({
      scenePath: q.scenePath,
      movie: q.movie,
      correctCharacter: q.correctCharacter,
      choices, // shuffled
    });
  }
  return result;
}

// PUBLIC_INTERFACE
export default function GameMovieClipQuiz({ section }) {
  const [questions, setQuestions] = useState([]); // [{movie, scenePath, correctCharacter, choices}]
  const [questionIdx, setQuestionIdx] = useState(0); // 0-based
  const [userAnswers, setUserAnswers] = useState([]); // [{choice, correct, expected}]
  const [revealed, setRevealed] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const timeoutRef = useRef();

  // SESSION (on mount or section change): build session questions.
  useEffect(() => {
    setWaiting(true);
    setLoading(true);
    setQuestions([]);
    setUserAnswers([]);
    setQuestionIdx(0);
    setRevealed(false);
    setAutoAdvance(false);

    async function run() {
      // Build questions
      const qs = await buildMultipleChoiceCharacterQuestions(section);
      setQuestions(qs);
      setWaiting(false);
      setLoading(false);
    }
    run();
    return () => clearTimeout(timeoutRef.current);
    // eslint-disable-next-line
  }, [section]);

  // Each time questionIdx changes, reset state
  useEffect(() => {
    setRevealed(false);
    setAutoAdvance(false);
    setWaiting(false);
    // No delay/question phase split: show scene & choices at once for this multiple-choice format
    // If finished, do nothing
    if (questions.length && questionIdx >= questions.length) {
      // triggers summary
    }
    return () => clearTimeout(timeoutRef.current);
    // eslint-disable-next-line
  }, [questionIdx, questions.length]);

  function handleChoiceClick(choice) {
    if (revealed || autoAdvance || !questions[questionIdx]) return;
    const q = questions[questionIdx];
    const correct = choice === q.correctCharacter;
    setRevealed(true);

    setUserAnswers((prev) => [
      ...prev,
      {
        choice,
        correct,
        expected: q.correctCharacter,
      },
    ]);
    setAutoAdvance(true);
    timeoutRef.current = setTimeout(() => {
      setAutoAdvance(false);
      setQuestionIdx((idx) => idx + 1);
    }, 1400);
  }

  function restartQuiz() {
    setLoading(true);
    setQuestions([]);
    setUserAnswers([]);
    setQuestionIdx(0);
    setRevealed(false);
    setAutoAdvance(false);
    setWaiting(true);

    // Rebuild questions after "Play Again"
    async function rerun() {
      const qs = await buildMultipleChoiceCharacterQuestions(section);
      setQuestions(qs);
      setWaiting(false);
      setLoading(false);
    }
    rerun();
  }

  // Render Score/History
  function renderSummary() {
    return (
      <div style={{ marginTop: 34, background: "#fff", borderRadius: 16, padding: "26px 20px", maxWidth: 600, marginLeft: "auto", marginRight: "auto" }}>
        <div style={{ fontWeight: 700, color: "#d505ff", fontSize: "19px", marginBottom: 6 }}>Quiz Complete!</div>
        <div style={{ fontWeight: 600, color: "#222", marginBottom: 12 }}>
          Score: {userAnswers.filter((a) => a.correct).length} / {questions.length}
        </div>
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 15, color: "#101", marginBottom: 14 }}>
          <thead>
            <tr style={{ background: "#e5d2fa" }}>
              <th style={{ padding: 6, textAlign: "left" }}>#</th>
              <th style={{ padding: 6, textAlign: "left" }}>Your Answer</th>
              <th style={{ padding: 6, textAlign: "left" }}>Correct Answer</th>
              <th style={{ padding: 6, textAlign: "center" }}>✔/✗</th>
            </tr>
          </thead>
          <tbody>
            {userAnswers.map((entry, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "#f7f3fd" : "#fff" }}>
                <td style={{ padding: 5 }}>{i + 1}</td>
                <td style={{ padding: 5, color: entry.correct ? "#263" : "#c00", fontWeight: 500 }}>{entry.choice}</td>
                <td style={{ padding: 5 }}>{entry.expected}</td>
                <td style={{ textAlign: "center", fontWeight: 700, color: entry.correct ? "#25B219" : "#c00" }}>
                  {entry.correct ? "✔" : "✗"}
                </td>
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
            marginRight: 8,
          }}
          onClick={restartQuiz}
        >
          Play Again
        </button>
      </div>
    );
  }

  // MAIN
  const current = questions[questionIdx] || {};
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
      <div
        style={{
          margin: "10px 0 26px 0",
          color: "#101",
          fontSize: 18,
          textAlign: "center",
          fontWeight: 500
        }}
      >
        {!loading && questionIdx < questions.length && (
          <>
            Score: {userAnswers.filter((a) => a.correct).length} &nbsp; | &nbsp; Question:{" "}
            {Math.min(questionIdx + 1, questions.length) || 1} / {questions.length || MAX_QUESTIONS}
          </>
        )}
      </div>
      {loading || waiting ? (
        <div>Loading Quiz…</div>
      ) : questionIdx >= questions.length ? (
        renderSummary()
      ) : (
        <div style={{ textAlign: "center" }}>
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
                <div
                  style={{
                    width: 400,
                    height: 220,
                    background: "#ccc",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 36,
                    color: "#d505ff"
                  }}
                >
                  🎬
                </div>
              )}
            </div>
          </div>
          <div style={{ fontWeight: 600, fontSize: 18, margin: "15px 0 15px 0", color: "#000" }}>
            What is the name of the character in this movie?
          </div>
          <div
            style={{
              display: "flex",
              gap: 20,
              justifyContent: "center",
              flexWrap: "wrap",
              margin: "0 auto",
              marginBottom: 12
            }}
          >
            {current.choices &&
              current.choices.map((choice, idx) => (
                <button
                  key={choice}
                  className="btn"
                  style={{
                    background:
                      revealed && choice === current.correctCharacter
                        ? "#25B219"
                        : revealed && choice === (userAnswers[questionIdx]?.choice)
                        ? "#c00"
                        : "#d505ff",
                    color: "#fff",
                    minWidth: 150,
                    fontSize: "1rem",
                    fontWeight: 600,
                    border: revealed
                      ? choice === current.correctCharacter
                        ? "2px solid #137709"
                        : choice === (userAnswers[questionIdx]?.choice)
                        ? "2px solid #7a0303"
                        : "1px solid #d505ff"
                      : "1px solid #d505ff",
                    opacity: revealed || autoAdvance ? 0.8 : 1,
                    cursor: revealed || autoAdvance ? "not-allowed" : "pointer",
                    margin: "5px 0",
                    borderRadius: "8px"
                  }}
                  disabled={revealed || autoAdvance}
                  onClick={() => handleChoiceClick(choice)}
                  tabIndex={revealed || autoAdvance ? -1 : 0}
                >
                  {choice}
                </button>
              ))}
          </div>
          <div style={{ margin: "10px 0", minHeight: 28, color: revealed ? "#222" : undefined, fontWeight: revealed ? 600 : undefined }}>
            {revealed
              ? (userAnswers[questionIdx] &&
                  (userAnswers[questionIdx].correct
                    ? "🎉 Correct!"
                    : `❌ Not quite. The correct answer was: ${current.correctCharacter}`))
              : " "}
          </div>
          {autoAdvance && (
            <div style={{ color: "#999", marginTop: 8 }}>Next quiz coming…</div>
          )}
        </div>
      )}
    </div>
  );
}
