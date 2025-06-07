import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPopularMovies, isKollywoodOriginalMovie, getRomanizedTitle } from "./tmdbApi";

const sampleMovieClips = [
  // For demo, hardcoded sample YT trailers because TMDB doesn't provide direct streaming video URLs from API
  { title: "Inception", video: "https://www.youtube.com/embed/8hP9D6kZseM" },
  { title: "Parasite", video: "https://www.youtube.com/embed/SEUXfv87Wpk" },
  { title: "Vikram", video: "https://www.youtube.com/embed/OKBMCL-frPU" },
  { title: "Interstellar", video: "https://www.youtube.com/embed/zSWdZVtXT7E" }
];

function getSectionMovies(section, cb) {
  getPopularMovies({
    region: section === "kollywood" ? "IN" : "US",
    language: section === "hollywood" ? "en" : "ta",
    include_adult: false,
  }).then(data => {
    let m = (data.results || []).filter(m => m.title && m.poster_path);
    if (section === "kollywood") {
      m = m.filter(isKollywoodOriginalMovie);
    }
    // Enforce max 18 for a quiz session
    if (m.length > 18) m = m.slice(0, 18);
    if (m.length) cb(m);
    else cb([]);
  });
}

 // PUBLIC_INTERFACE
export default function GameMovieClipQuiz({ section }) {
  const [movie, setMovie] = useState(null);
  const [quiz, setQuiz] = useState({}); // { answer: "", video: "" }
  const [chosen, setChosen] = useState("");
  const [resultMsg, setResultMsg] = useState("");
  const navigate = useNavigate();

  // Only demo: use sampleMovieClips as fallback
  useEffect(() => {
    getSectionMovies(section, ms => {
      // For illustration, alternate between actual and sample demos
      if (ms.length) {
        const pick = ms[Math.floor(Math.random() * ms.length)];
        setMovie(pick);
        setQuiz({
          video: sampleMovieClips[Math.floor(Math.random() * sampleMovieClips.length)].video,
          answer: section === "kollywood" ? getRomanizedTitle(pick) : pick.title
        });
      } else {
        const sample = sampleMovieClips[Math.floor(Math.random() * sampleMovieClips.length)];
        setQuiz({ video: sample.video, answer: section === "kollywood" ? getRomanizedTitle(sample) : sample.title });
        setMovie({ title: sample.title, poster_path: null });
      }
    });
  }, [section]);

  function check(e) {
    e.preventDefault();
    if (!chosen) return;
    if (chosen.toLowerCase() === quiz.answer.toLowerCase()) {
      setResultMsg("🎉 Correct! It's " + quiz.answer);
    } else {
      setResultMsg("❌ Nope, this was: " + quiz.answer);
    }
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
      >
        ← Back
      </button>
      <h2 style={{ color: "#d505ff" }}>Movie Clip Quiz</h2>
      {!quiz.video ? (
        <div>Loading Clip…</div>
      ) : (
        <div style={{ textAlign: "center" }}>
          <iframe
            width="340"
            height="215"
            src={quiz.video}
            title="Movie Clip"
            frameBorder="0"
            allowFullScreen
            style={{ borderRadius: 18, marginBottom: 14 }}
          />
          <form onSubmit={check}>
            <input
              type="text"
              placeholder="Movie title?"
              style={inputStyle}
              value={chosen}
              onChange={e => setChosen(e.target.value)}
            />
            <button className="btn"
              style={{
                background: "#d505ff",
                color: "#fff",
                margin: "12px 0 0"
              }}
              type="submit"
            >Submit</button>
          </form>
          <div style={{ marginTop: 18 }}>{resultMsg}</div>
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
