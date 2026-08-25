import { wilsonInterval } from "./routePrecedents";
import type { CanonicalObservation } from "./routePredictionEval";

export const DETECTOR_VERSION = "route-learning-v1";

export interface PersistentDeliveryRiskSignal {
  id: string;
  type: "persistent-delivery-risk";
  cohortHash: string;
  model: string;
  routeId: string;
  cohortRiskInterval: { low: number; high: number };
  comparatorRiskInterval: { low: number; high: number };
}

export interface PredictionMiscalibrationSignal {
  id: string;
  type: "prediction-miscalibration";
  model: string;
  binLow: number;
  binHigh: number;
  meanPredicted: number;
  actualInterval: { low: number; high: number };
  direction: "underpredicting" | "overpredicting";
  support: number;
}

export interface CohortDriftSignal {
  id: string;
  type: "cohort-drift";
  cohortHash: string;
  model: string;
  routeId: string;
  previousInterval: { low: number; high: number };
  recentInterval: { low: number; high: number };
  direction: "increasing" | "decreasing";
}

export type CActivitySignal = 
  | PersistentDeliveryRiskSignal 
  | PredictionMiscalibrationSignal 
  | CohortDriftSignal;

export interface CActivitySignalReport {
  schemaVersion: 1;
  detectorVersion: string;
  corpus: {
    eligible: number;
    earliest?: string;
    latest?: string;
  };
  examined: {
    cohorts: number;
    calibrationBins: number;
  };
  suppressed: {
    insufficientSupport: number;
    overlappingIntervals: number;
    unavailableComparator: number;
  };
  signals: CActivitySignal[];
}

function hashExactFeatures(features: any): string {
  return [
    features.selectedModel,
    features.routeId,
    features.domain,
    features.hingeBand,
    features.structured,
    features.adversarialBand,
    features.inputSizeBand
  ].join("|");
}

export function detectCActivitySignals(observations: CanonicalObservation[]): CActivitySignalReport {
  const signals: CActivitySignal[] = [];

  const suppressed = {
    insufficientSupport: 0,
    overlappingIntervals: 0,
    unavailableComparator: 0
  };

  // Group by Exact Cohort and Model+Route
  const byExact = new Map<string, CanonicalObservation[]>();
  const byModelRoute = new Map<string, CanonicalObservation[]>();
  
  // Group by Model for calibration
  const byModel = new Map<string, CanonicalObservation[]>();

  let earliest: string | undefined;
  let latest: string | undefined;

  // Track unique observations to prevent duplicate inflation
  const uniqueObs = new Map<string, CanonicalObservation>();

  for (const obs of observations) {
    if (!obs.prediction.id) continue;
    
    // Duplicate non-inflation rule: canonical duplicate policy (first seen wins or dedupe by prediction.id)
    if (uniqueObs.has(obs.prediction.id)) continue;
    uniqueObs.set(obs.prediction.id, obs);

    const f = obs.prediction.features;
    if (!f || !f.selectedModel || !f.routeId) continue;

    if (obs.outcome.observedAt) {
      if (!earliest || obs.outcome.observedAt < earliest) earliest = obs.outcome.observedAt;
      if (!latest || obs.outcome.observedAt > latest) latest = obs.outcome.observedAt;
    }
    
    const exactHash = hashExactFeatures(f);
    const exactList = byExact.get(exactHash) || [];
    exactList.push(obs);
    byExact.set(exactHash, exactList);

    const mrHash = `${f.selectedModel}|${f.routeId}`;
    const mrList = byModelRoute.get(mrHash) || [];
    mrList.push(obs);
    byModelRoute.set(mrHash, mrList);
    
    const mList = byModel.get(f.selectedModel) || [];
    mList.push(obs);
    byModel.set(f.selectedModel, mList);
  }

  let examinedCohorts = 0;
  let examinedBins = 0;

  // 1. persistent-delivery-risk
  for (const [exactHash, exactObs] of byExact.entries()) {
    examinedCohorts++;
    if (exactObs.length < 20) {
      suppressed.insufficientSupport++;
      continue;
    }

    const f = exactObs[0].prediction.features;
    const mrHash = `${f.selectedModel}|${f.routeId}`;
    const allMrObs = byModelRoute.get(mrHash) || [];
    
    // comparator = rest of same selectedModel + routeId
    const comparatorObs = allMrObs.filter(o => hashExactFeatures(o.prediction.features) !== exactHash);
    if (comparatorObs.length < 20) {
      suppressed.unavailableComparator++;
      continue;
    }

    const cohortFailures = exactObs.reduce((sum, o) => sum + o.actualFailure, 0);
    const compFailures = comparatorObs.reduce((sum, o) => sum + o.actualFailure, 0);

    const cohortW = wilsonInterval(cohortFailures, exactObs.length);
    const compW = wilsonInterval(compFailures, comparatorObs.length);

    if (cohortW && compW) {
      if (cohortW.low > compW.high) {
        signals.push({
          id: `learning:persistent-delivery-risk:${exactHash}`,
          type: "persistent-delivery-risk",
          cohortHash: exactHash,
          model: f.selectedModel as string,
          routeId: f.routeId as string,
          cohortRiskInterval: cohortW,
          comparatorRiskInterval: compW
        });
      } else {
        suppressed.overlappingIntervals++;
      }
    }
  }

  // 2. prediction-miscalibration
  for (const [model, obsList] of byModel.entries()) {
    const scorableObs = obsList.filter(o => o.predictedRisk !== null);
    
    // Bin into deciles [0, 0.1), [0.1, 0.2), ...
    const numBins = 10;
    for (let b = 0; b < numBins; b++) {
      examinedBins++;
      const binLow = b / numBins;
      const binHigh = (b + 1) / numBins;
      
      const inBin = scorableObs.filter(p => p.predictedRisk! >= binLow && p.predictedRisk! < binHigh);
      if (inBin.length < 20) {
        suppressed.insufficientSupport++;
        continue;
      }

      const binFailures = inBin.reduce((sum, o) => sum + o.actualFailure, 0);
      const meanPredicted = inBin.reduce((sum, o) => sum + o.predictedRisk!, 0) / inBin.length;
      
      const w = wilsonInterval(binFailures, inBin.length);
      if (!w) continue;

      if (meanPredicted < w.low) {
        signals.push({
          id: `learning:prediction-miscalibration:${DETECTOR_VERSION}:${model}:${binLow.toFixed(1)}`,
          type: "prediction-miscalibration",
          model,
          binLow,
          binHigh,
          meanPredicted,
          actualInterval: w,
          direction: "underpredicting",
          support: inBin.length
        });
      } else if (meanPredicted > w.high) {
        signals.push({
          id: `learning:prediction-miscalibration:${DETECTOR_VERSION}:${model}:${binLow.toFixed(1)}`,
          type: "prediction-miscalibration",
          model,
          binLow,
          binHigh,
          meanPredicted,
          actualInterval: w,
          direction: "overpredicting",
          support: inBin.length
        });
      } else {
        suppressed.overlappingIntervals++;
      }
    }
  }

  // 3. cohort-drift
  for (const [exactHash, exactObs] of byExact.entries()) {
    if (exactObs.length < 40) {
      suppressed.insufficientSupport++;
      continue;
    }
    
    const sorted = [...exactObs].sort((a, b) => {
      const ta = a.outcome.observedAt || "";
      const tb = b.outcome.observedAt || "";
      if (ta !== tb) return ta < tb ? -1 : 1;
      
      const rqa = a.outcome.requestId || "";
      const rqb = b.outcome.requestId || "";
      if (rqa !== rqb) return rqa < rqb ? -1 : 1;

      const pa = a.prediction.id || "";
      const pb = b.prediction.id || "";
      if (pa !== pb) return pa < pb ? -1 : 1;

      return 0;
    });

    const previous20 = sorted.slice(-40, -20);
    const recent20 = sorted.slice(-20);

    const prevFailures = previous20.reduce((sum, o) => sum + o.actualFailure, 0);
    const recFailures = recent20.reduce((sum, o) => sum + o.actualFailure, 0);

    const prevW = wilsonInterval(prevFailures, 20);
    const recW = wilsonInterval(recFailures, 20);

    if (prevW && recW) {
      const f = exactObs[0].prediction.features;
      if (recW.low > prevW.high) {
        signals.push({
          id: `learning:cohort-drift:${exactHash}`,
          type: "cohort-drift",
          cohortHash: exactHash,
          model: f.selectedModel as string,
          routeId: f.routeId as string,
          previousInterval: prevW,
          recentInterval: recW,
          direction: "increasing"
        });
      } else if (recW.high < prevW.low) {
        signals.push({
          id: `learning:cohort-drift:${exactHash}`,
          type: "cohort-drift",
          cohortHash: exactHash,
          model: f.selectedModel as string,
          routeId: f.routeId as string,
          previousInterval: prevW,
          recentInterval: recW,
          direction: "decreasing"
        });
      } else {
        suppressed.overlappingIntervals++;
      }
    }
  }

  // sort deterministically by type then stringified payload
  signals.sort((a, b) => {
    if (a.type !== b.type) return a.type < b.type ? -1 : 1;
    const sa = JSON.stringify(a);
    const sb = JSON.stringify(b);
    if (sa !== sb) return sa < sb ? -1 : 1;
    return 0;
  });

  return {
    schemaVersion: 1,
    detectorVersion: DETECTOR_VERSION,
    corpus: {
      eligible: uniqueObs.size,
      earliest,
      latest
    },
    examined: {
      cohorts: examinedCohorts,
      calibrationBins: examinedBins
    },
    suppressed,
    signals
  };
}
