const { useState, useEffect } = React;

// Simple program generator
function generateSimpleProgram(config) {
    const weeks = [];
    
    for (let w = 1; w <= 12; w++) {
        const phase = getPhaseParams(w);
        const workouts = [];
        
        const daysNum = parseInt(config.days);
        for (let d = 0; d < daysNum; d++) {
            const exercises = [
                {
                    name: d % 2 === 0 ? "Barbell Bench Press" : "Back Squat",
                    sets: phase.isDeload ? 2 : 4,
                    reps: [6, 10],
                    rir: 2,
                    rest: "2-3min",
                    type: "compound",
                    role: "main",
                    weight: null
                },
                {
                    name: d % 2 === 0 ? "Lat Pulldown" : "Romanian Deadlift",
                    sets: phase.isDeload ? 2 : 3,
                    reps: [8, 12],
                    rir: 1,
                    rest: "90s",
                    type: "compound",
                    role: "secondary",
                    weight: null
                }
            ];
            
            workouts.push({
                dayNumber: d + 1,
                dayType: d % 2 === 0 ? "Upper" : "Lower",
                exercises
            });
        }
        
        weeks.push({
            number: w,
            phase: phase.phase,
            deload: phase.isDeload,
            workouts
        });
    }
    
    return {
        weeks,
        config,
        createdAt: new Date().toISOString(),
        workoutHistory: []
    };
}

// Main App Component
function TrainIQ() {
    const [tab, setTab] = useState('home');
    const [config, setConfig] = useState({
        experience: '',
        days: '',
        time: '',
        programType: '',
        oneRMs: { chest: '', shoulders: '', lats: '', quads: '', hamstrings: '' }
    });
    const [program, setProgram] = useState(null);
    const [syncStatus, setSyncStatus] = useState('');
    
    // Load from localStorage on mount
    useEffect(() => {
        const profileId = window.supabaseSync.getProfileId();
        const stateKey = `trainiq:${profileId}:state`;
        const saved = safeLocalStorageGet(stateKey);
        
        if (saved) {
            if (saved.config) setConfig(saved.config);
            if (saved.program) setProgram(saved.program);
        }
    }, []);
    
    // Save to localStorage on change
    useEffect(() => {
        const profileId = window.supabaseSync.getProfileId();
        const stateKey = `trainiq:${profileId}:state`;
        safeLocalStorageSet(stateKey, { config, program });
    }, [config, program]);
    
    // Cloud sync handlers
    const handleCloudPush = async () => {
        setSyncStatus('Syncing...');
        const result = await window.supabaseSync.push();
        if (result.success) {
            setSyncStatus('✅ Synced to cloud');
            setTimeout(() => setSyncStatus(''), 3000);
        } else {
            setSyncStatus('❌ Sync failed');
        }
    };
    
    const handleCloudPull = async () => {
        if (!confirm('Replace local data with cloud data?')) return;
        
        setSyncStatus('Loading...');
        const result = await window.supabaseSync.pull();
        
        if (result.success) {
            setSyncStatus('✅ Loaded from cloud');
            setTimeout(() => window.location.reload(), 1000);
        } else {
            if (result.code === 'PGRST116') {
                alert('No cloud data found. Save to cloud first!');
            } else {
                alert(`Failed: ${result.error}`);
            }
            setSyncStatus('');
        }
    };
    
    const handleGenerate = () => {
        try {
            validateConfig(config);
            const newProgram = generateSimpleProgram(config);
            setProgram(newProgram);
            setTab('workouts');
        } catch (e) {
            alert(e.message);
        }
    };
    
    return (
        <div className="min-h-screen app-bg">
            {/* Cloud Sync Bar */}
            <div style={{background:'#111', padding:'10px', display:'flex', justifyContent:'center', gap:'8px', position:'sticky', top:0, zIndex:10000, borderBottom:'1px solid #444'}}>
                <button onClick={handleCloudPush} style={{background:'#007bff', color:'white', border:'none', padding:'8px 12px', borderRadius:'8px', fontWeight:'bold', cursor:'pointer'}}>
                    ⬆️ Save to Cloud
                </button>
                <button onClick={handleCloudPull} style={{background:'#28a745', color:'white', border:'none', padding:'8px 12px', borderRadius:'8px', fontWeight:'bold', cursor:'pointer'}}>
                    ⬇️ Load from Cloud
                </button>
                {syncStatus && <span style={{color:'white', padding:'8px'}}>{syncStatus}</span>}
            </div>
            
            {tab === 'home' && <HomeScreen config={config} setConfig={setConfig} onGenerate={handleGenerate} />}
            {tab === 'workouts' && program && <WorkoutsScreen program={program} setProgram={setProgram} />}
            {tab === 'settings' && <SettingsScreen />}
            
            <TabBar tab={tab} setTab={setTab} hasProgram={!!program} />
        </div>
    );
}

// Home Screen
function HomeScreen({ config, setConfig, onGenerate }) {
    const isValid = config.experience && config.days && config.time && config.programType;
    
    return (
        <div className="content-with-tabs px-4 pt-8 pb-32 max-w-2xl mx-auto">
            <div className="text-center mb-10">
                <h1 className="font-display text-5xl font-bold mb-1 premium-gradient bg-clip-text text-transparent">TRAINIQ</h1>
                <p className="text-gray-500 text-xs font-semibold tracking-wider">EVIDENCE-BASED TRAINING</p>
            </div>
            
            <div className="space-y-5">
                <div>
                    <label className="block text-xs font-bold text-gray-400 mb-2 tracking-wide">EXPERIENCE LEVEL</label>
                    <div className="grid grid-cols-3 gap-2">
                        {['Beginner', 'Intermediate', 'Advanced'].map(lvl => (
                            <button key={lvl} onClick={() => setConfig({...config, experience: lvl})}
                                className={"p-3 rounded-xl font-semibold text-sm transition btn-touch " +
                                    (config.experience === lvl ? "premium-gradient text-white shadow-lg" : "glass text-gray-300")}>
                                {lvl}
                            </button>
                        ))}
                    </div>
                </div>
                
                <div>
                    <label className="block text-xs font-bold text-gray-400 mb-2 tracking-wide">TRAINING DAYS</label>
                    <div className="grid grid-cols-4 gap-2">
                        {['3', '4', '5', '6'].map(d => (
                            <button key={d} onClick={() => setConfig({...config, days: d})}
                                className={"p-4 rounded-xl font-bold text-2xl transition btn-touch " +
                                    (config.days === d ? "premium-gradient text-white shadow-lg" : "glass text-gray-300")}>
                                {d}
                            </button>
                        ))}
                    </div>
                </div>
                
                <div>
                    <label className="block text-xs font-bold text-gray-400 mb-2 tracking-wide">SESSION LENGTH</label>
                    <div className="grid grid-cols-3 gap-2">
                        {['45min', '60min', '75min'].map(t => (
                            <button key={t} onClick={() => setConfig({...config, time: t})}
                                className={"p-3 rounded-xl font-semibold transition btn-touch " +
                                    (config.time === t ? "premium-gradient text-white shadow-lg" : "glass text-gray-300")}>
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
                
                <div>
                    <label className="block text-xs font-bold text-gray-400 mb-2 tracking-wide">PROGRAM TYPE</label>
                    <select value={config.programType} onChange={(e) => setConfig({...config, programType: e.target.value})}
                        className="w-full p-4 rounded-xl glass bg-black/40 text-white font-semibold border border-white/10 outline-none focus:ring-2 focus:ring-orange-500">
                        <option value="">Select Program Type</option>
                        <option value="Hypertrophy">Hypertrophy</option>
                        <option value="Strength">Strength</option>
                        <option value="Powerbuilding">Powerbuilding</option>
                        <option value="Minimalist">Minimalist</option>
                    </select>
                </div>
                
                <button onClick={onGenerate} disabled={!isValid}
                    className={"w-full p-5 rounded-xl font-display font-bold text-lg transition btn-touch " +
                        (isValid ? "premium-gradient text-white shadow-xl" : "glass text-gray-600 cursor-not-allowed")}>
                    GENERATE PROGRAM
                </button>
            </div>
        </div>
    );
}

// Workouts Screen
function WorkoutsScreen({ program, setProgram }) {
    const [week, setWeek] = useState(1);
    const currentWeek = program.weeks[week - 1];
    
    const updateWeight = (workoutIdx, exerciseIdx, weight) => {
        const updated = {...program};
        updated.weeks[week - 1].workouts[workoutIdx].exercises[exerciseIdx].weight = weight;
        setProgram(updated);
    };
    
    return (
        <div className="content-with-tabs">
            <div className="sticky top-0 bg-black/95 backdrop-blur-lg border-b border-white/10 pb-3 z-10">
                <div className="px-4 pt-4">
                    <h2 className="font-display font-bold text-lg">WEEK {week} OF 12</h2>
                    <p className="text-xs text-gray-400 mt-0.5">{currentWeek.phase} Phase</p>
                    <div className="flex gap-2 overflow-x-auto pb-2 mt-3">
                        {program.weeks.map(w => (
                            <button key={w.number} onClick={() => setWeek(w.number)}
                                className={"px-3 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition " +
                                    (week === w.number ? "premium-gradient text-white" :
                                     w.deload ? "bg-yellow-500/20 text-yellow-400" : "glass text-gray-400")}>
                                {w.deload ? `W${w.number} ↓` : `W${w.number}`}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            
            <div className="px-4 py-4 space-y-3">
                {currentWeek.workouts.map((workout, wIdx) => (
                    <div key={wIdx} className="glass rounded-xl p-4">
                        <h3 className="font-bold mb-3">Day {workout.dayNumber} - {workout.dayType}</h3>
                        {workout.exercises.map((ex, eIdx) => (
                            <div key={eIdx} className="mb-4 p-3 rounded-lg bg-black/50">
                                <div className="font-semibold text-sm mb-2">{ex.name}</div>
                                <div className="text-xs text-gray-400 mb-2">
                                    {ex.sets} sets × {ex.reps[0]}-{ex.reps[1]} reps @ {ex.rir} RIR
                                </div>
                                <input
                                    type="number"
                                    placeholder="Enter weight (lbs)"
                                    value={ex.weight || ''}
                                    onChange={(e) => updateWeight(wIdx, eIdx, e.target.value)}
                                    className="w-full p-2 rounded bg-black/50 border border-white/10 text-white text-sm"
                                />
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

// Settings Screen
function SettingsScreen() {
    const profileId = window.supabaseSync.getProfileId();
    const profileLink = `${window.location.origin}${window.location.pathname}#/u/${profileId}`;
    
    return (
        <div className="content-with-tabs px-4 py-6">
            <h2 className="text-2xl font-display font-bold mb-4">SETTINGS</h2>
            
            <div className="glass rounded-xl p-4 mb-4">
                <h3 className="font-bold text-sm mb-2">YOUR PROFILE LINK</h3>
                <p className="text-xs text-gray-400 mb-3">Bookmark this to access your data on any device</p>
                <input readOnly value={profileLink} className="w-full p-2 rounded bg-black/50 border border-white/10 text-white text-xs mb-2" />
                <button onClick={() => {
                    navigator.clipboard.writeText(profileLink);
                    alert('Profile link copied!');
                }} className="w-full p-3 rounded-lg premium-gradient text-white font-bold">
                    COPY LINK
                </button>
            </div>
            
            <button onClick={() => {
                if (confirm('Clear all local data?')) {
                    const profileId = window.supabaseSync.getProfileId();
                    localStorage.removeItem(`trainiq:${profileId}:state`);
                    window.location.reload();
                }
            }} className="w-full p-4 rounded-xl bg-red-500/20 text-red-400 font-bold">
                CLEAR ALL DATA
            </button>
        </div>
    );
}

// Tab Bar
function TabBar({ tab, setTab, hasProgram }) {
    const tabs = [
        { id: 'home', label: 'Home' },
        { id: 'workouts', label: 'Workouts', disabled: !hasProgram },
        { id: 'settings', label: 'Settings' }
    ];
    
    return (
        <div className="tab-bar px-3 pb-4 pt-3">
            <div className="max-w-2xl mx-auto rounded-2xl glass border border-white/10 px-2 py-2 flex justify-around">
                {tabs.map(t => (
                    <button key={t.id} onClick={() => !t.disabled && setTab(t.id)} disabled={t.disabled}
                        className={"flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition " +
                            (tab === t.id ? "text-orange-400 bg-white/5" : t.disabled ? "text-gray-800" : "text-gray-500")}>
                        <span className="text-xs font-bold tracking-wider">{t.label.toUpperCase()}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

// Render app
ReactDOM.render(<TrainIQ />, document.getElementById('root'));
