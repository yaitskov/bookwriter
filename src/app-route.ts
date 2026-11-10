import { bookRefToPath, InBookRef } from "./book/open-book";

export type AppRoute =
  | { readonly kind: "root" }
  | { readonly kind: "book"; book: InBookRef }


export const BookRoute = (br: InBookRef) => ({ kind: "book", book: br } as AppRoute )
export const RootRoute = (): AppRoute => ({ kind: "root" } as AppRoute)

export const appRouteToPath = (ar: AppRoute): string => {
  switch (ar.kind) {
    case "root": return "/";
    case "book": return `/book${bookRefToPath(ar.book)}`
  }
}