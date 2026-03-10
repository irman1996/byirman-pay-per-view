import Link from "next/link";
import "./landing.css";

export default function LandingPage() {
  return (
    <main className="landing-container">
      <header className="header glass-panel">
        <h1 className="logo gradient-text">ByIrman</h1>
        <div className="nav-links">
          <Link href="/create" className="btn btn-primary btn-small">
            Start Creating
          </Link>
        </div>
      </header>

      <section className="hero">
        <h1 className="hero-title">Turn Your Digital Content Into Revenue Instantly.</h1>
        <p className="hero-subtitle">
          The easiest way to sell your videos, PDFs, and exclusive files. Set a price in APT, generate a link, and get paid instantly directly to your wallet.
        </p>

        <div className="cta-group">
          <Link href="/create" className="btn btn-primary btn-large cta-pulse">
            Create Your First Pay-Per-View Link
          </Link>
          <a href="#how-it-works" className="btn btn-secondary btn-large">
            See How It Works
          </a>
        </div>
      </section>

      <section id="how-it-works" className="features">
        <div className="feature-card glass-panel">
          <div className="feature-icon">📁</div>
          <h3>1. Upload</h3>
          <p>Upload your high-quality video, wallpaper pack, or PDF securely.</p>
        </div>
        <div className="feature-card glass-panel">
          <div className="feature-icon">💰</div>
          <h3>2. Set Price</h3>
          <p>Determine exactly how much you want to charge in APT or ShelbyUSD.</p>
        </div>
        <div className="feature-card glass-panel">
          <div className="feature-icon">🔗</div>
          <h3>3. Share & Earn</h3>
          <p>Share your generated link anywhere. Viewers pay to unlock, and you get paid instantly!</p>
        </div>
      </section>
      
      <footer className="footer text-secondary">
        <p>© {new Date().getFullYear()} ByIrman. Built for the Shelby.xyz Ecosystem.</p>
      </footer>
    </main>
  );
}
