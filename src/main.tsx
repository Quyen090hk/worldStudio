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
  prepareOpeningScreen,
  markOpeningScreenShown,
  revealApplication,
  shouldShowOpeningScreen,
  showOpeningError,
  waitForFonts,
  waitForOpeningDismissal,
} from "./shared/opening/openingScreen";
import "./index.css";

clearLegacyBusinessStorage();

async function bootstrap() {
  try {
    const showOpening = shouldShowOpeningScreen();
    const readiness = Promise.all([
      showOpening ? prepareOpeningScreen() : Promise.resolve(),
      hydrateWorkspaceStores(),
      waitForFonts(),
    ]);
    if (showOpening) {
      await waitForOpeningDismissal(readiness);
      markOpeningScreenShown();
    } else {
      await readiness;
    }

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
    const canShareQuote =
      showOpening &&
      window.location.pathname === "/dashboard" &&
      "startViewTransition" in document;

    if (canShareQuote) {
      const transition = document.startViewTransition(() => {
        document.getElementById("opening-screen")?.remove();
        renderApplication();
      });
      await transition.finished;
    } else {
      renderApplication();
      revealApplication();
    }
  } catch (error) {
    showOpeningError(error);
  }
}

void bootstrap();
