"use client";

import { useState } from "react";
import DemoBeforeAfter from "./DemoBeforeAfter";

export default function DemoSectionWithReset() {
  const [resetKey, setResetKey] = useState(0);
  return (
    <div className="relative">
      <DemoBeforeAfter key={resetKey} />
      <div className="flex justify-center mt-6">
        <button
          type="button"
          onClick={() => setResetKey((k) => k + 1)}
          className="btn-ghost text-sm py-2 px-4 min-h-0 h-auto font-medium text-[var(--muted)] hover:text-[var(--text)]"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
