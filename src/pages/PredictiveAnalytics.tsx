import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Activity,
  Heart,
  Moon,
  Compass,
} from 'lucide-react';
import { Card, Badge, PageHeader } from '../components';
import { predictiveAnalyticsData, healthComparisonData, predictiveObservations } from '../data';

export function PredictiveAnalytics() {
  const [timeFilter, setTimeFilter] = useState<'7d' | '30d' | '90d'>('30d');

  const chartData = predictiveAnalyticsData[timeFilter];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        category="Personalised Health Profile"
        title="Predictive Analytics"
        description="Data-driven trend forecasting, baseline comparisons, and microgravity physiological adaptation models."
      />

      {/* 1. OVERVIEW SUMMARY CARDS (Heart Rate, Sleep, Blood Pressure) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Heart Rate Overview */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-subtle p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Heart Rate
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Heart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <div className="text-xl font-bold text-slate-900">Within baseline</div>
              <p className="text-xs text-slate-500 mt-0.5">Mean 72 BPM vs 68 BPM baseline</p>
            </div>
            <Badge variant="success" size="md">
              Normal
            </Badge>
          </div>
        </div>

        {/* Sleep Overview */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-subtle p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Sleep Duration
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Moon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <div className="text-xl font-bold text-slate-900">Slight decrease</div>
              <p className="text-xs text-slate-500 mt-0.5">7.5 hrs avg vs 8.0 hrs target</p>
            </div>
            <Badge variant="amber" size="md">
              Monitor
            </Badge>
          </div>
        </div>

        {/* Blood Pressure Overview */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-subtle p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Blood Pressure
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <div className="text-xl font-bold text-slate-900">Stable</div>
              <p className="text-xs text-slate-500 mt-0.5">118/78 mmHg consistent</p>
            </div>
            <Badge variant="success" size="md">
              Normal
            </Badge>
          </div>
        </div>
      </div>

      {/* 2. HEALTH TREND CHARTS (Heart Rate, Sleep, Blood Pressure) */}
      <Card
        title="Predictive Telemetry Trends"
        subtitle="Historical progression and trajectory forecasting across mission intervals"
        action={
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
            {(['7d', '30d', '90d'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setTimeFilter(filter)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  timeFilter === filter
                    ? 'bg-white text-sky-700 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {filter === '7d' ? '7 Days' : filter === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
          {/* 1. Heart Rate Trend */}
          <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-slate-800">Heart Rate Trend (BPM)</h4>
              <Badge variant="blue" size="sm">
                Line Chart
              </Badge>
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.heartRate} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="time" stroke="#94A3B8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={10} domain={[60, 85]} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFF', borderColor: '#E2E8F0', borderRadius: '8px', fontSize: '11px' }}
                    formatter={(val: number) => [`${val} BPM`, 'Heart Rate']}
                  />
                  <Line type="monotone" dataKey="heartRate" stroke="#0284C7" strokeWidth={2.5} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2. Sleep Duration Trend */}
          <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-slate-800">Sleep Duration (Hours)</h4>
              <Badge variant="amber" size="sm">
                Bar Chart
              </Badge>
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.sleep} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="time" stroke="#94A3B8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={10} domain={[0, 10]} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFF', borderColor: '#E2E8F0', borderRadius: '8px', fontSize: '11px' }}
                    formatter={(val: number) => [`${val} hrs`, 'Sleep']}
                  />
                  <Bar dataKey="sleepHours" fill="#38BDF8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 3. Blood Pressure Trend (Systolic & Diastolic) */}
          <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-slate-800">Blood Pressure (Sys / Dia)</h4>
              <Badge variant="neutral" size="sm">
                Dual Line
              </Badge>
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.bloodPressure} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="time" stroke="#94A3B8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={10} domain={[60, 130]} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFF', borderColor: '#E2E8F0', borderRadius: '8px', fontSize: '11px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                  <Line type="monotone" dataKey="systolic" name="Systolic" stroke="#0EA5E9" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="diastolic" name="Diastolic" stroke="#64748B" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </Card>

      {/* 3. HEALTH COMPARISON (Baseline vs Current) */}
      <Card
        title="Pre-Mission Baseline vs Current Comparison"
        subtitle="Direct delta evaluation against terrestrial qualification baselines"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 text-xs font-medium uppercase">
                <th className="pb-3 font-semibold">Biometric Metric</th>
                <th className="pb-3 font-semibold">Pre-Mission Baseline</th>
                <th className="pb-3 font-semibold">Current Value</th>
                <th className="pb-3 font-semibold">Delta</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold hidden md:table-cell">Physiological Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {healthComparisonData.map((item, idx) => {
                const statusVariant =
                  item.status === 'Normal' ? 'success' : item.status === 'Monitor' ? 'amber' : 'rose';
                return (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 font-semibold text-slate-900">{item.metric}</td>
                    <td className="py-3.5 text-slate-600 font-mono text-xs">{item.baseline}</td>
                    <td className="py-3.5 font-bold text-slate-900 font-mono text-xs">{item.current}</td>
                    <td className="py-3.5 text-slate-700 font-medium font-mono text-xs">{item.difference}</td>
                    <td className="py-3.5">
                      <Badge variant={statusVariant} size="sm">
                        {item.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 text-xs text-slate-500 hidden md:table-cell">{item.description}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 4. PREDICTIVE OBSERVATIONS */}
      <Card
        title="Flight Surgeon Observations"
        subtitle="Automated analytical takeaways and clinical trend interpretations"
      >
        <div className="space-y-3">
          {predictiveObservations.map((obs) => {
            const isNormal = obs.status === 'Normal';
            const isMonitor = obs.status === 'Monitor';
            const Icon = isNormal ? CheckCircle2 : isMonitor ? AlertCircle : AlertTriangle;
            const badgeVariant = isNormal ? 'success' : isMonitor ? 'amber' : 'rose';

            return (
              <div
                key={obs.id}
                className="p-4 rounded-xl border border-slate-100 bg-slate-50/40 hover:border-slate-200 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="flex items-start space-x-3">
                    <div
                      className={`p-1.5 rounded-lg border shrink-0 mt-0.5 ${
                        isNormal
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                          : isMonitor
                          ? 'bg-amber-50 border-amber-200 text-amber-600'
                          : 'bg-rose-50 border-rose-200 text-rose-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-semibold text-slate-900">{obs.text}</h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{obs.detail}</p>
                    </div>
                  </div>

                  <div className="self-start sm:self-center shrink-0 ml-8 sm:ml-0">
                    <Badge variant={badgeVariant} size="sm">
                      {obs.status}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
