// Process templates: defines the ordered sequence of processes per item type
// STITCHING: Inspection comes before Stitching (stitching is the final production step)

export const PROCESS_TEMPLATES: Record<string, string[]> = {
  SHEETED: ["Printing", "Pre Fold", "Trimming", "Inspection"],
  FOLDED: ["Printing", "Pre Fold", "Trimming", "Folding", "Inspection"],
  STITCHING: ["Printing", "Pre Fold", "Trimming", "Folding", "Inspection", "Stitching"],
};
