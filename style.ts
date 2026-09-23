const STYLE_ID = "click-word-menu-styles";

export function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .word-menu {
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
    .word-menu button {
      display: block;
      width: 100%;
      padding: 6px 16px;
      border: none;
      background: none;
      cursor: pointer;
      text-align: left;
      font: inherit;
    }
    .word-menu button:hover {
      background: #f0f0f0;
    }
    .word-menu .menu-label {
      padding: 6px 16px;
      color: #666;
      cursor: default;
      user-select: none;
    }
    .unknown-word {
      background: #fff3b0;
      border-radius: 2px;
      padding: 0 1px;
      animation: unknown-word-pulse 2s ease-in-out infinite;
    }
    @keyframes unknown-word-pulse {
      0% { opacity: 1; }
      50% { opacity: 0.3; }
      100% { opacity: 1; }
    }
    .synonym {
      background: #e8e8e8;
      border: 1px solid #c0c0c0;
      border-radius: 4px;
      padding: 0 2px;
    }
  `;
  document.head.appendChild(style);
}
