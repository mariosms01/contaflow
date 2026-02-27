import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { password } = await request.json();
        const adminPassword = process.env.ADMIN_PASSWORD;
        const authSecret = process.env.AUTH_SECRET;

        if (!adminPassword || !authSecret) {
            return NextResponse.json(
                { message: 'Erro de configuração do servidor. Variáveis .env ausentes.' },
                { status: 500 }
            );
        }

        if (password === adminPassword) {
            cookies().set({
                name: 'contaflow_auth',
                value: authSecret,
                httpOnly: true,
                path: '/',
                secure: process.env.NODE_ENV === 'production',
                maxAge: 60 * 60 * 24 * 30, // 30 dias
            });
            return NextResponse.json({ success: true, message: 'Autenticado com sucesso' });
        }

        return NextResponse.json({ success: false, message: 'Senha incorreta' }, { status: 401 });
    } catch (error) {
        return NextResponse.json({ success: false, message: 'Erro interno no servidor' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    cookies().delete('contaflow_auth');
    return NextResponse.json({ success: true, message: 'Logout efetuado com sucesso' });
}
