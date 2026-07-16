import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { I18nProvider } from "../shared/i18n";
import { ThemeProvider } from "../shared/theme/ThemeProvider";
import { AppRoutes } from "./routes";

describe("AppRoutes", () => {
  it("renders the application layout and not-found page for unknown paths", () => {
    const html = renderToStaticMarkup(
      <ThemeProvider>
        <I18nProvider>
          <MemoryRouter initialEntries={["/abc"]}>
            <AppRoutes />
          </MemoryRouter>
        </I18nProvider>
      </ThemeProvider>,
    );

    expect(html).toContain('id="main-content"');
    expect(html).toContain("Page not found");
    expect(html).toContain('href="/dashboard"');
  });
});
