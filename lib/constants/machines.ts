/** Maps each machine type to the process step(s) it runs on the production floor.
 * R1-R6 = Printing Press → Printing
 * Polar Cutter = Cutting Machine → Cutting + Trimming
 * MB01-MB04 = Folding Machine → Folding + Pre-Fold/Inspection
 * Muller Martini = Stitching Machine → Stitching
 */
export const MACHINE_PROCESS_AFFINITY: Record<string, string[]> = {
  "Printing Press":    ["Printing"],
  "Cutting Machine":   ["Cutting", "Trimming"],
  "Folding Machine":   ["Folding", "Pre-Fold/Inspection"],
  "Stitching Machine": ["Stitching"],
  "Other":             [],
};
