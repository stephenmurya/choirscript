"use client";

import Link from "next/link";

type PrintToolbarProps = {
  songId: string;
  blackAndWhite: boolean;
  onBlackAndWhiteChange: (value: boolean) => void;
};

export function PrintToolbar({
  songId,
  blackAndWhite,
  onBlackAndWhiteChange,
}: PrintToolbarProps) {
  function handlePrint() {
    // MVP uses the browser print dialog. Server-side PDF rendering can be added
    // later with a dedicated PDF service or a Node/Docker rendering service.
    window.print();
  }

  return (
    <div className="no-print sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-3 py-3 backdrop-blur sm:px-4">
      <div className="mx-auto flex max-w-[900px] flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Rehearsal View
          </p>
          <h1 className="text-lg font-semibold text-slate-950">ChoirScript</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex min-h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={blackAndWhite}
              onChange={(event) => onBlackAndWhiteChange(event.target.checked)}
              className="h-4 w-4 accent-cyan-700"
            />
            Simple B&W
          </label>
          <Link
            href={`/songs/${songId}`}
            className="min-h-11 rounded-md border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Back to Editor
          </Link>
          <button
            type="button"
            onClick={handlePrint}
            className="min-h-11 rounded-md bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-800"
          >
            {blackAndWhite ? "Print Simple PDF" : "Color PDF / Print"}
          </button>
        </div>
      </div>
      <p className="mx-auto mt-2 max-w-[900px] text-xs text-slate-500">
        For colorful PDFs, enable Background graphics in the browser print dialog if needed.
      </p>
    </div>
  );
}
