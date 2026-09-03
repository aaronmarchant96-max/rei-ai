/**
 * Keep the last verification date stable while the measured totals are stable.
 * A calendar change is not claim drift; a measurement change is.
 */
export function renderLatestVerifiedFullSuite(
  matchedLine,
  { testCount, suiteCount, verificationDate },
) {
  const counts = matchedLine.match(
    /\*\*(\d+)\/(\d+) suites\*\*, \*\*(\d+)\/(\d+) tests\*\*/,
  );

  if (
    counts &&
    Number(counts[1]) === suiteCount &&
    Number(counts[2]) === suiteCount &&
    Number(counts[3]) === testCount &&
    Number(counts[4]) === testCount
  ) {
    return matchedLine;
  }

  return `Latest verified full-suite result (${verificationDate}): **${suiteCount}/${suiteCount} suites**, **${testCount}/${testCount} tests**.`;
}
