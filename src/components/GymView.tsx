import React, { useState, useRef, useEffect } from "react";
import { Dumbbell, Play, Timer as TimerIcon, Plus, HeartPulse, Video, Bot, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

export function GymView() {
  const [activePlan, setActivePlan] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"workouts" | "recovery" | "custom" | "ai">("workouts");
  const [aiMessage, setAiMessage] = useState("");
  const [aiChat, setAiChat] = useState<{role: 'user' | 'coach', text: string}[]>([
    { role: 'coach', text: 'Hi! I am your AI Coach. What are your fitness goals for today? I can generate a custom workout plan for you.' }
  ]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get("/gym/programs")
      .then(res => setWorkouts(res.data))
      .catch(console.error);
  }, []);

  const handleSendAiMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiMessage.trim()) return;
    const userMsg = aiMessage;
    setAiChat(prev => [...prev, { role: 'user', text: userMsg }]);
    setAiMessage("");
    setIsAiLoading(true);

    try {
      const res = await fetch("/api/ai/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Can you generate a workout plan for: " + userMsg })
      });
      const data = await res.json();
      setAiChat(prev => [...prev, { role: 'coach', text: data.reply || "Sorry, I couldn't process that." }]);
    } catch {
      setAiChat(prev => [...prev, { role: 'coach', text: "Error connecting to AI Coach." }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "ai") {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiChat, activeTab]);

  const renderActiveWorkout = () => {
    const workout = workouts.find(w => w.id === activePlan);
    if (!workout) return null;

    return (
      <div className="bg-brand-surface border border-brand-border rounded-lg overflow-hidden flex flex-col h-full relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-accent/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="p-6 md:p-8 flex-1 overflow-y-auto z-10">
          <button 
            onClick={() => setActivePlan(null)}
            className="text-[11px] font-semibold text-brand-text-secondary uppercase tracking-wider hover:text-brand-text-primary mb-6 transition-colors flex items-center gap-1"
          >
            ← Back to Programs
          </button>
          
          <h2 className="text-2xl font-bold text-brand-text-primary mb-1">{workout.title}</h2>
          <div className="flex items-center gap-3 text-brand-text-secondary text-[13px] mb-8">
            <span className="flex items-center gap-1 font-medium"><TimerIcon className="w-3.5 h-3.5" /> {workout.duration}</span>
            <span>•</span>
            <span className="font-medium">{workout.level}</span>
          </div>

          <div className="space-y-3">
            {workout.exercises.map((ex, idx) => (
              <div key={idx} className="bg-[#212121] border border-brand-border rounded-md p-3 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-brand-accent/30 transition-colors cursor-pointer group">
                <div className="w-full sm:w-28 h-20 sm:h-16 bg-[#111] rounded-[4px] flex items-center justify-center relative overflow-hidden flex-shrink-0 group-hover:bg-[#151515] transition-colors border border-[rgba(255,255,255,0.05)] shadow-inner">
                  <Play className="w-6 h-6 text-[#e5e5e5] opacity-80 group-hover:scale-110 transition-transform" />
                  <div className="absolute bottom-1 right-1 text-[9px] text-[#a3a3a3] bg-black/60 px-1 rounded flex items-center gap-0.5">
                    <Video className="w-2.5 h-2.5" /> {ex.videoDuration}
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-brand-text-primary mb-1.5">{ex.name}</h4>
                  <div className="flex flex-wrap gap-2 text-[12px] text-brand-text-secondary">
                    <span className="font-mono bg-[#111] px-1.5 py-0.5 rounded text-brand-accent border border-[rgba(255,255,255,0.05)]">{ex.sets} Sets</span>
                    <span className="font-mono bg-[#111] px-1.5 py-0.5 rounded border border-[rgba(255,255,255,0.05)]">{ex.reps}</span>
                    <span className="font-mono bg-[#111] px-1.5 py-0.5 rounded text-orange-400 border border-[rgba(255,255,255,0.05)]">{ex.timeSet}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-4 bg-[rgba(33,33,33,0.9)] border-t border-brand-border relative z-10 text-center flex-shrink-0">
          <button className="w-full max-w-sm bg-brand-accent text-[#1e1e1e] font-semibold py-2.5 rounded hover:bg-[#b0d800] transition-colors shadow flex items-center justify-center gap-2 mx-auto text-[14px]">
            <Play className="w-4 h-4 fill-current" /> Start {workout.category === "recovery" ? "Recovery" : "Workout"}
          </button>
        </div>
      </div>
    );
  };

  const filteredWorkouts = workouts.filter(w => w.category === activeTab);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto w-full pb-24 md:pb-10 h-full flex flex-col">
      {!activePlan ? (
        <>
          <header className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
            <div></div>
            <button className="hidden md:flex items-center gap-1.5 bg-brand-surface border border-brand-border hover:bg-brand-surface-light px-3 py-1.5 rounded font-medium transition-colors text-[13px] text-brand-text-primary shadow-sm">
              <Plus className="w-4 h-4" /> Share Plan
            </button>
          </header>

          <div className="flex items-center gap-1 mb-6 bg-[#212121] p-1 rounded-md border border-[rgba(255,255,255,0.05)] w-max overflow-x-auto max-w-full shrink-0">
            <button 
              onClick={() => setActiveTab("workouts")}
              className={cn(
                "px-3 py-1.5 rounded text-[13px] font-medium transition-all flex items-center justify-center gap-1.5 whitespace-nowrap",
                activeTab === "workouts" 
                  ? "bg-[#333] text-brand-text-primary shadow-sm" 
                  : "text-brand-text-secondary hover:text-brand-text-primary"
              )}
            >
              <Dumbbell className="w-3.5 h-3.5" /> Strength
            </button>
            <button 
              onClick={() => setActiveTab("recovery")}
              className={cn(
                "px-3 py-1.5 rounded text-[13px] font-medium transition-all flex items-center justify-center gap-1.5 whitespace-nowrap",
                activeTab === "recovery" 
                  ? "bg-[#333] text-brand-text-primary shadow-sm" 
                  : "text-brand-text-secondary hover:text-brand-text-primary"
              )}
            >
              <HeartPulse className="w-3.5 h-3.5 text-rose-500" /> Recovery
            </button>
            <button 
              onClick={() => setActiveTab("custom")}
              className={cn(
                "px-3 py-1.5 rounded text-[13px] font-medium transition-all flex items-center justify-center gap-1.5 whitespace-nowrap",
                activeTab === "custom" 
                  ? "bg-[#333] text-brand-text-primary shadow-sm" 
                  : "text-brand-text-secondary hover:text-brand-text-primary"
              )}
            >
              <Plus className="w-3.5 h-3.5" /> Custom
            </button>
            <button 
              onClick={() => setActiveTab("ai")}
              className={cn(
                "px-3 py-1.5 rounded text-[13px] font-medium transition-all flex items-center justify-center gap-1.5 whitespace-nowrap",
                activeTab === "ai" 
                  ? "bg-[#333] text-brand-text-primary shadow-sm" 
                  : "text-brand-text-secondary hover:text-brand-text-primary"
              )}
            >
              <Bot className="w-3.5 h-3.5 text-purple-400" /> AI Coach
            </button>
          </div>

          {(activeTab === "workouts" || activeTab === "recovery") && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 overflow-y-auto pb-6">
              {filteredWorkouts.map(w => (
                <div 
                  key={w.id} 
                  onClick={() => setActivePlan(w.id)}
                  className="bg-brand-surface border border-brand-border rounded-md p-5 cursor-pointer hover:border-brand-accent/50 hover:bg-[#2e2e2e] transition-colors flex flex-col group shadow-sm"
                >
                  <div className={cn(
                    "w-10 h-10 rounded flex items-center justify-center mb-5",
                    w.category === "recovery" 
                      ? "bg-rose-500/10 border border-rose-500/20 text-rose-500" 
                      : "bg-[#1e1e1e] border border-brand-border text-brand-accent shadow-inner"
                  )}>
                    {w.category === "recovery" ? <HeartPulse className="w-5 h-5" /> : <Dumbbell className="w-5 h-5" />}
                  </div>
                  <h3 className="text-base font-semibold text-brand-text-primary mb-1 line-clamp-2">{w.title}</h3>
                  <div className="mt-auto pt-4 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-brand-text-secondary">
                    <span className="flex items-center gap-1"><TimerIcon className="w-3.5 h-3.5" /> {w.duration}</span>
                    <span>{w.level}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "custom" && (
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
               <div className="bg-brand-surface border border-brand-border rounded-md p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-brand-accent/50 transition-colors">
                  <div>
                    <h3 className="text-base font-semibold text-brand-text-primary mb-1">My Morning Strength Routine</h3>
                    <div className="flex items-center gap-3 text-[12px] text-brand-text-secondary">
                      <span className="flex items-center gap-1"><TimerIcon className="w-3.5 h-3.5" /> 45 min</span>
                      <span>•</span>
                      <span>6 Exercises</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="bg-brand-surface-light border border-brand-border text-brand-text-primary px-3 py-1.5 rounded text-[12px] font-medium hover:text-brand-accent transition-colors">
                      Edit
                    </button>
                    <button className="bg-[#333] text-brand-text-primary px-3 py-1.5 rounded text-[12px] font-medium hover:bg-brand-accent hover:text-[#1e1e1e] transition-colors">
                      Start
                    </button>
                  </div>
               </div>
               
               <div className="bg-brand-surface border border-brand-border rounded-md p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-brand-accent/50 transition-colors">
                  <div>
                    <h3 className="text-base font-semibold text-brand-text-primary mb-1">Cardio Blaster</h3>
                    <div className="flex items-center gap-3 text-[12px] text-brand-text-secondary">
                      <span className="flex items-center gap-1"><TimerIcon className="w-3.5 h-3.5" /> 30 min</span>
                      <span>•</span>
                      <span>HIIT</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="bg-brand-surface-light border border-brand-border text-brand-text-primary px-3 py-1.5 rounded text-[12px] font-medium hover:text-brand-accent transition-colors">
                      Edit
                    </button>
                    <button className="bg-[#333] text-brand-text-primary px-3 py-1.5 rounded text-[12px] font-medium hover:bg-brand-accent hover:text-[#1e1e1e] transition-colors">
                      Start
                    </button>
                  </div>
               </div>

              <div className="flex flex-col items-center justify-center border-2 border-dashed border-brand-border rounded-md p-8 text-center hover:bg-brand-surface-light/30 transition-colors cursor-pointer group mt-4">
                <div className="w-12 h-12 bg-brand-surface rounded-full border border-brand-border flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm">
                  <Plus className="w-6 h-6 text-brand-accent" />
                </div>
                <h3 className="text-brand-text-primary font-semibold text-sm mb-1">Create New Plan</h3>
                <p className="text-[12px] text-brand-text-secondary max-w-sm">Mix and match exercises to build your own perfect routine.</p>
              </div>
            </div>
          )}

          {activeTab === "ai" && (
            <div className="flex-1 bg-brand-surface border border-brand-border rounded-md overflow-hidden flex flex-col relative bottom-4 shadow-xl">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {aiChat.map((msg, i) => (
                  <div key={i} className={cn("flex max-w-[85%]", msg.role === 'user' ? "ml-auto flex-row-reverse" : "")}>
                    <div className={cn(
                      "w-8 h-8 rounded shrink-0 flex items-center justify-center mr-3 mt-1",
                      msg.role === 'coach' ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "hidden"
                    )}>
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className={cn(
                      "p-3 rounded-md text-[14px] whitespace-pre-wrap leading-relaxed",
                      msg.role === 'user'
                        ? "bg-[#2A2D3A] text-brand-text-primary"
                        : "bg-brand-surface-light border border-brand-border text-brand-text-primary"
                    )}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isAiLoading && (
                  <div className="flex max-w-[85%]">
                    <div className="w-8 h-8 rounded shrink-0 flex items-center justify-center mr-3 mt-1 bg-purple-500/20 text-purple-400 border border-purple-500/30">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="p-3 pr-6 rounded-md bg-brand-surface-light border border-brand-border text-brand-text-primary flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="p-3 border-t border-brand-border bg-[#1A1C23]">
                <form onSubmit={handleSendAiMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={aiMessage}
                    onChange={(e) => setAiMessage(e.target.value)}
                    placeholder="E.g., I want a 3-day bodyweight plan for core..."
                    className="flex-1 bg-[#111] border border-brand-border rounded px-3 h-10 text-[14px] text-brand-text-primary focus:outline-none focus:border-purple-500/50 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!aiMessage.trim() || isAiLoading}
                    className="bg-purple-600 disabled:opacity-50 hover:bg-purple-500 text-white w-10 h-10 rounded flex items-center justify-center transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          )}
        </>
      ) : (
        renderActiveWorkout()
      )}
    </div>
  );
}
