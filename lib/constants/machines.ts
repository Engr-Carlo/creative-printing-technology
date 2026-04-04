/** Maps each machine type to the process step(s) it runs on the production floor.
 * HP-01..HP-06 = Printing Press → Printing
 * PC-01 = Cutting Machine → Cutting + Trimming
 * MBO-01..MBO-04 = Folding Machine → Folding + Pre-Fold/Inspection
 * MM-01 = Stitching Machine → Stitching
 */
export const MACHINE_PROCESS_AFFINITY: Record<string, string[]> = {
  "Printing Press":    ["Printing"],
  "Cutting Machine":   ["Cutting", "Trimming"],
  "Folding Machine":   ["Folding", "Pre-Fold/Inspection"],
  "Stitching Machine": ["Stitching"],
  "Other":             [],
};
