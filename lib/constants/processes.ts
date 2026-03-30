// Process templates: defines the ordered sequence of processes per item type
// STITCHING: Inspection comes before Stitching (stitching is the final production step)

// Process templates per item type — based on production workflow diagram
// STITCHING: Inspection is the final QC step (after Stitching)
export const PROCESS_TEMPLATES: Record<string, string[]> = {
  SHEETED: ["Cutting", "Printing", "Pre-Fold/Inspection", "Trimming", "Inspection"],
  FOLDED: ["Cutting", "Printing", "Pre-Fold/Inspection", "Trimming", "Folding", "Inspection"],
  STITCHING: ["Cutting", "Printing", "Pre-Fold/Inspection", "Trimming", "Folding", "Stitching", "Inspection"],
};

/**
 * Maps a process name to the inventory materials it consumes.
 * - materialName: must match InventoryItem.name exactly (see seed-inventory.ts)
 * - qtyFormula: function of targetOutput → required quantity
 * - ifColor: when defined, this material only applies when item.color matches the value
 */
export interface ProcessMaterialTemplate {
  materialName: string;
  /** Inventory unit (e.g. "reams", "kg", "rolls") — used to auto-create item if not seeded */
  unit: string;
  qtyFormula: (targetOutput: number) => number;
  /** If set, material only applies when item.color strictly equals this string */
  ifColor?: string;
  /** If set, material is skipped when item.color strictly equals this string */
  excludeIfColor?: string;
}

export const PROCESS_MATERIAL_TEMPLATES: Record<string, ProcessMaterialTemplate[]> = {
  // Cutting consumes paper stock (reams). 1 ream ≈ 500 sheets.
  Cutting: [
    { materialName: "Paper Stock",     unit: "reams", qtyFormula: (t) => Math.ceil(t / 500) },
  ],
  // Printing: Ink-Black is default; Ink-Color only when color = "Two Colors".
  Printing: [
    { materialName: "Ink - Black",     unit: "kg",    qtyFormula: (t) => Math.ceil(t / 2000), excludeIfColor: "Two Colors" },
    { materialName: "Ink - Color",     unit: "kg",    qtyFormula: (t) => Math.ceil(t / 1000), ifColor: "Two Colors" },
  ],
  // Folding uses adhesive.
  Folding: [
    { materialName: "Adhesive / Glue", unit: "kg",    qtyFormula: (t) => Math.ceil(t / 5000) },
  ],
  // Stitching uses wire.
  Stitching: [
    { materialName: "Stitching Wire",  unit: "rolls", qtyFormula: (t) => Math.ceil(t / 2000) },
  ],
  // These processes consume no tracked inventory:
  "Pre-Fold/Inspection": [],
  Trimming: [],
  Inspection: [],
};
