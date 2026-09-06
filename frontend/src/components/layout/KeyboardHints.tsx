import { useEffect, useRef } from 'react';
import { navigationItems } from './navigation';
import { useLang } from '../../lib/i18n';

type KeyboardHintsProps = {
  visible: boolean;
  onClose: () => void;
};

/**
 * Transient overlay listing the keyboard shortcuts the app exposes.
 *
 * It appears only on demand (`?`) and is not part of the normal flow,
 * so we render it inside the React tree but position it over the
 * viewport with fixed coordinates. Closing on backdrop click or Escape
 * is handled by the parent hook plus the click handler here.
 */
export default function KeyboardHints({ visible, onClose }: KeyboardHintsProps) {
  const { t } = useLang();
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!visible) return;
    // Move focus into the dialog when it opens so screen readers announce it.
    dialogRef.current?.focus();
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(15,23,42,0.45)] backdrop-blur-sm"
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="keyboard-hints-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="surface-card cp-enter w-[min(420px,92vw)] p-6 outline-none"
      >
        <div className="cp-subtle-label">{t("Keyboard")}</div>
        <h2 id="keyboard-hints-title" className="cp-heading-lg mt-2">
          {t("Shortcuts")}
        </h2>
        <p className="cp-body-copy mt-1">{t("Quick keys for moving around COMET.")}</p>

        <ul className="mt-5 space-y-2.5">
          {navigationItems.map((item, idx) => (
            <li key={item.to} className="flex items-center justify-between gap-3">
              <span className="text-sm text-[#333d4b]">{t(item.label)}</span>
              <kbd className="rounded-md border border-[rgba(25,31,40,0.16)] bg-[rgba(255,255,255,0.96)] px-2 py-0.5 text-xs font-mono text-[#191f28] shadow-[inset_0_-1px_0_rgba(25,31,40,0.06)]">
                Alt + {idx + 1}
              </kbd>
            </li>
          ))}
          <li className="mt-3 flex items-center justify-between gap-3 border-t border-[rgba(25,31,40,0.07)] pt-3">
            <span className="text-sm text-[#333d4b]">{t("Toggle this dialog")}</span>
            <kbd className="rounded-md border border-[rgba(25,31,40,0.16)] bg-[rgba(255,255,255,0.96)] px-2 py-0.5 text-xs font-mono text-[#191f28] shadow-[inset_0_-1px_0_rgba(25,31,40,0.06)]">
              ?
            </kbd>
          </li>
          <li className="flex items-center justify-between gap-3">
            <span className="text-sm text-[#333d4b]">{t("Close")}</span>
            <kbd className="rounded-md border border-[rgba(25,31,40,0.16)] bg-[rgba(255,255,255,0.96)] px-2 py-0.5 text-xs font-mono text-[#191f28] shadow-[inset_0_-1px_0_rgba(25,31,40,0.06)]">
              Esc
            </kbd>
          </li>
        </ul>

        <div className="mt-6 flex justify-end">
          <button type="button" onClick={onClose} className="cp-button-secondary px-4 py-2 text-sm">
            {t("Close")}
          </button>
        </div>
      </div>
    </div>
  );
}
