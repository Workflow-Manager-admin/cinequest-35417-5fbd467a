import React from "react";
import { useAuth } from "./AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { FilmReelSVG, CurtainSVG } from "./assets/CinemaSVGs";

// PUBLIC_INTERFACE
export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="navbar" style={{
      background: "#fff",
      color: "#0d0d0d",
      boxShadow: "0 1px 16px #8911c21a",
      zIndex: 110,
      position: "relative"
    }}>
      <div className="container" style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "relative"
      }}>
        <div className="logo"
          style={{
            color: "#0d0d0d",
            cursor: "pointer",
            fontWeight: 700,
            display: "flex", alignItems: "center", gap: 5
          }}
          onClick={() => navigate("/")}
        >
          {/* Film reel SVG */}
          <FilmReelSVG size={30} style={{marginRight: 3, verticalAlign: "middle"}}/>
          <span className="logo-symbol" style={{ color: "#d505ff" }}>✦</span>{" "}
          CineQuest
        </div>
        <div>
          {!user ? (
            location.pathname !== "/auth" && (
              <button className="btn"
                style={{
                  background: "#d505ff",
                  color: "#fff"
                }}
                onClick={() => navigate("/auth")}>
                Login / Signup
              </button>
            )
          ) : (
            <span>
              <span style={{ marginRight: 15, fontWeight: 700 }}>{user.username}</span>
              <button className="btn"
                style={{
                  background: "#f9f9fb",
                  color: "#0d0d0d",
                  border: "1px solid #ccc"
                }}
                onClick={handleLogout}>
                Logout
              </button>
            </span>
          )}
        </div>
        {/* Subtle curtain at the base of navbar as a decorative underline */}
        <div style={{
          position: "absolute", left: -23, right: -23, bottom: -36, height: 42, zIndex: 0, opacity: 0.17, pointerEvents: "none"
        }}>
          <CurtainSVG size={120} style={{width: 120, height: 92}}/>
        </div>
      </div>
    </nav>
  );
}
