import { beforeEach, describe, expect, it } from "vitest";

import { createDefaultWorldProfile } from "../worldModel";
import { useWorldStore } from "./useWorldStore";

describe("daily world tasks", () => {
  beforeEach(() => {
    useWorldStore.setState({ profile: createDefaultWorldProfile() });
  });

  it("persists tasks only through explicit task actions", () => {
    const dateKey = "2026-07-18";

    useWorldStore.getState().addDailyTask(dateKey, "  Draft the city council  ");
    const [task] = useWorldStore.getState().profile.dailyTasks?.[dateKey] ?? [];

    expect(task.text).toBe("Draft the city council");
    expect(task.completed).toBe(false);

    useWorldStore.getState().toggleDailyTask(dateKey, task.id);
    expect(useWorldStore.getState().profile.dailyTasks?.[dateKey]?.[0].completed).toBe(true);

    useWorldStore.getState().deleteDailyTask(dateKey, task.id);
    expect(useWorldStore.getState().profile.dailyTasks?.[dateKey]).toEqual([]);
  });
});
