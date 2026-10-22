import "./nav.css";
import { createRoot } from "react-dom/client";


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
      type="button"
      className="content"
      title="Book Content (c)"
      onClick={onClick}
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
        title="Scroll to the chapter start (Home)"
        onClick={onToChapterStart}
      >⇑</button>
      <ContentButton onClick={onContent}/>
      <button
        type="button"
        className="stretch"
        title="Previous chapter (Arrow Left)"
        onClick={onPrevious}
      >
        {"<"}
      </button>
      <button
        type="button"
        className="close"
        title="Close Book (q)"
        onClick={onClose}
      >
        🗙
      </button>
      <button
        type="button"
        className="stretch"
        title="Next chapter (Arrow Right)"
        onClick={onNext}
      >
        {">"}
      </button>
      <ContentButton onClick={onContent}/>
      <button
        type="button"
        title="Scroll to the chapter end (End)"
        onClick={onToChapterEnd}
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
