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
      className="shrink-0 rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
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
    <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6">
      <div>
        <label htmlFor="dest-url" className="block text-sm font-medium text-slate-700">
          Destination URL
        </label>
        <input
          id="dest-url"
          type="url"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="https://YOURPROJECT.supabase.co/auth/v1/verify?token=...&type=recovery"
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>
      <div>
        <label htmlFor="rail-base" className="block text-sm font-medium text-slate-700">
          Rail base URL (your domain)
        </label>
        <input
          id="rail-base"
          type="url"
          value={railBase}
          onChange={(e) => setRailBase(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>
      {railLink && (
        <>
          <div>
            <label className="block text-sm font-medium text-slate-700">Protected link</label>
            <div className="mt-1 flex gap-2">
              <code className="flex-1 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 break-all">
                {railLink}
              </code>
              <CopyButton text={railLink} label="Copy link" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Supabase template snippet
            </label>
            <div className="mt-1 flex gap-2">
              <pre className="flex-1 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 whitespace-pre-wrap">
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
