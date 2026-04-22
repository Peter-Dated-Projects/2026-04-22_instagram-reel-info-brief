"use client";

interface KeyList {
  title: string;
  items: string[];
}

interface InsightsPanelProps {
  summary: string | null;
  keyLists: KeyList[];
  loading: boolean;
}

export default function InsightsPanel({
  summary,
  keyLists,
  loading,
}: InsightsPanelProps) {
  if (loading) {
    return (
      <div className="panel insights-panel">
        <div className="panel__header">
          <div className="panel__header-icon panel__header-icon--insights">✨</div>
          <span className="panel__header-title">AI Insights</span>
        </div>
        <div className="panel__body">
          <div className="insight-card">
            <div className="insight-card__header">
              <span className="insight-card__icon">📝</span>
              <span className="insight-card__title">Summary</span>
            </div>
            <div>
              <div className="skeleton skeleton--text" />
              <div className="skeleton skeleton--text" />
              <div className="skeleton skeleton--text" />
              <div className="skeleton skeleton--text" />
              <div className="skeleton skeleton--text" />
            </div>
          </div>
          <div className="insight-card">
            <div className="insight-card__header">
              <span className="insight-card__icon">📋</span>
              <span className="insight-card__title">Key Lists</span>
            </div>
            <div>
              <div className="skeleton skeleton--text" />
              <div className="skeleton skeleton--text" />
              <div className="skeleton skeleton--text" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!summary && keyLists.length === 0) {
    return (
      <div className="panel insights-panel">
        <div className="panel__header">
          <div className="panel__header-icon panel__header-icon--insights">✨</div>
          <span className="panel__header-title">AI Insights</span>
        </div>
        <div className="panel__body">
          <div className="empty-state">
            <div className="empty-state__icon">🧠</div>
            <div className="empty-state__text">
              AI-generated insights will appear here after analysis.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel insights-panel">
      <div className="panel__header">
        <div className="panel__header-icon panel__header-icon--insights">✨</div>
        <span className="panel__header-title">AI Insights</span>
      </div>
      <div className="panel__body">
        {/* Summary */}
        {summary && (
          <div className="insight-card">
            <div className="insight-card__header">
              <span className="insight-card__icon">📝</span>
              <span className="insight-card__title">Summary</span>
            </div>
            <div className="insight-card__body">
              {summary.split("\n").map((paragraph, i) => (
                <p key={i} style={{ marginBottom: i < summary.split("\n").length - 1 ? "12px" : 0 }}>
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Lists */}
        {keyLists.map((list, idx) => (
          <div className="list-card" key={idx}>
            <div className="list-card__title">{list.title}</div>
            <ul className="list-card__items">
              {list.items.map((item, i) => (
                <li className="list-card__item" key={i}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
