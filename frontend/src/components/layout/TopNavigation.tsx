import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useLang } from '../../lib/i18n';
import { useBasis } from '../../lib/use-basis';
import { useUnit } from '../../lib/use-unit';
import BrandMark from './BrandMark';
import { isNavigationPathActive, navigationItems } from './navigation';

function MinimizeIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M2.25 6.75h7.5" strokeLinecap="round" />
    </svg>
  );
}

function MaximizeIcon({ maximized }: { maximized: boolean }) {
  return maximized ? (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.2} className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M3.25 2.75h5v5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.75 4.25v5h5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.2} className="h-3.5 w-3.5" aria-hidden="true">
      <rect x="2.5" y="2.5" width="7" height="7" rx="0.8" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M3 3l6 6M9 3 3 9" strokeLinecap="round" />
    </svg>
  );
}

export default function TopNavigation() {
  const { unit, toggle } = useUnit();
  const { lang, toggle: toggleLang, t } = useLang();
  const { basis, toggle: toggleBasis } = useBasis();
  const location = useLocation();
  const isWindowsDesktop = typeof window !== 'undefined' && window.cometDesktop?.platform === 'win32';
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!isWindowsDesktop) return undefined;

    void window.cometDesktop?.isWindowMaximized?.().then((value) => setIsMaximized(Boolean(value)));
    const unsubscribe = window.cometDesktop?.onWindowStateChanged?.((payload) => {
      setIsMaximized(Boolean(payload.isMaximized));
    });

    return unsubscribe;
  }, [isWindowsDesktop]);

  const activeItem = navigationItems.find((item) => isNavigationPathActive(location.pathname, item.to));

  if (isWindowsDesktop) {
    return (
      <header className="sticky top-0 z-50 hidden lg:block">
        <div className="drag-region relative flex h-[38px] items-center border-b border-[#e5e8eb] bg-white pl-3">
          <div className="flex min-w-0 items-center gap-2">
            <BrandMark className="h-5 w-5 flex-none" />
            <span className="flex-none font-display text-[13px] leading-none text-[#191f28]">
              COMET<span className="font-normal text-[#68727f]">: Catalyst Overall Manufacturing Estimation Tool</span>
            </span>
            {activeItem ? (
              <>
                <span className="h-3.5 w-px bg-[#e5e8eb]" aria-hidden="true" />
                <span className="truncate text-xs font-medium text-[#68727f]">{t(activeItem.label)}</span>
              </>
            ) : null}
          </div>

          <div className="no-drag absolute right-0 top-0 flex h-full items-stretch" role="group" aria-label={t("Window controls")}>
            <button
              type="button"
              onClick={() => window.cometDesktop?.minimizeWindow?.()}
              className="flex w-12 items-center justify-center text-[#68727f] transition hover:bg-[#f2f4f6] hover:text-[#191f28]"
              title={t("Minimize")}
              aria-label={t("Minimize window")}
            >
              <MinimizeIcon />
            </button>

            <button
              type="button"
              onClick={() => window.cometDesktop?.toggleMaximizeWindow?.()}
              className="flex w-12 items-center justify-center text-[#68727f] transition hover:bg-[#f2f4f6] hover:text-[#191f28]"
              title={t(isMaximized ? 'Restore' : 'Maximize')}
              aria-label={t(isMaximized ? 'Restore window' : 'Maximize window')}
            >
              <MaximizeIcon maximized={isMaximized} />
            </button>

            <button
              type="button"
              onClick={() => window.cometDesktop?.closeWindow?.()}
              className="flex w-12 items-center justify-center text-[#68727f] transition hover:bg-[#f04452] hover:text-white"
              title={t("Close")}
              aria-label={t("Close window")}
            >
              <CloseIcon />
            </button>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 px-3 pb-2 pt-2 sm:px-4 lg:hidden">
      <div className="surface-card-soft overflow-hidden">
        <div className="drag-region border-b border-[#e5e8eb] px-4 pb-1.5 pt-[calc(env(titlebar-area-height,0px)+8px)]">
          <div className="flex items-center justify-between gap-3">
            <div className="cp-subtle-label">{t('Desktop Window')}</div>
            <div className="hidden h-6 w-28 rounded-full border border-[#e5e8eb] bg-[#f9fafb] xl:block" />
          </div>
        </div>

        <div className="no-drag px-4 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center">
                <BrandMark className="h-10 w-10" />
              </div>

              <div className="min-w-0">
                <div className="font-display text-[1.45rem] leading-none text-[#191f28]">COMET</div>
                <div className="mt-0.5 text-xs text-[#68727f]">{t('Evidence-first catalyst costing')}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={toggle}
              className="flex items-center gap-1 rounded-full border border-[#e5e8eb] bg-[#f2f4f6] p-1"
              title={t("Toggle output units")}
              aria-label={`${t('Toggle output units')}, ${t('currently')} ${unit}`}
              aria-pressed={unit === 'lb'}
            >
              <span
                aria-hidden="true"
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  unit === 'kg' ? 'bg-white text-[#191f28] shadow-[0_1px_3px_rgba(15,23,42,0.06)]' : 'text-[#5f6b7a]'
                }`}
              >
                kg
              </span>
              <span
                aria-hidden="true"
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  unit === 'lb' ? 'bg-white text-[#191f28] shadow-[0_1px_3px_rgba(15,23,42,0.06)]' : 'text-[#5f6b7a]'
                }`}
              >
                lb
              </span>
            </button>
            <button
              type="button"
              onClick={toggleLang}
              className="flex items-center gap-1 rounded-full border border-[#e5e8eb] bg-[#f2f4f6] p-1"
              title={t("Toggle language")}
              aria-label={`${t('Toggle language')}, ${t('currently')} ${t(lang === 'en' ? 'English' : 'Korean')}`}
              aria-pressed={lang === 'ko'}
            >
              <span
                aria-hidden="true"
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  lang === 'en' ? 'bg-white text-[#191f28] shadow-[0_1px_3px_rgba(15,23,42,0.06)]' : 'text-[#5f6b7a]'
                }`}
              >
                EN
              </span>
              <span
                aria-hidden="true"
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  lang === 'ko' ? 'bg-white text-[#191f28] shadow-[0_1px_3px_rgba(15,23,42,0.06)]' : 'text-[#5f6b7a]'
                }`}
              >
                한국어
              </span>
            </button>
            <button
              type="button"
              onClick={toggleBasis}
              className="flex items-center gap-1 rounded-full border border-[#e5e8eb] bg-[#f2f4f6] p-1"
              title={t("Price basis: live quotes for practical work, monthly averages for academic work")}
              aria-label={`${t('Toggle price basis')}, ${t('currently')} ${t(basis === 'live' ? 'live quotes' : 'monthly averages')}`}
              aria-pressed={basis === 'reference'}
            >
              <span
                aria-hidden="true"
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  basis === 'live' ? 'bg-white text-[#191f28] shadow-[0_1px_3px_rgba(15,23,42,0.06)]' : 'text-[#5f6b7a]'
                }`}
              >
                {t('Live')}
              </span>
              <span
                aria-hidden="true"
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  basis === 'reference' ? 'bg-white text-[#191f28] shadow-[0_1px_3px_rgba(15,23,42,0.06)]' : 'text-[#5f6b7a]'
                }`}
              >
                {t('Monthly avg')}
              </span>
            </button>
          </div>

          <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {navigationItems.map((item) => {
              const isActive = isNavigationPathActive(location.pathname, item.to);

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`group flex min-w-[164px] items-center gap-3 rounded-[14px] border px-3.5 py-2.5 transition ${
                    isActive
                      ? 'border-[#0d9488] bg-[#e6f5f2]'
                      : 'border-[#e5e8eb] bg-white hover:border-[#d1d6db] hover:bg-[#f9fafb]'
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 flex-none items-center justify-center rounded-[12px] transition ${
                      isActive
                        ? 'bg-[#0f766e] text-white'
                        : 'bg-[#f2f4f6] text-[#68727f] group-hover:text-[#4e5968]'
                    }`}
                  >
                    <item.Icon className="h-[18px] w-[18px]" />
                  </div>

                  <div className="truncate text-sm font-bold text-[#191f28]">{t(item.label)}</div>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
