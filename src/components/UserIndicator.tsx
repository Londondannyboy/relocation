import { useState } from "react";
import { StackProvider, StackTheme, useUser } from "@stackframe/react";
import { stackClientApp } from "../stack/client";

function UserMenu() {
  const user = useUser();
  const [showMenu, setShowMenu] = useState(false);

  if (!user) {
    return (
      <a
        href="/handler/sign-in"
        style={{
          background: "rgba(255,255,255,0.2)",
          color: "white",
          padding: "8px 20px",
          borderRadius: "20px",
          textDecoration: "none",
          fontWeight: 600,
          fontSize: "14px",
          transition: "all 0.2s",
        }}
      >
        Sign In
      </a>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          background: "rgba(255,255,255,0.2)",
          border: "none",
          borderRadius: "25px",
          padding: "6px 16px 6px 6px",
          cursor: "pointer",
          transition: "all 0.2s",
        }}
      >
        <img
          src={user.profileImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || "U")}&background=667eea&color=fff`}
          alt={user.displayName || "User"}
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            objectFit: "cover",
          }}
        />
        <span style={{ color: "white", fontWeight: 600, fontSize: "14px" }}>
          {user.displayName?.split(" ")[0] || "User"}
        </span>
      </button>

      {showMenu && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: "8px",
            background: "white",
            borderRadius: "12px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
            minWidth: "200px",
            overflow: "hidden",
            zIndex: 1000,
          }}
        >
          <div style={{ padding: "16px", borderBottom: "1px solid #eee" }}>
            <div style={{ fontWeight: 600, color: "#1a202c" }}>
              {user.displayName}
            </div>
            <div style={{ fontSize: "13px", color: "#666", marginTop: "2px" }}>
              {user.primaryEmail}
            </div>
          </div>
          <a
            href="/profile"
            style={{
              display: "block",
              padding: "12px 16px",
              color: "#1a202c",
              textDecoration: "none",
              fontSize: "14px",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f5")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            Profile
          </a>
          <button
            onClick={() => user.signOut()}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "12px 16px",
              color: "#dc2626",
              background: "none",
              border: "none",
              fontSize: "14px",
              cursor: "pointer",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

export default function UserIndicator() {
  return (
    <StackProvider app={stackClientApp}>
      <StackTheme>
        <UserMenu />
      </StackTheme>
    </StackProvider>
  );
}
