"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { calculateDueDate } from "@/lib/task-generator";
import {
  Bell, Search, Upload, FileText, CheckCircle2, Clock,
  AlertTriangle, Plus, Filter, MoreVertical, Download,
  ChevronDown, ChevronUp, Building2, Calendar, FileUp, RefreshCw, Trash2, Settings, LogOut
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModeToggle } from "@/components/mode-toggle";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TaskData = {
  id: string;
  escritorio: string;
  empresa: string;
  tarefa: string;
  comp: string;
  venc: string;
  status: string;
};

type EscritorioData = { id: string; nome: string; cor?: string };
type RegimeData = { id: string; nome: string };
type TaskRuleData = { id: string; regime_id: string; nome_tarefa: string; codigo_calculo?: string };

const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case "CONCLUÍDA":
      return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400"><CheckCircle2 className="w-3 h-3 mr-1" /> Concluída</Badge>;
    case "URGENTE":
      return <Badge className="bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 border-orange-500/20 dark:bg-orange-500/20 dark:text-orange-400"><AlertTriangle className="w-3 h-3 mr-1" /> Urgente</Badge>;
    case "ATRASADA":
      return <Badge variant="destructive" className="bg-red-500 text-white"><AlertTriangle className="w-3 h-3 mr-1" /> Atrasada</Badge>;
    default:
      return <Badge variant="outline" className="text-slate-600 border-slate-200 hover:bg-slate-100 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>;
  }
};

export default function Dashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedEmpresas, setExpandedEmpresas] = useState<string[]>([]);
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();

  // Aux data
  const [escritorios, setEscritorios] = useState<EscritorioData[]>([]);
  const [regimes, setRegimes] = useState<RegimeData[]>([]);
  const [regrasTarefas, setRegrasTarefas] = useState<TaskRuleData[]>([]);

  // Modals state
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [isNewCompanyOpen, setIsNewCompanyOpen] = useState(false);
  const [isNewEscritorioOpen, setIsNewEscritorioOpen] = useState(false);
  const [isNewRegimeOpen, setIsNewRegimeOpen] = useState(false);
  const [isManageRegimesOpen, setIsManageRegimesOpen] = useState(false);

  // Forms
  const [newEscritorioName, setNewEscritorioName] = useState("");
  const [newEscritorioColor, setNewEscritorioColor] = useState("slate");
  const [isSavingEscritorio, setIsSavingEscritorio] = useState(false);

  const [newRegimeName, setNewRegimeName] = useState("");
  const [isSavingRegime, setIsSavingRegime] = useState(false);

  // Task form
  const [taskEscritorioFilter, setTaskEscritorioFilter] = useState("");
  const [taskRegimeFilter, setTaskRegimeFilter] = useState("todos");
  const [taskEmpresaForm, setTaskEmpresaForm] = useState("");
  const [taskNameForm, setTaskNameForm] = useState("");
  const [taskCustomName, setTaskCustomName] = useState("");
  const [taskCompetenciaForm, setTaskCompetenciaForm] = useState("");
  const [taskDateForm, setTaskDateForm] = useState("");
  const [taskPeriodForm, setTaskPeriodForm] = useState("avulsa");
  const [taskRuleType, setTaskRuleType] = useState("uteis");
  const [taskRuleDays, setTaskRuleDays] = useState("10");
  const [isSavingTask, setIsSavingTask] = useState(false);

  // Modal de Exclusão (Safe Delete)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'empresa' | 'escritorio', id: string, name: string } | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const [genMonth, setGenMonth] = useState<string>((new Date().getMonth() + 1).toString());
  const [genYear, setGenYear] = useState<string>(new Date().getFullYear().toString());

  // New Company form
  const [newCompRazao, setNewCompRazao] = useState("");
  const [newCompCnpj, setNewCompCnpj] = useState("");
  const [newCompEscritorio, setNewCompEscritorio] = useState("");
  const [newCompRegime, setNewCompRegime] = useState("");
  const [isSavingCompany, setIsSavingCompany] = useState(false);

  useEffect(() => {
    if (taskRegimeFilter !== "todos" && taskRegimeFilter !== "avulsa" && taskRegimeFilter !== "" && taskNameForm && taskNameForm !== "personalizada" && taskCompetenciaForm) {
      if (taskCompetenciaForm.match(/^\d{2}\/\d{4}$/)) {
        const rule = regrasTarefas.find(r => r.nome_tarefa === taskNameForm && r.regime_id === taskRegimeFilter);
        if (rule && rule.codigo_calculo) {
          const [m, y] = taskCompetenciaForm.split('/');
          const dueDate = calculateDueDate(parseInt(m, 10), parseInt(y, 10), rule.codigo_calculo);
          const formatted = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`;
          setTaskDateForm(formatted);
        }
      }
    }
  }, [taskCompetenciaForm, taskNameForm, taskRegimeFilter, regrasTarefas]);

  const fetchDashboardData = async () => {
    setLoading(true);
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data, error } = await supabase
      .from("empresas")
      .select(`
          id,
          razao_social,
          escritorios (
            nome
          ),
          tarefas (
            id,
            tipo_imposto,
            mes_competencia,
            vencimento,
            status
          )
        `);

    if (data) {
      const mappedTasks: TaskData[] = [];
      data.forEach((emp: any) => {
        const escritorio = emp.escritorios?.nome || "Sem Escritório";
        const empresa = emp.razao_social || "Empresa Desconhecida";

        if (!emp.tarefas || emp.tarefas.length === 0) {
          mappedTasks.push({
            id: "dummy-" + emp.id,
            escritorio,
            empresa,
            tarefa: "",
            comp: "",
            venc: "",
            status: "DUMMY"
          });
        } else {
          emp.tarefas.forEach((t: any) => {
            mappedTasks.push({
              id: t.id,
              escritorio,
              empresa,
              tarefa: t.tipo_imposto,
              comp: t.mes_competencia,
              venc: t.vencimento ? new Date(new Date(t.vencimento).getTime() + new Date().getTimezoneOffset() * 60000).toLocaleDateString("pt-BR") : "N/A",
              status: t.status,
            });
          });
        }
      });
      setTasks(mappedTasks);
    }
    setLoading(false);
    setLoading(false);
  };

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchAuxData = async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const [resEsc, resReg, resRules] = await Promise.all([
        supabase.from("escritorios").select("id, nome, cor").order("nome"),
        supabase.from("regimes").select("id, nome").order("nome"),
        supabase.from("regras_tarefas_regime").select("id, regime_id, nome_tarefa").order("nome_tarefa")
      ]);
      if (resEsc.data) setEscritorios(resEsc.data);
      if (resReg.data) setRegimes(resReg.data);
      if (resRules.data) setRegrasTarefas(resRules.data);
    };
    fetchAuxData();
  }, []);

  const handleGenerateTasks = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/obrigacoes/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mes: parseInt(genMonth), ano: parseInt(genYear) })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Erro ao gerar tarefas");

      alert(result.message);
      setIsGenerateOpen(false);
      fetchDashboardData(); // Refresh da tela
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveCompany = async () => {
    if (!newCompRazao || !newCompCnpj || !newCompEscritorio || !newCompRegime) {
      alert("Preencha todos os campos obrigatórios!");
      return;
    }
    setIsSavingCompany(true);
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const selectedRegime = regimes.find(r => r.id === newCompRegime);

    const { data: insertedComp, error } = await supabase.from('empresas').insert({
      razao_social: newCompRazao,
      cnpj: newCompCnpj,
      escritorio_id: newCompEscritorio,
      regime_id: newCompRegime === 'sem_regime' ? null : newCompRegime,
      regime_trib: selectedRegime?.nome || "Não Informado" // Populate legacy text column to avoid NOT NULL constraint
    }).select();

    setIsSavingCompany(false);
    if (error) {
      alert("Erro ao cadastrar empresa: " + error.message);
    } else {
      // Automatic task generation for this specific company for the current month
      if (insertedComp && insertedComp.length > 0) {
        try {
          const today = new Date();
          await fetch("/api/obrigacoes/gerar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mes: today.getMonth() + 1,
              ano: today.getFullYear(),
              empresa_id: insertedComp[0].id
            })
          });
        } catch (e) {
          console.error("Erro ao auto-gerar tarefas para nova empresa", e);
        }
      }

      alert("Empresa cadastrada e plano de tarefas inicializado com sucesso!");
      setIsNewCompanyOpen(false);
      setNewCompRazao("");
      setNewCompCnpj("");
      setNewCompEscritorio("");
      setNewCompRegime("");
      fetchDashboardData();
    }
  };

  const handleSaveEscritorio = async () => {
    if (!newEscritorioName) { alert("Informe o nome do Escritório"); return; }
    setIsSavingEscritorio(true);
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { error } = await supabase.from('escritorios').insert({ nome: newEscritorioName, cor: newEscritorioColor });
    setIsSavingEscritorio(false);
    if (error) alert(error.message);
    else {
      setIsNewEscritorioOpen(false); setNewEscritorioName(""); setNewEscritorioColor("slate");
      // refresh aux data
      const resEsc = await supabase.from("escritorios").select("id, nome, cor").order("nome");
      if (resEsc.data) setEscritorios(resEsc.data);
    }
  };

  const handleSaveRegime = async () => {
    if (!newRegimeName) { alert("Informe o nome do Regime"); return; }
    setIsSavingRegime(true);
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

    // Check for existing regime
    const { data: existingRegime } = await supabase.from('regimes').select('id').eq('nome', newRegimeName).single();
    if (existingRegime) {
      alert("Este regime tributário já existe!");
      setIsSavingRegime(false);
      return;
    }

    const { error } = await supabase.from('regimes').insert({ nome: newRegimeName });
    setIsSavingRegime(false);
    if (error) alert(error.message);
    else {
      setIsNewRegimeOpen(false); setNewRegimeName("");
      const resReg = await supabase.from("regimes").select("id, nome").order("nome");
      if (resReg.data) setRegimes(resReg.data);
    }
  };

  const handleSaveTask = async () => {
    const finalTaskName = taskNameForm === "personalizada" ? taskCustomName : taskNameForm;
    if (!taskEmpresaForm || !finalTaskName || !taskCompetenciaForm || !taskDateForm) {
      alert("Preencha a Empresa, o Nome da Tarefa, a Competência e o Vencimento.");
      return;
    }

    // Prevent accidental saves without name if they selected "novo_regime" but didn't fill it
    if (taskRegimeFilter === "novo_regime" && !newRegimeName) {
      alert("Por favor digite o nome do Novo Regime antes de salvar.");
      return;
    }

    setIsSavingTask(true);
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

    // Find the original empresa ID
    const { data: empData } = await supabase.from("empresas").select("id").eq("razao_social", taskEmpresaForm).single();
    if (!empData) {
      alert("Erro ao localizar a empresa selecionada no banco.");
      setIsSavingTask(false);
      return;
    }

    let actRegimeId = taskRegimeFilter;

    // 1. If it's a new Regime, create it first or find it if it exists
    if (taskRegimeFilter === "novo_regime") {
      const { data: existingReg } = await supabase.from('regimes').select('id').eq('nome', newRegimeName).single();

      if (existingReg) {
        actRegimeId = existingReg.id;
      } else {
        const { data: newRegData, error: regErr } = await supabase.from('regimes')
          .insert({ nome: newRegimeName }).select("id").single();

        if (regErr || !newRegData) {
          alert("Erro ao criar Novo Regime: " + (regErr?.message || "Erro desconhecido"));
          setIsSavingTask(false);
          return;
        }
        actRegimeId = newRegData.id;
      }
    }

    // 2. If it is "permanente", we need to save the Rule into regras_tarefas_regime
    if (taskPeriodForm === "permanente" && actRegimeId && actRegimeId !== "todos" && actRegimeId !== "avulsa") {
      const ruleCode = `DINAMICO_${taskRuleType.toUpperCase()}_${taskRuleDays}`;
      const ruleDesc = taskRuleType === 'uteis' ? `${taskRuleDays} dias úteis após o final da competência` : `${taskRuleDays} dias corridos após o final da competência`;

      await supabase.from('regras_tarefas_regime').insert({
        regime_id: actRegimeId,
        nome_tarefa: finalTaskName,
        codigo_calculo: ruleCode,
        regra_vencimento: ruleDesc
      });
    }

    // 3. Insert the Task instance
    const { error } = await supabase.from("tarefas").insert({
      empresa_id: empData.id,
      tipo_imposto: finalTaskName,
      mes_competencia: taskCompetenciaForm,
      vencimento: taskDateForm,
      data_alerta: taskDateForm,
      status: "PENDENTE"
    });

    setIsSavingTask(false);
    if (error) {
      alert("Erro ao criar tarefa: " + error.message);
    } else {
      alert("Tarefa salva com sucesso!" + (taskPeriodForm === "permanente" ? " A regra de recorrência foi configurada." : ""));
      setIsNewTaskOpen(false);
      setTaskNameForm("");
      setTaskCustomName("");
      setTaskCompetenciaForm("");
      setTaskDateForm("");
      setTaskEmpresaForm("");
      setNewRegimeName("");
      setTaskPeriodForm("avulsa");

      // Refresh regimes and rules if we added new ones
      if (taskRegimeFilter === "novo_regime" || taskPeriodForm === "permanente") {
        const [resReg, resRules] = await Promise.all([
          supabase.from("regimes").select("id, nome").order("nome"),
          supabase.from("regras_tarefas_regime").select("id, regime_id, nome_tarefa, codigo_calculo")
        ]);
        if (resReg.data) setRegimes(resReg.data);
        if (resRules.data) setRegrasTarefas(resRules.data);
      }

      fetchDashboardData();
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || deleteConfirmText !== "CONFIRMA") return;
    setIsDeleting(true);
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

    let targetId = deleteTarget.id;

    if (deleteTarget.type === 'empresa' && targetId === 'lookup') {
      // Find the company ID by its razao_social since we only store names in groupedTasks
      const { data: empInfo } = await supabase.from('empresas').select('id').eq('razao_social', deleteTarget.name).single();
      if (empInfo) {
        targetId = empInfo.id;
      } else {
        alert("Empresa não encontrada no banco");
        setIsDeleting(false);
        return;
      }
    }

    try {
      if (deleteTarget.type === 'empresa') {
        await supabase.from('tarefas').delete().eq('empresa_id', targetId);
        const { error } = await supabase.from('empresas').delete().eq('id', targetId);
        if (error) throw error;
      } else if (deleteTarget.type === 'escritorio') {
        const { data: companies } = await supabase.from('empresas').select('id').eq('escritorio_id', targetId);
        if (companies && companies.length > 0) {
          const compIds = companies.map(c => c.id);
          await supabase.from('tarefas').delete().in('empresa_id', compIds);
          await supabase.from('empresas').delete().eq('escritorio_id', targetId);
        }
        const { error } = await supabase.from('escritorios').delete().eq('id', targetId);
        if (error) throw error;
      }

      setDeleteModalOpen(false);
      setDeleteTarget(null);
      setDeleteConfirmText("");

      // Refresh options after delete
      if (deleteTarget.type === 'escritorio') {
        if (activeTab === deleteTarget.name) setActiveTab("");
        const resEsc = await supabase.from("escritorios").select("id, nome, cor").order("nome");
        if (resEsc.data) setEscritorios(resEsc.data);
      }

      fetchDashboardData();
    } catch (err: any) {
      alert(`Erro ao excluir ${deleteTarget.type}: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Export Reports Handler
  const handleDownloadRelatorio = () => {
    if (!activeTab || !groupedTasks[activeTab]) return;

    const relevantTasks = Object.values(groupedTasks[activeTab]).flat().filter(t => t.status !== "DUMMY");
    if (relevantTasks.length === 0) {
      alert("Nenhuma tarefa para exportar neste escritório.");
      return;
    }

    // Convert to CSV
    const headers = ["Empresa", "Obrigação", "Competência", "Vencimento", "Status"];
    const csvContent = headers.join(",") + "\n" + relevantTasks.map(t =>
      `"${t.empresa}","${t.tarefa}","${t.comp}","${t.venc}","${t.status}"`
    ).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Relatorio_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Group Tasks by Escritório -> Empresa
  const validTasks = tasks.filter(t => t.status !== "DUMMY");

  type GroupedData = Record<string, Record<string, TaskData[]>>;
  const groupedTasks = tasks.reduce((acc, task) => {
    if (!acc[task.escritorio]) acc[task.escritorio] = {};
    if (!acc[task.escritorio][task.empresa]) acc[task.escritorio][task.empresa] = [];
    if (task.status !== "DUMMY") {
      acc[task.escritorio][task.empresa].push(task);
    }
    return acc;
  }, {} as GroupedData);

  const escritoriosNames = Object.keys(groupedTasks);

  useEffect(() => {
    if (escritoriosNames.length > 0 && !activeTab) {
      setActiveTab(escritoriosNames[0]);
    }
  }, [escritoriosNames, activeTab]);

  // Filter Active Escritório
  const activeEscritorioData = groupedTasks[activeTab] || {};

  // Filter
  const filteredEmpresas = Object.entries(activeEscritorioData).filter(([empresaName, tasks]) => {
    const term = searchTerm.toLowerCase();
    return empresaName.toLowerCase().includes(term) || tasks.some(t => t.tarefa.toLowerCase().includes(term));
  });

  const toggleEmpresa = (empresa: string) => {
    setExpandedEmpresas(prev => prev.includes(empresa) ? prev.filter(e => e !== empresa) : [...prev, empresa]);
  };

  const getEmpresaStats = (tasksList: TaskData[]) => {
    return {
      total: tasksList.length,
      concluidas: tasksList.filter(t => t.status === "CONCLUÍDA").length,
      criticas: tasksList.filter(t => t.status === "URGENTE" || t.status === "ATRASADA").length
    };
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-200">
      {/* Header Fixo */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 shadow-md shadow-blue-600/20 flex items-center justify-center text-white font-bold text-xl">
              C
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">ContaFlow</h1>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100" onClick={() => setIsManageRegimesOpen(true)}>
              <Settings className="h-5 w-5" />
            </Button>
            <ModeToggle />

            <div className="w-9 h-9 ml-2 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">PR</span>
            </div>

            <Button variant="ghost" size="icon" className="text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 ml-1" onClick={async () => {
              await fetch('/api/auth', { method: 'DELETE' });
              router.push('/login');
            }}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex-1">

        {/* Painel Título e Call to Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Dashboard de Entregas</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Acompanhamento das obrigações fiscais da <strong className="text-slate-700 dark:text-slate-300">MEBRACON</strong></p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Modal de Gerar Rotinas */}
            <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <RefreshCw className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" /> Gerar Rotina Mês
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[450px] dark:bg-slate-900">
                <DialogHeader>
                  <DialogTitle>Automatização de Obrigações</DialogTitle>
                  <DialogDescription>
                    O ContaFlow criará automaticamente as tarefas pendentes de acordo com o <strong>Regime Tributário</strong> de cada empresa vinculada.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="mes-comp">Mês da Competência</Label>
                      <Select value={genMonth} onValueChange={setGenMonth}>
                        <SelectTrigger id="mes-comp">
                          <SelectValue placeholder="Mês" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                            <SelectItem key={m} value={m.toString()}>{String(m).padStart(2, '0')}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ano-comp">Ano</Label>
                      <Select value={genYear} onValueChange={setGenYear}>
                        <SelectTrigger id="ano-comp">
                          <SelectValue placeholder="Ano" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2025">2025</SelectItem>
                          <SelectItem value="2026">2026</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsGenerateOpen(false)}>Cancelar</Button>
                  <Button type="button" onClick={handleGenerateTasks} disabled={isGenerating}>
                    {isGenerating ? "Gerando..." : "Gerar Obrigações"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Modal de Nova Empresa */}
            <Dialog open={isNewCompanyOpen} onOpenChange={setIsNewCompanyOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <Building2 className="w-4 h-4 mr-2 text-emerald-600 dark:text-emerald-500" /> Nova Empresa
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] dark:bg-slate-900">
                <DialogHeader>
                  <DialogTitle>Cadastrar Nova Empresa</DialogTitle>
                  <DialogDescription>
                    Adicione uma nova empresa informando a qual Escritório ela pertence e qual o seu Regime Tributário.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right text-slate-700 dark:text-slate-300">Razão Social</Label>
                    <Input
                      placeholder="Ex: TAREFIX Ltda" className="col-span-3"
                      value={newCompRazao} onChange={e => setNewCompRazao(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right text-slate-700 dark:text-slate-300">CNPJ</Label>
                    <Input
                      placeholder="00.000.000/0000-00" className="col-span-3"
                      value={newCompCnpj} onChange={e => setNewCompCnpj(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right text-slate-700 dark:text-slate-300">Escritório</Label>
                    <Select value={newCompEscritorio} onValueChange={setNewCompEscritorio}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Selecione o Escritório..." />
                      </SelectTrigger>
                      <SelectContent>
                        {escritorios.map(esc => (
                          <SelectItem key={esc.id} value={esc.id}>{esc.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right text-slate-700 dark:text-slate-300">Regime</Label>
                    <Select value={newCompRegime} onValueChange={setNewCompRegime}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Selecione o Regime..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sem_regime">Nenhum (Em branco)</SelectItem>
                        {regimes.map(reg => (
                          <SelectItem key={reg.id} value={reg.id}>{reg.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsNewCompanyOpen(false)}>Cancelar</Button>
                  <Button onClick={handleSaveCompany} disabled={isSavingCompany}>
                    {isSavingCompany ? "Salvando..." : "Salvar Empresa"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>


            <Dialog open={isNewEscritorioOpen} onOpenChange={setIsNewEscritorioOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <Building2 className="w-4 h-4 mr-2 text-slate-500" /> Novo Escritório
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                  <DialogTitle>Cadastrar Mestre (Escritório)</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="space-y-2">
                    <Label>Nome do Escritório</Label>
                    <Input value={newEscritorioName} onChange={e => setNewEscritorioName(e.target.value)} placeholder="Ex: Matriz Itajaí" />
                  </div>
                  <div className="space-y-2">
                    <Label>Cor de Representação</Label>
                    <Select value={newEscritorioColor} onValueChange={setNewEscritorioColor}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma cor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="slate"><div className="flex items-center"><div className="w-3 h-3 rounded-full bg-slate-500 mr-2"></div> Padrão</div></SelectItem>
                        <SelectItem value="blue"><div className="flex items-center"><div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div> Azul</div></SelectItem>
                        <SelectItem value="emerald"><div className="flex items-center"><div className="w-3 h-3 rounded-full bg-emerald-500 mr-2"></div> Verde</div></SelectItem>
                        <SelectItem value="purple"><div className="flex items-center"><div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div> Roxo</div></SelectItem>
                        <SelectItem value="orange"><div className="flex items-center"><div className="w-3 h-3 rounded-full bg-orange-500 mr-2"></div> Laranja</div></SelectItem>
                        <SelectItem value="rose"><div className="flex items-center"><div className="w-3 h-3 rounded-full bg-rose-500 mr-2"></div> Rosa</div></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsNewEscritorioOpen(false)}>Cancelar</Button>
                  <Button onClick={handleSaveEscritorio} disabled={isSavingEscritorio}>Salvar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Modal Novo Regime */}
            <Dialog open={isNewRegimeOpen} onOpenChange={setIsNewRegimeOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <FileText className="w-4 h-4 mr-2 text-slate-500" /> Novo Regime
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                  <DialogTitle>Cadastrar Mestre (Regime Tributário)</DialogTitle>
                  <DialogDescription>
                    O Regime agrupará as regras de obrigações da automação.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                  <Label>Nome do Regime Tributário</Label>
                  <Input value={newRegimeName} onChange={e => setNewRegimeName(e.target.value)} placeholder="Ex: Simples Nacional - Construção" />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsNewRegimeOpen(false)}>Cancelar</Button>
                  <Button onClick={handleSaveRegime} disabled={isSavingRegime}>Salvar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Modal de Nova Tarefa Avulsa/Recorrente */}
            <Dialog open={isNewTaskOpen} onOpenChange={setIsNewTaskOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/10">
                  <Plus className="w-4 h-4 mr-2" /> Cadastrar Tarefa
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px] dark:bg-slate-900">
                <DialogHeader>
                  <DialogTitle>Criar Obrigação Fiscal / Tarefa</DialogTitle>
                  <DialogDescription>
                    Vincule uma nova obrigação à uma empresa específica. Ela assumirá as regras e datas da guia.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-4">
                  {/* Selectors */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300">1. Filtrar Escritório</Label>
                      <Select value={taskEscritorioFilter} onValueChange={setTaskEscritorioFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos os Escritórios</SelectItem>
                          {escritorios.map(esc => (
                            <SelectItem key={esc.id} value={esc.nome}>{esc.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300">2. Filtrar Regime (Regras)</Label>
                      <Select value={taskRegimeFilter} onValueChange={setTaskRegimeFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos (Manuais)</SelectItem>
                          <SelectItem value="novo_regime" className="text-emerald-600 font-semibold">+ Criar Novo Regime de Regras</SelectItem>
                          <SelectItem value="avulsa">TAREFA AVULSA (Personalizada)</SelectItem>
                          {regimes.map(reg => (
                            <SelectItem key={reg.id} value={reg.id}>{reg.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {taskRegimeFilter === "novo_regime" && (
                        <div className="mt-2 animate-in fade-in slide-in-from-top-2">
                          <Input
                            className="border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 focus-visible:ring-emerald-500"
                            placeholder="Digite o Nome do Novo Regime..."
                            value={newRegimeName}
                            onChange={e => setNewRegimeName(e.target.value)}
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300">3. Empresa</Label>
                      <Select value={taskEmpresaForm} onValueChange={setTaskEmpresaForm}>
                        <SelectTrigger>
                          <SelectValue placeholder="Escolher..." />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(groupedTasks)
                            .filter(([escritorio]) => taskEscritorioFilter === "todos" || taskEscritorioFilter === "" || escritorio === taskEscritorioFilter)
                            .flatMap(([escritorio, empresasMap]) =>
                              Object.keys(empresasMap).map(emp => (
                                <SelectItem key={`${escritorio}-${emp}`} value={emp}>{emp}</SelectItem>
                              ))
                            )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Task details */}
                  <div className="grid grid-cols-3 gap-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300">Nome da Tarefa / Guia</Label>
                      {taskRegimeFilter === "todos" || taskRegimeFilter === "avulsa" || taskRegimeFilter === "" || taskRegimeFilter === "novo_regime" ? (
                        <Input
                          placeholder={taskRegimeFilter === "novo_regime" ? "Ex: Guia Nova..." : "Ex: Guia INSS, DAS..."}
                          value={taskCustomName} onChange={e => { setTaskCustomName(e.target.value); setTaskNameForm("personalizada"); }}
                        />
                      ) : (
                        <Select value={taskNameForm} onValueChange={setTaskNameForm}>
                          <SelectTrigger>
                            <SelectValue placeholder="Escolha a Obrigação" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="personalizada">- Digitar Manualmente -</SelectItem>
                            {regrasTarefas.filter(r => r.regime_id === taskRegimeFilter).map(rule => (
                              <SelectItem key={rule.id} value={rule.nome_tarefa}>{rule.nome_tarefa}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {taskNameForm === "personalizada" && taskRegimeFilter !== "todos" && taskRegimeFilter !== "avulsa" && taskRegimeFilter !== "" && taskRegimeFilter !== "novo_regime" && (
                        <Input
                          className="mt-2"
                          placeholder="Nome da Tarefa Avulsa"
                          value={taskCustomName}
                          onChange={e => setTaskCustomName(e.target.value)}
                        />
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300">Competência</Label>
                      <Input
                        placeholder="MM/AAAA" className="w-full"
                        value={taskCompetenciaForm} onChange={e => setTaskCompetenciaForm(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300">Vencimento Original</Label>
                      <Input
                        type="date" className="w-full"
                        value={taskDateForm} onChange={e => setTaskDateForm(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Seletor de Periodicidade com Tabs */}
                  {(taskNameForm === "personalizada" || taskRegimeFilter === "todos" || taskRegimeFilter === "avulsa" || taskRegimeFilter === "" || taskRegimeFilter === "novo_regime") && (
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                      <Label className="block mb-3 text-slate-700 dark:text-slate-300 font-semibold">Periodicidade e Recorrência</Label>
                      <Tabs value={taskPeriodForm} onValueChange={setTaskPeriodForm} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="avulsa"><Calendar className="w-4 h-4 mr-2" /> Avulsa (1x)</TabsTrigger>
                          <TabsTrigger value="permanente"><RefreshCw className="w-4 h-4 mr-2" /> Contínua (Criar Regra)</TabsTrigger>
                        </TabsList>
                        <TabsContent value="avulsa" className="text-sm text-slate-500 dark:text-slate-400 mt-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md">
                          Esta tarefa aparecerá apenas nesta competência e não terá uma regra salva no banco para repetições.
                        </TabsContent>
                        <TabsContent value="permanente" className="text-sm text-blue-600 dark:text-blue-400 mt-3 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-100 dark:border-blue-800">
                          <p className="mb-3">Configurar regra para recriar esta tarefa no futuro:</p>
                          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                            <span className="text-slate-700 dark:text-slate-300 whitespace-nowrap">Vence:</span>
                            <Input type="number" className="w-20" value={taskRuleDays} onChange={e => setTaskRuleDays(e.target.value)} />
                            <Select value={taskRuleType} onValueChange={setTaskRuleType}>
                              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="uteis">Dias Úteis</SelectItem>
                                <SelectItem value="corridos">Dias Corridos</SelectItem>
                              </SelectContent>
                            </Select>
                            <span className="text-slate-700 dark:text-slate-300 whitespace-nowrap">após a competência.</span>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsNewTaskOpen(false)}>Cancelar</Button>
                  <Button onClick={handleSaveTask} disabled={isSavingTask}>
                    {isSavingTask ? "Salvando..." : "Salvar Tarefa"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Modal de Exclusão Segura */}
            <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
              <DialogContent className="sm:max-w-[400px] dark:bg-slate-900 border-red-100 dark:border-red-900/30">
                <DialogHeader>
                  <DialogTitle className="text-red-600 dark:text-red-500 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Excluir {deleteTarget?.type === 'empresa' ? 'Empresa' : 'Escritório'}
                  </DialogTitle>
                  <DialogDescription className="pt-2">
                    Você está prestes a excluir permanentemente <strong>{deleteTarget?.name}</strong> e todos os dados vinculados. Esta ação não pode ser desfeita.
                  </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-3">
                  <Label className="text-slate-700 dark:text-slate-300">
                    Para confirmar a exclusão, digite <strong className="text-red-600 dark:text-red-500">CONFIRMA</strong> abaixo:
                  </Label>
                  <Input
                    placeholder="Digite CONFIRMA"
                    value={deleteConfirmText}
                    onChange={e => setDeleteConfirmText(e.target.value)}
                    className="border-red-200 focus-visible:ring-red-500 dark:border-red-900/50"
                  />
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => { setDeleteModalOpen(false); setDeleteConfirmText(""); }}>
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteConfirm}
                    disabled={isDeleting || deleteConfirmText !== "CONFIRMA"}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {isDeleting ? "Excluindo..." : "Excluir Definitivamente"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Modal de Gerenciamento de Regimes */}
            <Dialog open={isManageRegimesOpen} onOpenChange={setIsManageRegimesOpen}>
              <DialogContent className="sm:max-w-[450px] dark:bg-slate-900">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" /> Gerenciador de Regimes
                  </DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                  {regimes.map((regime) => {
                    const rules = regrasTarefas.filter(r => r.regime_id === regime.id);
                    return (
                      <div key={regime.id} className="flex flex-col p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-700 dark:text-slate-300">{regime.nome}</span>
                          <Button
                            variant="ghost" size="icon"
                            className="text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={async () => {
                              if (confirm(`Tem certeza que deseja excluir o regime "${regime.nome}"? Empresas não serão apagadas, mas perderão a definição do modelo.`)) {
                                const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
                                setIsDeleting(true);
                                await supabase.from('empresas').update({ regime_id: null }).eq('regime_id', regime.id);
                                await supabase.from('regras_tarefas_regime').delete().eq('regime_id', regime.id);
                                const { error } = await supabase.from('regimes').delete().eq('id', regime.id);
                                setIsDeleting(false);
                                if (error) alert("Erro: " + error.message);
                                else {
                                  setRegimes(prev => prev.filter(r => r.id !== regime.id));
                                  fetchDashboardData();
                                }
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        {rules.length > 0 && (
                          <div className="mt-2 pl-3 border-l-2 border-slate-200 dark:border-slate-700 space-y-1">
                            <p className="text-xs text-slate-500 font-semibold mb-1">Regras ({rules.length}):</p>
                            {rules.map(rule => (
                              <div key={rule.id} className="text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
                                <span>• {rule.nome_tarefa}</span>
                                <span className="opacity-70 bg-slate-200 dark:bg-slate-800 px-1 rounded">{rule.codigo_calculo || "Manual"}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {rules.length === 0 && (
                          <div className="mt-2 text-xs text-slate-400 dark:text-slate-500 italic">
                            Nenhuma regra associada a este regime.
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {regimes.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-4">Nenhum regime cadastrado.</p>
                  )}
                </div>
                <DialogFooter>
                  <Button onClick={() => setIsManageRegimesOpen(false)}>Fechar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

          </div>
        </div>

        {/* Zona 1 - Indicadores */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm dark:bg-slate-900">
            <CardContent className="p-5">
              <div className="flex items-center justify-between pb-2">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total no Mês</p>
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">{loading ? "..." : validTasks.length}</div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Demandas fiscais mapeadas</p>
            </CardContent>
          </Card>

          <Card className="border-emerald-100 dark:border-emerald-900 shadow-sm bg-emerald-50/30 dark:bg-emerald-900/10">
            <CardContent className="p-5">
              <div className="flex items-center justify-between pb-2">
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-500">Baixadas pelo OCR</p>
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                </div>
              </div>
              <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">{loading ? "..." : tasks.filter(t => t.status === 'CONCLUÍDA').length}</div>
              <p className="text-xs text-emerald-600/70 dark:text-emerald-500/70 mt-1">Comprovantes validados</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 shadow-sm dark:bg-slate-900">
            <CardContent className="p-5">
              <div className="flex items-center justify-between pb-2">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Aguardando Pagamento</p>
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">{loading ? "..." : tasks.filter(t => t.status === 'PENDENTE').length}</div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Pendentes de baixa</p>
            </CardContent>
          </Card>

          <Card className="border-orange-200 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-900/10 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between pb-2">
                <p className="text-sm font-medium text-orange-600 dark:text-orange-500">Alerta: &lt; 5 dias</p>
                <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-500" />
                </div>
              </div>
              <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">{loading ? "..." : tasks.filter(t => t.status === 'URGENTE' || t.status === 'ATRASADA').length}</div>
              <p className="text-xs text-orange-600/70 dark:text-orange-500/70 mt-1">Atrasadas ou vencendo hoje</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Escritórios */}
        {
          escritoriosNames.length > 0 && (
            <div className="mb-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 h-auto p-1.5 flex-wrap justify-start rounded-xl gap-2">
                  {escritoriosNames.map(nome => (
                    <TabsTrigger key={nome} value={nome} className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900/50 dark:data-[state=active]:text-blue-300 px-6 py-2.5 rounded-lg shadow-sm border border-transparent data-[state=active]:border-blue-100 dark:data-[state=active]:border-blue-800 transition-all font-medium">
                      <Building2 className="w-4 h-4 mr-2" />
                      {nome}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          )
        }

        {/* Zona 2 - Tabela Agrupada */}
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden dark:bg-slate-900">

          <CardHeader className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-5">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                🏢 Painel de Clientes ({activeTab || "Geral"})
                <Badge variant="secondary" className="ml-2 font-normal bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">{Object.keys(activeEscritorioData).length} Empresas</Badge>
              </CardTitle>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Filtrar por carteira ou imposto..."
                    className="pl-9 h-9 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-blue-500 rounded-lg dark:text-slate-200"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="sm" className="h-9 shrink-0 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 dark:border-slate-800">
                  <Filter className="h-4 w-4 mr-2" /> Vencimentos
                </Button>
                {activeTab && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 shrink-0 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                    onClick={() => {
                      const escObj = escritorios.find(e => e.nome === activeTab);
                      if (escObj) {
                        setDeleteTarget({ type: 'escritorio', id: escObj.id, name: escObj.nome });
                        setDeleteConfirmText("");
                        setDeleteModalOpen(true);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Excluir Escritório
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <div className="bg-slate-50/50 dark:bg-slate-950/50">
            {/* Cabecalho da Tabela */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <div className="col-span-12 md:col-span-5 hidden md:block">Razão Social / Cliente</div>
              <div className="col-span-3 hidden md:block">Progresso</div>
              <div className="col-span-4 hidden md:flex justify-end pr-2">Ações Rápidas</div>
            </div>

            {/* Lista de Empresas (Acordeom) */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredEmpresas.map(([empresaName, tasks]) => {
                const isExpanded = expandedEmpresas.includes(empresaName);
                const stats = getEmpresaStats(tasks);
                const allFinished = stats.concluidas === stats.total;

                return (
                  <div key={empresaName} className="flex flex-col bg-white dark:bg-slate-900">
                    {/* Linha Mãe (Header da Empresa) */}
                    <div
                      className={`grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 items-center cursor-pointer transition-colors ${isExpanded ? 'bg-blue-50/30 dark:bg-blue-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                      onClick={() => toggleEmpresa(empresaName)}
                    >
                      <div className="col-span-12 md:col-span-5 flex items-center gap-3">
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                        <div className="flex items-center gap-2">
                          <Building2 className={`w-4 h-4 ${allFinished ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`} />
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{empresaName}</span>
                        </div>
                      </div>

                      {/* Barrinha de Progresso / Resumo Pílulas */}
                      <div className="col-span-12 md:col-span-4 flex items-center gap-2 md:pl-0 pl-9">
                        <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700">
                          {stats.total} {stats.total === 1 ? 'Guia' : 'Guias'}
                        </Badge>

                        {allFinished ? (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 hover:bg-emerald-100 flex items-center gap-1 border-0">
                            <CheckCircle2 className="w-3 h-3" /> Faturado
                          </Badge>
                        ) : (
                          <div className="flex gap-1.5 items-center pl-2">
                            {stats.concluidas > 0 && (
                              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{stats.concluidas} OK</span>
                            )}
                            {stats.criticas > 0 && (
                              <span className="text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/40 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> {stats.criticas}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Botões do lado direito */}
                      <div className="col-span-12 md:col-span-3 flex items-center justify-end gap-2 md:pr-2">
                        <Button variant="ghost" size="sm" className="hidden xl:flex text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 h-8" onClick={(e) => e.stopPropagation()}>
                          <Upload className="h-3.5 w-3.5 mr-1.5" /> Mandar Recibo
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-8 w-8 text-red-400 dark:text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget({ type: 'empresa', id: 'lookup', name: empresaName });
                            setDeleteConfirmText("");
                            setDeleteModalOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Área Expandida (Tabela Filha com as Tarefas) */}
                    {isExpanded && (
                      <div className="px-6 pb-5 pt-2 bg-slate-50/50 dark:bg-slate-950/30 block">
                        <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-sm ml-9 transition-all">
                          <Table>
                            <TableHeader className="bg-slate-100/50 dark:bg-slate-800/50">
                              <TableRow className="hover:bg-transparent dark:border-slate-800">
                                <TableHead className="py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 w-2/5">Guia Faturamento / Imposto</TableHead>
                                <TableHead className="py-2 text-xs font-semibold text-slate-600 dark:text-slate-400">Competência</TableHead>
                                <TableHead className="py-2 text-xs font-semibold text-slate-600 dark:text-slate-400">Deadline (Max)</TableHead>
                                <TableHead className="py-2 text-xs font-semibold text-slate-600 dark:text-slate-400">Situação</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {tasks.map(task => (
                                <TableRow key={task.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 dark:border-slate-800">
                                  <TableCell className="py-2.5">
                                    <span className="font-medium text-slate-800 dark:text-slate-200">{task.tarefa}</span>
                                  </TableCell>
                                  <TableCell className="py-2.5 text-slate-500 dark:text-slate-400">
                                    {task.comp}
                                  </TableCell>
                                  <TableCell className="py-2.5">
                                    <span className={`flex items-center gap-1.5 text-sm ${task.status === "URGENTE" || task.status === "ATRASADA" ? "text-orange-600 dark:text-orange-400 font-semibold" : "text-slate-600 dark:text-slate-400"}`}>
                                      {task.venc}
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-2.5">
                                    <StatusBadge status={task.status} />
                                  </TableCell>
                                  <TableCell className="py-2.5 text-right">
                                    <Button variant="outline" size="sm" className="h-7 text-xs font-medium text-slate-600 dark:text-slate-400 dark:border-slate-700">
                                      Baixar PDF
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </main >
    </div >
  );
}
