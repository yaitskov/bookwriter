export interface ClickedWord {
  word: string;
  node: Text | null;
  start: number;
  end: number;
}

export function extractClickedWord(p: HTMLElement): ClickedWord {
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0).cloneRange();
    range.collapse(true);
    let node: Node | null = range.startContainer;
    let offset = range.startOffset;

    while (node && node.nodeType !== Node.TEXT_NODE) {
      if (node.childNodes.length > 0) {
        node = node.childNodes.item(Math.min(offset, node.childNodes.length - 1));
        offset = offset > 0 ? (node.textContent?.length ?? 0) : 0;
      } else {
        node = node.parentNode;
        offset = 0;
      }
    }

    if (node instanceof Text) {
      const text = node.textContent;
      if (text !== null) {
        let start = Math.max(0, Math.min(offset, text.length));
        let end = start;
        const isWordChar = (ch: string): boolean => /[\w'’-]/.test(ch);

        while (start > 0 && isWordChar(text[start - 1])) start--;
        while (end < text.length && isWordChar(text[end])) end++;

        if (start < end) {
          return { word: text.slice(start, end), node, start, end };
        }
      }
    }
  }

  const words = p.textContent?.trim().split(/\s+/);
  return { word: words ? words[words.length - 1] : "", node: null, start: 0, end: 0 };
}
