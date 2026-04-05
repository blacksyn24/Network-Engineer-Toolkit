/**
 * @file launcher-hints.js
 * @description Boutons « copier » pour faciliter le lancement hors navigation manuelle.
 */
(function (global) {
  "use strict";
  const U = global.NetKit && global.NetKit.ui;
  if (!U) return;

  const feedback = document.getElementById("launch-feedback");

  function showFeedback(msg) {
    if (!feedback) return;
    feedback.textContent = msg;
    feedback.hidden = false;
    clearTimeout(showFeedback._t);
    showFeedback._t = setTimeout(() => {
      feedback.hidden = true;
    }, 2800);
  }

  document.getElementById("btn-copy-vscode-task")?.addEventListener("click", async () => {
    const text =
      "Dans Cursor/VS Code : Ctrl+Shift+B pour ouvrir index.html\n" +
      "ou Ctrl+Shift+P → « Tasks: Run Task » → « Ouvrir Network Engineer Toolkit »";
    const ok = await U.copyText(text);
    showFeedback(ok ? "Instructions VS Code copiées dans le presse-papiers." : "Copie impossible (navigateur).");
  });

  document.getElementById("btn-copy-sh-cmd")?.addEventListener("click", async () => {
    const text =
      "# À lancer depuis le dossier du projet (Network Engineer Toolkit) :\n" +
      "chmod +x open-netkit.sh   # une seule fois\n" +
      "./open-netkit.sh";
    const ok = await U.copyText(text);
    showFeedback(ok ? "Commande terminal copiée (collez dans un terminal au bon dossier)." : "Copie impossible.");
  });

  document.getElementById("btn-copy-bat-hint")?.addEventListener("click", async () => {
    const text = "open-netkit.bat";
    const ok = await U.copyText(text);
    showFeedback(ok ? "Nom du fichier copié : double-cliquez-le dans l’explorateur Windows." : "Copie impossible.");
  });
})(window);
