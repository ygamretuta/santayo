import "./status.css";

/** Loading / empty / error message. */
export function Status({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="status">
      {children}
    </p>
  );
}
