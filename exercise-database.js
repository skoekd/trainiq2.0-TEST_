// Exercise database with safety guards
const EXERCISE_DATABASE = {
    chest_horizontal: [
        { name: "Barbell Bench Press", primary: "chest", secondary: ["triceps", "front_delts"], type: "compound", equipment: "barbell", skill: "high", fatigue: "high", repRange: [3, 12] },
        { name: "Dumbbell Bench Press", primary: "chest", secondary: ["triceps", "front_delts"], type: "compound", equipment: "dumbbell", skill: "medium", fatigue: "high", repRange: [6, 15] },
        { name: "Incline Barbell Press", primary: "chest", secondary: ["triceps", "front_delts"], type: "compound", equipment: "barbell", skill: "high", fatigue: "high", repRange: [5, 12] },
        { name: "Machine Chest Press", primary: "chest", secondary: ["triceps"], type: "compound", equipment: "machine", skill: "low", fatigue: "medium", repRange: [8, 20] }
    ],
    chest_isolation: [
        { name: "Cable Flyes", primary: "chest", secondary: [], type: "isolation", equipment: "cable", skill: "low", fatigue: "low", repRange: [10, 20] },
        { name: "Pec Deck", primary: "chest", secondary: [], type: "isolation", equipment: "machine", skill: "low", fatigue: "low", repRange: [12, 25] }
    ],
    back_vertical: [
        { name: "Pull-ups", primary: "lats", secondary: ["biceps"], type: "compound", equipment: "bodyweight", skill: "high", fatigue: "high", repRange: [5, 15] },
        { name: "Lat Pulldown", primary: "lats", secondary: ["biceps"], type: "compound", equipment: "cable", skill: "low", fatigue: "medium", repRange: [8, 15] }
    ],
    back_horizontal: [
        { name: "Barbell Row", primary: "back", secondary: ["biceps", "rear_delts"], type: "compound", equipment: "barbell", skill: "high", fatigue: "high", repRange: [5, 12] },
        { name: "Seated Cable Row", primary: "back", secondary: ["biceps"], type: "compound", equipment: "cable", skill: "low", fatigue: "medium", repRange: [10, 20] }
    ],
    shoulders_press: [
        { name: "Overhead Press", primary: "shoulders", secondary: ["triceps"], type: "compound", equipment: "barbell", skill: "high", fatigue: "high", repRange: [4, 10] },
        { name: "Seated Dumbbell Press", primary: "shoulders", secondary: ["triceps"], type: "compound", equipment: "dumbbell", skill: "medium", fatigue: "high", repRange: [6, 12] }
    ],
    shoulders_lateral: [
        { name: "Lateral Raise", primary: "side_delts", secondary: [], type: "isolation", equipment: "dumbbell", skill: "low", fatigue: "low", repRange: [10, 20] }
    ],
    shoulders_rear: [
        { name: "Face Pull", primary: "rear_delts", secondary: [], type: "isolation", equipment: "cable", skill: "low", fatigue: "low", repRange: [12, 20] }
    ],
    legs_squat: [
        { name: "Back Squat", primary: "quads", secondary: ["glutes", "hamstrings"], type: "compound", equipment: "barbell", skill: "high", fatigue: "very_high", repRange: [3, 10] },
        { name: "Leg Press", primary: "quads", secondary: ["glutes"], type: "compound", equipment: "machine", skill: "low", fatigue: "high", repRange: [8, 20] }
    ],
    legs_hinge: [
        { name: "Romanian Deadlift", primary: "hamstrings", secondary: ["glutes", "back"], type: "compound", equipment: "barbell", skill: "high", fatigue: "high", repRange: [6, 12] },
        { name: "Dumbbell RDL", primary: "hamstrings", secondary: ["glutes"], type: "compound", equipment: "dumbbell", skill: "medium", fatigue: "medium", repRange: [8, 15] }
    ],
    legs_quad_isolation: [
        { name: "Leg Extension", primary: "quads", secondary: [], type: "isolation", equipment: "machine", skill: "low", fatigue: "low", repRange: [10, 20] }
    ],
    legs_hamstring_isolation: [
        { name: "Leg Curl", primary: "hamstrings", secondary: [], type: "isolation", equipment: "machine", skill: "low", fatigue: "low", repRange: [10, 20] }
    ],
    legs_glutes: [
        { name: "Hip Thrust", primary: "glutes", secondary: ["hamstrings"], type: "compound", equipment: "barbell", skill: "medium", fatigue: "medium", repRange: [8, 15] }
    ],
    legs_calves: [
        { name: "Standing Calf Raise", primary: "calves", secondary: [], type: "isolation", equipment: "machine", skill: "low", fatigue: "low", repRange: [10, 20] }
    ],
    arms_biceps: [
        { name: "Barbell Curl", primary: "biceps", secondary: [], type: "isolation", equipment: "barbell", skill: "low", fatigue: "low", repRange: [8, 15] },
        { name: "Dumbbell Curl", primary: "biceps", secondary: [], type: "isolation", equipment: "dumbbell", skill: "low", fatigue: "low", repRange: [8, 15] }
    ],
    arms_triceps: [
        { name: "Tricep Pushdown", primary: "triceps", secondary: [], type: "isolation", equipment: "cable", skill: "low", fatigue: "low", repRange: [10, 20] },
        { name: "Overhead Extension", primary: "triceps", secondary: [], type: "isolation", equipment: "dumbbell", skill: "low", fatigue: "low", repRange: [10, 15] }
    ],
    core_antiextension: [
        { name: "Plank", primary: "core", secondary: [], type: "isolation", equipment: "bodyweight", skill: "low", fatigue: "low", repRange: [30, 60] }
    ],
    core_antirotation: [
        { name: "Pallof Press", primary: "core", secondary: [], type: "isolation", equipment: "cable", skill: "low", fatigue: "low", repRange: [10, 15] }
    ]
};
