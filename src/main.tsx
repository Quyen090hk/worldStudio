import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./app/App";
import { I18nProvider } from "./shared/i18n";
import { ThemeProvider } from "./shared/theme/ThemeProvider";
import { clearLegacyBusinessStorage } from "./shared/storage/database";
import "./index.css";

clearLegacyBusinessStorage();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </I18nProvider>
    </ThemeProvider>
  </React.StrictMode>
);
