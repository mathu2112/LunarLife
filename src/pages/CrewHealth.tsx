

import { useEffect, useState } from 'react';
import {
  UsersRound,
  HeartPulse,
  Moon,
  Activity,
  Droplets,
  FlaskConical,
  AlertCircle,
  Loader2,
  CalendarDays,
  ShieldCheck,
  Thermometer,
  ArrowUpRight,
} from 'lucide-react';

import {
  loadAllHealthDatasets,
  type CsvRow,
} from '../services/healthDataService';

import { ResearchDataAnalysis } from '../components/ResearchDataAnalysis';

type HealthDatasets = Awaited<
  ReturnType<typeof loadAllHealthDatasets>
>;

function formatValue(value?: string): string {
  if (!value || value.trim() === '') return '—';

  const number = Number(value);

  return Number.isFinite(number) ? number.toFixed(1) : '—';
}

function getLatestRecords(rows: CsvRow[]): CsvRow[] {
  const latest = new Map<string, CsvRow>();

  rows.forEach((row) => {
    const id = row.astronaut_id;

    if (!id) return;

    const existing = latest.get(id);

    if (!existing || row.date > existing.date) {
      latest.set(id, row);
    }
  });

  return Array.from(latest.values()).sort((a, b) =>
    a.astronaut_id.localeCompare(b.astronaut_id)
  );
}

function hasReportedSymptoms(record?: CsvRow): boolean {
  const symptoms = record?.symptoms?.trim().toLowerCase();

  return Boolean(
    symptoms &&
    !['none', 'n/a', 'na', 'no symptoms'].includes(symptoms)
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  unit,
  color,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  unit?: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5">
      <div className="flex items-center gap-2 mb-2">
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-xs font-medium text-slate-500">{label}</span>
      </div>

      <p className="text-xl font-bold tracking-tight text-slate-900">
        {value}
        {unit && (
          <span className="ml-1 text-xs font-medium text-slate-400">
            {unit}
          </span>
        )}
      </p>
    </div>
  );
}

function CrewMemberCard({
  profile,
  dailyRecord,
}: {
  profile: CsvRow;
  dailyRecord?: CsvRow;
}) {
  const hasSymptoms = hasReportedSymptoms(dailyRecord);
  const symptoms = dailyRecord?.symptoms?.trim();

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:border-sky-200 hover:shadow-md">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-sky-100 bg-sky-50">
              <UsersRound className="h-5 w-5 text-sky-700" />
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-base font-bold text-slate-900">
                {profile.display_name}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                {profile.astronaut_id} · {profile.mission_role}
              </p>
            </div>
          </div>

          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
              hasSymptoms
                ? 'border border-amber-200 bg-amber-50 text-amber-700'
                : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            {hasSymptoms ? 'Symptom reported' : 'No symptoms recorded'}
          </span>
        </div>

        {dailyRecord ? (
          <>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Metric
                icon={HeartPulse}
                label="Heart rate"
                value={formatValue(dailyRecord.heart_rate_bpm)}
                unit="bpm"
                color="bg-rose-50 text-rose-600"
              />

              <Metric
                icon={Droplets}
                label="Blood oxygen"
                value={formatValue(dailyRecord.spo2_percent)}
                unit="%"
                color="bg-sky-50 text-sky-600"
              />

              <Metric
                icon={Activity}
                label="Blood pressure"
                value={`${formatValue(dailyRecord.systolic_bp_mmhg)}/${formatValue(dailyRecord.diastolic_bp_mmhg)}`}
                unit="mmHg"
                color="bg-violet-50 text-violet-600"
              />

              <Metric
                icon={Moon}
                label="Sleep duration"
                value={formatValue(dailyRecord.sleep_hours)}
                unit="hrs"
                color="bg-indigo-50 text-indigo-600"
              />

              <Metric
                icon={Thermometer}
                label="Temperature"
                value={formatValue(dailyRecord.body_temperature_c)}
                unit="°C"
                color="bg-orange-50 text-orange-600"
              />

              <Metric
                icon={Activity}
                label="Exercise"
                value={formatValue(dailyRecord.exercise_minutes)}
                unit="min"
                color="bg-emerald-50 text-emerald-600"
              />
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <CalendarDays className="h-3.5 w-3.5" />
                Latest record
              </span>
              <span className="text-xs font-medium text-slate-600">
                {dailyRecord.date}
              </span>
            </div>

            {hasSymptoms && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div>
                  <p className="text-xs font-semibold text-amber-800">
                    Reported observation
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-amber-700">
                    {symptoms}
                  </p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
            No daily health record available.
          </div>
        )}
      </div>
    </article>
  );
}

export function CrewHealth() {
  const [datasets, setDatasets] = useState<HealthDatasets | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function fetchCrewData() {
      try {
        const result = await loadAllHealthDatasets();

        if (active) {
          setDatasets(result);
          setError('');
        }
      } catch (error) {
  console.error('Error loading crew health data:', error);

  setError(
    error instanceof Error
      ? error.message
      : 'An unknown error occurred while loading crew health data.'
  );
     
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchCrewData();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center gap-3 text-sm text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
        Loading crew health information...
      </div>
    );
  }

  if (error || !datasets) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-white p-6">
        <div className="flex items-center gap-3 text-rose-600">
          <AlertCircle className="h-5 w-5" />
          <p className="text-sm">
            {error || 'Crew health data is unavailable.'}
          </p>
        </div>
      </div>
    );
  }

  const profiles = datasets.astronautProfiles ?? [];
  const latestRecords = getLatestRecords(datasets.dailyMonitoring ?? []);
  const researchRecords = datasets.researchPanels ?? [];
  console.log('Daily monitoring rows:', datasets.dailyMonitoring?.length);
  console.log('First daily record:', datasets.dailyMonitoring?.[0]);
  console.log('Latest records:', latestRecords);

  const symptomCount = latestRecords.filter(hasReportedSymptoms).length;

  const latestDates = latestRecords
    .map((row) => row.date)
    .filter(Boolean)
    .sort();

  const latestDate = latestDates[latestDates.length - 1] ?? '—';

  return (
    <div className="space-y-8 pb-8">

      {/* PAGE HEADER */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-sky-50" />
        <div className="pointer-events-none absolute -right-2 top-20 h-32 w-32 rounded-full bg-blue-50/70" />

        <div className="relative">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-sky-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700">
              Crew monitoring
            </span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Crew Health Overview
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
            Monitor available crew health summaries, review recorded
            observations and explore scientific research measurements.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 text-xs text-slate-500">
              <CalendarDays className="h-4 w-4 text-slate-400" />
              Latest data: {latestDate}
            </span>

            <span className="hidden h-4 w-px bg-slate-200 sm:block" />

            <span className="inline-flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Research and monitoring workspace
            </span>
          </div>
        </div>
      </section>

      {/* OVERVIEW METRICS */}
      <section>
        <div className="mb-4">
          <h2 className="text-base font-bold text-slate-900">
            Crew Monitoring Summary
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Overview of the currently available crew monitoring records.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50">
                <UsersRound className="h-5 w-5 text-sky-600" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-300" />
            </div>
            <p className="mt-5 text-3xl font-bold text-slate-900">
              {profiles.length}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-600">
              Crew profiles
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Available astronaut profiles
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
                <HeartPulse className="h-5 w-5 text-emerald-600" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-300" />
            </div>
            <p className="mt-5 text-3xl font-bold text-slate-900">
              {latestRecords.length}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-600">
              Latest health records
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Crew members with available records
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-300" />
            </div>
            <p className="mt-5 text-3xl font-bold text-slate-900">
              {symptomCount}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-600">
              Recorded symptoms
            </p>
            <p className="mt-1 text-xs text-slate-400">
              In the latest available entries
            </p>
          </div>
        </div>
      </section>

      {/* CREW MEMBER HEALTH */}
      <section>
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Crew Member Health
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Individual summaries from the latest available monitoring records.
            </p>
          </div>

          <span className="w-fit rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500">
            {profiles.length} crew profiles
          </span>
        </div>

        {profiles.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {profiles.map((profile: any) => {
              const dailyRecord = latestRecords.find(
                (row) => row.astronaut_id === profile.astronaut_id
              );

              return (
                <CrewMemberCard
                  key={profile.astronaut_id}
                  profile={profile}
                  dailyRecord={dailyRecord}
                />
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            No crew profiles are currently available.
          </div>
        )}

        <p className="mt-3 text-xs leading-relaxed text-slate-400">
          Crew profiles and daily health records use simulated demonstration
          data. Recorded symptoms are observations and are not medical
          assessments.
        </p>
      </section>

      {/* RESEARCH SECTION */}
      <section className="space-y-5 border-t border-slate-200 pt-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-violet-100 bg-violet-50">
              <FlaskConical className="h-5 w-5 text-violet-600" />
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">
                Scientific data
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">
                Scientific Research Insights
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
                Explore metabolic, cardiovascular and immune measurements
                collected at pre-flight and post-flight research timepoints.
              </p>
            </div>
          </div>

          <span className="w-fit rounded-full border border-violet-100 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">
            LSDS-8 Research
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              title: 'Metabolic panel',
              description: 'Biochemical and metabolic measurements',
              icon: Activity,
              color: 'text-sky-600',
              bg: 'bg-sky-50',
            },
            {
              title: 'Cardiovascular panel',
              description: 'Research measurements related to cardiovascular health',
              icon: HeartPulse,
              color: 'text-rose-600',
              bg: 'bg-rose-50',
            },
            {
              title: 'Immune panel',
              description: 'Measurements related to immune system activity',
              icon: ShieldCheck,
              color: 'text-emerald-600',
              bg: 'bg-emerald-50',
            },
          ].map((panel) => {
            const Icon = panel.icon;

            return (
              <div
                key={panel.title}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${panel.bg}`}>
                  <Icon className={`h-4 w-4 ${panel.color}`} />
                </div>
                <h3 className="mt-3 text-sm font-bold text-slate-800">
                  {panel.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  {panel.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                LSDS-8 Research Dataset
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                {researchRecords.length} combined research sample records
              </p>
            </div>

            <div className="rounded-lg border border-violet-100 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700">
              Research collection data
            </div>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-slate-600">
            Research subjects C001–C004 are separate from the AST001–AST004
            simulated crew profiles above. These research measurements are
            presented independently and are not individual crew medical
            records.
          </p>
        </div>

        {researchRecords.length > 0 ? (
          <ResearchDataAnalysis records={researchRecords} />
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">
              No LSDS-8 research records are currently available.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

export default CrewHealth;
