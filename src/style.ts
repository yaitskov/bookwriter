const STYLE_ID = "click-word-menu-styles";

export function ensureStyles(doc: Document = document): void {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement("style");
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
    .settings-dialog-backdrop {
      position: fixed;
      inset: 0;
      z-index: 10001;
      display: none;
      background: rgba(0, 0, 0, 0.35);
      font: 14px system-ui, sans-serif;
    }
    .settings-dialog {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 10002;
      min-width: 340px;
      max-width: 90vw;
      background: #fff;
      border: 1px solid #d0d0d0;
      border-radius: 6px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      padding: 16px 20px;
      color: #222;
    }
    .settings-dialog h2 {
      margin: 0 0 12px;
      font-size: 15px;
    }
    .settings-dialog label {
      display: block;
      margin-bottom: 8px;
    }
    .settings-dialog input[type="range"] {
      width: 100%;
      box-sizing: border-box;
    }
    .settings-dialog .settings-value {
      margin-top: 8px;
      color: #666;
      font: 12px ui-monospace, monospace;
      user-select: none;
    }
    .settings-dialog .settings-hint {
      margin: 8px 0 0;
      color: #666;
      font-size: 12px;
    }
    .settings-dialog .settings-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 16px;
    }
    .settings-dialog button {
      padding: 6px 14px;
      border: 1px solid #d0d0d0;
      border-radius: 4px;
      background: #fff;
      cursor: pointer;
      font: inherit;
    }
    .settings-dialog button:hover:enabled {
      background: #f0f0f0;
    }
    .settings-dialog button:disabled {
      opacity: 0.5;
      cursor: default;
    }
    .settings-dialog .settings-apply {
      background: #2b6cb0;
      border-color: #2a5f96;
      color: #fff;
    }
    .settings-dialog .settings-apply:hover:enabled {
      background: #2a5f96;
    }
    .loading-modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 10003;
      display: none;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.35);
      font: 14px system-ui, sans-serif;
    }
    .loading-modal {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      min-width: 220px;
      padding: 20px 24px;
      background: #fff;
      border: 1px solid #d0d0d0;
      border-radius: 6px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      color: #222;
    }
    .loading-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #d0e0f0;
      border-top-color: #2b6cb0;
      border-radius: 50%;
      animation: loading-spin 0.8s linear infinite;
    }
    @keyframes loading-spin {
      to { transform: rotate(360deg); }
    }
    .loading-message {
      margin: 0;
    }
    .loading-cancel {
      padding: 6px 14px;
      border: 1px solid #d0d0d0;
      border-radius: 4px;
      background: #fff;
      cursor: pointer;
      font: inherit;
    }
    .loading-cancel:hover {
      background: #f0f0f0;
    }
  `;
  doc.head.appendChild(style);
}
