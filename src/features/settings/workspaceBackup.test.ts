import { describe, expect, it } from "vitest";

import {
  WORKSPACE_BACKUP_FORMAT,
  WORKSPACE_BACKUP_VERSION,
  WorkspaceBackupError,
  parseWorkspaceBackup,
  sanitizeWorkspaceData,
  type WorkspaceBackup,
} from "./workspaceBackup";

function createValidBackup(): WorkspaceBackup {
  return {
    format: WORKSPACE_BACKUP_FORMAT,
    version: WORKSPACE_BACKUP_VERSION,
    exportedAt: "2026-07-14T00:00:00.000Z",
    data: {
      world: {
        name: "The Ashen Archive",
        description: "A test world.",
        createdAt: "2026-07-14T00:00:00.000Z",
        updatedAt: "2026-07-14T00:00:00.000Z",
      },
      entries: [
        {
          id: "entry-1",
          title: "Archivist",
          type: "Character",
          summary: "Keeper of the archive.",
          content: "<p>Notes</p>",
          tags: ["archive"],
          createdAt: "2026-07-14T00:00:00.000Z",
          updatedAt: "2026-07-14T00:00:00.000Z",
        },
      ],
      revisions: [],
      relationships: [],
      timeline: {
        items: [],
        eras: [],
        viewport: { centerYear: 0, yearsPerScreen: 500 },
      },
      atlas: {
        maps: [
          {
            id: "map-1",
            name: "Known World",
            scale: "World",
            description: "",
            createdAt: "2026-07-14T00:00:00.000Z",
          },
        ],
        activeMapId: "map-1",
        layers: [
          {
            id: "layer-1",
            mapId: "map-1",
            name: "Places",
            color: "#986e36",
            visible: true,
          },
        ],
        markers: [],
        connections: [],
        images: [],
      },
      assetLibrary: {
        items: [],
        files: [],
      },
      canvas: {
        cards: [],
        connections: [],
        viewport: { zoom: 1 },
      },
      graphSettings: {
        visibleTypes: [
          "Character",
          "Location",
          "Organization",
          "Item",
          "Event",
        ],
        showSecrets: true,
        showOrphans: true,
        nodeRepulsion: 9000,
        linkDistance: 92,
        linkElasticity: 0.9,
        centerGravity: 0.18,
        animationDuration: 500,
        groups: [],
      },
    },
  };
}

function expectBackupError(action: () => unknown, code: WorkspaceBackupError["code"]) {
  try {
    action();
    throw new Error("Expected parsing to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(WorkspaceBackupError);
    expect((error as WorkspaceBackupError).code).toBe(code);
  }
}

describe("parseWorkspaceBackup", () => {
  it("accepts a valid, referentially consistent backup", () => {
    const parsed = parseWorkspaceBackup(JSON.stringify(createValidBackup()));
    expect(parsed.data.entries).toHaveLength(1);
    expect(parsed.data.atlas.activeMapId).toBe("map-1");
  });

  it("rejects malformed JSON and unsupported versions", () => {
    expectBackupError(() => parseWorkspaceBackup("{"), "invalid-json");

    const backup = { ...createValidBackup(), version: 99 };
    expectBackupError(
      () => parseWorkspaceBackup(JSON.stringify(backup)),
      "unsupported-version",
    );
  });

  it("migrates version 1 backups without an asset library", () => {
    const legacy = JSON.parse(
      JSON.stringify(createValidBackup()),
    ) as Record<string, unknown> & {
      data: Record<string, unknown>;
    };
    legacy.version = 1;
    delete legacy.data.assetLibrary;
    delete legacy.data.canvas;
    delete legacy.data.world;

    const parsed = parseWorkspaceBackup(JSON.stringify(legacy));

    expect(parsed.version).toBe(WORKSPACE_BACKUP_VERSION);
    expect(parsed.data.assetLibrary).toEqual({ items: [], files: [] });
    expect(parsed.data.canvas).toEqual({
      cards: [],
      connections: [],
      viewport: { zoom: 1 },
    });
    expect(parsed.data.world.name).toBe("The Ashen Archive");
  });

  it("migrates version 2 backups without a canvas", () => {
    const legacy = JSON.parse(
      JSON.stringify(createValidBackup()),
    ) as Record<string, unknown> & {
      data: Record<string, unknown>;
    };
    legacy.version = 2;
    delete legacy.data.canvas;
    delete legacy.data.world;

    const parsed = parseWorkspaceBackup(JSON.stringify(legacy));

    expect(parsed.version).toBe(WORKSPACE_BACKUP_VERSION);
    expect(parsed.data.canvas.cards).toEqual([]);
    expect(parsed.data.world.name).toBe("The Ashen Archive");
  });

  it("migrates version 3 backups without world metadata", () => {
    const legacy = JSON.parse(
      JSON.stringify(createValidBackup()),
    ) as Record<string, unknown> & {
      data: Record<string, unknown>;
    };
    legacy.version = 3;
    delete legacy.data.world;

    const parsed = parseWorkspaceBackup(JSON.stringify(legacy));

    expect(parsed.version).toBe(WORKSPACE_BACKUP_VERSION);
    expect(parsed.data.world.name).toBe("The Ashen Archive");
  });

  it("migrates version 4 backups without revision history", () => {
    const legacy = JSON.parse(
      JSON.stringify(createValidBackup()),
    ) as Record<string, unknown> & {
      data: Record<string, unknown>;
    };
    legacy.version = 4;
    delete legacy.data.revisions;

    const parsed = parseWorkspaceBackup(JSON.stringify(legacy));

    expect(parsed.version).toBe(WORKSPACE_BACKUP_VERSION);
    expect(parsed.data.revisions).toEqual([]);
  });

  it("rejects duplicate entity IDs", () => {
    const backup = createValidBackup();
    backup.data.entries.push({ ...backup.data.entries[0] });
    expectBackupError(
      () => parseWorkspaceBackup(JSON.stringify(backup)),
      "invalid-data",
    );
  });

  it("rejects orphaned relationships", () => {
    const backup = createValidBackup();
    backup.data.relationships.push({
      id: "relationship-1",
      sourceEntryId: "entry-1",
      targetEntryId: "missing-entry",
      type: "Allied with",
      inverseLabel: "Allied with",
      direction: "mutual",
      strength: null,
      status: "current",
      startYear: null,
      endYear: null,
      description: "",
      tags: [],
    });
    expectBackupError(
      () => parseWorkspaceBackup(JSON.stringify(backup)),
      "invalid-data",
    );
  });

  it("rejects markers assigned to a layer from another map", () => {
    const backup = createValidBackup();
    backup.data.atlas.maps.push({
      ...backup.data.atlas.maps[0],
      id: "map-2",
      name: "Second Map",
    });
    backup.data.atlas.markers.push({
      id: "marker-1",
      mapId: "map-2",
      layerId: "layer-1",
      entryIds: ["entry-1"],
      title: "Wrong layer",
      description: "",
      category: "Settlement",
      x: 50,
      y: 50,
      color: "#986e36",
      size: "Medium",
      startYear: null,
      endYear: null,
    });
    expectBackupError(
      () => parseWorkspaceBackup(JSON.stringify(backup)),
      "invalid-data",
    );
  });

  it("rejects asset metadata without its binary file", () => {
    const backup = createValidBackup();
    backup.data.assetLibrary.items.push({
      id: "asset-1",
      name: "portrait.png",
      mediaType: "image/png",
      kind: "image",
      size: 10,
      tags: [],
      createdAt: "2026-07-14T00:00:00.000Z",
      updatedAt: "2026-07-14T00:00:00.000Z",
    });

    expectBackupError(
      () => parseWorkspaceBackup(JSON.stringify(backup)),
      "invalid-data",
    );
  });

  it("rejects canvas connections to missing cards", () => {
    const backup = createValidBackup();
    backup.data.canvas.cards.push({
      id: "note-1",
      kind: "note",
      x: 100,
      y: 100,
      color: "parchment",
      title: "Question",
      body: "Who opened the gate?",
      createdAt: "2026-07-14T00:00:00.000Z",
      updatedAt: "2026-07-14T00:00:00.000Z",
    });
    backup.data.canvas.connections.push({
      id: "connection-1",
      fromCardId: "note-1",
      toCardId: "missing-card",
      createdAt: "2026-07-14T00:00:00.000Z",
    });

    expectBackupError(
      () => parseWorkspaceBackup(JSON.stringify(backup)),
      "invalid-data",
    );
  });
});

describe("sanitizeWorkspaceData", () => {
  it("removes legacy orphaned references before export", () => {
    const backup = createValidBackup();
    backup.data.relationships.push({
      id: "relationship-1",
      sourceEntryId: "entry-1",
      targetEntryId: "missing-entry",
      type: "Allied with",
      inverseLabel: "Allied with",
      direction: "mutual",
      strength: null,
      status: "current",
      startYear: null,
      endYear: null,
      description: "",
      tags: [],
    });
    backup.data.timeline.items.push({
      id: "timeline-1",
      entryId: "missing-entry",
      startYear: 1,
      endYear: null,
      description: "",
      color: null,
    });
    backup.data.atlas.markers.push({
      id: "marker-1",
      mapId: "map-1",
      layerId: "layer-1",
      entryIds: ["entry-1", "missing-entry"],
      title: "Archive",
      description: "",
      category: "Landmark",
      x: 50,
      y: 50,
      color: "#986e36",
      size: "Medium",
      startYear: null,
      endYear: null,
    });

    const sanitized = sanitizeWorkspaceData(backup.data);

    expect(sanitized.relationships).toEqual([]);
    expect(sanitized.timeline.items).toEqual([]);
    expect(sanitized.atlas.markers[0].entryIds).toEqual(["entry-1"]);
  });
});
