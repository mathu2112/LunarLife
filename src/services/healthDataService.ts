import {
  PersonalBaseline,
  PreMissionAssessmentRecord,
  HistoricalHealthMeasurement,
  SelfExaminationRecord
} from '../types';

export type CsvRow = Record<string, string>;

export interface AstronautData extends Record<string, string> {
  astronaut_id: string;
  display_name: string;
  age_years: string;
  mission_role: string;
  baseline_resting_hr_bpm: string;
  baseline_systolic_bp_mmhg: string;
  baseline_diastolic_bp_mmhg: string;
  baseline_temperature_c: string;
  baseline_spo2_percent: string;
  baseline_sleep_hours: string;
  baseline_stress_score: string;
  baseline_mood_score: string;
  baseline_exercise_minutes: string;
  data_source: string;
}

// ----------------------------------------------------------------------------
// General CSV Reader
// ----------------------------------------------------------------------------
export async function loadCSV(fileName: string): Promise<CsvRow[]> {
  const datasetGroup = fileName.startsWith('LSDS-8_')
    ? 'nasa'
    : 'simulated';

  const response = await fetch(
    `/api/datasets/${datasetGroup}/${encodeURIComponent(fileName)}`
  );

  if (!response.ok) {
    throw new Error(`Unable to load ${fileName}`);
  }

  const rows = await response.json();

  if (!Array.isArray(rows)) {
    throw new Error(`Invalid dataset format: ${fileName}`);
  }

  return rows.map((row: Record<string, unknown>) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key,
        String(value ?? '')
      ])
    )
  );
}

// ----------------------------------------------------------------------------
// Individual CSV Data Loaders
// ----------------------------------------------------------------------------
export async function loadAstronautProfiles(): Promise<AstronautData[]> {
  const rows = await loadCSV('astronaut_profiles.csv');
  const storedUpdates = getStoredAstronautUpdates();

  return rows.map(row => {
    const custom = storedUpdates[row.astronaut_id];
    return custom ? ({ ...row, ...custom } as AstronautData) : (row as unknown as AstronautData);
  });
}

export async function loadDailyMonitoring(): Promise<CsvRow[]> {
  const csvRows = await loadCSV('daily_health_monitoring.csv');
  const customRows = getStoredCustomMeasurements();

  return [...csvRows, ...customRows];
}

export async function loadMetabolicData(): Promise<CsvRow[]> {
  return loadCSV('LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv');
}

export async function loadCardiovascularData(): Promise<CsvRow[]> {
  return loadCSV('LSDS-8_Multiplex_serum_cardiovascular_EvePanel_TRANSFORMED.csv');
}

export async function loadImmuneData(): Promise<CsvRow[]> {
  return loadCSV('LSDS-8_Multiplex_serum_immune_EvePanel_TRANSFORMED.csv');
}

export async function loadRadiationLog(): Promise<CsvRow[]> {
  return loadCSV('radiation_log.csv');
}

export async function loadCabinEnvironment(): Promise<CsvRow[]> {
  return loadCSV('cabin_environment_log.csv');
}

export async function loadMissionProfiles(): Promise<CsvRow[]> {
  return loadCSV('mission_profiles.csv');
}

export async function loadHealthGuidance(): Promise<any> {
  const res = await fetch(
    '/api/datasets/simulated/health_guidance.json'
  );

  if (!res.ok) return null;

  return res.json();
}

// ----------------------------------------------------------------------------
// Research Data Structures (NASA OSD-575 / LSDS-8)
// ----------------------------------------------------------------------------
export interface ResearchPanelRecord {
  sampleName: string;
  subjectId: string;
  timepoint: string;
  timepointOrder: number;
  metabolic: CsvRow | null;
  cardiovascular: CsvRow | null;
  immune: CsvRow | null;
}

const researchTimepointOrder: Record<string, number> = {
  'L-92': 1,
  'L-44': 2,
  'L-3': 3,
  'R+1': 4,
  'R+45': 5,
  'R+82': 6,
  'R+194': 7
};

export function combineResearchPanels(
  metabolic: CsvRow[],
  cardiovascular: CsvRow[],
  immune: CsvRow[]
): ResearchPanelRecord[] {
  const metabolicMap = new Map(metabolic.map(row => [row['Sample Name'], row]));
  const cardiovascularMap = new Map(cardiovascular.map(row => [row['Sample Name'], row]));
  const immuneMap = new Map(immune.map(row => [row['Sample Name'], row]));

  const sampleNames = new Set([
    ...metabolicMap.keys(),
    ...cardiovascularMap.keys(),
    ...immuneMap.keys()
  ]);

  return Array.from(sampleNames)
  .filter((sampleName): sampleName is string =>
    typeof sampleName === 'string' && sampleName.trim() !== ''
  )
  .map(sampleName => {
    const match = sampleName.match(/^(C\d+)_serum_(.+)$/);
    if (!match) return null;

      const subjectId = match[1];
      const timepoint = match[2];

      return {
        sampleName,
        subjectId,
        timepoint,
        timepointOrder: researchTimepointOrder[timepoint] ?? 999,
        metabolic: metabolicMap.get(sampleName) ?? null,
        cardiovascular: cardiovascularMap.get(sampleName) ?? null,
        immune: immuneMap.get(sampleName) ?? null
      };
    })
    .filter((row): row is ResearchPanelRecord => row !== null)
    .sort((a, b) => {
      const subjectComparison = a.subjectId.localeCompare(b.subjectId);
      if (subjectComparison !== 0) return subjectComparison;
      return a.timepointOrder - b.timepointOrder;
    });
}

// ----------------------------------------------------------------------------
// Database & Combined Loader
// ----------------------------------------------------------------------------
export async function loadAstronautHealthData(astronautId: string) {
  const [profiles, dailyRecords] = await Promise.all([
    loadAstronautProfiles(),
    loadDailyMonitoring()
  ]);

  const profile = profiles.find(item => item.astronaut_id === astronautId);
  if (!profile) {
    throw new Error(`Astronaut ${astronautId} was not found`);
  }

  const dailyMonitoring = dailyRecords
    .filter(item => item.astronaut_id === astronautId)
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    profile,
    dailyMonitoring,
    dataSource: 'SIMULATED_DEMO_DATA'
  };
}

export async function loadAllHealthDatasets() {
  const [
    astronautProfiles,
    dailyMonitoring,
    metabolic,
    cardiovascular,
    immune
  ] = await Promise.all([
    loadAstronautProfiles(),
    loadDailyMonitoring(),
    loadMetabolicData(),
    loadCardiovascularData(),
    loadImmuneData()
  ]);

  return {
    astronautProfiles,
    dailyMonitoring,
    metabolic,
    cardiovascular,
    immune,
    researchPanels: combineResearchPanels(metabolic, cardiovascular, immune),
    dataSource: 'SIMULATED_DEMO_DATA',
    researchDataSource: 'LSDS-8_RESEARCH_DATA'
  };
}

// ----------------------------------------------------------------------------
// Local Storage Persistence & Integration Layer (Person 5 Database)
// ----------------------------------------------------------------------------
const STORAGE_KEYS = {
  ASTRONAUT_UPDATES: 'ASTRA_DB_ASTRONAUT_UPDATES',
  CUSTOM_MEASUREMENTS: 'ASTRA_DB_CUSTOM_MEASUREMENTS',
  PRE_MISSION_ASSESSMENTS: 'ASTRA_DB_PRE_MISSION_ASSESSMENTS',
  SELF_EXAMS: 'ASTRA_DB_SELF_EXAMINATIONS',
  CUSTOM_BASELINES: 'ASTRA_DB_CUSTOM_BASELINES',
  ACTIVE_ASTRONAUT: 'ASTRA_DB_ACTIVE_ASTRONAUT_ID'
};

export function getStoredAstronautUpdates(): Record<string, Partial<AstronautData>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ASTRONAUT_UPDATES);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveStoredAstronautUpdate(id: string, updates: Partial<AstronautData>): void {
  try {
    const all = getStoredAstronautUpdates();
    all[id] = { ...(all[id] || {}), ...updates };
    localStorage.setItem(STORAGE_KEYS.ASTRONAUT_UPDATES, JSON.stringify(all));
  } catch (e) {
    console.error('Failed to save astronaut update:', e);
  }
}

export function getStoredCustomMeasurements(): CsvRow[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_MEASUREMENTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomMeasurement(record: CsvRow): void {
  try {
    const all = getStoredCustomMeasurements();
    all.push(record);
    localStorage.setItem(STORAGE_KEYS.CUSTOM_MEASUREMENTS, JSON.stringify(all));
  } catch (e) {
    console.error('Failed to save custom measurement:', e);
  }
}

export function getStoredSelfExams(astronautId?: string): SelfExaminationRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SELF_EXAMS);
    const records: SelfExaminationRecord[] = raw ? JSON.parse(raw) : getDefaultSelfExamRecords();
    if (astronautId) {
      return records.filter(r => r.astronautId === astronautId);
    }
    return records;
  } catch {
    return getDefaultSelfExamRecords();
  }
}

export function saveSelfExamRecord(record: SelfExaminationRecord): void {
  try {
    const all = getStoredSelfExams();
    all.unshift(record);
    localStorage.setItem(STORAGE_KEYS.SELF_EXAMS, JSON.stringify(all));
  } catch (e) {
    console.error('Failed to save self exam record:', e);
  }
}

// ----------------------------------------------------------------------------
// Pre-Mission Assessment Records Repository
// ----------------------------------------------------------------------------
const DEFAULT_PRE_MISSION_ASSESSMENTS: Record<string, PreMissionAssessmentRecord> = {
  AST001: {
    astronautId: 'AST001',
    certificationNumber: 'NASA-JSC-MED-2026-0814-A',
    clinicalFacility: 'Johnson Space Center – Flight Medicine Clinic (Houston, TX)',
    flightClearance: 'CLASS I FLIGHT CERTIFIED',
    examiningFlightSurgeon: 'Dr. Evelyn Martinez, MD, Lead Flight Surgeon',
    certificationDate: '2026-08-10',
    expirationDate: '2027-08-10',
    cardiovascularStress: {
      protocol: 'Bruce Treadmill Protocol (Stage 5 Completed)',
      vo2Max: 52.4,
      restingHr: 64,
      maxHr: 182,
      ecgSummary: 'Normal sinus rhythm at rest and peak exercise. No ischemic ST changes or arrhythmia.'
    },
    boneMineralDensity: {
      lumbarTScore: 1.1,
      femoralTScore: 0.9,
      dxaStatus: 'Normal Bone Mass'
    },
    pulmonaryFunction: {
      fvcLiters: 4.9,
      fev1Liters: 4.2,
      baselineSpo2: 98
    },
    vestibularAdaptation: {
      sotScore: 89,
      motionSicknessSusceptibility: 'Low'
    },
    laboratoryBaselineSummary: 'Complete blood count, comprehensive metabolic panel, and lipid profile within optimal astronaut standards. Serum ferritin 110 ng/mL, 25-OH Vitamin D 42 ng/mL.',
    generalClinicalNotes: 'Candidate demonstrated exceptional cardiovascular conditioning, balanced aerobic-anaerobic endurance, and robust microgravity vestibular adaptation profile. Cleared for long-duration orbital mission with EVA qualifications.'
  },
  AST002: {
    astronautId: 'AST002',
    certificationNumber: 'NASA-JSC-MED-2026-0815-B',
    clinicalFacility: 'Johnson Space Center – Flight Medicine Clinic (Houston, TX)',
    flightClearance: 'CLASS I FLIGHT CERTIFIED',
    examiningFlightSurgeon: 'Dr. Evelyn Martinez, MD, Lead Flight Surgeon',
    certificationDate: '2026-08-11',
    expirationDate: '2027-08-11',
    cardiovascularStress: {
      protocol: 'Bruce Treadmill Protocol (Stage 5 Completed)',
      vo2Max: 49.8,
      restingHr: 68,
      maxHr: 178,
      ecgSummary: 'Normal sinus rhythm. Appropriate blood pressure response to graded exercise.'
    },
    boneMineralDensity: {
      lumbarTScore: 0.8,
      femoralTScore: 0.7,
      dxaStatus: 'Normal Bone Mass'
    },
    pulmonaryFunction: {
      fvcLiters: 4.5,
      fev1Liters: 3.8,
      baselineSpo2: 97
    },
    vestibularAdaptation: {
      sotScore: 85,
      motionSicknessSusceptibility: 'Moderate'
    },
    laboratoryBaselineSummary: 'All renal, hepatic, and metabolic indices normotensive and clear. Cytokine panel stable.',
    generalClinicalNotes: 'Flight Engineer cleared for long-duration flight. Routine prophylactic countermeasures recommended for initial 48h neuro-vestibular adaptation.'
  },
  AST003: {
    astronautId: 'AST003',
    certificationNumber: 'NASA-JSC-MED-2026-0816-C',
    clinicalFacility: 'Johnson Space Center – Flight Medicine Clinic (Houston, TX)',
    flightClearance: 'CLASS I FLIGHT CERTIFIED',
    examiningFlightSurgeon: 'Dr. Gregory Hayes, MD, Aerospace Medicine Specialist',
    certificationDate: '2026-08-12',
    expirationDate: '2027-08-12',
    cardiovascularStress: {
      protocol: 'Bruce Treadmill Protocol (Stage 5 Completed)',
      vo2Max: 54.1,
      restingHr: 62,
      maxHr: 185,
      ecgSummary: 'Optimal sinus bradycardia at rest typical of trained endurance athletes. Peak test normal.'
    },
    boneMineralDensity: {
      lumbarTScore: 1.3,
      femoralTScore: 1.1,
      dxaStatus: 'Normal Bone Mass'
    },
    pulmonaryFunction: {
      fvcLiters: 5.1,
      fev1Liters: 4.4,
      baselineSpo2: 98
    },
    vestibularAdaptation: {
      sotScore: 92,
      motionSicknessSusceptibility: 'Low'
    },
    laboratoryBaselineSummary: 'Full panel optimal. High baseline plasma volume and excellent immune cytokine profile.',
    generalClinicalNotes: 'Mission Specialist cleared without restrictions. Highest aerobic capacity across crew compliment.'
  },
  AST004: {
    astronautId: 'AST004',
    certificationNumber: 'NASA-JSC-MED-2026-0817-D',
    clinicalFacility: 'Johnson Space Center – Flight Medicine Clinic (Houston, TX)',
    flightClearance: 'CLASS I FLIGHT CERTIFIED',
    examiningFlightSurgeon: 'Dr. Gregory Hayes, MD, Aerospace Medicine Specialist',
    certificationDate: '2026-08-13',
    expirationDate: '2027-08-13',
    cardiovascularStress: {
      protocol: 'Bruce Treadmill Protocol (Stage 4 Completed)',
      vo2Max: 47.6,
      restingHr: 70,
      maxHr: 175,
      ecgSummary: 'Normal physiological test. Good recovery heart rate kinetics post-treadmill.'
    },
    boneMineralDensity: {
      lumbarTScore: 0.7,
      femoralTScore: 0.6,
      dxaStatus: 'Normal Bone Mass'
    },
    pulmonaryFunction: {
      fvcLiters: 4.3,
      fev1Liters: 3.6,
      baselineSpo2: 97
    },
    vestibularAdaptation: {
      sotScore: 84,
      motionSicknessSusceptibility: 'Moderate'
    },
    laboratoryBaselineSummary: 'Metabolic, immune and endocrine screening normal. Cortisol and thyroid function nominal.',
    generalClinicalNotes: 'Pilot qualified and cleared for orbital flight. Focus on adherence to resistance exercise protocol.'
  }
};

export function getPreMissionAssessment(astronautId: string): PreMissionAssessmentRecord {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRE_MISSION_ASSESSMENTS);
    if (raw) {
      const records = JSON.parse(raw);
      if (records[astronautId]) return records[astronautId];
    }
  } catch {}
  return DEFAULT_PRE_MISSION_ASSESSMENTS[astronautId] || DEFAULT_PRE_MISSION_ASSESSMENTS.AST001;
}

export function savePreMissionAssessment(record: PreMissionAssessmentRecord): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRE_MISSION_ASSESSMENTS);
    const records = raw ? JSON.parse(raw) : { ...DEFAULT_PRE_MISSION_ASSESSMENTS };
    records[record.astronautId] = record;
    localStorage.setItem(STORAGE_KEYS.PRE_MISSION_ASSESSMENTS, JSON.stringify(records));
  } catch (e) {
    console.error('Failed to save pre-mission assessment:', e);
  }
}

// ----------------------------------------------------------------------------
// Baseline Calculation & Baseline Deviation Engine
// ----------------------------------------------------------------------------
export function calculatePersonalBaselinesFromRecords(records: CsvRow[]): PersonalBaseline {
  // Prefer PRE_MISSION records if available, otherwise calculate from first 14 records
  const preMissionRecords = records.filter(r => r.mission_phase === 'PRE_MISSION');
  const calibrationPool = preMissionRecords.length >= 5 ? preMissionRecords : records.slice(0, 14);

  const getMean = (key: string, fallback: number): number => {
    const values = calibrationPool
      .map(r => Number(r[key]))
      .filter(v => Number.isFinite(v) && v > 0);
    if (values.length === 0) return fallback;
    return Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1));
  };

  return {
    restingHeartRate: Math.round(getMean('heart_rate_bpm', 64)),
    systolicBp: Math.round(getMean('systolic_bp_mmhg', 116)),
    diastolicBp: Math.round(getMean('diastolic_bp_mmhg', 74)),
    bodyTemperature: getMean('body_temperature_c', 36.7),
    spo2: Math.round(getMean('spo2_percent', 98)),
    sleepHours: getMean('sleep_hours', 7.5),
    exerciseMinutes: Math.round(getMean('exercise_minutes', 110)),
    stressScore: Number(getMean('stress_score_1_to_5', 2).toFixed(1)),
    moodScore: Number(getMean('mood_score_1_to_5', 4).toFixed(1)),
    calibratedFrom: preMissionRecords.length >= 5 ? 'Pre-Mission Medical Screening' : '60-Day Rolling Average',
    lastRecalibrated: new Date().toISOString().slice(0, 10)
  };
}

export interface BaselineComparisonResult {
  metric: string;
  baselineValue: string;
  currentValue: string;
  delta: string;
  deltaPercent: string;
  status: 'Normal' | 'Monitor' | 'Review';
  generalPopulationRange: string;
  clinicalSignificance: string;
}

export function evaluateMeasurementAgainstBaseline(
  latest: CsvRow,
  baseline: PersonalBaseline
): BaselineComparisonResult[] {
  const currentHr = Number(latest.heart_rate_bpm) || baseline.restingHeartRate;
  const currentSys = Number(latest.systolic_bp_mmhg) || baseline.systolicBp;
  const currentDia = Number(latest.diastolic_bp_mmhg) || baseline.diastolicBp;
  const currentTemp = Number(latest.body_temperature_c) || baseline.bodyTemperature;
  const currentSpo2 = Number(latest.spo2_percent) || baseline.spo2;
  const currentSleep = Number(latest.sleep_hours) || baseline.sleepHours;
  const currentExercise = Number(latest.exercise_minutes) || baseline.exerciseMinutes;

  const hrDiff = currentHr - baseline.restingHeartRate;
  const hrPct = ((hrDiff / baseline.restingHeartRate) * 100).toFixed(1);
  const hrStatus: 'Normal' | 'Monitor' | 'Review' =
    hrDiff > 12 ? 'Review' : hrDiff > 6 ? 'Monitor' : 'Normal';

  const sysDiff = currentSys - baseline.systolicBp;
  const diaDiff = currentDia - baseline.diastolicBp;
  const bpStatus: 'Normal' | 'Monitor' | 'Review' =
    sysDiff > 15 || diaDiff > 10 ? 'Review' : sysDiff > 8 || diaDiff > 6 ? 'Monitor' : 'Normal';

  const tempDiff = Number((currentTemp - baseline.bodyTemperature).toFixed(2));
  const tempStatus: 'Normal' | 'Monitor' | 'Review' =
    tempDiff > 0.8 ? 'Review' : tempDiff > 0.4 ? 'Monitor' : 'Normal';

  const sleepDiff = Number((currentSleep - baseline.sleepHours).toFixed(1));
  const sleepStatus: 'Normal' | 'Monitor' | 'Review' =
    sleepDiff < -1.8 ? 'Review' : sleepDiff < -1.0 ? 'Monitor' : 'Normal';

  const spo2Diff = currentSpo2 - baseline.spo2;
  const spo2Status: 'Normal' | 'Monitor' | 'Review' =
    spo2Diff <= -3 ? 'Review' : spo2Diff <= -2 ? 'Monitor' : 'Normal';

  const exDiff = currentExercise - baseline.exerciseMinutes;
  const exStatus: 'Normal' | 'Monitor' | 'Review' =
    exDiff < -35 ? 'Review' : exDiff < -20 ? 'Monitor' : 'Normal';

  return [
    {
      metric: 'Resting Heart Rate',
      baselineValue: `${baseline.restingHeartRate} BPM`,
      currentValue: `${currentHr} BPM`,
      delta: `${hrDiff >= 0 ? '+' : ''}${hrDiff} BPM`,
      deltaPercent: `${hrDiff >= 0 ? '+' : ''}${hrPct}%`,
      status: hrStatus,
      generalPopulationRange: '60–100 BPM (Broad average)',
      clinicalSignificance:
        hrDiff > 10
          ? `Elevated by ${hrDiff} BPM above individual baseline. General medical average would treat ${currentHr} BPM as 'normal' (under 100), but personal baseline flags an individual autonomic/stress change.`
          : 'Consistent with individual cardiovascular baseline.'
    },
    {
      metric: 'Blood Pressure',
      baselineValue: `${baseline.systolicBp}/${baseline.diastolicBp} mmHg`,
      currentValue: `${currentSys}/${currentDia} mmHg`,
      delta: `${sysDiff >= 0 ? '+' : ''}${sysDiff}/${diaDiff >= 0 ? '+' : ''}${diaDiff} mmHg`,
      deltaPercent: `${((sysDiff / baseline.systolicBp) * 100).toFixed(1)}%`,
      status: bpStatus,
      generalPopulationRange: '120/80 mmHg (General standard)',
      clinicalSignificance:
        bpStatus !== 'Normal'
          ? 'Mild cephalad fluid shift arterial pressure variation observed.'
          : 'Within normal individual hemodynamic calibration window.'
    },
    {
      metric: 'Core Body Temp',
      baselineValue: `${baseline.bodyTemperature.toFixed(1)} °C`,
      currentValue: `${currentTemp.toFixed(1)} °C`,
      delta: `${tempDiff >= 0 ? '+' : ''}${tempDiff} °C`,
      deltaPercent: `${((tempDiff / baseline.bodyTemperature) * 100).toFixed(1)}%`,
      status: tempStatus,
      generalPopulationRange: '36.5–37.5 °C',
      clinicalSignificance:
        tempDiff >= 0.4
          ? 'Characteristic spaceflight core temperature elevation (space fever mechanism) noted.'
          : 'Normothermic core temperature maintained.'
    },
    {
      metric: 'Oxygen Saturation (SpO₂)',
      baselineValue: `${baseline.spo2}%`,
      currentValue: `${currentSpo2}%`,
      delta: `${spo2Diff >= 0 ? '+' : ''}${spo2Diff}%`,
      deltaPercent: `${spo2Diff}%`,
      status: spo2Status,
      generalPopulationRange: '95–100%',
      clinicalSignificance:
        spo2Status !== 'Normal'
          ? 'Mild desaturation noted relative to baseline.'
          : 'Cabin ambient O2 delivery and pulmonary diffusion optimal.'
    },
    {
      metric: 'Daily Sleep Duration',
      baselineValue: `${baseline.sleepHours} hrs`,
      currentValue: `${currentSleep} hrs`,
      delta: `${sleepDiff >= 0 ? '+' : ''}${sleepDiff} hrs`,
      deltaPercent: `${((sleepDiff / baseline.sleepHours) * 100).toFixed(1)}%`,
      status: sleepStatus,
      generalPopulationRange: '7.0–9.0 hrs',
      clinicalSignificance:
        sleepDiff < -1.0
          ? `Cumulative sleep deficit of ${Math.abs(sleepDiff)} hours compared to individual pre-mission baseline.`
          : 'Restorative circadian sleep cycles maintained.'
    },
    {
      metric: 'Daily Exercise Minutes',
      baselineValue: `${baseline.exerciseMinutes} min`,
      currentValue: `${currentExercise} min`,
      delta: `${exDiff >= 0 ? '+' : ''}${exDiff} min`,
      deltaPercent: `${((exDiff / baseline.exerciseMinutes) * 100).toFixed(1)}%`,
      status: exStatus,
      generalPopulationRange: '60–120 min (ARED / T2)',
      clinicalSignificance:
        exStatus !== 'Normal'
          ? 'Physical conditioning countermeasure below daily prescribed baseline target.'
          : 'Complete daily musculoskeletal countermeasure protocol fulfilled.'
    }
  ];
}

// ----------------------------------------------------------------------------
// Self-Examination Seed Data
// ----------------------------------------------------------------------------
function getDefaultSelfExamRecords(): SelfExaminationRecord[] {
  return [
    {
      id: 'EXAM-001',
      astronautId: 'AST001',
      date: '2026-10-18',
      examinationType: 'Cardiovascular Auscultation',
      findings: 'Regular rate and rhythm (RRR), S1/S2 audible, no murmurs, gallops, or friction rubs detected via digital stethoscope.',
      outcome: 'Passed / Normal',
      notes: 'Performed using on-board telemedicine digital stethoscope protocol.',
      examiner: 'AST001 (Self-Examined)'
    },
    {
      id: 'EXAM-002',
      astronautId: 'AST001',
      date: '2026-10-15',
      examinationType: 'Visual Acuity & SANS',
      findings: 'Near/distance Snellen chart 20/20 bilateral. Fundoscopic optical coherence scan shows sharp disc margins; no evidence of papilledema.',
      outcome: 'Passed / Normal',
      notes: 'Routine Day-60 Spaceflight Associated Neuro-ocular Syndrome (SANS) surveillance.',
      examiner: 'AST001 (Assisted by Crew Medical Officer)'
    },
    {
      id: 'EXAM-003',
      astronautId: 'AST001',
      date: '2026-10-10',
      examinationType: 'Orthostatic Tolerance',
      findings: 'Stand test simulation with lower-body pressure countermeasure: HR transition +8 BPM, BP stable at 122/78 mmHg.',
      outcome: 'Passed / Normal',
      notes: 'Orthostatic tolerance test under simulated Earth gravity re-adaptation prep.',
      examiner: 'AST001 (Self-Examined)'
    }
  ];
}

// ----------------------------------------------------------------------------
// Database Maintenance Operations
// ----------------------------------------------------------------------------
export function resetDatabaseToDefaults(): void {
  try {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  } catch (e) {
    console.error('Failed to reset database:', e);
  }
}

export function exportFullDatabaseJSON(): string {
  const data = {
    exportedAt: new Date().toISOString(),
    system: 'ASTRA Health Platform - Person 5 Integration Database',
    astronautUpdates: getStoredAstronautUpdates(),
    customMeasurements: getStoredCustomMeasurements(),
    selfExams: getStoredSelfExams(),
    preMissionAssessments: DEFAULT_PRE_MISSION_ASSESSMENTS
  };
  return JSON.stringify(data, null, 2);
}
