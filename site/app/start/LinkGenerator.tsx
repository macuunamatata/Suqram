"use client";

import { useState, useCallback } from "react";
import { RAIL_BASE_DEFAULT } from "@/lib/constants";

function generateRailLink(destination: string, railBase: string): string {
  const rid = crypto.randomUUID();
  const encoded = encodeURIComponent(destination.trim());
  const base = railBase.replace(/\/$/, "");
  return `${base}/r/${rid}#u=${encoded}`;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);
  return (
    <button
      type="button"
      onClick={copy}
      className="btn-secondary shrink-0 px-3 py-2 text-sm"
    >
      {copied ? "Copied" : label}
    </button>
  );
}

export default function LinkGenerator() {
  const [destination, setDestination] = useState("");
  const [railBase, setRailBase] = useState(RAIL_BASE_DEFAULT);
  const railLink = destination.trim()
    ? generateRailLink(destination, railBase)
    : "";
  const base = railBase.replace(/\/$/, "");
  const snippet = railLink
    ? `const rid = crypto.randomUUID();\nconst destination = '{{ .ConfirmationURL }}';\nconst railLink = \`${base}/r/\${rid}#u=\${encodeURIComponent(destination)}\`;`
    : "";

  return (
    <div className="card card-gradient-top space-y-6 p-6">
      <div>
        <label htmlFor="dest-url" className="block text-sm font-medium text-[var(--text)]">
          Destination URL
        </label>
        <input
          id="dest-url"
          type="url"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="https://YOURPROJECT.supabase.co/auth/v1/verify?token=...&type=recovery"
          className="input-base mt-2"
        />
      </div>
      <div>
        <label htmlFor="rail-base" className="block text-sm font-medium text-[var(--text)]">
          Rail base URL (your domain)
        </label>
        <input
          id="rail-base"
          type="url"
          value={railBase}
          onChange={(e) => setRailBase(e.target.value)}
          className="input-base mt-2"
        />
      </div>
      {railLink && (
        <>
          <div>
            <label className="block text-sm font-medium text-[var(--text)]">Protected link</label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start">
              <code className="input-base flex-1 break-all px-4 py-3 font-mono text-sm">
                {railLink}
              </code>
              <CopyButton text={railLink} label="Copy link" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text)]">
              Supabase template snippet
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start">
              <pre className="input-base flex-1 overflow-x-auto whitespace-pre-wrap p-4 font-mono text-xs">
                {snippet}
              </pre>
              <CopyButton text={snippet} label="Copy snippet" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
