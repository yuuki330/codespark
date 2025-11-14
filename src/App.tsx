import React, { useEffect, useMemo, useRef, useState } from "react";

type Snippet = {
  id: string;
  title: string;
  body: string;
  tags: string[];
};

// 仮のスニペットデータ（あとで増やしていけばOK）
const initialSnippets: Snippet[] = [
  {
    id: "1",
    title: "ログ出力（Python）",
    body: 'import logging\nlogger = logging.getLogger(__name__)\nlogger.info("Hello CodeSpark")',
    tags: ["python", "logging"],
  },
  {
    id: "2",
    title: "fetch wrapper（TypeScript）",
    body: "export async function apiGet<T>(path: string): Promise<T> {\n  const res = await fetch(path);\n  if (!res.ok) throw new Error(`Request failed: ${res.status}`);\n  return res.json();\n}",
    tags: ["typescript", "fetch"],
  },
];

// クリップボードにコピーするヘルパー
async function copyToClipboard(text: string) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      console.log("Copied to clipboard");
    } catch (err) {
      console.error("Failed to copy:", err);
      alert("クリップボードへのコピーに失敗しました");
    }
  } else {
    console.warn("Clipboard API not available");
    alert("この環境では自動コピーが使えません。手動でコピーしてください。");
  }
}

const App: React.FC = () => {
  // 検索キーワード
  const [query, setQuery] = useState("");
  // 今は initialSnippets をそのまま使う（今後ここを差し替えていくイメージ）
  const [snippets] = useState<Snippet[]>(initialSnippets);
  // クリックされたスニペット（背景色を一瞬変える用）
  const [clickedId, setClickedId] = useState<string | null>(null);
  // 初期フォーカス用
  const inputRef = useRef<HTMLInputElement | null>(null);

  // 検索キーワードに応じたフィルタリング
  const filteredSnippets = useMemo(() => {
    const kw = query.trim().toLowerCase();
    if (!kw) return snippets;
    return snippets.filter((s) => {
      return (
        s.title.toLowerCase().includes(kw) ||
        s.tags.some((t) => t.toLowerCase().includes(kw)) ||
        s.body.toLowerCase().includes(kw)
      );
    });
  }, [query, snippets]);

  // 初回レンダー時に検索バーにフォーカス
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // スニペットをクリックしたときの処理
  const handleClickSnippet = async (snippet: Snippet) => {
    setClickedId(snippet.id);
    await copyToClipboard(snippet.body);
    // コピーされたことが分かるように、少しだけハイライトを残す
    setTimeout(() => {
      setClickedId((prev) => (prev === snippet.id ? null : prev));
    }, 180);
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at top, #1e293b, #020617)",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        color: "#e5e7eb",
      }}
    >
      <div
        style={{
          width: "640px",
          maxWidth: "90vw",
          background: "rgba(15, 23, 42, 0.9)",
          borderRadius: "18px",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
          padding: "16px 20px 12px",
          border: "1px solid rgba(148, 163, 184, 0.3)",
          backdropFilter: "blur(12px)",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: "18px",
                fontWeight: 600,
                letterSpacing: "0.04em",
              }}
            >
              CodeSpark
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "#9ca3af",
              }}
            >
              Local snippet launcher (React prototype)
            </div>
          </div>
          <div
            style={{
              fontSize: "11px",
              borderRadius: "999px",
              border: "1px solid rgba(148, 163, 184, 0.5)",
              padding: "4px 8px",
              color: "#e5e7eb",
              opacity: 0.7,
            }}
          >
            ⌘⇧Space
          </div>
        </div>

        {/* Search */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 10px",
            borderRadius: "12px",
            background: "#020617",
            border: "1px solid rgba(55, 65, 81, 0.8)",
          }}
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Search snippets…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#e5e7eb",
              fontSize: "13px",
            }}
          />
        </div>

        {/* List */}
        <div
          style={{
            marginTop: "4px",
            maxHeight: "260px",
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {filteredSnippets.length === 0 ? (
            <div
              style={{
                fontSize: "12px",
                color: "#6b7280",
                padding: "12px 4px",
              }}
            >
              No snippets found.
            </div>
          ) : (
            filteredSnippets.map((s) => {
              const isClicked = clickedId === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => handleClickSnippet(s)}
                  style={{
                    padding: "8px 8px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    transition:
                      "background 120ms ease-out, transform 80ms ease-out",
                    background: isClicked
                      ? "rgba(22, 163, 74, 0.55)"
                      : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isClicked) {
                      e.currentTarget.style.background =
                        "rgba(30, 64, 175, 0.55)";
                      e.currentTarget.style.transform = "translateY(-1px)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isClicked) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.transform = "translateY(0)";
                    }
                  }}
                >
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 500,
                      marginBottom: "2px",
                    }}
                  >
                    {s.title}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "6px",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    {s.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: "10px",
                          padding: "2px 6px",
                          borderRadius: "999px",
                          background: "rgba(31, 41, 55, 0.9)",
                          color: "#9ca3af",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#9ca3af",
                      marginTop: "4px",
                    }}
                  >
                    {s.body.replace(/\s+/g, " ").slice(0, 80)}…
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
