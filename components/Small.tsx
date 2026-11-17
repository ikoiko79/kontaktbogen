'use client';

import { useState } from 'react';

export function CopyButton({ text, label = 'Kopieren' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn small ghost"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1600);
      }}
    >
      {done ? 'Kopiert' : label}
    </button>
  );
}

// Absende-Knopf, der vor dem Löschen nachfragt.
export function ConfirmButton({ question, className, children }: { question: string; className?: string; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(question)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
