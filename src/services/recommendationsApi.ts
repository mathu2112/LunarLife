import { generatePredictiveAnalyticsReport, getAvailableCrewProfiles } from '../analytics/analyticsService';
import { getDefaultDailyHealthRecords, getDefaultAstronautProfiles } from '../analytics/dataLoader';
import { getAssessmentHistory } from '../assessment/historyStorage';

const API_BASE = import.meta.env.VITE_RECOMMENDATIONS_API_URL || 'http://127.0.0.1:8000';

export type Priority = 'routine' | 'attention' | 'urgent';
export interface ApiRecommendation {
  category: 'medical_review' | 'sleep' | 'stress' | 'exercise' | 'preventive';
  title: string;
  description: string;
  priority: Priority;
}
export interface ApiTask {
  id: string;
  astronaut_id?: string;
  title: string;
  reason: string;
  priority: Priority;
  status: 'pending' | 'completed';
  due: string;
}
export interface RecommendationResponse {
  astronaut_id: string;
  recommendations: ApiRecommendation[];
  follow_up_tasks: ApiTask[];
  demo_only?: boolean;
}
export const crewProfiles = getAvailableCrewProfiles();

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API error ${response.status}: ${body.slice(0, 300)}`);
  }
  return response.json() as Promise<T>;
}

/** Only records for the exact same astronaut ID are combined. */
export function buildHealthInput(astronautId: string) {
  const records = getDefaultDailyHealthRecords().filter(r => r.astronaut_id === astronautId);
  const profile = getDefaultAstronautProfiles().find(p => p.astronaut_id === astronautId);
  if (!records.length || !profile) throw new Error(`No matching telemetry and baseline for ${astronautId}`);
  const latest = records[records.length - 1];
  const report = generatePredictiveAnalyticsReport(astronautId, '30d');
  if (report.isInsufficientData) throw new Error(report.insufficientDataReason || 'Insufficient data');

  const mapping = {
    sleep_decline: 'sleep_decline',
    high_stress: 'stress_increase',
    elevated_hr: 'unusual_heart_rate',
    compound_fatigue: 'persistent_fatigue',
  } as const;
  const findings = report.potentialRisks.flatMap(risk => {
    const code = mapping[risk.category as keyof typeof mapping];
    return code ? [{ code, detail: risk.description.slice(0, 500) }] : [];
  });
  // Other risk categories are not silently converted into unsupported backend codes.
  const recentAssessment = getAssessmentHistory().find(a => a.astronautId === astronautId);
  const symptoms = recentAssessment?.symptomReport.selectedSymptoms || [];
  const baselineExercise = profile.baseline_exercise_minutes;
  const stress = latest.stress_score_1_to_5;
  return {
    astronaut_id: astronautId,
    sleep_hours: Number.isFinite(latest.sleep_hours) ? latest.sleep_hours : null,
    baseline_sleep_hours: profile.baseline_sleep_hours > 0 ? profile.baseline_sleep_hours : null,
    // Analytics stress is 1–5; backend expects 0–10. Preserve scale proportionally.
    stress_level: Number.isFinite(stress) ? Math.max(0, Math.min(10, Math.round(stress * 2))) : null,
    activity_status: latest.exercise_minutes < baselineExercise * 0.7 ? 'low' : 'normal',
    fatigue: symptoms.includes('fatigue'),
    dizziness: symptoms.includes('dizziness'),
    chest_pain: false, // Assessment symptom taxonomy does not expose chest pain.
    unusual_heart_rate: report.potentialRisks.some(r => r.category === 'elevated_hr'),
    findings,
  };
}

export function generateRecommendations(astronautId: string) {
  return request<RecommendationResponse>('/recommendations/generate', {
    method: 'POST', body: JSON.stringify(buildHealthInput(astronautId)),
  });
}
export async function loadRecommendations(astronautId: string) {
  const [recommendations, tasks] = await Promise.all([
    request<{ recommendations: ApiRecommendation[] }>(`/recommendations/${encodeURIComponent(astronautId)}`),
    request<{ tasks: ApiTask[] }>(`/tasks/${encodeURIComponent(astronautId)}`),
  ]);
  return { recommendations: recommendations.recommendations, follow_up_tasks: tasks.tasks };
}
export function setTaskStatus(taskId: string, status: ApiTask['status']) {
  return request<ApiTask>(`/tasks/${encodeURIComponent(taskId)}`, {
    method: 'PATCH', body: JSON.stringify({ status }),
  });
}
