import { initApp } from "./main.js";

const bookContent = document.getElementById("book-content");
if (!(bookContent instanceof HTMLDivElement)) {
  throw new ReferenceError("Book content element is not found");
}

initApp(bookContent);
