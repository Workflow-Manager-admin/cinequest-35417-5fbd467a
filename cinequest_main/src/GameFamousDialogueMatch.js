import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPopularMovies, getRomanizedTitle } from "./tmdbApi";

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

// PUBLIC_INTERFACE
export default function GameFamousDialogueMatch({ section }) {
  const [pair, setPair] = useState(null);
  const [options, setOptions] = useState([]);
  const [picked, setPicked] = useState("");
  const [resultMsg, setResultMsg] = useState("");
  const [movieImages, setMovieImages] = useState({}); // movie: poster_path
  const navigate = useNavigate();

  useEffect(() => {
    const choices = getSectionChoices(section);
    const pick = choices[Math.floor(Math.random() * choices.length)];
    setPair(pick);

    // Fetch poster images for all option movies
    const moviesToGet = choices.map(d => d.movie);
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
        } catch { }
      }
      setMovieImages(res);
    }
    fetchImgs();
    // Shuffle options
    setOptions([...choices].sort(() => 0.5 - Math.random()));
  }, [section]);

  function checkMatch(title) {
    setPicked(title);
    const isKollywood = section === "kollywood";
    const answer = isKollywood
      ? getRomanizedTitle({ title: pair.movie, original_title: pair.movie })
      : pair.movie;
    const correct = isKollywood
      ? title === getRomanizedTitle({ title: pair.movie, original_title: pair.movie })
      : title === pair.movie;
    if (correct) {
      setResultMsg("🎉 Correct!");
    } else {
      setResultMsg(
        "❌ Oops, the correct answer was: " + answer
      );
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
      <h2 style={{ color: "#d505ff" }}>Famous Dialogue Match</h2>
      {!pair ? (
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
            “{pair.dialogue}”
          </div>
          <div style={{
            display: "flex",
            gap: 16,
            justifyContent: "center",
            marginTop: 10,
            flexWrap: "wrap"
          }}>
            {options.map(opt => (
              <div
                key={opt.movie}
                tabIndex={0}
                onClick={() => checkMatch(
                  section === "kollywood"
                    ? getRomanizedTitle({ title: opt.movie, original_title: opt.movie })
                    : opt.movie
                )}
                onKeyDown={e => {
                  if (e.key === "Enter") checkMatch(
                    section === "kollywood"
                      ? getRomanizedTitle({ title: opt.movie, original_title: opt.movie })
                      : opt.movie
                  );
                }}
                style={{
                  background: picked === (
                                      section === "kollywood"
                                        ? getRomanizedTitle({ title: opt.movie, original_title: opt.movie })
                                        : opt.movie
                                    )
                    ? "#d505ff"
                    : "#f9f9fb",
                  color: picked === (
                                      section === "kollywood"
                                        ? getRomanizedTitle({ title: opt.movie, original_title: opt.movie })
                                        : opt.movie
                                    )
                    ? "#fff"
                    : "#101",
                  borderRadius: 10,
                  padding: 14,
                  minWidth: 98,
                  cursor: "pointer",
                  boxShadow: "0 1.5px 8px #d505ff1e",
                  outline: picked === opt.movie ? "2.5px solid #8f00aa" : "none",
                  marginBottom: 8,
                  position: "relative"
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
                  {section === "kollywood"
                    ? getRomanizedTitle({ title: opt.movie, original_title: opt.movie })
                    : opt.movie}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 22 }}>{resultMsg}</div>
        </div>
      )}
    </div>
  );
}
