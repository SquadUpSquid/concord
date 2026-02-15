import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Tauri's asset protocol may not serve .wasm with application/wasm MIME type.
// Patch instantiateStreaming to fall back to ArrayBuffer-based instantiation.
const _instantiateStreaming = WebAssembly.instantiateStreaming;
WebAssembly.instantiateStreaming = async (source, importObject) => {
  try {
    return await _instantiateStreaming(source, importObject);
  } catch {
    const response = await source;
    const bytes = await response.arrayBuffer();
    return WebAssembly.instantiate(bytes, importObject);
  }
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
