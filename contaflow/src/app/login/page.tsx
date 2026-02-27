"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, LogIn, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const res = await fetch("/api/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
            });

            const data = await res.json();

            if (res.ok) {
                // Sucesso, redireciona para o painel principal
                router.push("/");
                router.refresh();
            } else {
                // Define a mensagem de erro vinda do backend ou genérica
                setError(data.message || "Senha incorreta");
            }
        } catch (err) {
            setError("Erro de conexão. Tente novamente.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
            <Card className="w-full max-w-md shadow-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <form onSubmit={handleLogin}>
                    <CardHeader className="space-y-3 pb-6 text-center">
                        <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center mb-2">
                            <Lock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                            Acesso Restrito
                        </CardTitle>
                        <CardDescription className="text-slate-500 dark:text-slate-400">
                            Digite sua senha de administrador para acessar o painel do ContaFlow.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Input
                                type="password"
                                placeholder="********"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={`w-full bg-slate-50 dark:bg-slate-950 ${error ? "border-red-500 focus-visible:ring-red-500" : ""
                                    }`}
                                disabled={isLoading}
                            />
                        </div>
                        {error && (
                            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 p-3 rounded-md">
                                <ShieldAlert className="w-4 h-4 shrink-0" />
                                <p>{error}</p>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                            disabled={isLoading || password.length === 0}
                        >
                            {isLoading ? (
                                "Verificando..."
                            ) : (
                                <>
                                    Entrar no ContaFlow <LogIn className="w-4 h-4 ml-2" />
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
