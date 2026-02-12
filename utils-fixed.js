// ==================== UTILITY FUNCTIONS (FIXED) ====================

// ========== INPUT VALIDATION ==========
function validateConfig(config) {
    const errors = [];
    
    if (!['Beginner', 'Intermediate', 'Advanced'].includes(config.experience)) {
        errors.push('Invalid experience level');
    }
    
    const days = parseInt(config.days);
    if (isNaN(days) || days < 3 || days > 6) {
        errors.push('Days must be 3-6');
    }
    
    const validTypes = [
        'Hypertrophy', 'Strength', 'Powerbuilding', 'Minimalist',
        'Power / Speed-Strength', 'Specialization (Body-Part Focus)',
        'German Volume Training (GVT)', 'Density (EDT-style)',
        'GPP / Conditioning-Integrated'
    ];
    
    if (!validTypes.includes(config.programType)) {
        errors.push('Invalid program type');
    }
    
    if (errors.length > 0) {
        throw new Error(`Validation failed:\n${errors.join('\n')}`);
    }
    
    return config;
}

// ========== WEIGHT CALCULATION ==========
function roundWeight(w) {
    const n = parseFloat(w);
    if (!n || n <= 0) return 0;
    if (n < 100) {
        const m = n % 2.5;
        return m < 1.25 ? Math.floor(n/2.5)*2.5 : Math.ceil(n/2.5)*2.5;
    }
    const m = n % 5;
    return m < 2.5 ? Math.floor(n/5)*5 : Math.ceil(n/5)*5;
}

const NSCA_REP_PCT = [
    { reps: 1, pct: 1.00 },
    { reps: 2, pct: 0.95 },
    { reps: 3, pct: 0.93 },
    { reps: 4, pct: 0.90 },
    { reps: 5, pct: 0.87 },
    { reps: 6, pct: 0.85 },
    { reps: 7, pct: 0.83 },
    { reps: 8, pct: 0.80 },
    { reps: 9, pct: 0.77 },
    { reps: 10, pct: 0.75 },
    { reps: 12, pct: 0.70 }
];

function percentFromRepsToFailure(repsToFailure) {
    const r = Math.max(1, Math.round(repsToFailure));
    if (r <= 12) {
        for (let i = 0; i < NSCA_REP_PCT.length; i++) {
            if (NSCA_REP_PCT[i].reps === r) return NSCA_REP_PCT[i].pct;
            if (NSCA_REP_PCT[i].reps > r) {
                const hi = NSCA_REP_PCT[i];
                const lo = NSCA_REP_PCT[i - 1];
                const t = (r - lo.reps) / (hi.reps - lo.reps);
                return lo.pct + t * (hi.pct - lo.pct);
            }
        }
        return 0.70;
    }
    return Math.max(0.30, 1 / (1 + (r / 30)));
}

// ========== PHASE PARAMETERS ==========
function getPhaseParams(week) {
    if (week <= 4) {
        return { 
            phase: 'Base', 
            volumeMult: week === 4 ? 0.5 : 1.0, 
            intensityAdj: 0,
            isDeload: week === 4 
        };
    } else if (week <= 8) {
        return { 
            phase: 'Intensification', 
            volumeMult: week === 8 ? 0.5 : 0.85, 
            intensityAdj: week === 8 ? -10 : 5,
            isDeload: week === 8 
        };
    } else {
        return { 
            phase: 'Peak', 
            volumeMult: week === 12 ? 0.5 : 0.7, 
            intensityAdj: week === 12 ? -15 : 10,
            isDeload: week === 12 
        };
    }
}

// ========== STORAGE HELPERS ==========
function safeLocalStorageSet(key, value) {
    try {
        const serialized = JSON.stringify(value);
        const sizeKB = new Blob([serialized]).size / 1024;
        
        if (sizeKB > 3000) {
            console.warn(`Large storage item (${sizeKB.toFixed(0)}KB)`);
        }
        
        localStorage.setItem(key, serialized);
        return { success: true, size: sizeKB };
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            console.error('Storage quota exceeded');
            alert('Storage full! Clear old programs in History tab.');
            return { success: false, quotaExceeded: true };
        }
        return { success: false, error: e.message };
    }
}

function safeLocalStorageGet(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        if (item === null) return defaultValue;
        return JSON.parse(item);
    } catch (e) {
        console.error(`Error parsing key "${key}":`, e);
        return defaultValue;
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.validateConfig = validateConfig;
    window.roundWeight = roundWeight;
    window.percentFromRepsToFailure = percentFromRepsToFailure;
    window.getPhaseParams = getPhaseParams;
    window.safeLocalStorageSet = safeLocalStorageSet;
    window.safeLocalStorageGet = safeLocalStorageGet;
}
