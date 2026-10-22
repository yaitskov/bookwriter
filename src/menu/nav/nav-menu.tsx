import "./nav.css";
import { createRoot } from "react-dom/client";

function dropFocus(cb: () => void): () => void {
  return () => {
    if (document.activeElement)
      (document.activeElement as HTMLElement).blur();
    cb();
  }
};

export interface NavMenuProps {
  disabled: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onContent: () => void;
  onClose: () => void;
  onToChapterStart: () => void;
  onToChapterEnd: () => void;
}

export interface NavMenuController {
  setDisabled(disabled: boolean): void;
}

export interface ContentButtonProps {
  onClick: () => void;
}

function ContentButton({ onClick }: ContentButtonProps): React.JSX.Element {
  return (
    <button
      tabIndex={-1}
      type="button"
      className="content"
      title="Book Content (c)"
      onClick={dropFocus(onClick)}
          >
          ☰
    </button>
  );
}

export function NavMenu({
  disabled,
  onPrevious,
  onNext,
  onContent,
  onClose,
  onToChapterStart,
  onToChapterEnd,
}: NavMenuProps): React.JSX.Element {
  if (disabled) return <span></span> ;
  return (
    <div className="book-nav">
      <button
        type="button"
        tabIndex={-1}
        title="Scroll to the chapter start (Home)"
        onClick={dropFocus(onToChapterStart)}
          >⇑</button>
      <ContentButton onClick={onContent}/>
      <button
        type="button" tabIndex={-1}
        className="stretch"
        title="Previous chapter (Arrow Left)"
        onClick={dropFocus(onPrevious)}
          >
          {"<"}
      </button>
      <button
        type="button" tabIndex={-1}
        className="close"
        title="Close Book (q)"
        onClick={dropFocus(onClose)}
          >
          🗙
      </button>
      <button
        type="button" tabIndex={-1}
        className="stretch"
        title="Next chapter (Arrow Right)"
        onClick={dropFocus(onNext)}
          >
          {">"}
      </button>
      <ContentButton onClick={onContent}/>
      <button
        type="button" tabIndex={-1}
        title="Scroll to the chapter end (End)"
        onClick={dropFocus(onToChapterEnd)}
          >⇓</button>
    </div>
  );
}

export function createNavMenu(
  doc: Document,
  callbacks: Omit<NavMenuProps, "disabled">,
): NavMenuController {
  const host = doc.createElement("div");
  doc.body.append(host);

  const root = createRoot(host);
  let disabled = true;

  const render = (): void => {
    root.render(<NavMenu disabled={disabled} {...callbacks} />);
  };

  render();

  return {
    setDisabled(next: boolean): void {
      if (next === disabled) return;
      disabled = next;
      render();
    },
  };
}
