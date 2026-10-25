import "./vertical-tabs.css";
import { useId, useRef, useState } from "react";

export interface VerticalTab {
  id: string;
  label: string;
  content: React.ReactNode;
}

export interface VerticalTabsProps {
  tabs: readonly VerticalTab[];
  initialTabId?: string;
  ariaLabel?: string;
}

export function VerticalTabs({
  tabs,
  initialTabId,
  ariaLabel = "Settings sections",
}: VerticalTabsProps): React.JSX.Element {
  const baseId = useId();
  const [activeId, setActiveId] = useState(initialTabId ?? tabs[0]?.id ?? "");
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];

  const select = (index: number): void => {
    const tab = tabs[index];
    if (!tab) return;
    setActiveId(tab.id);
    buttonRefs.current[index]?.focus();
  };

  const move = (index: number, delta: number): void => {
    if (tabs.length === 0) return;
    select((index + delta + tabs.length) % tabs.length);
  };

  const tabId = (id: string): string => `${baseId}-tab-${id}`;
  const panelId = (id: string): string => `${baseId}-panel-${id}`;

  return (
    <div className="vertical-tabs">
      <div
        className="vertical-tabs-list"
        role="tablist"
        aria-orientation="vertical"
        aria-label={ariaLabel}
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(element) => {
              buttonRefs.current[index] = element;
            }}
            type="button"
            role="tab"
            id={tabId(tab.id)}
            aria-selected={tab.id === active?.id}
            aria-controls={panelId(tab.id)}
            tabIndex={tab.id === active?.id ? 0 : -1}
            onClick={() => setActiveId(tab.id)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowRight") {
                event.preventDefault();
                move(index, 1);
              } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
                event.preventDefault();
                move(index, -1);
              } else if (event.key === "Home") {
                event.preventDefault();
                select(0);
              } else if (event.key === "End") {
                event.preventDefault();
                select(tabs.length - 1);
              }
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className="vertical-tabs-panel"
          role="tabpanel"
          id={panelId(tab.id)}
          aria-labelledby={tabId(tab.id)}
          hidden={tab.id !== active?.id}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
