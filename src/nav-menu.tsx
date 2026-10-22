import { createRoot } from "react-dom/client";

export interface NavMenuProps {
  disabled: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onContent: () => void;
  onClose: () => void;
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
      title="Book Content"
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
}: NavMenuProps): React.JSX.Element {
  if (disabled) return <span></span> ;
  return (
    <div className="book-nav">
      <ContentButton onClick={onContent}/>
      <button
        type="button"
        className="stretch"
        title="Previous chapter"
        aria-label="Previous section"
        onClick={onPrevious}
      >
        {"<"}
      </button>
      <button
        type="button"
        className="close"
        title="Close Book"
        onClick={onClose}
      >
        🗙
      </button>
      <button
        type="button"
        className="stretch"
        title="Next chapter"
        aria-label="Next section"
        onClick={onNext}
      >
        {">"}
      </button>
      <ContentButton onClick={onContent}/>
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
