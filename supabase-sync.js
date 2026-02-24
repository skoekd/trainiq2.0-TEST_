// ==================== SUPABASE CLOUD SYNC (v4) ====================
//
// WHAT THIS FILE DOES:
//   pushToCloud()    — Reads full app state from localStorage and upserts to Supabase.
//   pullFromCloud()  — Fetches state, merges 1RMs, restores to localStorage.
//   browseProfiles() — Lists all saved profiles from Supabase for import.
//   loadProfileById()— Imports a specific profile into the current session.
//
// COMPATIBLE TABLE SCHEMA (user_data — 3 columns only):
//   key_name   TEXT  (primary key, e.g. "trainiq:<uuid>")
//   created_at TIMESTAMPTZ
//   Content    JSONB
//
// The sync timestamp is stored inside Content._syncedAt — no extra column needed.
// Do NOT add updated_at unless you also update all queries here.

const SUPABASE_URL = 'https://mujacewgojnbgbtxovkw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11amFjZXdnb2puYmdidHhvdmt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5OTk4NDMsImV4cCI6MjA4NTU3NTg0M30.ed6BEfgZqhgK9SZ78SxPxdCXbb0U9O8JZg5xGQBBe34';

// ---------------------------------------------------------------------------
// CLIENT INITIALISATION
// ---------------------------------------------------------------------------
let supabaseClient = null;

try {
    const { createClient } = supabase;
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase connected');
} catch (err) {
    console.error('❌ Supabase init failed:', err);
}

// ---------------------------------------------------------------------------
// PUSH — write localStorage state to Supabase
// ---------------------------------------------------------------------------
async function pushToCloud() {
    if (!supabaseClient) {
        alert('⚠️ Cloud sync unavailable.\n\nSupabase failed to initialise — check the browser console.');
        return;
    }

    try {
        const profileId = _syncGetProfileId();
        const stateKey  = `trainiq:${profileId}:state`;
        const raw       = localStorage.getItem(stateKey);

        if (!raw) {
            alert('❌ Nothing to save.\n\nGenerate a program first, then press Save to Cloud.');
            return;
        }

        const state       = JSON.parse(raw);
        const now         = new Date().toISOString();
        state._syncedAt   = now;          // stamp so pull can show "last synced"

        // Persist the stamped copy locally so timestamps stay consistent
        localStorage.setItem(stateKey, JSON.stringify(state));

        // NOTE: user_data table only has: key_name, created_at, Content.
        // No updated_at column exists — Supabase throws 42703 if you include it.
        // The sync timestamp lives inside Content._syncedAt instead.
        const payload = {
            key_name: `trainiq:${profileId}`,
            Content:  state
        };

        const { error } = await supabaseClient
            .from('user_data')
            .upsert(payload, { onConflict: 'key_name' });

        if (error) throw error;

        const summary = _buildSyncSummary(state);
        alert('✅ Saved to cloud!\n\n' + summary);
        console.log('☁️  Push OK — profile:', profileId, '— synced at:', now);

    } catch (err) {
        console.error('pushToCloud error:', err);
        alert('❌ Save failed:\n' + err.message + '\n\nCheck the browser console for details.');
    }
}

// ---------------------------------------------------------------------------
// PULL — fetch Supabase state and restore to localStorage
// ---------------------------------------------------------------------------
async function pullFromCloud() {
    if (!supabaseClient) {
        alert('⚠️ Cloud sync unavailable.\n\nSupabase failed to initialise — check the browser console.');
        return;
    }

    try {
        const profileId = _syncGetProfileId();

        const { data, error } = await supabaseClient
            .from('user_data')
            .select('Content, created_at')
            .eq('key_name', `trainiq:${profileId}`)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                alert('❌ No cloud data found for this profile.\n\nPress "⬆️ Save to Cloud" first.');
            } else {
                throw error;
            }
            return;
        }

        if (!data?.Content) {
            alert('❌ Cloud record is empty.');
            return;
        }

        const cloudState = data.Content;

        // Show a meaningful preview so the user knows what they're about to load
        const syncedAt = cloudState._syncedAt || data.created_at;
        const lastSynced = syncedAt
            ? new Date(syncedAt).toLocaleString()
            : 'Unknown';
        const summary = _buildSyncSummary(cloudState);

        const confirmed = confirm(
            '⚠️  This will REPLACE your current local data with the cloud copy.\n\n' +
            'Cloud last synced: ' + lastSynced + '\n\n' +
            summary + '\n\n' +
            'Continue?'
        );
        if (!confirmed) return;

        // FIX: Merge 1RM values — cloud wins for any filled (>0) value.
        // If the cloud copy is blank/zero for a lift but the local copy has a
        // value, keep the local value.  This prevents a device that never had
        // 1RMs entered from silently wiping carefully set values on another device.
        const stateKey = `trainiq:${profileId}:state`;
        const rawLocal = localStorage.getItem(stateKey);
        if (rawLocal) {
            try {
                const localState    = JSON.parse(rawLocal);
                const localOneRMs   = localState?.config?.oneRMs;
                const cloudOneRMs   = cloudState?.config?.oneRMs;
                if (localOneRMs && cloudOneRMs && cloudState.config) {
                    const merged = { ...localOneRMs };
                    Object.keys(cloudOneRMs).forEach(k => {
                        const v = parseFloat(cloudOneRMs[k]);
                        if (!isNaN(v) && v > 0) merged[k] = cloudOneRMs[k];
                    });
                    cloudState.config.oneRMs = merged;
                }
            } catch (_) {
                // merge failed — proceed with cloud state as-is; no data loss
            }
        }

        localStorage.setItem(stateKey, JSON.stringify(cloudState));
        alert('✅ Cloud data loaded!\n\nLast synced: ' + lastSynced + '\n\nReloading…');
        setTimeout(() => window.location.reload(), 500);

    } catch (err) {
        console.error('pullFromCloud error:', err);
        alert('❌ Load failed:\n' + err.message + '\n\nCheck the browser console for details.');
    }
}

// ---------------------------------------------------------------------------
// BROWSE — list every saved profile from Supabase
// ---------------------------------------------------------------------------
// NOTE: Your Supabase project has RLS disabled (visible in the dashboard).
// This means browseProfiles() returns ALL rows from ALL users — not just your
// own profile.  This is intentional for a shared-device gym scenario but
// should be restricted with Row Level Security before any public release.
// SQL to enable per-user scoping once you add auth:
//   ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "users_own_rows" ON user_data USING (key_name = current_user);
async function browseProfiles() {
    if (!supabaseClient) {
        return { error: 'Supabase not connected. Check console for details.', profiles: [] };
    }
    try {
        const { data, error } = await supabaseClient
            .from('user_data')
            .select('key_name, created_at, Content')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            return { error: null, profiles: [] };
        }

        // Transform rows into display-friendly profile objects
        const profiles = data.map(row => {
            const keyName   = row.key_name || '';
            const content   = row.Content || {};
            const cfg       = content.config || {};
            const prog      = content.program;
            const syncedAt  = content._syncedAt || row.created_at;

            // Strip the "trainiq:" prefix to show a clean ID in the UI
            const displayId = keyName.replace(/^trainiq:/, '');
            // Truncate UUID to first 8 chars for readability
            const shortId   = displayId.length > 8 ? displayId.slice(0, 8) + '…' : displayId;

            let weekCount = 0;
            let exCount   = 0;
            let hasSetLog = false;
            if (prog && Array.isArray(prog.weeks)) {
                weekCount = prog.weeks.length;
                prog.weeks.forEach(wk => {
                    (wk.workouts || []).forEach(wo => {
                        (wo.exercises || []).forEach(ex => {
                            exCount++;
                            if (Array.isArray(ex.setLog) && ex.setLog.some(s => s.weight || s.reps)) {
                                hasSetLog = true;
                            }
                        });
                    });
                });
            }

            return {
                keyName,          // full "trainiq:<uuid>" key — used to fetch
                displayId,        // full uuid
                shortId,          // truncated for UI
                programType: cfg.programType || '—',
                experience:  cfg.experience  || '—',
                days:        cfg.days        || '—',
                weekCount,
                exCount,
                hasSetLog,
                syncedAt:    syncedAt ? new Date(syncedAt).toLocaleString() : 'Unknown',
                rawContent:  content         // kept so loadProfileById can use it directly
            };
        });

        return { error: null, profiles };

    } catch (err) {
        console.error('browseProfiles error:', err);
        return { error: err.message, profiles: [] };
    }
}

// ---------------------------------------------------------------------------
// LOAD A SPECIFIC PROFILE — import another profile's data into the current session
// ---------------------------------------------------------------------------
async function loadProfileById(keyName, rawContent) {
    // rawContent is passed from the browse result so we don't need an extra
    // round-trip to Supabase. If absent we re-fetch (defensive fallback).
    try {
        let cloudState = rawContent || null;

        if (!cloudState) {
            if (!supabaseClient) throw new Error('Supabase not connected');
            const { data, error } = await supabaseClient
                .from('user_data')
                .select('Content, created_at')
                .eq('key_name', keyName)
                .single();
            if (error) throw error;
            cloudState = data?.Content;
        }

        if (!cloudState) {
            alert('❌ The selected profile has no data.');
            return false;
        }

        // Write to the CURRENT profile's localStorage key so the app picks it
        // up on reload — we never redirect the user to a different profile URL.
        const currentProfileId = _syncGetProfileId();
        const stateKey         = `trainiq:${currentProfileId}:state`;

        // Merge 1RMs: same logic as pullFromCloud — never silently wipe local values
        const rawLocal = localStorage.getItem(stateKey);
        if (rawLocal) {
            try {
                const localState  = JSON.parse(rawLocal);
                const localOneRMs = localState?.config?.oneRMs;
                const cloudOneRMs = cloudState?.config?.oneRMs;
                if (localOneRMs && cloudOneRMs && cloudState.config) {
                    const merged = { ...localOneRMs };
                    Object.keys(cloudOneRMs).forEach(k => {
                        const v = parseFloat(cloudOneRMs[k]);
                        if (!isNaN(v) && v > 0) merged[k] = cloudOneRMs[k];
                    });
                    cloudState.config.oneRMs = merged;
                }
            } catch (_) { /* proceed with cloud state as-is */ }
        }

        localStorage.setItem(stateKey, JSON.stringify(cloudState));
        return true;

    } catch (err) {
        console.error('loadProfileById error:', err);
        alert('❌ Failed to load profile:\n' + err.message);
        return false;
    }
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

/**
 * Derive the active profile ID.
 *
 * Resolution order:
 *   1. URL hash  (#/u/<id>)  — matches the regex used inside index.html
 *   2. Persisted fallback key in localStorage
 *   3. Generate + persist a new UUID
 *
 * FIX vs original: the original used /#\/u\/([a-f0-9-]+)/i which would fail
 * to match profile IDs containing uppercase characters (UUID v4 is lowercase
 * but crypto.randomUUID() output is implementation-defined).
 * We now use the same /#\/u\/([^/]+)/ pattern as index.html so the two always
 * agree on which profile is active.
 */
function _syncGetProfileId() {
    const hash = window.location.hash || '';
    const m    = hash.match(/#\/u\/([^/]+)/);
    if (m && m[1]) return decodeURIComponent(m[1]);

    const stored = localStorage.getItem('trainiq_default_profile_id');
    if (stored) return stored;

    const newId = (window.crypto?.randomUUID)
        ? window.crypto.randomUUID()
        : (String(Date.now()) + '-' + Math.random().toString(16).slice(2));
    localStorage.setItem('trainiq_default_profile_id', newId);
    return newId;
}

/**
 * Build a concise human-readable summary of a state blob for the confirm dialog.
 */
function _buildSyncSummary(state) {
    if (!state) return '(no data)';
    try {
        const cfg   = state.config || {};
        const prog  = state.program;
        const lines = [];

        if (cfg.programType) lines.push('Program type : ' + cfg.programType);
        if (cfg.experience)  lines.push('Level        : ' + cfg.experience);
        if (cfg.days)        lines.push('Days/week    : ' + cfg.days);

        if (prog?.weeks?.length) {
            lines.push('Weeks        : ' + prog.weeks.length);
            let totalEx = 0, swapped = 0, hasSetLog = false;
            prog.weeks.forEach(wk => {
                (wk.workouts || []).forEach(wo => {
                    (wo.exercises || []).forEach(ex => {
                        totalEx++;
                        if (ex.originalName) swapped++;
                        if (Array.isArray(ex.setLog) && ex.setLog.some(s => s.weight || s.reps)) {
                            hasSetLog = true;
                        }
                    });
                });
            });
            if (totalEx)   lines.push('Exercises    : ' + totalEx);
            if (swapped)   lines.push('Swaps        : ' + swapped + ' exercise(s) customised');
            if (hasSetLog) lines.push('             : ✓ per-set workout log included');
        }

        const filledRMs = Object.values(cfg.oneRMs || {}).filter(v => parseFloat(v) > 0).length;
        if (filledRMs) lines.push('1RM lifts    : ' + filledRMs + ' on file');

        const histLen = Array.isArray(state.history) ? state.history.length : 0;
        if (histLen)  lines.push('History      : ' + histLen + ' saved block(s)');

        return lines.join('\n') || '(empty program)';
    } catch (_) {
        return '(could not read summary)';
    }
}

// Expose globally — called from index.html
window.pushToCloud     = pushToCloud;
window.pullFromCloud   = pullFromCloud;
window.browseProfiles  = browseProfiles;
window.loadProfileById = loadProfileById;

console.log('📦 supabase-sync v3 loaded');
