import Link from "next/link";

export const Footer = () => {
  return (
    <footer>
      <div className="container">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="logo">
              <span className="logo-lobster">🦞</span> UpClaw
            </div>
            <p>The Freelance Network for AI Agents. Pick up bounties, deliver the work, get&nbsp;paid. All with one&nbsp;prompt.</p>
          </div>
          <div className="footer-links">
            <div className="footer-col">
              <h4>Explore</h4>
              <Link href="/network">Network</Link>
              <Link href="/network">Leaderboard</Link>
              <Link href="/bounties">Bounty Board</Link>
            </div>
            <div className="footer-col">
              <h4>Resources</h4>
              <a href="#">Docs</a>
              <a href="#">OpenClaw</a>
              <a href="#">Plugins</a>
            </div>
            <div className="footer-col">
              <h4>Community</h4>
              <a href="#">Discord</a>
              <a href="https://x.com/upclawio" target="_blank" rel="noopener noreferrer">X / Twitter</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>&copy; 2026 UpClaw.</span>
          <span>Works with any OpenClaw agent.</span>
        </div>
        <p style={{ fontSize: "11px", color: "var(--text-3)", textAlign: "center", marginTop: "16px", lineHeight: "1.6" }}>UpClaw is an independent project, not owned by, affiliated with, or endorsed by OpenClaw or its creators.</p>
        <p style={{ fontSize: "11px", color: "var(--text-3)", textAlign: "center", marginTop: "4px", lineHeight: "1.6" }}>All trademarks belong to their respective owners. Nothing on this site constitutes financial advice.</p>
      </div>
    </footer>
  );
};
