/**
 * Whether the letters of `query` appear in `str` in the same order, not
 * always side by side. Case does not matter: "rs" matches "Russian".
 */
export function fuzzy(str: string, query: string): boolean {
    let qi = 0;
    for (let si = 0; si < str.length && qi < query.length; si++) {
        if (str[si].toLowerCase() === query[qi].toLowerCase()) {
            qi++;
        }
    }
    return qi === query.length;
}

/**
 * The Levenshtein distance between `a` and `b`, but it stops early once the
 * distance is sure to pass `maxDist` and then returns `maxDist + 1`.
 */
export function levenshteinLimited(
    a: string,
    b: string,
    maxDist: number
): number {
    const lenA = a.length;
    const lenB = b.length;

    if (Math.abs(lenA - lenB) > maxDist) return maxDist + 1;

    const dp = new Array<number>(lenB + 1);
    for (let j = 0; j <= lenB; j++) {
        dp[j] = j;
    }

    for (let i = 1; i <= lenA; i++) {
        let prev = dp[0];
        dp[0] = i;
        let rowMin = dp[0];

        for (let j = 1; j <= lenB; j++) {
            const temp = dp[j];
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;

            dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);

            prev = temp;

            if (dp[j] < rowMin) {
                rowMin = dp[j];
            }
        }

        if (rowMin > maxDist) {
            return maxDist + 1;
        }
    }

    return dp[lenB];
}

enum MatchPriority {
    None = -1,
    Levenshtein = 0,
    Fuzzy = 1,
}

type Match<T> = {
    option: T;
    priority: MatchPriority;
    distance: number;
};

/**
 * The options that match what the user typed, best first. A field that holds
 * the letters of the query in order comes first; then a field within
 * `maxDistance` edits of the query, the closest first. Case and spaces around
 * the query do not matter, and equal matches keep their order. A blank query
 * returns all options.
 */
export function matchOptions<T>(
    options: readonly T[],
    query: string,
    fields: (option: T) => readonly string[],
    maxDistance = 2
): T[] {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice();

    const matches = options
        .map((option): Match<T> | null => {
            let priority: MatchPriority = MatchPriority.None;
            let distance = Number.MAX_SAFE_INTEGER;

            for (const raw of fields(option)) {
                const field = raw.toLowerCase();
                if (fuzzy(field, q)) {
                    priority = MatchPriority.Fuzzy;
                    distance = 0;
                    break;
                }
                const current = levenshteinLimited(field, q, maxDistance);
                if (
                    current <= maxDistance &&
                    (priority === MatchPriority.None || current < distance)
                ) {
                    priority = MatchPriority.Levenshtein;
                    distance = current;
                }
            }

            if (priority === MatchPriority.None) return null;
            return { option, priority, distance };
        })
        .filter((m): m is Match<T> => m !== null);

    // Array.prototype.sort is stable, so equal matches keep their order.
    matches.sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        return a.distance - b.distance;
    });

    return matches.map((m) => m.option);
}
