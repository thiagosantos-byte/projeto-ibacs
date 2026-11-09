import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-6-luna";
const APP_ORIGIN = Deno.env.get("APP_ORIGIN");

const allowedHeaders = {
  ...corsHeaders,
  "Access-Control-Allow-Origin": APP_ORIGIN ?? "*",
};
const jsonHeaders = { ...allowedHeaders, "Content-Type": "application/json; charset=utf-8" };

Deno.serve(async (request: Request) => {
  const requestOrigin = request.headers.get("origin");
  if (APP_ORIGIN && requestOrigin && requestOrigin !== APP_ORIGIN) {
    return Response.json({ error: "Origem não autorizada." }, { status: 403, headers: jsonHeaders });
  }

  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: allowedHeaders });
  }

  if (request.method !== "POST") {
    return Response.json({ error: "Método não permitido." }, { status: 405, headers: jsonHeaders });
  }

  if (!OPENAI_API_KEY) {
    return Response.json(
      { error: "OPENAI_API_KEY não foi configurada como secret da Edge Function." },
      { status: 503, headers: jsonHeaders },
    );
  }

  try {
    const body = await request.json();
    const incoming = Array.isArray(body?.messages) ? body.messages : [];
    const messages = incoming
      .filter((item: unknown) => typeof item === "object" && item !== null)
      .map((item: { role?: unknown; content?: unknown }) => ({
        role: item.role === "assistant" ? "assistant" : "user",
        content: typeof item.content === "string" ? item.content.slice(0, 2000) : "",
      }))
      .filter((item: { content: string }) => item.content.length > 0)
      .slice(-12);

    if (messages.length === 0) {
      return Response.json({ error: "Envie uma mensagem para iniciar a conversa." }, { status: 400, headers: jsonHeaders });
    }

    const preferenceSummary = typeof body?.preferences === "object" && body.preferences !== null
      ? JSON.stringify(body.preferences).slice(0, 1200)
      : "Preferências não informadas.";
    const preferences = typeof body?.preferences === "object" && body.preferences !== null
      ? body.preferences as Record<string, unknown>
      : {};
    const adaptiveGuidance = [
      preferences.simpleLanguage === true ? "Use linguagem simples, frases curtas e explique termos técnicos." : "",
      preferences.elderlyMode === true ? "Organize orientações em etapas numeradas e evite pressa ou excesso de opções." : "",
      preferences.calmMode === true ? "Mantenha respostas tranquilas, previsíveis e sem excesso de estímulos ou exclamações." : "",
      preferences.largeText === true ? "Organize a resposta em blocos curtos e com títulos claros para facilitar a leitura ampliada." : "",
    ].filter(Boolean).join(" ");

    const systemPrompt = [
      "Você é AURA, assistente de orientação sobre acessibilidade digital e inclusão. Responda sempre em português brasileiro, com linguagem acolhedora, objetiva e respeitosa.",
      "Ajude a navegar pela plataforma e explique recursos de baixa visão/cegueira, surdez e Libras, comunicação aumentativa e alternativa, daltonismo, envelhecimento, TEA, mobilidade, cognição e aprendizagem.",
      "Nunca diagnostique, presuma necessidades a partir de um perfil, infantilize, nem recomende que uma pessoa informe um diagnóstico. Pergunte preferências, não condições médicas.",
      "Diferencie recomendações gerais de requisitos legais ou de conformidade. Não afirme que uma página está certificada ou plenamente conforme WCAG sem auditoria humana.",
      "Quando uma funcionalidade depender de serviço externo ou suporte do navegador, explique a dependência em vez de fingir que foi ativada.",
      adaptiveGuidance,
      `Preferências escolhidas pelo usuário (configurações de interface, não diagnósticos): ${preferenceSummary}`,
    ].join("\n\n");

    const openAIResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        max_output_tokens: 900,
        store: false,
      }),
      signal: AbortSignal.timeout(45000),
    });

    const result = await openAIResponse.json();
    if (!openAIResponse.ok) {
      const detail = typeof result?.error?.message === "string" ? result.error.message : "A API de IA retornou um erro.";
      return Response.json({ error: detail }, { status: openAIResponse.status, headers: jsonHeaders });
    }

    const answer = typeof result?.output_text === "string" ? result.output_text.trim() : "";
    if (!answer) {
      return Response.json({ error: "A API respondeu sem texto. Tente novamente." }, { status: 502, headers: jsonHeaders });
    }

    return Response.json({ answer }, { headers: jsonHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno ao processar a solicitação.";
    return Response.json({ error: message }, { status: 500, headers: jsonHeaders });
  }
});
