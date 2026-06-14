import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { slugify } from "@/lib/slug";

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1";

const BreakdownSchema = z.object({
  title: z.string().min(1).max(160),
  category: z.string().min(1).max(80),
  subcategory: z.string().min(1).max(120),
  definition: z.string().min(10).max(2500),
  core_idea: z.array(z.string().min(3).max(800)).min(3).max(8),
  key_steps: z.array(z.object({
    title: z.string().min(1).max(200),
    detail: z.string().min(3).max(3000),
  })).min(3).max(12),
  analogy: z.string().min(10).max(2500),
  applied_case: z.string().min(5).max(3000),
  code_snippet: z.string().min(5).max(8000),
  code_lang: z.string().min(1).max(40),
  diagram_prompt: z.string().min(10).max(1500),
  deep_dive: z.string().min(20).max(6000),
  common_pitfalls: z.array(z.string().min(3).max(600)).min(2).max(8),
  further_reading: z.array(z.string().min(3).max(300)).min(2).max(8),
});

type Breakdown = z.infer<typeof BreakdownSchema>;

async function generateBreakdown(query: string, apiKey: string): Promise<Breakdown> {
  const systemPrompt = `You are an expert scientific tutor for bioinformatics, computational biology, genomics, statistics, AI/ML, and computer science. Produce a thorough, in-depth study card that fully explains the concept so a learner needs no other source. Be accurate, concrete, and richly detailed — NOT terse. Use markdown-free plain text. Length guidance: definition 4-8 sentences; deep_dive 4-8 paragraphs covering history, math/mechanism, variants, assumptions, and context; each key_step detail 3-6 sentences; analogy a vivid extended paragraph; applied_case a real-world worked example with specifics; code_snippet a complete runnable example with comments. Include common_pitfalls and further_reading (book/paper/tool names). The diagram_prompt must describe a clean, minimalist, scientific technical diagram on a dark background suitable for AI image generation.`;

  const tool = {
    type: "function" as const,
    function: {
      name: "concept_breakdown",
      description: "Structured in-depth breakdown of a scientific or computational concept.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          category: { type: "string" },
          subcategory: { type: "string" },
          definition: { type: "string" },
          core_idea: { type: "array", items: { type: "string" } },
          key_steps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                detail: { type: "string" },
              },
              required: ["title", "detail"],
              additionalProperties: false,
            },
          },
          analogy: { type: "string" },
          applied_case: { type: "string" },
          code_snippet: { type: "string" },
          code_lang: { type: "string" },
          diagram_prompt: { type: "string" },
          deep_dive: { type: "string" },
          common_pitfalls: { type: "array", items: { type: "string" } },
          further_reading: { type: "array", items: { type: "string" } },
        },
        required: ["title", "category", "subcategory", "definition", "core_idea", "key_steps", "analogy", "applied_case", "code_snippet", "code_lang", "diagram_prompt", "deep_dive", "common_pitfalls", "further_reading"],
        additionalProperties: false,
      },
    },
  };

  const res = await fetch(`${LOVABLE_AI_URL}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Break down this concept: "${query}"` },
      ],
      tools: [tool],
      tool_choice: { type: "function", function: { name: "concept_breakdown" } },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("Rate limit reached — please wait a moment and try again.");
    if (res.status === 402) throw new Error("AI credits exhausted — please top up the workspace.");
    throw new Error(`AI breakdown failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const call = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!call?.function?.arguments) throw new Error("AI returned no structured output.");
  const parsed = JSON.parse(call.function.arguments);
  return BreakdownSchema.parse(parsed);
}

async function generateDiagram(prompt: string, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch(`${LOVABLE_AI_URL}/images/generations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: `Minimalist scientific diagram, dark near-black background (#09090b), thin teal (#14b8a6) and white technical lines, sparse labels, no photorealism, technical schematic style. Subject: ${prompt}`,
          },
        ],
        modalities: ["image", "text"],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) return null;
    return `data:image/png;base64,${b64}`;
  } catch (e) {
    console.error("diagram generation error", e);
    return null;
  }
}

export const generateConcept = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { query: string }) => z.object({ query: z.string().min(1).max(200) }).parse(data))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing on server.");
    const { supabase, userId } = context;
    const slug = slugify(data.query);
    if (!slug) throw new Error("Invalid query.");

    // Cache hit?
    const { data: existing } = await supabase.from("concepts").select("*").eq("slug", slug).maybeSingle();
    let concept = existing;

    if (!concept) {
      const breakdown = await generateBreakdown(data.query, apiKey);
      const image = await generateDiagram(breakdown.diagram_prompt, apiKey);
      const { data: ins, error } = await supabase
        .from("concepts")
        .insert({
          slug,
          title: breakdown.title,
          category: breakdown.category,
          subcategory: breakdown.subcategory,
          definition: breakdown.definition,
          core_idea: breakdown.core_idea,
          key_steps: breakdown.key_steps,
          analogy: breakdown.analogy,
          applied_case: breakdown.applied_case,
          code_snippet: breakdown.code_snippet,
          code_lang: breakdown.code_lang,
          diagram_prompt: breakdown.diagram_prompt,
          image_data_url: image,
        })
        .select("*")
        .single();
      if (error) throw new Error(`Failed to save concept: ${error.message}`);
      concept = ins;
    }

    // Log search history (best-effort)
    await supabase.from("search_history").insert({ user_id: userId, query: data.query, concept_id: concept!.id });

    return { slug: concept!.slug, id: concept!.id };
  });

export const getConcept = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { slug: string }) => z.object({ slug: z.string().min(1).max(120) }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: concept, error } = await context.supabase
      .from("concepts")
      .select("*")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!concept) return { concept: null, saved: false };
    const { data: saved } = await context.supabase
      .from("library_items")
      .select("id")
      .eq("user_id", context.userId)
      .eq("concept_id", concept.id)
      .maybeSingle();
    return { concept, saved: !!saved };
  });

export const toggleLibrary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { conceptId: string; save: boolean }) =>
    z.object({ conceptId: z.string().uuid(), save: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    if (data.save) {
      const { error } = await context.supabase
        .from("library_items")
        .insert({ user_id: context.userId, concept_id: data.conceptId });
      if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    } else {
      const { error } = await context.supabase
        .from("library_items")
        .delete()
        .eq("user_id", context.userId)
        .eq("concept_id", data.conceptId);
      if (error) throw new Error(error.message);
    }
    return { saved: data.save };
  });

export const getHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("search_history")
      .select("id, query, created_at, concept_id, concepts(slug, title, category)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });

export const getLibrary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("library_items")
      .select("id, created_at, concepts(id, slug, title, category, definition)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });
