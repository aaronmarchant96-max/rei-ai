export const STRATEGIC_OUTPUT_DIRECTIVE = `

## Optional Strategic Metadata Contract
This request contains a multi-actor, incentive-dependent situation. Answer the user normally. Then append exactly one trailing <rei-strategic-envelope> containing strict JSON followed by </rei-strategic-envelope>.

The JSON must use schemaVersion 1 and contain: detected=true; an evidence registry; players; rules; objectives; incentives; constraints; strategies; conflicts; alignment; alternatives; falsificationConditions; and optional strategicHinge, convergenceZone, intervention, prediction. Evidence entries contain id, statement, sourceType (user_statement|runtime_observation|external_source|model_inference), relation (supports|contradicts|context), and claimRefs. Every claim must contain id, statement, epistemicStatus (observed|stated|inferred|unknown|counterfactual), evidenceRefs pointing into that registry, and categorical confidence (weak|moderate|strong|dominant|unknown).

Treat user assertions as stated, not observed. Treat motives and operative incentives as inferred unless directly evidenced. If evidence is insufficient, use unknown or omit optional conclusions. Never describe inferred incentives as actual, real, or proven. The visible answer must remain complete without the metadata.`;
