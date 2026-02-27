import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateTasksFromRules, TaskRule } from "@/lib/task-generator";

// Usa Service Role Key para ignorar RLS e poder inserir num cron/job, ou anon key dependendo do caso.
// Aqui vamos usar a ANON KEY mesmo, ou a URL/KEY do env.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
    try {
        const { mes, ano, empresa_id } = await request.json();

        if (!mes || !ano) {
            return NextResponse.json({ error: "Parâmetros 'mes' e 'ano' são obrigatórios (ex: { mes: 2, ano: 2026 })" }, { status: 400 });
        }

        const compString = `${String(mes).padStart(2, '0')}/${ano}`;

        // 1. Obter todas as empresas ativas com os IDs dos seus Regimes
        let empQuery = supabase
            .from('empresas')
            .select('id, razao_social, regime_id')
            .not('regime_id', 'is', null);

        if (empresa_id) {
            empQuery = empQuery.eq('id', empresa_id);
        }

        const { data: empresas, error: empError } = await empQuery;

        if (empError) throw empError;
        if (!empresas || empresas.length === 0) {
            return NextResponse.json({ message: "Nenhuma empresa com regime tributário vinculado encontrada." });
        }

        // 2. Obter todas as regras de regimes
        const { data: regrasData, error: regrasError } = await supabase
            .from('regras_tarefas_regime')
            .select('regime_id, nome_tarefa, regra_vencimento, codigo_calculo');

        if (regrasError) throw regrasError;

        // Agrupar regras por regime_id para facilitar o lookup
        const regrasPorRegime = (regrasData || []).reduce((acc: Record<string, TaskRule[]>, regra) => {
            if (!acc[regra.regime_id]) acc[regra.regime_id] = [];
            acc[regra.regime_id].push({
                nome_tarefa: regra.nome_tarefa,
                regra_vencimento: regra.regra_vencimento,
                codigo_calculo: regra.codigo_calculo
            });
            return acc;
        }, {});

        // 3. Checar duplicatas já existentes na base para a mesma competência e empresas
        const idsEmpresas = empresas.map(e => e.id);
        const { data: tarefasExistentes, error: errExist } = await supabase
            .from('tarefas')
            .select('empresa_id, tipo_imposto')
            .eq('mes_competencia', compString)
            .in('empresa_id', idsEmpresas);

        if (errExist) throw errExist;

        const setTarefasExistentes = new Set((tarefasExistentes || []).map(t => `${t.empresa_id}-${t.tipo_imposto}`));

        // 4. Montar o Bulk Insert Array
        const tarefasParaInserir: any[] = [];

        for (const empresa of empresas) {
            const regrasDesteRegime = regrasPorRegime[empresa.regime_id] || [];
            if (regrasDesteRegime.length === 0) continue;

            // Chama nossa Engine TypeScript
            const generated = generateTasksFromRules(compString, regrasDesteRegime);

            // Mapeia para o formato da tabela `tarefas`
            for (const t of generated) {
                // Anti-Duplicação
                if (setTarefasExistentes.has(`${empresa.id}-${t.tarefa}`)) {
                    continue; // Pula essa tarefa pois já foi gerada para essa empresa nesta competência
                }

                // Garantindo timezone para não dar diferença no JS/Banco
                const vDate = t.vencimento;
                const formattedDate = `${vDate.getFullYear()}-${String(vDate.getMonth() + 1).padStart(2, '0')}-${String(vDate.getDate()).padStart(2, '0')}`;

                tarefasParaInserir.push({
                    empresa_id: empresa.id,
                    tipo_imposto: t.tarefa,
                    mes_competencia: compString,
                    vencimento: formattedDate,
                    // data_alerta: data_alerta é requerido no Supabase "Vencimento - 5 dias úteis".
                    data_alerta: formattedDate, // Simplificação por enquanto. Idealmente fazer a subtração real da engine.
                    status: 'PENDENTE'
                });
            }
        }

        if (tarefasParaInserir.length === 0) {
            return NextResponse.json({ message: "Nenhuma tarefa foi gerada (regras inexistentes para os regimes encontrados)." });
        }

        // 4. Inserir no Supabase
        const { data: resultInsert, error: errInsert } = await supabase
            .from('tarefas')
            .insert(tarefasParaInserir)
            .select();

        if (errInsert) throw errInsert;

        return NextResponse.json({
            message: `${tarefasParaInserir.length} tarefas geradas com sucesso para a competência ${compString}`,
            tarefas: resultInsert
        });

    } catch (error: any) {
        console.error("Erro na geração de tarefas:", error);
        return NextResponse.json({ error: error.message || "Erro desconhecido" }, { status: 500 });
    }
}
