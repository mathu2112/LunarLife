import React, { useCallback, useEffect, useState } from 'react';
import { Card, Badge, PageHeader } from '../components';
import { getAssessmentHistory } from '../assessment/historyStorage';
import {
  crewProfiles, generateRecommendations, loadRecommendations, setTaskStatus,
  type ApiRecommendation, type ApiTask,
} from '../services/recommendationsApi';

const categoryNames: Record<ApiRecommendation['category'], string> = {
  medical_review: 'Medical Review', sleep: 'Sleep Management', stress: 'Stress Management',
  exercise: 'Physical Activity', preventive: 'Preventive Health',
};
const priorityStyles = {
  routine: 'bg-emerald-50 text-emerald-700',
  attention: 'bg-amber-50 text-amber-800',
  urgent: 'bg-rose-50 text-rose-800',
};

export function HealthRecommendations() {
  const [astronautId, setAstronautId] = useState(crewProfiles[0]?.astronaut_id || '');
  const [recommendations, setRecommendations] = useState<ApiRecommendation[]>([]);
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  const refresh = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const result = await loadRecommendations(id);
      setRecommendations(result.recommendations);
      setTasks(result.follow_up_tasks);
      setHasGenerated(result.recommendations.length > 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load recommendations');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(astronautId); }, [astronautId, refresh]);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateRecommendations(astronautId);
      setRecommendations(result.recommendations);
      // Load all tasks, including previously completed ones, from persistent storage.
      const saved = await loadRecommendations(astronautId);
      setTasks(saved.follow_up_tasks);
      setHasGenerated(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to generate recommendations');
    } finally { setLoading(false); }
  };

  const toggleTask = async (task: ApiTask) => {
    setError(null);
    try {
      const updated = await setTaskStatus(task.id, task.status === 'completed' ? 'pending' : 'completed');
      setTasks(previous => previous.map(item => item.id === updated.id ? updated : item));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to update task');
    }
  };

  const categories = ['All', ...Object.values(categoryNames)];
  const visible = filter === 'All' ? recommendations : recommendations.filter(r => categoryNames[r.category] === filter);
  const completed = tasks.filter(t => t.status === 'completed').length;
  const assessment = getAssessmentHistory().find(a => a.astronautId === astronautId);

  return (
    <div className="space-y-6">
      <PageHeader category="Personalised Health Profile" title="Health Recommendations"
        description="Recommendations generated from this astronaut's simulated telemetry, predictive risk report and matching assessment symptoms." />
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-3">
        <label htmlFor="rec-astronaut" className="text-sm font-semibold text-slate-700">Astronaut</label>
        <select id="rec-astronaut" value={astronautId} onChange={e => setAstronautId(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm" disabled={loading}>
          {crewProfiles.map(p => <option key={p.astronaut_id} value={p.astronaut_id}>{p.display_name} ({p.astronaut_id})</option>)}
        </select>
        <button type="button" onClick={() => void generate()} disabled={loading || !astronautId}
          className="rounded-lg bg-sky-600 text-white text-sm font-semibold px-4 py-2 disabled:opacity-50">
          {loading ? 'Working…' : 'Generate from health data'}
        </button>
        <button type="button" onClick={() => void refresh(astronautId)} disabled={loading}
          className="rounded-lg border border-slate-300 text-sm px-4 py-2 disabled:opacity-50">Refresh</button>
      </div>
      <p className="text-xs text-slate-500">Prototype demonstration only. Recommendations are not clinically validated or a replacement for mission medical personnel. Each generation saves a new set of follow-up tasks.</p>
      {assessment?.escalation.isEscalated && (
        <div role="alert" className="rounded-lg border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900">
          <strong>Assessment escalation:</strong> {assessment.escalation.headline}. Follow mission medical protocols; do not rely on routine recommendations.
        </div>
      )}
      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}. Check that FastAPI is running on port 8000.</div>}
      <div className="flex flex-wrap gap-2">
        {categories.map(cat => <button key={cat} type="button" onClick={() => setFilter(cat)}
          className={`rounded-lg px-3 py-2 text-xs font-medium ${filter === cat ? 'bg-sky-600 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>{cat}</button>)}
      </div>
      {!hasGenerated && !loading && <div className="rounded-lg bg-sky-50 p-5 text-sm text-sky-900">No saved recommendations for this astronaut yet. Select an astronaut and click “Generate from health data”.</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visible.map((rec, index) => (
          <div key={`${rec.category}-${rec.title}-${index}`} className="rounded-xl bg-white border border-slate-200 p-5 space-y-2">
            <div className="flex justify-between gap-2"><h3 className="font-semibold text-sm">{rec.title}</h3>
              <span className={`rounded px-2 py-1 text-xs ${priorityStyles[rec.priority]}`}>{rec.priority}</span></div>
            <p className="text-xs text-slate-600 leading-relaxed">{rec.description}</p>
            <Badge variant="neutral" size="sm">{categoryNames[rec.category]}</Badge>
          </div>
        ))}
      </div>
      <Card title="Follow-Up Tasks & Action Items" subtitle="Saved on the FastAPI backend; completion persists after refreshing."
        action={<span className="text-xs font-semibold">{completed} / {tasks.length} Completed</span>}>
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-4">
          <div className="bg-sky-600 h-full" style={{ width: `${tasks.length ? Math.round(completed / tasks.length * 100) : 0}%` }} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tasks.map(task => <button key={task.id} type="button" onClick={() => void toggleTask(task)}
            className="text-left border border-slate-200 rounded-lg p-3 hover:bg-slate-50">
            <div className="flex justify-between gap-2"><span className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-slate-400' : ''}`}>{task.title}</span>
              <span className={`text-xs ${priorityStyles[task.priority]}`}>{task.priority}</span></div>
            <p className="text-xs text-slate-500 mt-1">{task.reason}</p>
            <p className="text-xs text-sky-700 mt-2">{task.status === 'completed' ? '✓ Completed' : '○ Pending'} · Due: {task.due.replace(/_/g, ' ')}</p>
          </button>)}
        </div>
      </Card>
    </div>
  );
}
