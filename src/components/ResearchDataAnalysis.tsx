import React, { useState } from 'react';
import { FlaskConical, Filter, Calendar, Activity, Info, BarChart3, ChevronRight } from 'lucide-react';
import { Card, Badge } from '../components';
import { ResearchPanelRecord } from '../services/healthDataService';

interface ResearchDataAnalysisProps {
  records: ResearchPanelRecord[];
}

export function ResearchDataAnalysis({ records }: ResearchDataAnalysisProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedPanel, setSelectedPanel] = useState<'all' | 'metabolic' | 'cardiovascular' | 'immune'>('all');
  const [selectedTimepoint, setSelectedTimepoint] = useState<string>('all');

  const subjects = Array.from(new Set(records.map(r => r.subjectId))).sort();
  const timepoints = Array.from(new Set(records.map(r => r.timepoint))).sort((a, b) => {
    const order: Record<string, number> = { 'L-92': 1, 'L-44': 2, 'L-3': 3, 'R+1': 4, 'R+45': 5, 'R+82': 6, 'R+194': 7 };
    return (order[a] ?? 99) - (order[b] ?? 99);
  });

  const filtered = records.filter(record => {
    if (selectedSubject !== 'all' && record.subjectId !== selectedSubject) return false;
    if (selectedTimepoint !== 'all' && record.timepoint !== selectedTimepoint) return false;
    return true;
  });

  const getTimepointBadge = (tp: string) => {
    if (tp.startsWith('L-')) return <Badge variant="blue" size="sm">Pre-Flight ({tp})</Badge>;
    if (tp.startsWith('R+')) return <Badge variant="amber" size="sm">Post-Flight ({tp})</Badge>;
    return <Badge variant="neutral" size="sm">{tp}</Badge>;
  };

  return (
    <Card
      title="NASA OSD-575 Research Biomarker Analysis"
      subtitle="Real SpaceX Inspiration4 multi-panel biological research data (Metabolic, Cardiovascular, Immune)"
    >
      <div className="space-y-4">
        {/* Banner */}
        <div className="flex items-start gap-3 p-3.5 bg-sky-50/70 border border-sky-100 rounded-xl text-xs text-sky-900 leading-relaxed">
          <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">NASA Open Science Data Repository (OSD-575 / LSDS-8):</span>
            {' '}This panel presents real human spaceflight research measurements collected across pre-flight (Launch minus L-92, L-44, L-3) and post-flight (Recovery plus R+1, R+45, R+82, R+194) phases. Maintained independently from simulated telemetry.
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-semibold text-slate-700">Filters:</span>
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-500 mr-1.5">Subject:</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="bg-white border border-slate-200 rounded-md px-2 py-1 text-slate-700 text-xs focus:outline-none focus:border-sky-500"
            >
              <option value="all">All Subjects ({subjects.length})</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-500 mr-1.5">Timepoint:</label>
            <select
              value={selectedTimepoint}
              onChange={(e) => setSelectedTimepoint(e.target.value)}
              className="bg-white border border-slate-200 rounded-md px-2 py-1 text-slate-700 text-xs focus:outline-none focus:border-sky-500"
            >
              <option value="all">All Timepoints</option>
              {timepoints.map(tp => <option key={tp} value={tp}>{tp} ({tp.startsWith('L') ? 'Pre-flight' : 'Post-flight'})</option>)}
            </select>
          </div>

          

          <div className="ml-auto text-slate-500 font-mono text-[11px]">
            Showing {filtered.length} samples
          </div>
        </div>

        {/* Data Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[500px] overflow-y-auto pr-1">
          {filtered.map((record) => {
            const hasMetabolic = !!record.metabolic;
            const hasCardio = !!record.cardiovascular;
            const hasImmune = !!record.immune;

            return (
              <div
                key={record.sampleName}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:border-sky-300 transition-all text-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-sky-600" />
                    <span className="font-bold text-slate-900 font-mono">{record.sampleName}</span>
                  </div>
                  {getTimepointBadge(record.timepoint)}
                </div>

                <div className="grid grid-cols-2 gap-2 text-slate-600 mt-2 pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Subject ID</span>
                    <span className="font-semibold text-slate-800">{record.subjectId}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Collection Time</span>
                    <span className="font-semibold text-slate-800">
                      {record.timepoint.startsWith('L-') ? `Launch - ${record.timepoint.slice(2)}d` : `Return + ${record.timepoint.slice(2)}d`}
                    </span>
                  </div>
                </div>

                {/* Analyte summaries */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Available Arrays:</span>
                    <div className="flex items-center gap-1.5">
                      {hasMetabolic && <Badge variant="blue" size="sm">CMP</Badge>}
                      {hasCardio && <Badge variant="amber" size="sm">Cardio</Badge>}
                      {hasImmune && <Badge variant="success" size="sm">Immune</Badge>}
                    </div>
                  </div>

                  {record.metabolic && (
                    <div className="bg-slate-50/70 p-2 rounded-lg text-[11px] text-slate-600">
                      <span className="font-medium text-slate-700">Metabolic Panel Preview:</span>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-1 font-mono text-[10px]">
                        {Object.entries(record.metabolic)
                          .filter(([k]) => !['Sample Name', 'Subject ID', 'Time Point', 'Parameter'].includes(k))
                          .slice(0, 4)
                          .map(([k, v]) => (
                            <div key={k} className="truncate">
                              <span className="text-slate-400">{k.slice(0, 10)}:</span> {String(v)}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
