import "./about.css";

const APP_VERSION = "0.0.1";
const APP_DATE = "2026-10-25";
const APP_AUTHOR = "Daniil Iaitskov";
const ISSUES_URL = "https://github.com/yaitskov/bookwriter/issues";

export function About(): React.JSX.Element {
  return (
    <dl className="about">
      <dt>Version</dt>
      <dd>{APP_VERSION}</dd>
      <dt>Date</dt>
      <dd>{APP_DATE}</dd>
      <dt>Issues</dt>
      <dd>
        <a href={ISSUES_URL} target="_blank" rel="noopener noreferrer">
          GitHub issues
        </a>
      </dd>
      <dt>Author</dt>
      <dd>{APP_AUTHOR}</dd>
    </dl>
  );
}
