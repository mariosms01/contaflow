export type TaskRule = {
    nome_tarefa: string;
    regra_vencimento: string;
    codigo_calculo: string;
};

export type GeneratedTask = {
    tarefa: string;
    vencimento: Date;
};

/**
 * Checks if a given date is a weekend.
 */
function isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
}

/**
 * Adds days until it hits a business day.
 */
function addBusinessDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    while (isWeekend(result)) {
        result.setDate(result.getDate() + Math.sign(days));
    }
    return result;
}

/**
 * Gets the Nth business day of a month.
 */
function getNthBusinessDay(year: number, month: number, n: number): Date {
    let date = new Date(year, month, 1);
    let businessDaysCount = 0;

    while (date.getMonth() === month) {
        if (!isWeekend(date)) {
            businessDaysCount++;
            if (businessDaysCount === n) {
                return date;
            }
        }
        date.setDate(date.getDate() + 1);
    }
    // Fallback to last day if 'n' is larger than total business days
    const lastDay = new Date(year, month + 1, 0);
    return lastDay;
}

/**
 * Gets the last business day of a month.
 */
function getLastBusinessDay(year: number, month: number): Date {
    // start at the last day of the month
    let date = new Date(year, month + 1, 0);
    while (isWeekend(date)) {
        date.setDate(date.getDate() - 1);
    }
    return date;
}

/**
 * Calculates the exact due date based on the competency and the strategy rule.
 * @param compMonth The competency month (1-12)
 * @param compYear The competency year (e.g. 2026)
 * @param strategy The calculation code (e.g. DIA_20_SEG_ADIADO)
 */
export function calculateDueDate(compMonth: number, compYear: number, strategy: string): Date {
    // Determine Next Month and Second Next Month (0-indexed for JS Date)
    // Note: if compMonth = 2 (February), JS Date month is 1. Next month is 2 (March).
    const jsCompMonthIndex = compMonth - 1;
    const nextMonthIndex = jsCompMonthIndex + 1;
    const secondNextMonthIndex = jsCompMonthIndex + 2;

    let baseDate: Date;

    // Handle dynamic codes
    if (strategy.startsWith('DINAMICO_CORRIDOS_')) {
        const days = parseInt(strategy.replace('DINAMICO_CORRIDOS_', ''), 10);
        // Dias corridos após o final da competência
        const endOfComp = new Date(compYear, nextMonthIndex, 0);
        const targetDate = new Date(endOfComp);
        targetDate.setDate(targetDate.getDate() + days);
        return targetDate;
    }

    if (strategy.startsWith('DINAMICO_UTEIS_')) {
        const days = parseInt(strategy.replace('DINAMICO_UTEIS_', ''), 10);
        // X dias úteis após o final da competência (no próximo mês)
        // Isso é igual ao N-ésimo dia útil do mês seguinte!
        return getNthBusinessDay(compYear, nextMonthIndex, days);
    }

    switch (strategy) {
        case 'DIA_20_SEG_ADIADO':
            // Dia 20 do mês seguinte, adiado (se final de semana, vai p/ frente)
            baseDate = new Date(compYear, nextMonthIndex, 20);
            if (isWeekend(baseDate)) {
                baseDate = addBusinessDays(baseDate, 1);
            }
            return baseDate;

        case 'DIA_15_SEG_NORMAL':
            // Dia 15 do mês seguinte
            return new Date(compYear, nextMonthIndex, 15);

        case 'ULTIMO_DIA_UTIL_2_SEG':
            // Último dia útil do 2º mês seguinte
            return getLastBusinessDay(compYear, secondNextMonthIndex);

        case 'DIA_28_SEG_NORMAL':
            // Dia 28 do mês seguinte
            return new Date(compYear, nextMonthIndex, 28);

        case 'DIA_25_SEG_ANTECIPADO':
            // Dia 25 do mês seguinte, antecipado (se final de semana, volta pra trás)
            baseDate = new Date(compYear, nextMonthIndex, 25);
            if (isWeekend(baseDate)) {
                baseDate = addBusinessDays(baseDate, -1);
            }
            return baseDate;

        case 'DIA_20_SEG_NORMAL':
            // Dia 20 do mês seguinte
            return new Date(compYear, nextMonthIndex, 20);

        case 'DECIMO_DIA_UTIL_2_SEG':
            // 10º dia útil do segundo mês seguinte
            return getNthBusinessDay(compYear, secondNextMonthIndex, 10);

        case 'ULTIMO_DIA_SEG_NORMAL':
            // Último dia do mês seguinte
            return new Date(compYear, nextMonthIndex + 1, 0);

        default:
            console.warn(`Regra de vencimento não suportada: ${strategy}. Retornando dia 1º do próximo mês.`);
            return new Date(compYear, nextMonthIndex, 1);
    }
}

/**
 * Parses "MM/YYYY" into [Month, Year].
 */
export function parseCompetencia(competenciaStr: string): { month: number, year: number } {
    const [m, y] = competenciaStr.split('/');
    return { month: parseInt(m, 10), year: parseInt(y, 10) };
}

/**
 * Generates tasks for a given competency based on an array of rules.
 */
export function generateTasksFromRules(competencia: string, rules: TaskRule[]): GeneratedTask[] {
    const { month, year } = parseCompetencia(competencia);

    return rules.map(rule => {
        const dueDate = calculateDueDate(month, year, rule.codigo_calculo);
        return {
            tarefa: rule.nome_tarefa,
            vencimento: dueDate
        };
    });
}
