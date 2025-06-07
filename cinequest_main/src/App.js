import React from "react";
import "./App.css";
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import Navbar from "./Navbar";
import AuthPage from "./AuthPage";
import SectionPage from "./SectionPage";
import GameBlurredPoster from "./GameBlurredPoster";
import GameMovieClipQuiz from "./GameMovieClipQuiz";
import GameFourImageConnection from "./GameFourImageConnection";
import GameEmojiMovieGuess from "./GameEmojiMovieGuess";
import {
  FilmReelSVG,
  PopcornSVG,
  CurtainSVG,
  SpotlightSVG,
  MovieTicketSVG,
  CinemaScreenSVG
} from "./assets/CinemaSVGs";

// Cinema overlay components (easy removal or toggle if needed)
function CinemaBackgroundDecor() {
  return (
    <>
      {/* Top curtain overlay */}
      <div className="cinema-curtain-overlay">
        {/* Decorative SVG curtain over gradient */}
        <CurtainSVG style={{
          position: "absolute", left: 20, top: -28, zIndex: 2, opacity: 0.97
        }}/>
      </div>
      {/* Center spotlight effect */}
      <div className="cinema-spotlight-bg">
        <SpotlightSVG style={{
          position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", opacity: 0.5
        }} size={148}/>
      </div>
      {/* Top right fixed cinema icons (opacity as background deco) */}
      <div className="cinema-fg-icons">
        <FilmReelSVG size={34}/>
        <PopcornSVG size={34}/>
        <MovieTicketSVG size={34}/>
      </div>
    </>
  );
}

function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="container" style={{ position: "relative", minHeight: "92vh" }}>
      <div className="hero" style={{
        paddingTop: 120, color: "#0d0d0d",
        background: "rgba(255,255,255,0.04)",
        borderRadius: 30, boxShadow: "0 4px 44px #d505ff17"
      }}>
        {/* Add cinema screen and reel icons in header for extra theming */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 6,
        }}>
          <CinemaScreenSVG size={52} style={{ opacity: 0.91 }}/>
          <div className="subtitle" style={{ color: "#d505ff" }}>The Movie Game Platform</div>
          <FilmReelSVG size={32} style={{ marginLeft: 10, marginBottom: 6, opacity: 0.94 }}/>
        </div>
        <h1 className="title" style={{color: "#d505ff", letterSpacing: "-2px", fontWeight: 700}}>
          CineQuest
        </h1>
        <div className="description" style={{
          color: "#222", background: "rgba(245,211,255,0.13)", borderRadius: 11, padding: "12px 8px"
        }}>
          Hollywood & Kollywood movie quiz games powered by TMDB.<br />
          <small>
            {user
              ? "Welcome, " + user.username + "!"
              : "Sign up/log in to play and track your progress."}
          </small>
        </div>
        <button
          className="btn btn-large"
          style={{
            background: "#d505ff",
            color: "#fff",
            fontWeight: 600,
            boxShadow: "0 2px 16px #ce72ff32"
          }}
          onClick={() =>
            user
              ? navigate("/section")
              : navigate("/auth")
          }
        >
          {user ? "Choose Section" : "Get Started"}
        </button>
        {/* Themed popcorn at CTA (visual only) */}
        <div style={{ marginTop: 24 }}>
          <PopcornSVG size={36} style={{verticalAlign: "middle", marginRight: 8}}/>
        </div>

        <div style={{ marginTop: 42 }}>
          <div className="subtitle" style={{ fontSize: "1rem", color: "#d505ff", marginBottom: 2 }}>
            How CineQuest works
          </div>
          <div style={{
            color: "#333", maxWidth: 480, margin: "10px auto 0",
            fontSize: 16, lineHeight: 1.7,
            background: "rgba(255,255,255,0.14)", borderRadius: 8, padding: 10
          }}>
            Login and pick either the Hollywood or Kollywood section. Each offers multiple games: guess movies from blurred posters, connect images, match dialogues, play movie clip quizzes, and select movies for directors!
          </div>
        </div>
      </div>
      <div className="cinema-bg-footer">
        <span>
          <MovieTicketSVG size={28} style={{verticalAlign: "middle"}}/>{" "}
          Welcome to CineQuest &copy; 2024 – All movie game content uses TMDB data.
        </span>
      </div>
    </div>
  );
}

// Only if authenticated
function RequireAuth({ children }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/auth" />;
  }
  return children;
}
// Section Choice Page
function SectionChoicePage() {
  const navigate = useNavigate();
  return (
    <div className="container" style={{marginTop: 100, textAlign:"center"}}>
      <h2 style={{color: "#d505ff"}}>Choose Your Section</h2>
      <div
        style={{
          display: "flex",
          gap: 42,
          justifyContent: "center",
          marginTop: 28,
          width: "100%",
          maxWidth: 620,
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        <button
          className="btn btn-large section-select-btn"
          style={{
            background: "#d505ff",
            color: "#fff",
            fontWeight: 600,
            borderRadius: 16,
            minHeight: 88,
            flex: "1 1 0",
            fontSize: "2rem",
            boxShadow: "0 4px 32px #d505ff13",
            letterSpacing: "0.01em",
            padding: "30px 0",
            transition: "box-shadow 0.19s, transform 0.13s",
          }}
          onClick={() => navigate("/hollywood")}
        >
          Hollywood
        </button>
        <button
          className="btn btn-large section-select-btn"
          style={{
            background: "#d505ff",
            color: "#fff",
            fontWeight: 600,
            borderRadius: 16,
            minHeight: 88,
            flex: "1 1 0",
            fontSize: "2rem",
            boxShadow: "0 4px 32px #d505ff13",
            letterSpacing: "0.01em",
            padding: "30px 0",
            transition: "box-shadow 0.19s, transform 0.13s",
          }}
          onClick={() => navigate("/kollywood")}
        >
          Kollywood
        </button>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app" style={{
          minHeight: "100vh",
          background: "#f9f9fb",
        }}>
          <Navbar />
          <main style={{ flex: 1 }}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route
                path="/section"
                element={
                  <RequireAuth>
                    <SectionChoicePage />
                  </RequireAuth>
                }
              />
              <Route
                path="/hollywood"
                element={
                  <RequireAuth>
                    <SectionPage section="hollywood" />
                  </RequireAuth>
                }
              />
              <Route
                path="/kollywood"
                element={
                  <RequireAuth>
                    <SectionPage section="kollywood" />
                  </RequireAuth>
                }
              />

              {/* Hollywood Games */}
              <Route
                path="/hollywood/blurred-poster"
                element={
                  <RequireAuth>
                    <GameBlurredPoster section="hollywood" />
                  </RequireAuth>
                }
              />
              <Route
                path="/hollywood/movie-clip-quiz"
                element={
                  <RequireAuth>
                    <GameMovieClipQuiz section="hollywood" />
                  </RequireAuth>
                }
              />
              <Route
                path="/hollywood/four-image-connection"
                element={
                  <RequireAuth>
                    <GameFourImageConnection section="hollywood" />
                  </RequireAuth>
                }
              />
              <Route
                path="/hollywood/famous-dialogue-match"
                element={
                  <RequireAuth>
                    <GameEmojiMovieGuess section="hollywood" />
                  </RequireAuth>
                }
              />
              {/* Kollywood Games */}
              <Route
                path="/kollywood/blurred-poster"
                element={
                  <RequireAuth>
                    <GameBlurredPoster section="kollywood" />
                  </RequireAuth>
                }
              />
              <Route
                path="/kollywood/movie-clip-quiz"
                element={
                  <RequireAuth>
                    <GameMovieClipQuiz section="kollywood" />
                  </RequireAuth>
                }
              />
              <Route
                path="/kollywood/four-image-connection"
                element={
                  <RequireAuth>
                    <GameFourImageConnection section="kollywood" />
                  </RequireAuth>
                }
              />
              <Route
                path="/kollywood/famous-dialogue-match"
                element={
                  <RequireAuth>
                    <GameEmojiMovieGuess section="kollywood" />
                  </RequireAuth>
                }
              />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;