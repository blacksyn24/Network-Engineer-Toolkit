/**
 * @file history-panel.js
 * @description Affichage de l’historique global des actions.
 */
(function (global) {
  "use strict";
  const NetKit = global.NetKit;
  if (!NetKit) return;

  NetKit.renderHistoryPanel = function () {
    const list = document.getElementById("history-list-global");
    const empty = document.getElementById("history-empty-global");
    if (!list || !empty) return;
    const items = NetKit.ui.loadHistory();
    list.innerHTML = "";
    if (items.length === 0) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    items.forEach((it) => {
      const li = document.createElement("li");
      li.className = "history-item";
      const time = document.createElement("time");
      time.dateTime = it.t;
      time.textContent = new Date(it.t).toLocaleString("fr-FR");
      li.appendChild(time);
      const pre = document.createElement("pre");
      pre.className = "history-pre";
      pre.textContent = it.summary || JSON.stringify(it, null, 2);
      li.appendChild(pre);
      list.appendChild(li);
    });
  };

  const clearBtn = document.getElementById("btn-clear-history-global");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      localStorage.removeItem(NetKit.HISTORY_KEY);
      NetKit.renderHistoryPanel();
    });
  }
})(window);
