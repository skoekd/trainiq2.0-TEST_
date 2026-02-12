// ==================== SUPABASE CLOUD SYNC (FIXED) ====================
// Free cloud sync for TrainIQ using Supabase
// 
// CRITICAL FIXES:
// 1. Uses correct table: trainiq_data (not user_data)
// 2. Uses correct columns: profile_id, state_data (not key_name, Content)
// 3. Proper conflict resolution with timestamps
// 4. Profile ID persistence in URL hash

const SUPABASE_URL = 'https://mujacewgojnbgbtxovkw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11amFjZXdnb2puYmdidHhvdmt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5OTk4NDMsImV4cCI6MjA4NTU3NTg0M30.ed6BEfgZqhgK9SZ78SxPxdCXbb0U9O8JZg5xGQBBe34';

// Initialize Supabase client
let supabaseClient = null;

try {
    const { createClient } = supabase;
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase connected');
} catch (error) {
    console.error('❌ Supabase initialization failed:', error);
}

// Helper: Get profile ID from URL hash with proper fallback
function getProfileIdFromHash() {
    // Priority 1: Check URL hash
    const hash = window.location.hash;
    const match = hash.match(/#\/u\/([a-f0-9-]+)/i);
    if (match && match[1]) {
        // Store in localStorage as backup
        localStorage.setItem('trainiq_current_profile', match[1]);
        return match[1];
    }
    
    // Priority 2: Check localStorage
    const storedProfile = localStorage.getItem('trainiq_current_profile');
    if (storedProfile) {
        // Update URL hash to match
        window.location.hash = `#/u/${storedProfile}`;
        return storedProfile;
    }
    
    // Priority 3: Generate new profile ID
    const newProfileId = generateUUID();
    localStorage.setItem('trainiq_current_profile', newProfileId);
    window.location.hash = `#/u/${newProfileId}`;
    return newProfileId;
}

// Helper: Generate UUID
function generateUUID() {
    if (crypto && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Get complete state from localStorage
function getCompleteState() {
    const profileId = getProfileIdFromHash();
    const stateKey = `trainiq:${profileId}:state`;
    const stateData = localStorage.getItem(stateKey);
    
    if (!stateData) {
        return null;
    }
    
    try {
        return JSON.parse(stateData);
    } catch (e) {
        console.error('Failed to parse state:', e);
        return null;
    }
}

// Save complete state to localStorage
function saveCompleteState(state) {
    const profileId = getProfileIdFromHash();
    const stateKey = `trainiq:${profileId}:state`;
    
    try {
        localStorage.setItem(stateKey, JSON.stringify(state));
        return true;
    } catch (e) {
        console.error('Failed to save state:', e);
        return false;
    }
}

// Push current data to cloud
async function pushToCloud() {
    if (!supabaseClient) {
        alert('⚠️ Cloud sync not configured.\n\nSupabase connection failed.');
        return { success: false, error: 'Not configured' };
    }

    try {
        const profileId = getProfileIdFromHash();
        const state = getCompleteState();
        
        if (!state) {
            alert('❌ No data to sync. Generate a program first!');
            return { success: false, error: 'No data' };
        }

        // Add timestamp to state for conflict resolution
        const stateWithTimestamp = {
            ...state,
            lastSyncedAt: new Date().toISOString()
        };

        // Use correct table name: trainiq_data
        // Use correct columns: profile_id, state_data
        const { data, error } = await supabaseClient
            .from('trainiq_data')
            .upsert({
                profile_id: profileId,
                state_data: stateWithTimestamp,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'profile_id'
            });

        if (error) throw error;

        // Update local state with sync timestamp
        saveCompleteState(stateWithTimestamp);

        console.log('☁️ Data pushed to cloud:', profileId);
        return { success: true, timestamp: new Date().toISOString() };
        
    } catch (error) {
        console.error('Push error:', error);
        return { success: false, error: error.message };
    }
}

// Pull data from cloud to device
async function pullFromCloud() {
    if (!supabaseClient) {
        alert('⚠️ Cloud sync not configured.\n\nSupabase connection failed.');
        return { success: false, error: 'Not configured' };
    }

    try {
        const profileId = getProfileIdFromHash();
        
        // Fetch from Supabase using correct table and columns
        const { data, error } = await supabaseClient
            .from('trainiq_data')
            .select('state_data, updated_at')
            .eq('profile_id', profileId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return { success: false, error: 'No cloud data found', code: 'PGRST116' };
            }
            throw error;
        }

        if (!data || !data.state_data) {
            return { success: false, error: 'Empty cloud data' };
        }

        // Conflict resolution: check timestamps
        const localState = getCompleteState();
        const cloudState = data.state_data;
        
        if (localState && localState.lastSyncedAt && cloudState.lastSyncedAt) {
            const localTime = new Date(localState.lastSyncedAt).getTime();
            const cloudTime = new Date(cloudState.lastSyncedAt).getTime();
            
            // If local is newer, warn user
            if (localTime > cloudTime) {
                const shouldOverwrite = confirm(
                    '⚠️ Your local data is newer than cloud data.\n\n' +
                    `Local: ${new Date(localState.lastSyncedAt).toLocaleString()}\n` +
                    `Cloud: ${new Date(cloudState.lastSyncedAt).toLocaleString()}\n\n` +
                    'Overwrite local with older cloud data?'
                );
                
                if (!shouldOverwrite) {
                    return { success: false, error: 'User cancelled' };
                }
            }
        }

        // Save to localStorage
        saveCompleteState(cloudState);

        console.log('☁️ Data pulled from cloud:', profileId);
        return { 
            success: true, 
            timestamp: data.updated_at,
            state: cloudState
        };
        
    } catch (error) {
        console.error('Pull error:', error);
        return { success: false, error: error.message };
    }
}

// Auto-sync every 30 seconds (if enabled in settings)
let autoSyncInterval = null;

function startAutoSync() {
    if (autoSyncInterval) return;
    
    autoSyncInterval = setInterval(async () => {
        const state = getCompleteState();
        if (state && state.settings && state.settings.autoSync) {
            const result = await pushToCloud();
            if (result.success) {
                console.log('🔄 Auto-sync completed');
            }
        }
    }, 30000); // 30 seconds
}

function stopAutoSync() {
    if (autoSyncInterval) {
        clearInterval(autoSyncInterval);
        autoSyncInterval = null;
    }
}

// Make functions globally available
window.supabaseSync = {
    push: pushToCloud,
    pull: pullFromCloud,
    getProfileId: getProfileIdFromHash,
    startAutoSync,
    stopAutoSync
};

// Start auto-sync on load
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        startAutoSync();
    });
}

console.log('📦 Supabase sync module loaded (FIXED VERSION)');
