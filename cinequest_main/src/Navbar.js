import React from "react";
import { useAuth } from "./AuthContext";
import { useNavigate, useLocation } from "react-router-dom";

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
      color: "#0d0d0d"
    }}>
      <div className="container" style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div className="logo"
          style={{
            color: "#0d0d0d",
            cursor: "pointer",
            fontWeight: 700
          }}
          onClick={() => navigate("/")}
        >
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
      </div>
    </nav>
  );
}
