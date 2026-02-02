// ==================== SUPABASE CLOUD SYNC ====================
// 100% Free Cloud Sync with Supabase (No Credit Card Required!)
// Allows users to sync programs across devices with Google Sign-In

// Supabase configuration - YOU NEED TO REPLACE THESE WITH YOUR OWN VALUES
// Get these from: https://supabase.com/dashboard
const supabaseConfig = {
    url: "YOUR_SUPABASE_URL_HERE",
    anonKey: "YOUR_SUPABASE_ANON_KEY_HERE"
};

// Initialize Supabase (only if config is set up)
let supabaseInitialized = false;
let supabase = null;

function initializeSupabase() {
    if (supabaseInitialized) return true;
    
    // Check if Supabase is loaded and config is set
    if (typeof window.supabase === 'undefined') {
        console.warn('Supabase SDK not loaded');
        return false;
    }
    
    if (supabaseConfig.url === "YOUR_SUPABASE_URL_HERE") {
        console.warn('Supabase not configured. Cloud sync disabled.');
        return false;
    }
    
    try {
        supabase = window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey);
        supabaseInitialized = true;
        
        console.log('✅ Supabase initialized successfully');
        return true;
    } catch (error) {
        console.error('Supabase initialization error:', error);
        return false;
    }
}

// ==================== AUTHENTICATION ====================

async function signInWithGoogle() {
    if (!initializeSupabase()) {
        alert('Cloud sync is not configured. Please contact support.');
        return null;
    }
    
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });
        
        if (error) throw error;
        
        console.log('✅ Signed in with Google');
        return data;
    } catch (error) {
        console.error('Sign-in error:', error);
        
        if (error.message.includes('popup')) {
            return null; // User cancelled
        }
        
        alert(`Sign-in failed: ${error.message}`);
        return null;
    }
}

async function signOut() {
    if (!supabase) return;
    
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        console.log('✅ Signed out');
    } catch (error) {
        console.error('Sign-out error:', error);
    }
}

function getCurrentUser() {
    return supabase ? supabase.auth.getUser() : null;
}

function onAuthStateChanged(callback) {
    if (!supabase) return () => {};
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
        callback(session?.user || null);
    });
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        callback(session?.user || null);
    });
    
    return () => subscription.unsubscribe();
}

// ==================== CLOUD STORAGE ====================

async function saveToCloud(userId, data) {
    if (!supabase || !userId) {
        throw new Error('Not authenticated');
    }
    
    try {
        const { error } = await supabase
            .from('user_data')
            .upsert({
                user_id: userId,
                config: data.config || {},
                program: data.program || null,
                history: data.history || [],
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id'
            });
        
        if (error) throw error;
        
        console.log('✅ Saved to cloud');
        return { success: true };
    } catch (error) {
        console.error('Cloud save error:', error);
        return { success: false, error: error.message };
    }
}

async function loadFromCloud(userId) {
    if (!supabase || !userId) {
        throw new Error('Not authenticated');
    }
    
    try {
        const { data, error } = await supabase
            .from('user_data')
            .select('*')
            .eq('user_id', userId)
            .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
            throw error;
        }
        
        if (!data) {
            console.log('No cloud data found');
            return null;
        }
        
        console.log('✅ Loaded from cloud');
        
        return {
            config: data.config || {},
            program: data.program || null,
            history: data.history || [],
            updatedAt: data.updated_at
        };
    } catch (error) {
        console.error('Cloud load error:', error);
        throw error;
    }
}

async function deleteCloudData(userId) {
    if (!supabase || !userId) {
        throw new Error('Not authenticated');
    }
    
    try {
        const { error } = await supabase
            .from('user_data')
            .delete()
            .eq('user_id', userId);
        
        if (error) throw error;
        
        console.log('✅ Cloud data deleted');
        return { success: true };
    } catch (error) {
        console.error('Cloud delete error:', error);
        return { success: false, error: error.message };
    }
}

// ==================== SYNC MANAGER ====================

class SyncManager {
    constructor() {
        this.syncing = false;
        this.lastSync = null;
        this.autoSyncEnabled = true;
        this.syncInterval = null;
    }
    
    async enableAutoSync(callback) {
        this.autoSyncEnabled = true;
        
        // Auto-sync every 30 seconds when user is active
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        this.syncInterval = setInterval(async () => {
            if (this.autoSyncEnabled && !this.syncing) {
                const session = await supabase.auth.getSession();
                if (session?.data?.session?.user) {
                    await this.syncToCloud(callback);
                }
            }
        }, 30000); // 30 seconds
    }
    
    disableAutoSync() {
        this.autoSyncEnabled = false;
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }
    
    async syncToCloud(getLocalData) {
        if (this.syncing) return;
        
        const session = await supabase.auth.getSession();
        const user = session?.data?.session?.user;
        if (!user) return;
        
        this.syncing = true;
        
        try {
            const localData = getLocalData();
            const result = await saveToCloud(user.id, localData);
            
            if (result.success) {
                this.lastSync = new Date();
            }
            
            return result;
        } catch (error) {
            console.error('Sync error:', error);
            return { success: false, error: error.message };
        } finally {
            this.syncing = false;
        }
    }
    
    async syncFromCloud(userId) {
        if (this.syncing) return null;
        
        this.syncing = true;
        
        try {
            const cloudData = await loadFromCloud(userId);
            this.lastSync = new Date();
            return cloudData;
        } catch (error) {
            console.error('Sync error:', error);
            return null;
        } finally {
            this.syncing = false;
        }
    }
    
    getLastSyncTime() {
        if (!this.lastSync) return null;
        
        const now = new Date();
        const diff = now - this.lastSync;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} hr ago`;
        return this.lastSync.toLocaleDateString();
    }
}

// Global sync manager instance
window.syncManager = new SyncManager();

// ==================== EXPORT FUNCTIONS ====================

if (typeof window !== 'undefined') {
    window.supabaseCloudSync = {
        initialize: initializeSupabase,
        signInWithGoogle,
        signOut,
        getCurrentUser,
        onAuthStateChanged,
        saveToCloud,
        loadFromCloud,
        deleteCloudData,
        syncManager: window.syncManager
    };
}
