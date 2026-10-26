import "./welcome.css";
import { createRoot } from "react-dom/client";
import {
  BookLibraryView,
  type BookLibraryViewHandle,
} from "../library/view";
import type { BookLibrary } from "../library/db";
import type { Sha1 } from "../util/hash";

export interface C2WelcomeProps {
  library: BookLibrary;
  onOpenBook: (contentSha: Sha1) => void;
  onOpenNewBook: () => void;
  onShowHelp: () => void;
  onShowSettings: () => void;
  libraryViewRef?: React.Ref<BookLibraryViewHandle>;
}

export function C2Welcome({
  library,
  onOpenBook,
  onOpenNewBook,
  onShowHelp,
  onShowSettings,
  libraryViewRef,
}: C2WelcomeProps): React.JSX.Element {
  return (
    <div className="container">
      <section>
        <header>
          <h1>📖 Adaptive E-reader <span className="c2">C2</span></h1>
        </header>
        <p>
          Weclome to <span className="c2">C2</span> bookreader! It's a bookreader dedicated
          for <em>ESL</em> readers that adapts a book content to user's language
          level. If a book vocabulary is too hard for you, lower down the
          threshold for the minimum allowed word frequency in the app
          settings.
        </p>
        <p>
          There is no an open book. Click{" "}
          <button
            id="load-new-book"
            type="button"
            autoFocus
            className="cta"
            onClick={onOpenNewBook}
          >
            open
          </button>{" "}
          or press <kbd>o</kbd> key to choose a book from the device.
        </p>
        <p>
          Click{" "}
          <button
            id="show-help"
            type="button"
            className="cta"
            onClick={onShowHelp}
          >
            help
          </button>{" "}
          or press <kbd>h</kbd> key to see keyboard shortcuts and mouse actions.
        </p>
        <p>
          Click{" "}
          <button
            id="show-settings"
            type="button"
            className="cta"
            onClick={onShowSettings}
          >
            settings
          </button>{" "}
          or press <kbd>s</kbd> key to change app settings.
        </p>
      </section>
      <BookLibraryView
        ref={libraryViewRef}
        library={library}
        onOpenBook={onOpenBook}
        onOpenNewBook={onOpenNewBook}
      />
    </div>
  );
}

export interface C2WelcomeOptions extends C2WelcomeProps {
  target?: HTMLElement;
  doc?: Document;
}

export function createC2Welcome(options: C2WelcomeOptions): HTMLElement {
  const { target, doc: docOption, ...props } = options;
  const doc = docOption ?? document;
  const host = target ?? doc.getElementById("c2-welcome");
  if (!host) {
    throw new ReferenceError("Tag with id c2-welcome is not found");
  }

  const root = createRoot(host);
  root.render(<C2Welcome {...props} />);
  return host;
}
