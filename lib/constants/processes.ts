// Process templates: defines the ordered sequence of processes per item type
// STITCHING: Inspection comes before Stitching (stitching is the final production step)

// Process templates per item type — based on production workflow diagram
// STITCHING: Inspection is the final QC step (after Stitching)
export const PROCESS_TEMPLATES: Record<string, string[]> = {
  SHEETED: ["Printing", "Pre-Fold/Inspection", "Trimming", "Inspection"],
  FOLDED: ["Printing", "Pre-Fold/Inspection", "Trimming", "Folding", "Inspection"],
  STITCHING: ["Printing", "Pre-Fold/Inspection", "Trimming", "Folding", "Stitching", "Inspection"],
};
