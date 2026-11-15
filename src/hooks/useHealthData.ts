
import { useEffect, useState } from 'react';
import {
  loadAllHealthDatasets,
  type CsvRow,
  type AstronautData
} from '../services/healthDataService';

interface HealthData {
  astronautProfiles: AstronautData[];
  dailyMonitoring: CsvRow[];
  metabolic: CsvRow[];
  cardiovascular: CsvRow[];
  immune: CsvRow[];
  dataSource: string;
  researchPanels: import('../services/healthDataService').ResearchPanelRecord[];
  researchDataSource: string;
}

interface UseHealthDataResult {
  data: HealthData | null;
  loading: boolean;
  error: string | null;
}

export function useHealthData(): UseHealthDataResult {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchHealthData() {
      try {
        setLoading(true);
        setError(null);

        const result = await loadAllHealthDatasets();

        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'An unexpected error occurred while loading health data.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchHealthData();

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}
