import { useState } from "react";
import { CATEGORY_BY_ID } from "../config";
import { JUMP_EVENT } from "./Mushaf";
import { useJudging } from "../state/store";
import { Icon } from "./Icon";

export function MistakeLog() {
  const { state, dispatch } = useJudging();
  const [openId, setOpenId] = useState<string | null>(null);
  const ordered = [...state.mistakes].sort((a, b) => b.ts - a.ts);

  const toggle = (id: string, tid: string, page?: number) => {
    const opening = openId !== id;
    setOpenId(opening ? id : null);
    if (opening) {
      window.dispatchEvent(new CustomEvent(JUMP_EVENT, { detail: { tid, page } }));
    }
  };

  return (
    <section className="panel" aria-label="Mistakes">
      <div className="panel-head">
        <span className="t-label">
          Mistakes{ordered.length > 0 ? ` · ${ordered.length}` : ""}
        </span>
      </div>

      {ordered.length === 0 ? (
        <p className="empty">Press and hold a letter on the page to mark one.</p>
      ) : (
        <ul className="log">
          {ordered.map((m) => {
            const cat = CATEGORY_BY_ID[m.category];
            const open = openId === m.id;
            return (
              <li
                className={`log-row-wrap cat-${m.category} ${open ? "open" : ""}`}
                key={m.id}
              >
                <button
                  type="button"
                  className="log-row"
                  aria-expanded={open}
                  title={`${cat.label} — ${m.label}`}
                  onClick={() => toggle(m.id, m.tid, m.page)}
                >
                  <span className="log-dot" aria-hidden="true" />
                  <span className="log-glyph">{m.glyph}</span>
                  <span className="log-amt t-num">−{m.amount}</span>
                </button>
                <div className="log-expand">
                  <div className="log-expand-inner">
                    <div className="log-detail">
                      <span className="log-loc">
                        {cat.label} · {m.label}
                      </span>
                      <button
                        type="button"
                        className="step-btn"
                        aria-label="decrease deduction"
                        onClick={() =>
                          dispatch({
                            type: "SET_MISTAKE_AMOUNT",
                            id: m.id,
                            amount: m.amount - 0.5,
                          })
                        }
                      >
                        <Icon name="minus" size={12} />
                      </button>
                      <span className="step-val t-num">−{m.amount}</span>
                      <button
                        type="button"
                        className="step-btn"
                        aria-label="increase deduction"
                        onClick={() =>
                          dispatch({
                            type: "SET_MISTAKE_AMOUNT",
                            id: m.id,
                            amount: m.amount + 0.5,
                          })
                        }
                      >
                        <Icon name="plus" size={12} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label="remove mark"
                        onClick={() => {
                          setOpenId(null);
                          dispatch({ type: "REMOVE_MISTAKE", id: m.id });
                        }}
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
