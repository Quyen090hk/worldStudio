import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { AppRoutes } from "./routes";
import { I18nProvider } from "../shared/i18n";
import { ThemeProvider } from "../shared/theme/ThemeProvider";
import { SoftDialogProvider } from "../shared/components/SoftDialogProvider";
import { useWorldRegistryStore } from "../features/world/stores/useWorldRegistryStore";
import { NotFoundPage } from "../shared/components/NotFoundPage";

function render(path: string) {
  return renderToString(
    <ThemeProvider><I18nProvider><SoftDialogProvider><MemoryRouter initialEntries={[path]}><AppRoutes /></MemoryRouter></SoftDialogProvider></I18nProvider></ThemeProvider>,
  );
}

describe("AppRoutes", () => {
  it("shows world setup instead of inventing a default world", () => {
    useWorldRegistryStore.setState({ worlds: [], activeWorldId: "" });
    expect(render("/manuscript")).toContain("Create your first world");
  });

  it("renders a recoverable not-found destination", () => {
    const html = renderToString(<I18nProvider><MemoryRouter><NotFoundPage /></MemoryRouter></I18nProvider>);
    expect(html).toContain("Page not found");
    expect(html).toContain('href="/manuscript"');
  });
});
