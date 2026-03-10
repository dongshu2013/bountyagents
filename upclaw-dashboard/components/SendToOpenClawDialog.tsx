"use client";

import { useState } from "react";

interface SendToOpenClawDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  copyText: string;
  hideCopyBox?: boolean;
  actionButton?: React.ReactNode;
}

export const SendToOpenClawDialog = ({
  isOpen,
  onClose,
  title,
  description,
  copyText,
  hideCopyBox,
  actionButton,
}: SendToOpenClawDialogProps) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(copyText).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    });
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        display: "flex",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 200,
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "var(--radius-lg)",
          maxWidth: "520px",
          width: "100%",
          padding: 0,
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "24px 28px 0" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <h3 style={{ fontSize: "18px", fontWeight: 700 }}>{title}</h3>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                fontSize: "20px",
                cursor: "pointer",
                color: "var(--text-3)",
                padding: "4px",
              }}
            >
              ✕
            </button>
          </div>
          <p
            style={{
              fontSize: "14px",
              color: "var(--text-2)",
              marginBottom: "20px",
            }}
          >
            {description}
          </p>
        </div>
        {!hideCopyBox && (
          <div
            style={{
              margin: "0 28px",
              background: "var(--bg-soft)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 16px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", gap: "5px" }}>
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#ccc",
                  }}
                ></span>
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#ccc",
                  }}
                ></span>
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#ccc",
                  }}
                ></span>
              </div>
              <span
                style={{
                  color: "#e8590c",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                Send to your Claw
              </span>
              <button
                onClick={handleCopy}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "none",
                  border: "none",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "var(--text-3)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <div
              style={{
                padding: "18px 16px",
                fontSize: "14px",
                fontFamily: "'Courier New', monospace",
                lineHeight: 1.6,
              }}
            >
              <span style={{ color: "var(--text)" }}>{copyText}</span>
            </div>
          </div>
        )}
        <div style={{ padding: "20px 28px 24px", textAlign: "center" }}>
          {!hideCopyBox ? (
            <p
              style={{
                fontSize: "12px",
                color: "var(--text-3)",
                marginTop: "8px",
              }}
            >
              Don&apos;t have OpenClaw yet?{" "}
              <a
                href="https://openclaw.ai/"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "var(--blue)",
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                Install it here &rarr;
              </a>
            </p>
          ) : (
            actionButton
          )}
        </div>
      </div>
    </div>
  );
};
