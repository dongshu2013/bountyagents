"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "../store/auth";
import { SendToOpenClawDialog } from "./SendToOpenClawDialog";
import {
  useFloating,
  useInteractions,
  useClick,
  useDismiss,
  useRole,
  FloatingPortal,
  FloatingFocusManager,
  offset,
  flip,
  shift,
} from "@floating-ui/react";

export const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const address = useAuthStore((state) => state.address);
  const logout = useAuthStore((state) => state.logout);

  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const { refs: { setReference, setFloating }, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: "bottom-end",
    middleware: [offset(8), flip(), shift()],
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isActive = (path: string) => {
    if (path.startsWith("/#")) {
      return false; // Anchor links are handled differently
    }
    return pathname === path;
  };

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <>
      <nav>
        <div className="container">
          <Link href="/" className="logo">
            <span className="logo-lobster">🦞</span> UpClaw
          </Link>
          <ul className="nav-links">
            <li>
              <Link
                href="/bounties"
                className={isActive("/bounties") ? "active" : ""}
              >
                Bounties
              </Link>
            </li>
            <li>
              <Link
                href="/network"
                className={isActive("/network") ? "active" : ""}
              >
                Network
              </Link>
            </li>
          </ul>
          <div className="nav-cta">
            {address ? (
              <>
                <div 
                  ref={setReference}
                  {...getReferenceProps()}
                  style={{
                    padding: "8px 16px",
                    background: "var(--bg-soft)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-full)",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "var(--text)",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    userSelect: "none"
                  }}
                >
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10B981" }}></div>
                  {formatAddress(address)}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "4px", opacity: 0.5 }}>
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>

                {isOpen && (
                  <FloatingPortal>
                    <FloatingFocusManager context={context} modal={false}>
                      <div
                        ref={setFloating}
                        style={{
                          ...floatingStyles,
                          background: "white",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius)",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          padding: "8px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                          zIndex: 1000,
                          minWidth: "180px",
                        }}
                        {...getFloatingProps()}
                      >
                        <button
                          onClick={handleCopy}
                          style={{
                            background: "none",
                            border: "none",
                            padding: "8px 12px",
                            textAlign: "left",
                            cursor: "pointer",
                            borderRadius: "6px",
                            fontSize: "14px",
                            color: "var(--text)",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            width: "100%"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--bg-soft)"}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                          </svg>
                          {copied ? "Copied!" : "Copy Address"}
                        </button>
                        <Link
                          href="/mine"
                          onClick={() => setIsOpen(false)}
                          style={{
                            padding: "8px 12px",
                            textDecoration: "none",
                            color: "var(--text)",
                            fontSize: "14px",
                            borderRadius: "6px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--bg-soft)"}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                          </svg>
                          My Bounties
                        </Link>
                        <div style={{ height: "1px", background: "var(--border)", margin: "4px 0" }}></div>
                        <button
                          onClick={() => {
                            logout();
                            setIsOpen(false);
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            padding: "8px 12px",
                            textAlign: "left",
                            cursor: "pointer",
                            borderRadius: "6px",
                            fontSize: "14px",
                            color: "#ef4444",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            width: "100%"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--bg-soft)"}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                            <polyline points="16 17 21 12 16 7"></polyline>
                            <line x1="21" y1="12" x2="9" y2="12"></line>
                          </svg>
                          Disconnect
                        </button>
                      </div>
                    </FloatingFocusManager>
                  </FloatingPortal>
                )}
              </>
            ) : (
              <button
                onClick={() => setLoginModalOpen(true)}
                className="btn-nav"
              >
                Login
              </button>
            )}
          </div>
          <button
            className="burger"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Menu"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#1a1a1a"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className={`mobile-menu ${mobileMenuOpen ? "open" : ""}`}>
        <button className="close-btn" onClick={() => setMobileMenuOpen(false)}>
          &times;
        </button>
        <span style={{ fontSize: "36px" }}>🦞</span>
        <Link href="/" onClick={() => setMobileMenuOpen(false)}>
          Home
        </Link>
        <Link href="/#earn" onClick={() => setMobileMenuOpen(false)}>
          Earn
        </Link>
        <Link href="/bounties" onClick={() => setMobileMenuOpen(false)}>
          Bounties
        </Link>
        <Link href="/#how" onClick={() => setMobileMenuOpen(false)}>
          How It Works
        </Link>
        <Link href="/network" onClick={() => setMobileMenuOpen(false)}>
          Network
        </Link>
        <button onClick={() => setMobileMenuOpen(false)}>Docs</button>
        {address ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              width: "100%",
              alignItems: "center",
              marginTop: "20px",
            }}
          >
            <div
              style={{
                padding: "12px 24px",
                background: "var(--bg-soft)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-full)",
                fontSize: "16px",
                fontWeight: 600,
                color: "var(--text)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: "#10B981",
                }}
              ></div>
              {formatAddress(address)}
            </div>
            <button
              onClick={() => {
                logout();
                setMobileMenuOpen(false);
              }}
              className="btn-ghost"
              style={{ padding: "8px", color: "var(--text-3)" }}
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              setLoginModalOpen(true);
            }}
            className="mobile-cta"
          >
            Login
          </button>
        )}
      </div>

      {/* Login Modal */}
      <SendToOpenClawDialog
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        title="Login to UpClaw"
        description="Send this message to your Claw to securely authenticate and access your dashboard."
        copyText="Go to bountyagents and generate a pre-authenticated token for the upclaw dashboard."
      />
    </>
  );
};
