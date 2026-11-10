/**
 * Renders admin-edited page text safely (no HTML): blank-line paragraphs, "## " headings,
 * "- " bullet lists and "1. " numbered lists. React escapes all text content.
 */
export function SimpleText({ text, lang }: { text: string; lang?: string }) {
  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return (
    <div className="prose-legal" lang={lang}>
      {blocks.map((b, i) => {
        const lines = b.split("\n").filter(Boolean);
        if (lines.length && lines.every((l) => l.startsWith("- "))) {
          return <ul key={i}>{lines.map((l, j) => <li key={j}>{l.slice(2)}</li>)}</ul>;
        }
        if (lines.length && lines.every((l) => /^\d+\.\s/.test(l))) {
          return <ol key={i} className="mb-3 list-decimal pl-6 text-slate-700">{lines.map((l, j) => <li key={j}>{l.replace(/^\d+\.\s/, "")}</li>)}</ol>;
        }
        return (
          <div key={i}>
            {lines.map((l, j) =>
              l.startsWith("## ") ? <h2 key={j}>{l.slice(3)}</h2> : l.startsWith("- ") ? <ul key={j}><li>{l.slice(2)}</li></ul> : <p key={j}>{l}</p>,
            )}
          </div>
        );
      })}
    </div>
  );
}
