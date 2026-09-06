/* eslint-disable react-refresh/only-export-components */
import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLang } from '../../lib/i18n';

export type WorkspaceSection = {
  id: string;
  label: string;
  summary: string;
};

export function useWorkspaceSections(sections: WorkspaceSection[], queryKey: string) {
  if (sections.length === 0) {
    throw new Error('useWorkspaceSections requires at least one section');
  }
  const [searchParams, setSearchParams] = useSearchParams();
  const sectionIds = useMemo(() => sections.map((section) => section.id), [sections]);
  const rawValue = searchParams.get(queryKey);
  const activeSectionId = rawValue && sectionIds.includes(rawValue) ? rawValue : sections[0]!.id;
  const activeIndex = Math.max(0, sectionIds.indexOf(activeSectionId));
  // Safe: activeIndex is clamped to [0, sections.length-1] and sections is non-empty.
  const activeSection: WorkspaceSection = sections[activeIndex] ?? sections[0]!;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeSectionId]);

  function setActiveSection(id: string) {
    if (!sectionIds.includes(id)) return;
    const next = new URLSearchParams(searchParams);
    next.set(queryKey, id);
    setSearchParams(next);
  }

  function goPrevious() {
    if (activeIndex <= 0) return;
    setActiveSection(sectionIds[activeIndex - 1]!);
  }

  function goNext() {
    if (activeIndex >= sectionIds.length - 1) return;
    setActiveSection(sectionIds[activeIndex + 1]!);
  }

  return {
    activeIndex,
    activeSection,
    activeSectionId,
    canGoPrevious: activeIndex > 0,
    canGoNext: activeIndex < sectionIds.length - 1,
    goNext,
    goPrevious,
    setActiveSection,
  };
}

type WorkspaceSectionNavProps = {
  sections: WorkspaceSection[];
  activeSectionId: string;
  activeIndex: number;
  onSelect: (id: string) => void;
  disabledSectionIds?: string[];
};

function StepCheckIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-3 w-3" aria-hidden="true">
      <path d="M2.5 6.5 5 9l4.5-5.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function WorkspaceSectionNav({
  sections,
  activeSectionId,
  activeIndex,
  onSelect,
  disabledSectionIds = [],
}: WorkspaceSectionNavProps) {
  const { t } = useLang();
  if (sections.length === 0) return null;
  const activeSection: WorkspaceSection = sections[activeIndex] ?? sections[0]!;

  return (
    <section className="surface-card-soft flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <nav aria-label={t("Workflow steps")} className="flex flex-wrap items-center gap-1">
        {sections.map((section, index) => {
          const active = section.id === activeSectionId;
          const done = index < activeIndex;
          const disabled = !active && disabledSectionIds.includes(section.id);
          return (
            <div key={section.id} className="flex items-center">
              {index > 0 ? <div className="mx-1.5 h-px w-4 bg-[#e5e8eb]" aria-hidden="true" /> : null}
              <button
                type="button"
                onClick={() => !disabled && onSelect(section.id)}
                disabled={disabled}
                aria-current={active ? 'step' : undefined}
                className={`flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 transition ${
                  active
                    ? 'bg-[#eef8f5]'
                    : disabled
                      ? 'cursor-not-allowed opacity-45'
                      : 'hover:bg-[#f4f6f8]'
                }`}
              >
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold ${
                    active
                      ? 'bg-[#0f766e] text-white'
                      : done
                        ? 'bg-[#191f28] text-white'
                        : 'bg-[#f2f4f6] text-[#5f6b7a]'
                  }`}
                >
                  {done ? <StepCheckIcon /> : index + 1}
                </span>
                <span
                  className={`text-sm ${
                    active ? 'font-semibold text-[#191f28]' : done ? 'font-medium text-[#4e5968]' : 'font-medium text-[#68727f]'
                  }`}
                >
                  {t(section.label)}
                </span>
              </button>
            </div>
          );
        })}
      </nav>

      <div className="hidden max-w-[320px] truncate text-xs text-[#68727f] xl:block">{activeSection ? t(activeSection.summary) : null}</div>
    </section>
  );
}

type WorkspaceSectionFooterProps = {
  activeSection: WorkspaceSection;
  activeIndex: number;
  totalSections: number;
  onPrevious: () => void;
  onNext: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
};

export function WorkspaceSectionFooter({
  activeSection,
  activeIndex,
  totalSections,
  onPrevious,
  onNext,
  canGoPrevious,
  canGoNext,
}: WorkspaceSectionFooterProps) {
  const { lang, t } = useLang();
  return (
    <section className="surface-card-soft mt-auto flex items-center justify-between gap-4 px-4 py-2.5">
      <div className="min-w-0 truncate text-sm text-[#68727f]">
        {lang === 'ko'
          ? `${activeIndex + 1}/${totalSections} 단계`
          : `Step ${activeIndex + 1} of ${totalSections}`}
        <span className="mx-1.5 text-[#68727f]">·</span>
        <span className="font-medium text-[#4e5968]">{t(activeSection.label)}</span>
      </div>

      <div className="flex flex-none gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={!canGoPrevious}
          className="cp-button-secondary px-4 disabled:opacity-35"
        >
          {t('Back')}
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canGoNext}
          className="cp-button-primary px-5 disabled:opacity-35"
        >
          {t('Next')}
        </button>
      </div>
    </section>
  );
}
