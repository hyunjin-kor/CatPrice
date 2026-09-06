import { NavLink, useLocation } from 'react-router-dom';
import { useLang } from '../../lib/i18n';
import { useBasis } from '../../lib/use-basis';
import { useUnit } from '../../lib/use-unit';
import BrandMark from './BrandMark';
import { isNavigationPathActive, navigationItems } from './navigation';

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      className={`h-4 w-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
      aria-hidden="true"
    >
      <path d="M9.5 4.5 6 8l3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.5 4.5 9 8l3.5 3.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.45" />
    </svg>
  );
}

type SidebarProps = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

export default function Sidebar({ collapsed, onToggleCollapsed }: SidebarProps) {
  const { unit, toggle } = useUnit();
  const { lang, toggle: toggleLang, t } = useLang();
  const { basis, toggle: toggleBasis } = useBasis();
  const basisTitle = 'Price basis: live quotes for practical work, monthly averages for academic work (click to switch)';
  const location = useLocation();
  const hasTitlebar = typeof window !== 'undefined' && window.cometDesktop?.platform === 'win32';

  return (
    <aside className="hidden lg:block">
      <div className={`surface-rail sticky overflow-hidden ${hasTitlebar ? 'top-[46px]' : 'top-2'} ${collapsed ? 'p-2' : 'p-3'}`}>
        <div className="flex flex-col gap-5">
          <div className={collapsed ? 'flex flex-col items-center gap-2 pt-1.5' : 'flex items-center gap-2.5 px-1.5 pt-1.5'}>
            <BrandMark className="h-9 w-9 flex-none" />
            {collapsed ? null : (
              <div className="min-w-0 flex-1">
                <div className="font-display text-[1.2rem] leading-none text-[#191f28]">COMET</div>
                <div className="mt-1 text-xs text-[#68727f]">{t('Catalyst cost estimator')}</div>
              </div>
            )}
            <button
              type="button"
              onClick={onToggleCollapsed}
              className="no-drag flex h-7 w-7 flex-none items-center justify-center rounded-[8px] text-[#8b95a1] transition hover:bg-[#f2f4f6] hover:text-[#4e5968]"
              title={t(collapsed ? 'Expand sidebar' : 'Collapse sidebar')}
              aria-label={t(collapsed ? 'Expand sidebar' : 'Collapse sidebar')}
              aria-expanded={!collapsed}
            >
              <CollapseIcon collapsed={collapsed} />
            </button>
          </div>

          <nav className="space-y-0.5">
            {navigationItems.map((item) => {
              const isActive = isNavigationPathActive(location.pathname, item.to);

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  aria-current={isActive ? 'page' : undefined}
                  title={collapsed ? t(item.label) : undefined}
                  className={`group relative flex items-center rounded-[10px] transition ${
                    collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'
                  } ${isActive ? 'bg-[#eef8f5]' : 'hover:bg-[#f4f6f7]'}`}
                >
                  {isActive ? (
                    <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-[#0d9488]" aria-hidden="true" />
                  ) : null}
                  <item.Icon
                    className={`h-[18px] w-[18px] flex-none transition ${
                      isActive ? 'text-[#0d9488]' : 'text-[#8b95a1] group-hover:text-[#68727f]'
                    }`}
                  />
                  {collapsed ? (
                    <span className="sr-only">{t(item.label)}</span>
                  ) : (
                    <div
                      className={`min-w-0 truncate text-sm transition ${
                        isActive ? 'font-semibold text-[#0f766e]' : 'font-medium text-[#4e5968] group-hover:text-[#191f28]'
                      }`}
                    >
                      {t(item.label)}
                    </div>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {collapsed ? (
            <div className="flex flex-col items-center gap-2 border-t border-[#f2f4f6] pb-1 pt-3">
              <button
                type="button"
                onClick={toggle}
                className="no-drag flex h-8 w-10 items-center justify-center rounded-full bg-[#eef1f2] text-xs font-semibold text-[#0f766e] transition hover:bg-[#e6f5f2]"
                title={`${t('Display unit')}: ${unit} (${t('click to switch')})`}
                aria-label={`${t('Toggle output units')}, ${t('currently')} ${unit}`}
                aria-pressed={unit === 'lb'}
              >
                {unit}
              </button>
              <button
                type="button"
                onClick={toggleLang}
                className="no-drag flex h-8 w-10 items-center justify-center rounded-full bg-[#eef1f2] text-xs font-semibold text-[#0f766e] transition hover:bg-[#e6f5f2]"
                title={`${t('Language')}: ${t(lang === 'en' ? 'English' : 'Korean')} (${t('click to switch')})`}
                aria-label={`${t('Toggle language')}, ${t('currently')} ${t(lang === 'en' ? 'English' : 'Korean')}`}
                aria-pressed={lang === 'ko'}
              >
                {lang === 'en' ? 'EN' : '한'}
              </button>
              <button
                type="button"
                onClick={toggleBasis}
                className="no-drag flex h-8 w-10 items-center justify-center rounded-full bg-[#eef1f2] text-xs font-semibold text-[#0f766e] transition hover:bg-[#e6f5f2]"
                title={basisTitle}
                aria-label={`${t('Toggle price basis')}, ${t('currently')} ${t(basis === 'live' ? 'live quotes' : 'monthly averages')}`}
                aria-pressed={basis === 'reference'}
              >
                {basis === 'live' ? t('Live') : t('Monthly avg')}
              </button>
            </div>
          ) : (
            <div className="space-y-3 border-t border-[#f2f4f6] px-1.5 pb-1 pt-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-medium text-[#68727f]">{t('Display unit')}</div>

                <button
                  type="button"
                  onClick={toggle}
                  className="no-drag flex items-center rounded-full bg-[#eef1f2] p-0.5"
                  title={t("Toggle output units")}
                  aria-label={`${t('Toggle output units')}, ${t('currently')} ${unit}`}
                  aria-pressed={unit === 'lb'}
                >
                  <span
                    aria-hidden="true"
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      unit === 'kg' ? 'bg-[#0f766e] text-white' : 'text-[#5f6b7a]'
                    }`}
                  >
                    kg
                  </span>
                  <span
                    aria-hidden="true"
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      unit === 'lb' ? 'bg-[#0f766e] text-white' : 'text-[#5f6b7a]'
                    }`}
                  >
                    lb
                  </span>
                </button>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-medium text-[#68727f]">{t('Language')}</div>

                <button
                  type="button"
                  onClick={toggleLang}
                  className="no-drag flex items-center rounded-full bg-[#eef1f2] p-0.5"
                  title={t("Toggle language")}
                  aria-label={`${t('Toggle language')}, ${t('currently')} ${t(lang === 'en' ? 'English' : 'Korean')}`}
                  aria-pressed={lang === 'ko'}
                >
                  <span
                    aria-hidden="true"
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      lang === 'en' ? 'bg-[#0f766e] text-white' : 'text-[#5f6b7a]'
                    }`}
                  >
                    EN
                  </span>
                  <span
                    aria-hidden="true"
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      lang === 'ko' ? 'bg-[#0f766e] text-white' : 'text-[#5f6b7a]'
                    }`}
                  >
                    한국어
                  </span>
                </button>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-medium text-[#68727f]">{t('Price basis')}</div>

                <button
                  type="button"
                  onClick={toggleBasis}
                  className="no-drag flex items-center rounded-full bg-[#eef1f2] p-0.5"
                  title={basisTitle}
                  aria-label={`${t('Toggle price basis')}, ${t('currently')} ${t(basis === 'live' ? 'live quotes' : 'monthly averages')}`}
                  aria-pressed={basis === 'reference'}
                >
                  <span
                    aria-hidden="true"
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      basis === 'live' ? 'bg-[#0f766e] text-white' : 'text-[#5f6b7a]'
                    }`}
                  >
                    {t('Live')}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      basis === 'reference' ? 'bg-[#0f766e] text-white' : 'text-[#5f6b7a]'
                    }`}
                  >
                    {t('Monthly avg')}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
