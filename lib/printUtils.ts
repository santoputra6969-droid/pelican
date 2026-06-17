export function isIOSSafari(): boolean {
  if (typeof window === "undefined") return false;

  const ua = window.navigator.userAgent;
  const isiOS = /iP(hone|ad|od)/.test(ua);
  const isWebKit = /WebKit/.test(ua);
  const isOtherIOSBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);

  return isiOS && isWebKit && !isOtherIOSBrowser;
}

export function printWithIOSClass(): void {
  if (typeof window === "undefined") return;

  const root = document.documentElement;
  const useIOSClass = isIOSSafari();

  if (useIOSClass) {
    root.classList.add("ios-safari-print");
  }

  const cleanup = () => {
    root.classList.remove("ios-safari-print");
    window.removeEventListener("afterprint", cleanup);
  };

  window.addEventListener("afterprint", cleanup);
  window.print();

  if (!useIOSClass) {
    cleanup();
    return;
  }

  // Fallback cleanup for browsers that do not reliably fire afterprint.
  window.setTimeout(cleanup, 1500);
}
