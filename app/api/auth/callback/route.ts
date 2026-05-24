export const runtime = "edge";

import { exchangeCodeForToken, createZarithUser, getZarithUser } from "@/lib/supabase/client";

export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // Verificar erros de OAuth
    if (error) {
      const errorMessage = `OAuth Error: ${error} - ${errorDescription || "Unknown error"}`;
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("error", errorMessage);
      return Response.redirect(redirectUrl.toString());
    }

    if (!code) {
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("error", "Código de autenticação não fornecido");
      return Response.redirect(redirectUrl.toString());
    }

    // Trocar código por token
    const session = await exchangeCodeForToken(code);

    if (!session || !session.user) {
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("error", "Falha ao obter sessão");
      return Response.redirect(redirectUrl.toString());
    }

    // Verificar se usuário já existe no schema zarith
    const existingUser = await getZarithUser(session.user.id);

    if (!existingUser) {
      // Criar novo usuário no schema zarith
      await createZarithUser(
        session.user.id,
        session.user.email || "",
        session.user.user_metadata?.name || session.user.email?.split("@")[0],
        session.user.user_metadata?.avatar_url
      );
    }

    // Salvar token na sessão (via cookie)
    const redirectUrl = new URL("/chat", request.url);

    // Criar response com redirect
    const response = Response.redirect(redirectUrl.toString());

    // Salvar access token em cookie seguro
    response.headers.set(
      "Set-Cookie",
      `sb-access-token=${session.access_token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${session.expires_in || 3600}`
    );

    // Salvar refresh token em cookie seguro
    if (session.refresh_token) {
      response.headers.append(
        "Set-Cookie",
        `sb-refresh-token=${session.refresh_token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`
      );
    }

    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("error", `Erro ao processar callback: ${errorMessage}`);
    return Response.redirect(redirectUrl.toString());
  }
}
