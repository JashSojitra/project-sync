export const CHECKPOINTS = [
  { id: "entrance", name: "Main Entrance", x: 57, y: 168, instruction: "Check that the entrance and accessible path are clear." },
  { id: "reception", name: "Security Reception", x: 57, y: 103, instruction: "Review the handover log at the security desk." },
  { id: "corridor", name: "East Corridor", x: 157, y: 103, instruction: "Check that the corridor and marked exits are unobstructed." },
  { id: "equipment", name: "Equipment Room", x: 245, y: 103, instruction: "Check the exterior of the equipment room and note any issue." },
  { id: "exit", name: "Rear Exit", x: 245, y: 40, instruction: "Check that the exit route is clear and the door closes properly." },
] as const;
