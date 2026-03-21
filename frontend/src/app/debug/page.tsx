"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getDebugMatch } from "@/lib/api";
import { TopBar } from "@/components/TopBar";

interface DebugMeta {
  openai_key_set: boolean;
  api_call_ok: boolean;
  ai_scored: number;
  mock_scored: number;
  model: string;
  supabase_connected: boolean;
  prefilter_top_k: number;
  candidates_total: number;
  prefilter_skipped: boolean;
  candidates_prefiltered: number;
  embeddings_cached: number;
  embeddings_computed: number;
}

interface MatchEntry {
  id: string;
  name: string;
  match_score: number;
  match_type: string;
  ai_source: string;
  background: string;
}

interface DebugResponse {
  user_id: string;
  debug: DebugMeta;
  tribe_list: MatchEntry[];
}

const USER_IDS = Array.from({ length: 15 }, (_, i) =>
  `usr_${String(i + 1).padStart(3, "0")}`
);

function StatusCard({
  label,
  value,
  detail,
  ok,
}: {
  label: string;
  value: string | number;
  detail: string;
  ok: boolean;
}) {
  return (
    <div
      style={{
        background: ok ? "var(--green-lt)" : "#FAE8E0",
        border: `1px solid ${ok ? "rgba(90,122,92,.2)" : "rgba(196,122,106,.2)"}`,
        borderRadius: "var(--radius-sm)",
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "var(--text-3)",
          textTransform: "uppercase",
          letterSpacing: ".07em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-instrument-serif), serif",
          fontSize: 24,
          marginTop: 4,
          lineHeight: 1,
          color: ok ? "var(--green)" : "var(--red-soft)",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "var(--text-3)",
          marginTop: 3,
          fontWeight: 300,
        }}
      >
        {detail}
      </div>
    </div>
  );
}

function AiSourceBadge({ source }: { source: string }) {
  const isAi = source === "gpt-4o";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 100,
        fontSize: 11,
        fontWeight: 600,
        background: isAi ? "var(--green-lt)" : "#FAE8D0",
        color: isAi ? "var(--green)" : "var(--amber)",
      }}
    >
      {source}
    </span>
  );
}

export default function DebugPage() {
  const router = useRouter();
  const [selectedUser, setSelectedUser] = useState(USER_IDS[0]);
  const [data, setData] = useState<DebugResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runMatch() {
    setLoading(true);
    setError(null);
    try {
      const res = await getDebugMatch(selectedUser);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        background: "var(--cream)",
        minHeight: "100dvh",
        paddingBottom: 32,
      }}
    >
      <TopBar
        title="Debug: AI Match Audit"
        subtitle="Source verification"
        onBack={() => router.push("/")}
      />

      {/* Controls */}
      <div
        style={{
          padding: "16px 16px 10px",
          display: "flex",
          gap: 10,
          alignItems: "center",
        }}
      >
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--card-border)",
            background: "var(--card)",
            fontFamily: "var(--font-geist-sans), sans-serif",
            fontSize: 14,
            color: "var(--text)",
            cursor: "pointer",
          }}
        >
          {USER_IDS.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
        <button
          onClick={runMatch}
          disabled={loading}
          style={{
            padding: "10px 22px",
            borderRadius: "var(--radius-sm)",
            border: "none",
            background: "var(--green)",
            color: "#fff",
            fontFamily: "var(--font-geist-sans), sans-serif",
            fontSize: 14,
            fontWeight: 600,
            cursor: loading ? "wait" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Running…" : "Run Match"}
        </button>
      </div>

      {error && (
        <div
          style={{
            margin: "0 16px 10px",
            padding: "10px 14px",
            borderRadius: "var(--radius-sm)",
            background: "#FAE8E0",
            border: "1px solid rgba(196,122,106,.2)",
            fontSize: 13,
            color: "var(--red-soft)",
          }}
        >
          {error}
        </div>
      )}

      {data && (
        <>
          {/* Status cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              padding: "6px 16px 10px",
            }}
          >
            <StatusCard
              label="OpenAI Key"
              value={data.debug.openai_key_set ? "Set" : "Missing"}
              detail={data.debug.openai_key_set ? "Key configured" : "No API key found"}
              ok={data.debug.openai_key_set}
            />
            <StatusCard
              label="Supabase"
              value={data.debug.supabase_connected ? "Connected" : "Offline"}
              detail={
                data.debug.supabase_connected
                  ? "Client active"
                  : "Using mock data"
              }
              ok={data.debug.supabase_connected}
            />
            <StatusCard
              label="AI Scored"
              value={data.debug.ai_scored}
              detail={`via ${data.debug.model}`}
              ok={data.debug.ai_scored > 0}
            />
            <StatusCard
              label="Mock Scored"
              value={data.debug.mock_scored}
              detail="fallback scoring"
              ok={data.debug.mock_scored === 0}
            />
            <StatusCard
              label="Embeddings"
              value={`${data.debug.embeddings_cached}/${data.debug.embeddings_cached + data.debug.embeddings_computed}`}
              detail={`${data.debug.embeddings_computed} computed`}
              ok={data.debug.embeddings_cached + data.debug.embeddings_computed > 0}
            />
            <StatusCard
              label="Pre-filtered"
              value={
                data.debug.prefilter_skipped
                  ? `${data.debug.candidates_total} (skip)`
                  : `${data.debug.candidates_prefiltered}/${data.debug.candidates_total}`
              }
              detail={
                data.debug.prefilter_skipped
                  ? `≤ ${data.debug.prefilter_top_k}, no filter needed`
                  : `top-${data.debug.prefilter_top_k} sent to GPT-4o`
              }
              ok={!data.debug.prefilter_skipped}
            />
          </div>

          {/* Match table */}
          <div style={{ padding: "4px 16px 14px" }}>
            <div
              style={{
                background: "var(--card)",
                border: "1px solid var(--card-border)",
                borderRadius: "var(--radius)",
                padding: 18,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  paddingBottom: 12,
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-instrument-serif), serif",
                    fontSize: 18,
                  }}
                >
                  Match Results
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    fontWeight: 500,
                    color: "var(--text-3)",
                    background: "var(--cream)",
                    border: "1px solid var(--card-border)",
                    padding: "2px 10px",
                    borderRadius: 100,
                  }}
                >
                  {data.tribe_list.length} candidates
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {data.tribe_list.map((match) => (
                  <div
                    key={match.id}
                    style={{
                      background: "var(--cream)",
                      border: "1px solid var(--card-border)",
                      borderRadius: "var(--radius-sm)",
                      padding: "12px 14px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 6,
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          fontSize: 14,
                          fontWeight: 500,
                        }}
                      >
                        {match.name}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--text-2)",
                        }}
                      >
                        {match.match_score}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text-3)",
                          padding: "2px 8px",
                          borderRadius: 100,
                          border: "1px solid var(--card-border)",
                          background: "var(--card)",
                        }}
                      >
                        {match.match_type}
                      </div>
                      <AiSourceBadge source={match.ai_source} />
                    </div>
                    {match.background && (
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--text-3)",
                          fontWeight: 300,
                          lineHeight: 1.4,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {match.background}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
