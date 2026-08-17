"use client";

import { type CSSProperties, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const inputStyle: CSSProperties = {
  border: "1px solid black",
  padding: "4px 12px",
  display: "block",
  marginBottom: "8px",
  minWidth: "220px",
};

const buttonStyle: CSSProperties = {
  backgroundColor: "#E5E5E5",
  border: "1px solid black",
  color: "black",
  padding: "4px 12px",
};

export default function LiveResultPasswordPage() {
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showReset, setShowReset] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const router = useRouter();
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password.trim()) {
      setError("Please enter a password");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${base}/api/live-result/verify-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        setError("Invalid password. Please try again.");
        return;
      }

      const data: { ok: boolean } = await res.json();
      if (!data.ok) {
        setError("Invalid password. Please try again.");
        return;
      }

      if (typeof window !== "undefined") {
        sessionStorage.setItem("liveResultAccess", "true");
      }

      router.replace("/live-reports/live-result/lucky-12");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSuccess(null);

    if (!newPassword.trim()) {
      setResetError("Please enter a new password");
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError("New password and confirmation do not match");
      return;
    }

    setResetSubmitting(true);
    try {
      const res = await fetch(`${base}/api/live-result/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data: { ok?: boolean; message?: string } = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        setResetError(data.message ?? "Could not update password. Please try again.");
        return;
      }

      setResetSuccess("Password updated.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setResetError("Something went wrong. Please try again.");
    } finally {
      setResetSubmitting(false);
    }
  };

  const toggleResetPanel = () => {
    setShowReset((v) => !v);
    setResetError(null);
    setResetSuccess(null);
  };

  return (
    <section style={{ color: "black", paddingTop: "16px", paddingLeft: "8px" }}>
      <style>{`
        .lrp-reset-mobile {
          display: none;
        }
        @media (max-width: 639px) {
          .lrp-reset-desktop {
            display: none !important;
          }
          .lrp-reset-mobile {
            display: inline-block;
            margin-top: 9px;
          }
        }
      `}</style>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "16px",
          paddingRight: "8px",
        }}
      >
        <h1
          style={{
            fontSize: "24px",
            fontWeight: "bold",
            margin: 0,
          }}
        >
          Enter Password to Access Live Result
        </h1>
        <button
          type="button"
          className="lrp-reset-desktop"
          onClick={toggleResetPanel}
          style={buttonStyle}
        >
          Reset password
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ ...inputStyle, display: "inline-block", marginBottom: 0, marginRight: "8px" }}
        />
        <button type="submit" disabled={isSubmitting} style={buttonStyle}>
          Submit
        </button>
        <button
          type="button"
          className="lrp-reset-mobile"
          onClick={toggleResetPanel}
          style={buttonStyle}
        >
          Reset password
        </button>
      </form>

      {error && (
        <p style={{ marginTop: "8px", color: "red", fontSize: "14px" }}>
          {error}
        </p>
      )}

      {showReset && (
        <div style={{ marginTop: "20px", maxWidth: "320px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "10px" }}>
            Reset password
          </h2>
          <form onSubmit={handleResetSubmit}>
            <input
              type="password"
              placeholder="Current password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={inputStyle}
            />
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button type="submit" disabled={resetSubmitting} style={buttonStyle}>
                Update password
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowReset(false);
                  setResetError(null);
                  setResetSuccess(null);
                  setOldPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                style={buttonStyle}
              >
                Cancel
              </button>
            </div>
          </form>
          {resetError && (
            <p style={{ marginTop: "8px", color: "red", fontSize: "14px" }}>
              {resetError}
            </p>
          )}
          {resetSuccess && (
            <p style={{ marginTop: "8px", color: "green", fontSize: "14px" }}>
              {resetSuccess}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
