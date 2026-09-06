import { useState } from 'react';
import { exportEstimateCsv, exportEstimateJson } from '../../lib/api';
import { useLang } from '../../lib/i18n';

type ExportFormat = 'json' | 'csv';

type ExportButtonProps = {
  estimateId: number | null;
  fileStem?: string;
  className?: string;
  disabled?: boolean;
};

function downloadBlob(content: BlobPart, type: string, filename: string) {
  const blob = new Blob([content], { type });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

function sanitizeFileStem(value: string) {
  return value.trim().replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') || 'comet-estimate';
}

export default function ExportButton({
  estimateId,
  fileStem = 'comet-estimate',
  className = '',
  disabled = false,
}: ExportButtonProps) {
  const { t } = useLang();
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [error, setError] = useState('');

  const blocked = disabled || estimateId == null;
  const baseName = sanitizeFileStem(fileStem);

  async function handleExport(format: ExportFormat) {
    if (blocked || estimateId == null) return;
    setError('');
    setExporting(format);
    try {
      if (format === 'json') {
        const payload = await exportEstimateJson(estimateId);
        downloadBlob(
          JSON.stringify(payload, null, 2),
          'application/json;charset=utf-8',
          `${baseName}-${estimateId}.json`,
        );
      } else {
        const payload = await exportEstimateCsv(estimateId);
        downloadBlob(payload, 'text/csv;charset=utf-8', `${baseName}-${estimateId}.csv`);
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Export failed');
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className={`space-y-2 ${className}`.trim()}>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleExport('json')}
          disabled={blocked || exporting !== null}
          className="cp-button-secondary px-3 py-2 text-sm disabled:opacity-35"
        >
          {t(exporting === 'json' ? 'Exporting JSON...' : 'Export JSON')}
        </button>
        <button
          type="button"
          onClick={() => void handleExport('csv')}
          disabled={blocked || exporting !== null}
          className="cp-button-primary px-3 py-2 text-sm disabled:opacity-35"
        >
          {t(exporting === 'csv' ? 'Exporting CSV...' : 'Export CSV')}
        </button>
      </div>
      {error ? (
        <div className="rounded-[16px] border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
          {t(error)}
        </div>
      ) : null}
    </div>
  );
}
