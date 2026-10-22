export interface NavMenu {
  element: HTMLDivElement;
  previousButton: HTMLButtonElement;
  nextButton: HTMLButtonElement;
}

export function createNavMenu(doc: Document): NavMenu {
  const element = doc.createElement("div");
  element.className = "book-nav";

  const previousButton = doc.createElement("button");
  previousButton.type = "button";
  previousButton.textContent = "<";
  previousButton.title = "Previous chapter";
  previousButton.setAttribute("aria-label", "Previous section");
  previousButton.classList.add('stretch');
  previousButton.disabled = true;

  let mkCbtn = () => {
    const contentButton = doc.createElement("button");
    contentButton.type = "button";
    contentButton.textContent = "☰";
    contentButton.title = "Book Content";
    contentButton.classList.add('content');
    return contentButton;
  };

  const closeButton = doc.createElement("button");
  closeButton.type = "button";
  closeButton.textContent = "🗙";
  closeButton.title = "Close Book";
  closeButton.classList.add('close');

  const nextButton = doc.createElement("button");
  nextButton.type = "button";
  nextButton.textContent = ">";
  nextButton.title = "Next chapter";
  nextButton.setAttribute("aria-label", "Next section");
  nextButton.classList.add('stretch');
  nextButton.disabled = true;

  element.append(mkCbtn(), previousButton, closeButton, nextButton, mkCbtn());
  doc.body.append(element);

  return { element, previousButton, nextButton };
}
