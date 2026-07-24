import React from "react";
import ReactDOM from "react-dom/client";
import { flushSync } from "react-dom";
import { BrowserRouter } from "react-router-dom";

import App from "./app/App";
import { I18nProvider } from "./shared/i18n";
import { ThemeProvider } from "./shared/theme/ThemeProvider";
import { SoftDialogProvider } from "./shared/components/SoftDialogProvider";
import { clearLegacyBusinessStorage } from "./shared/storage/database";
import { hydrateWorkspaceStores } from "./features/world/hydrateWorkspaceStores";
import {
  revealApplication,
  showOpeningError,
  waitForFonts,
} from "./shared/opening/openingScreen";
import "./index.css";

clearLegacyBusinessStorage();

async function bootstrap() {
  try {
    const readiness = Promise.all([
      hydrateWorkspaceStores(),
      waitForFonts(),
    ]);
    await readiness;
    // Local-directory backup support is not required to paint the workspace.
    // Load it after hydration so backup serializers do not inflate the first route.
    void import("./features/settings/localWorkspaceAutoSync").then(({ startLocalWorkspaceAutoSync }) => startLocalWorkspaceAutoSync());

    const rootElement = document.getElementById("root")!;
    const root = ReactDOM.createRoot(rootElement);
    const application = (
      <React.StrictMode>
        <ThemeProvider>
          <I18nProvider>
            <SoftDialogProvider>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </SoftDialogProvider>
          </I18nProvider>
        </ThemeProvider>
      </React.StrictMode>
    );
    const renderApplication = () => flushSync(() => root.render(application));
    renderApplication();
    revealApplication();
  } catch (error) {
    showOpeningError(error);
  }
}

void bootstrap();
