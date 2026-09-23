const STYLE_ID = "click-word-menu-styles";

export function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #unknown-word-menu {
      position: fixed;
      z-index: 10000;
      display: none;
      background: #fff;
      border: 1px solid #d0d0d0;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      padding: 4px 0;
      font: 14px system-ui, sans-serif;
    }
    #unknown-word-menu button {
      display: block;
      width: 100%;
      padding: 6px 16px;
      border: none;
      background: none;
      cursor: pointer;
      text-align: left;
    }
    #unknown-word-menu button:hover {
      background: #f0f0f0;
    }
    .unknown-word {
      background: #fff3b0;
      border-radius: 2px;
      padding: 0 1px;
    }
  `;
  document.head.appendChild(style);
}