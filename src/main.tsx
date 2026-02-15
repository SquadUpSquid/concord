import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Tauri's asset protocol doesn't serve .wasm with application/wasm MIME type.
// Skip streaming entirely and use ArrayBuffer-based instantiation.
WebAssembly.instantiateStreaming = async (source, importObject) => {
  const response = await source;
  const bytes = await response.arrayBuffer();
  return WebAssembly.instantiate(bytes, importObject);
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
