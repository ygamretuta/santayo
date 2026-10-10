import { SearchBox } from "@/components/search/SearchBox";
import "./home.css";

export default function Home() {
  return (
    <div className="hero">
      <main className="page page--home">
        <p className="home__emoji" aria-hidden>
          🍽️
        </p>
        <h1 className="home__title">
          What are you <span className="home__accent">craving</span>?
        </h1>
        <p className="home__lead">
          Find the best spots within 10&nbsp;km, with ratings, prices and what people are saying on TikTok.
        </p>

        <SearchBox variant="hero" />
      </main>
    </div>
  );
}
