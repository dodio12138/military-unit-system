"use strict";

const viewModeStorageKey = "military-unit-system:view-mode:v1";
let displayMode = "flat";
try { if (localStorage.getItem(viewModeStorageKey) === "depth") displayMode = "depth"; } catch { /* Use the flat view when storage is unavailable. */ }

function initializeViewMode() {
  function syncControls() {
    document.documentElement.dataset.viewMode = displayMode;
    $("view-flat").setAttribute("aria-pressed", String(displayMode === "flat"));
    $("view-depth").setAttribute("aria-pressed", String(displayMode === "depth"));
  }
  for (const [id, mode] of [["view-flat", "flat"], ["view-depth", "depth"]]) {
    $(id).addEventListener("click", () => {
      if (displayMode === mode) return;
      displayMode = mode;
      try { localStorage.setItem(viewModeStorageKey, mode); } catch { /* Display changes remain usable without storage. */ }
      syncControls();
      renderPalette();
      render();
      fitView();
      $("empty-symbol").innerHTML = rankMark("company") + symbol("infantry");
      announce(mode === "depth" ? "已切换到整体 2.5D 视角" : "已切换到平面兵牌");
    });
  }
  syncControls();
}
