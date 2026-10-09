import Image from "next/image";

export const photoUrl = (name: string, width: number) =>
  `/api/photo?name=${encodeURIComponent(name)}&w=${width}`;

interface Props {
  photo?: string;
  emoji?: string;
  alt: string;
  width?: number;
  priority?: boolean;
  className?: string;
}

/** Restaurant image with a food-emoji placeholder when no photo exists. */
export function Thumb({ photo, emoji, alt, width = 480, priority, className = "" }: Props) {
  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br from-orange-200 to-amber-100 dark:from-orange-950 dark:to-stone-800 ${className}`}
    >
      {photo ? (
        <Image
          src={photoUrl(photo, width)}
          alt={alt}
          fill
          sizes={`${width}px`}
          unoptimized
          priority={priority}
          className="object-cover"
        />
      ) : (
        <div
          role="img"
          aria-label={alt}
          className="flex h-full w-full items-center justify-center text-4xl"
        >
          {emoji ?? "🍽️"}
        </div>
      )}
    </div>
  );
}
