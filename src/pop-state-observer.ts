import { App } from "./app";
import { AppRoute, BookRoute, RootRoute } from "./app-route";
import { ToEnd, ToPercent, ToStart } from "./scroll-to";
import { Sha1 } from "./util/hash";

export function parseRoute(r: string): AppRoute | null {
  if (r === "/") return RootRoute();
  let [ _es, bookSha, itemId, scrollTo ] = r.split('/');
  if (itemId.match(/^\d+$/) && bookSha.match(/^[0-9a-f]{40}$/)) {
    if (scrollTo == '0') {
      return BookRoute(
        { bookSha: Sha1.fromHex(bookSha),
          itemId: +itemId,
          scrollTo: ToStart()
        })
    }
    if (scrollTo == '1') {
      return BookRoute(
        { bookSha: Sha1.fromHex(bookSha),
          itemId: +itemId,
          scrollTo: ToEnd()
        })
    }
    if (scrollTo.match(/^\d+([.]\d+)?$/)) {
      return BookRoute(
        { bookSha: Sha1.fromHex(bookSha),
          itemId: +itemId,
          scrollTo: ToPercent(+scrollTo)
        })
    }
  }
  console.log(`Failed to parse route ${r}`);
  return null;
}

export function navigateTo(app: App, appRoute: AppRoute, updateHistory: boolean) {
  console.log(`navigate back to ${JSON.stringify(appRoute)}`);
  switch (appRoute.kind) {
    case "book":
      let sf = async () => app.goToBookItem(appRoute.book.itemId, appRoute.book.scrollTo, false);
      if (app.openBookSha1) {
        if (app.openBookSha1.hex !== appRoute.book.bookSha.hex) {
          app.closeBook();
          app.openBookFromLibrary(appRoute.book.bookSha).then(sf);
        } else {
          sf();
        }
      } else {
        app.openBookFromLibrary(appRoute.book.bookSha).then(sf);
      }
      break;
    case "root":
      if (!app.closeBookIfOpen()) {
        app.pushRoute(RootRoute());
      }
      break;
    default:
      console.log(`not app route in history ${appRoute}`)
  }
}

export function bindPopStateObserver(app: App) {
  window.addEventListener('popstate', (event: PopStateEvent) => {
    let appRoute: AppRoute = event.state;
    navigateTo(app, appRoute, false);
  });
}