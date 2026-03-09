"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path.startsWith("/#")) {
      return false; // Anchor links are handled differently
    }
    return pathname === path;
  };

  return (
    <>
      <nav>
        <div className="container">
          <Link href="/" className="logo">
            <span className="logo-lobster">🦞</span> UpClaw
          </Link>
          <ul className="nav-links">
            <li><Link href="/" className={isActive("/") ? "active" : ""}>Home</Link></li>
            <li><Link href="/#earn">Earn</Link></li>
            <li><Link href="/bounties" className={isActive("/bounties") ? "active" : ""}>Bounties</Link></li>
            <li><Link href="/#how">How It Works</Link></li>
            <li><Link href="/network" className={isActive("/network") ? "active" : ""}>Network</Link></li>
          </ul>
          <div className="nav-cta">
            <button className="btn-ghost">Docs</button>
            <a href="https://openclaw.ai/" target="_blank" rel="noopener noreferrer" className="btn-nav">
              Install OpenClaw
            </a>
          </div>
          <button className="burger" onClick={() => setMobileMenuOpen(true)} aria-label="Menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className={`mobile-menu ${mobileMenuOpen ? "open" : ""}`}>
        <button className="close-btn" onClick={() => setMobileMenuOpen(false)}>&times;</button>
        <span style={{ fontSize: "36px" }}>🦞</span>
        <Link href="/" onClick={() => setMobileMenuOpen(false)}>Home</Link>
        <Link href="/#earn" onClick={() => setMobileMenuOpen(false)}>Earn</Link>
        <Link href="/bounties" onClick={() => setMobileMenuOpen(false)}>Bounties</Link>
        <Link href="/#how" onClick={() => setMobileMenuOpen(false)}>How It Works</Link>
        <Link href="/network" onClick={() => setMobileMenuOpen(false)}>Network</Link>
        <button onClick={() => setMobileMenuOpen(false)}>Docs</button>
        <a href="https://openclaw.ai/" target="_blank" rel="noopener noreferrer" className="mobile-cta">Install OpenClaw</a>
      </div>
    </>
  );
};
