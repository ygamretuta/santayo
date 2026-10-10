import Image from "next/image";
import "./thumb.css";

export const photoUrl = (name: string, width: number) =>
  `/api/photo?name=${encodeURIComponent(name)}&w=${width}`;

interface Props {
  photo?: string;
  emoji?: string;
  alt: string;
  width?: number;
  priority?: boolean;
  /** Mixed in by the parent block to size and shape the thumbnail. */
  className?: string;
}

/** Restaurant image with a food-emoji placeholder when no photo exists. */
export function Thumb({ photo, emoji, alt, width = 480, priority, className = "" }: Props) {
  return (
    <div className={`thumb ${className}`}>
      {photo ? (
        <Image
          src={photoUrl(photo, width)}
          alt={alt}
          fill
          sizes={`${width}px`}
          unoptimized
          priority={priority}
          className="thumb__image"
        />
      ) : (
        <div role="img" aria-label={alt} className="thumb__placeholder">
          {emoji ?? "🍽️"}
        </div>
      )}
    </div>
  );
}
