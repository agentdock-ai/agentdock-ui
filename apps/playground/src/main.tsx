import React, { useEffect, useState, type MouseEvent } from "react";
import { createRoot } from "react-dom/client";
import { Moon, Sun, Settings2 } from "lucide-react";
import { ChatIcon } from "./components/agentdock-ui/icon";
import { ChatPage } from "./pages/chat-page";
import { ComponentsPage } from "./pages/components-page";
import "./style.css";

const agentdockLogo = new URL(
  "../../../assets/agentdock-logo.png",
  import.meta.url,
).href;

type Page = "chat" | "components";
const currentPage = (): Page =>
  window.location.pathname.replace(/\/$/, "") === "/components"
    ? "components"
    : "chat";

function Playground() {
  const [page, setPage] = useState(currentPage);
  const [chatVisited, setChatVisited] = useState(page === "chat");
  const [dark, setDark] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const previous = document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", dark);
    return () => {
      document.documentElement.classList.toggle("dark", previous);
    };
  }, [dark]);

  useEffect(() => {
    function updatePage() {
      const next = currentPage();
      setPage(next);
      if (next === "chat") setChatVisited(true);
    }
    window.addEventListener("popstate", updatePage);
    return () => window.removeEventListener("popstate", updatePage);
  }, []);

  useEffect(() => {
    document.title = `${page === "chat" ? "Chat" : "Components"} · Agentdock Playground`;
  }, [page]);

  function navigate(event: MouseEvent<HTMLAnchorElement>, next: Page) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    if (next === page) return;
    window.history.pushState(null, "", next === "chat" ? "/" : "/components");
    setPage(next);
    if (next === "chat") setChatVisited(true);
  }

  return (
    <div className={`${dark ? "dark " : ""}playground-app`}>
      <header className="playground-header">
        <span className="playground-brand">
          <span
            aria-hidden="true"
            className="playground-brand-mark"
            style={{ maskImage: `url(${agentdockLogo})` }}
          />
          <span>
            Agentdock <span className="playground-brand-label">Playground</span>
          </span>
        </span>
        <nav aria-label="Pages" className="playground-navigation">
          <a
            href="/"
            aria-current={page === "chat" ? "page" : undefined}
            onClick={(event) => navigate(event, "chat")}
          >
            Chat
          </a>
          <a
            href="/components"
            aria-current={page === "components" ? "page" : undefined}
            onClick={(event) => navigate(event, "components")}
          >
            Components
          </a>
        </nav>
        <div className="playground-header-actions flex items-center gap-1">
          {page === "chat" && (
            <button
              type="button"
              className="workspace-action"
              aria-label="Connection settings"
              aria-haspopup="dialog"
              aria-expanded={settingsOpen}
              onClick={() => setSettingsOpen(true)}
            >
              <ChatIcon icon={Settings2} size={15} />
            </button>
          )}
          <button
            type="button"
            className="workspace-action"
            aria-label={dark ? "Light mode" : "Dark mode"}
            onClick={() => setDark(!dark)}
          >
            <ChatIcon icon={dark ? Sun : Moon} size={15} />
          </button>
        </div>
      </header>
      {chatVisited && (
        <div className="playground-page" hidden={page !== "chat"}>
          <ChatPage
            settingsOpen={page === "chat" && settingsOpen}
            onCloseSettings={() => setSettingsOpen(false)}
          />
        </div>
      )}
      {page === "components" && <ComponentsPage />}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Playground />
  </React.StrictMode>,
);
