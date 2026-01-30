import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Control link result — Auth Link Rail",
  description: "Outcome: control link already used or worked.",
};

export default function TestControlResultPage({
  searchParams,
}: {
  searchParams: { tid?: string; used?: string };
}) {
  const used = searchParams?.used === "1";
  const tid = searchParams?.tid ?? "";
  const ts = new Date().toISOString();

  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <div
        className={`rounded-2xl border-2 p-10 ${
          used
            ? "border-amber-300 bg-amber-50"
            : "border-green-300 bg-green-50"
        }`}
      >
        <h1
          className={`text-2xl font-bold sm:text-3xl ${
            used ? "text-amber-800" : "text-green-800"
          }`}
        >
          {used
            ? "Control link already used"
            : "Control link worked (first click)"}
        </h1>
        <p className="mt-4 text-slate-600">
          {used
            ? "This link was already used — likely by an email scanner before you clicked."
            : "You were the first to click this link. In a corporate inbox, scanners often hit it first."}
        </p>
        <p className="mt-6 text-sm text-slate-500">
          {ts}
          {tid ? ` · Test ID: ${tid}` : ""}
        </p>
      </div>
      <p className="mt-8">
        <a href="/live-test" className="text-sky-600 hover:text-sky-700">
          Run another live inbox test →
        </a>
      </p>
    </div>
  );
}
