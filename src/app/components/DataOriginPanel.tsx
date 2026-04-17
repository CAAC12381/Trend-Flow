import type { DataOriginMeta, DataQuality } from "../lib/api";

const qualityStyles: Record<
  DataQuality,
  { badge: string; labelEs: string; labelEn: string }
> = {
  real: {
    badge: "border-emerald-400/25 bg-emerald-500/10 text-emerald-100",
    labelEs: "Real",
    labelEn: "Real",
  },
  estimated: {
    badge: "border-amber-400/25 bg-amber-500/10 text-amber-100",
    labelEs: "Estimado",
    labelEn: "Estimated",
  },
  heuristic: {
    badge: "border-cyan-400/25 bg-cyan-500/10 text-cyan-100",
    labelEs: "Heuristico",
    labelEn: "Heuristic",
  },
};

export function DataOriginPanel({
  title,
  meta,
  language,
  compact = false,
}: {
  title: string;
  meta?: DataOriginMeta;
  language: "es" | "en";
  compact?: boolean;
}) {
  if (!meta) {
    return null;
  }

  return (
    <section className="rounded-[24px] border border-white/15 bg-white/[0.05] p-4 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-white/40">
            {title}
          </div>
          <p className="mt-2 text-sm text-white/70">{meta.narrative}</p>
        </div>
      </div>

      <div className={`mt-4 grid gap-3 ${compact ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-3"}`}>
        {meta.sections.map((section) => {
          const style = qualityStyles[section.quality];
          return (
            <div
              key={`${section.label}-${section.source}`}
              className="rounded-[18px] border border-white/10 bg-white/[0.04] p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-white/92">
                  {section.label}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${style.badge}`}
                >
                  {language === "en" ? style.labelEn : style.labelEs}
                </span>
              </div>
              <div className="mt-2 text-xs text-white/45">{section.source}</div>
              <p className="mt-3 text-sm text-white/68">{section.description}</p>
              {section.updatedAt && (
                <div className="mt-3 text-xs text-white/42">
                  {language === "en" ? "Updated" : "Actualizado"}:{" "}
                  {new Date(section.updatedAt).toLocaleString(
                    language === "en" ? "en-US" : "es-MX",
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {meta.methodology.length > 0 && (
        <div className="mt-4 rounded-[18px] border border-white/10 bg-[#111522]/60 p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-white/40">
            {language === "en" ? "Methodology" : "Metodologia"}
          </div>
          <div className="mt-3 space-y-2">
            {meta.methodology.map((item) => (
              <p key={item} className="text-sm text-white/68">
                - {item}
              </p>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
