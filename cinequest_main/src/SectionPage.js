import React from "react";
import { useNavigate } from "react-router-dom";

// PUBLIC_INTERFACE
export default function SectionPage({ section }) {
  const navigate = useNavigate();

  // Game Definitions
  const games = [
    {
      id: "blurred-poster",
      title: "Blurred Poster Guessing",
      description: "Guess the movie from a blurred poster.",
    },
    {
      id: "movie-clip-quiz",
      title: "Movie Clip Quiz",
      description: "Watch a 5s clip, answer a related question.",
    },
    {
      id: "four-image-connection",
      title: "4-Image Connection",
      description: "Four images, one movie. Can you connect them?",
    },
    {
      id: "famous-dialogue-match",
      title: "Guess the Movie from the Emoji",
      description: "Guess the movie from a sequence of emojis as clues.",
    }
    // Director's Movies Game removed.
  ];

  return (
    <div className="container" style={{ marginTop: 100, position: "relative" }}>
      {/* Back to Home Button - visually clear but unobtrusive at the very top */}
      <button
        className="btn"
        style={{
          position: "absolute",
          top: -52,
          left: 18,
          background: "rgba(245,211,255,0.97)",
          color: "#d505ff",
          border: "1px solid #d505ff40",
          fontWeight: 600,
          borderRadius: 6,
          boxShadow: "0 2px 14px #d505ff14",
          fontSize: "1rem",
          padding: "7px 16px",
          zIndex: 10,
          opacity: 0.92,
          transition: "background 0.16s, box-shadow 0.14s"
        }}
        onClick={() => navigate("/")}
        aria-label="Back to Home"
      >
        <span style={{ fontSize: 21, verticalAlign: "middle", marginRight: 7 }}>←</span>
        Home
      </button>

      {/* Section/game selection interface */}
      <div style={{ fontSize: 26, fontWeight: 700, color: "#d505ff" }}>
        {section === "hollywood" ? "Hollywood" : "Kollywood"} Section
      </div>
      <div style={{ margin: "14px 0 30px 0", color: "#333" }}>
        {section === "kollywood"
          ? <>
              Only original Kollywood (Tamil cinema) movies are included –
              dubbed movies are excluded.
              <br />
              Movie answers are always shown in English (Romanized) form for Kollywood.
            </>
          : "Choose a game below:"}
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 28,
          justifyContent: "center",
        }}
      >
        {games.map(g => (
          <div
            key={g.id}
            style={{
              background: "#fff",
              color: "#0d0d0d",
              borderRadius: 12,
              padding: "22px 26px",
              minWidth: 240,
              maxWidth: 280,
              boxShadow: "0 2px 16px #d505ff26",
              textAlign: "center",
              cursor: "pointer",
              transition: "box-shadow 0.19s",
            }}
            tabIndex={0}
            onClick={() =>
              navigate(`/${section}/${g.id}`)
            }
            onKeyDown={e => {
              if (e.key === "Enter") navigate(`/${section}/${g.id}`);
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 18 }}>{g.title}</div>
            <div style={{ color: "#777", margin: "8px 0 0" }}>
              <small>{g.description}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
