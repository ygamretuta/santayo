import { socialLinks } from "@/lib/social";
import type { Restaurant } from "@/lib/types";
import "./social.css";

/** TikTok review searches (plus other platforms) for a restaurant. */
export function SocialLinks({ r }: { r: Restaurant }) {
  const social = socialLinks(r);

  return (
    <section className="social">
      <h2 className="social__title">What people are saying online</h2>
      <p className="social__intro">
        Opens TikTok search for {r.name}. We link to the search, since TikTok has no public API for
        embedding results.
      </p>
      <ul className="social__tiktok-list">
        {social.tiktok.map((l) => (
          <li key={l.href}>
            <a href={l.href} target="_blank" rel="noopener noreferrer" className="social__tiktok-link">
              <span aria-hidden className="social__icon">🎵</span>
              <span className="social__text">
                <span className="social__label">{l.label}</span>
                {l.hint && <span className="social__hint">{l.hint} · TikTok</span>}
              </span>
            </a>
          </li>
        ))}
      </ul>
      <div className="social__others">
        {social.other.map((l) => (
          <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="social__other">
            {l.label} ↗
          </a>
        ))}
      </div>
    </section>
  );
}
