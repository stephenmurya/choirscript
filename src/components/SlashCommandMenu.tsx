"use client";

export type SlashCommand = {
  id: string;
  label: string;
  description?: string;
  shortcut?: string;
  action: () => void;
};

type SlashCommandMenuProps = {
  commands: SlashCommand[];
};

export function SlashCommandMenu({ commands }: SlashCommandMenuProps) {
  return (
    <div
      data-slash-menu="true"
      className="absolute left-0 top-10 z-40 w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-200/80"
      role="menu"
      aria-label="Slash commands"
    >
      <p className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        Commands
      </p>
      {commands.map((command) => (
        <button
          key={command.id}
          type="button"
          role="menuitem"
          onClick={command.action}
          className="w-full rounded-lg px-2.5 py-2 text-left transition hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
        >
          <span className="block text-sm font-semibold text-slate-900">{command.label}</span>
          {command.description ? (
            <span className="mt-0.5 block text-xs text-slate-500">{command.description}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
