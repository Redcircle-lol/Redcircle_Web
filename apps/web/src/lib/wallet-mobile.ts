const APP_ORIGIN = "https://www.redcircle.lol";

type SolanaWindow = Window & {
  phantom?: { solana?: { isPhantom?: boolean } };
  solana?: { isPhantom?: boolean; isSolflare?: boolean };
};

/** True when page runs inside X, Instagram, Facebook, etc. */
export function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/Twitter|TwitterAndroid|FBAN|FBAV|Instagram|Line\//i.test(ua)) return true;
  return /(iPhone|iPad|iPod)/i.test(ua) && /AppleWebKit/i.test(ua) && !/Safari/i.test(ua);
}

export function isAndroidChrome(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /android/i.test(ua) && /chrome/i.test(ua) && !/edg/i.test(ua);
}

export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android|iphone|ipad|ipod/i.test(uaSafe());
}

function uaSafe(): string {
  return navigator.userAgent || "";
}

/** Extension or in-app browser provider (Phantom, Solflare, etc.). */
export function hasInjectedSolanaProvider(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as SolanaWindow;
  return !!(w.phantom?.solana || w.solana);
}

export function isInsidePhantomBrowser(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as SolanaWindow).phantom?.solana?.isPhantom;
}

/**
 * iOS Safari / mobile browsers without an injected wallet:
 * open the current page inside Phantom's in-app browser where connect works.
 */
export function openPhantomBrowseDeeplink(targetUrl?: string): void {
  const page = targetUrl || window.location.href;
  const encodedPage = encodeURIComponent(page);
  const encodedRef = encodeURIComponent(APP_ORIGIN);
  window.location.assign(`https://phantom.app/ul/browse/${encodedPage}?ref=${encodedRef}`);
}

/** Use Phantom browse handoff instead of the wallet modal. */
export function shouldRedirectToPhantomBrowser(): boolean {
  if (!isMobileDevice()) return false;
  if (isInAppBrowser()) return false;
  if (hasInjectedSolanaProvider()) return false;
  if (isAndroidChrome()) return false;
  return true;
}

/** Open wallet UI — modal on desktop/Android Chrome, Phantom app on iOS Safari. */
export function openMobileAwareWalletConnect(openModal: (open: boolean) => void): void {
  if (shouldRedirectToPhantomBrowser()) {
    openPhantomBrowseDeeplink();
    return;
  }
  openModal(true);
}

export function getMobileWalletHint(): string | null {
  if (isInAppBrowser()) {
    return "Wallet connect doesn't work inside the X app. Tap ⋯ → Open in Safari, then connect your wallet.";
  }
  return null;
}
