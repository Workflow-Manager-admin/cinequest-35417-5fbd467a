import React from "react";
import { useNavigate } from "react-router-dom";

// PUBLIC_INTERFACE
/**
 * BackButton - A consistent, unobtrusive back button for navigation.
 * Uses navigate(-1) to return to the previous page.
 * Style: matches app theme, placed fixed at top-left within main content area.
 *
 * Usage: Place <BackButton /> at the top of each main or game component.
 */
export default function BackButton({ style, className, disabled }) {
  const navigate = useNavigate();
  return (
    <button
      className={`btn cq-back-btn${className ? " " + className : ""}`}
      style={{
        position: "absolute",
        top: 18,
        left: 10,
        zIndex: 40,
        minWidth: 0,
        padding: "6px 18px 6px 14px",
        background: "#fff",
        color: "#d505ff",
        border: "1px solid #d505ff55",
        fontWeight: 700,
        borderRadius: 22,
        fontSize: 17,
        boxShadow: "0 2px 8px #d505ff13",
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? "none" : "auto",
        transition: "opacity 0.14s",
        ...style
      }}
      onClick={() => navigate(-1)}
      disabled={disabled}
      aria-label="Go Back"
    >
      ← Back
    </button>
  );
}
