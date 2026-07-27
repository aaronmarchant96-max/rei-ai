export default function PhilosophyModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="rei-modal-overlay" onClick={onClose}>
      <div className="rei-glass-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rei-modal-header">
          <h2>SYSTEM PHILOSOPHY: R.E.I.</h2>
          <button className="rei-close-btn" onClick={onClose} aria-label="Close Modal">
            &times;
          </button>
        </div>

        <div className="rei-concept-layer">
          <h3>1. Latin: Rei (The Matter / Reality / Hinge)</h3>
          <p><strong>The Concept:</strong> Genitive form of <em>Res</em>, meaning "thing," "fact," or "reality."</p>
          <p><strong>The Connection:</strong> In <em>CARDO REI</em>, it represents "The Hinge of the Matter." Dissecting the core pivot where the reality of a problem turns.</p>
          <p className="rei-tagline">"Investigating the matter, not the person."</p>
        </div>

        <div className="rei-concept-layer">
          <h3>2. Operational: R-E-I (Record • Evaluate • Iterate)</h3>
          <p><strong>The Concept:</strong> The engineering process loop that keeps development structured and safe.</p>
          <p><strong>The Connection:</strong> <strong>Record</strong> the facts (TDD/Citations), <strong>Evaluate</strong> the boundaries (Scoring/Tiers), and <strong>Iterate</strong> in modular steps.</p>
          <p className="rei-tagline">"Building tiny houses until you get a neighborhood."</p>
        </div>

        <div className="rei-concept-layer">
          <h3>3. Physics: Refractive Index (R.I.)</h3>
          <p><strong>The Concept:</strong> Optical measure of how much light bends when entering a new medium.</p>
          <p><strong>The Connection:</strong> REI acts as a refractive lens for thoughts. Bending raw arguments to filter out the glare (smoke, bias) and find clear direction.</p>
          <p className="rei-tagline">"Shaping raw light into structured clarity."</p>
        </div>
      </div>
    </div>
  );
}
