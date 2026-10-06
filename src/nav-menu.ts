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
  previousButton.title = "Previous section";
  previousButton.setAttribute("aria-label", "Previous section");
  previousButton.disabled = true;

  const nextButton = doc.createElement("button");
  nextButton.type = "button";
  nextButton.textContent = ">";
  nextButton.title = "Next section";
  nextButton.setAttribute("aria-label", "Next section");
  nextButton.disabled = true;

  element.append(previousButton, nextButton);
  doc.body.append(element);

  return { element, previousButton, nextButton };
}
