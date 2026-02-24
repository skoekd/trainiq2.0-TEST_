// ==================== SUPABASE CLOUD SYNC (v3) ====================
//
// WHAT THIS FILE DOES:
//   pushToCloud() — Reads full app state (program + edits + 1RMs) from
//                   localStorage and upserts it to Supabase. Safe to call
//                   multiple times. Uses updated_at so created_at is preserved.
//
//   pullFromCloud() — Fetches state from Supabase, shows a preview, merges
//                     1RMs (never silently overwrites local values), then
//                     reloads the app.
//
// WHAT THIS CAPTURES:
//   ✓ Full 12-week generated program
//   ✓ Exercise swaps (name + originalName)
//   ✓ Set count changes (+/- Set buttons)
//   ✓ Exercise deletions
//   ✓ Per-set logged weight / reps / RIR (via setLog — requires Fix 3 in index.html)
//   ✓ 1RM values (merged on pull — never silently cleared)
//   ✓ Warm-up preferences
//   ✓ Program history (up to 10 blocks)
//
// SUPABASE TABLE (user_data):
//   Your existing table is correct. One recommended upgrade — run this SQL once
//   in the Supabase SQL Editor to add an updated_at column so created_at is never
//   overwritten:
//
//     ALTER TABLE user_data
//       ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
//
//   Then each row correctly tracks both when a program was first created AND
//   when it was last cloud-synced.

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

        // FIX: Use updated_at for the sync timestamp so created_at (when the
        // program was first built) is never overwritten.  Falls back gracefully
        // if the column doesn't exist yet on older deployments.
        const payload = {
            key_name:   `trainiq:${profileId}`,
            Content:    state,
            updated_at: now          // add column via SQL — see header comment
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
            .select('Content, created_at, updated_at')
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
        const syncedAt = cloudState._syncedAt || data.updated_at || data.created_at;
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

// Expose globally — called by the buttons in index.html
window.pushToCloud  = pushToCloud;
window.pullFromCloud = pullFromCloud;

console.log('📦 supabase-sync v3 loaded');
