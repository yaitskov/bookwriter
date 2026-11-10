
import { ScrollTo } from '../scroll-to';
import { Sha1 } from '../util/hash';

export interface InBookRef {
  bookSha: Sha1;
  itemId: number;
  scrollTo: ScrollTo;
}

export function bookRefToPath(r: InBookRef): string {
  const prefix = `/${r.bookSha}/${r.itemId}/`;
  switch (r.scrollTo.kind) {
    case "anchor":
      return `${prefix}${r.scrollTo.anchor}`;
    case "percent":
      return `${prefix}${r.scrollTo.scrollTo}`;
    case "start":
      return `${prefix}0`;
    case "end":
      return `${prefix}1`;
  }
}
