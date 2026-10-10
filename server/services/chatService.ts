import Anthropic from '@anthropic-ai/sdk';
import { ApiError, GoogleGenAI, type Content, type FunctionDeclaration, type GenerateContentParameters } from '@google/genai';
import { MenuItem } from '../models/MenuItem';
import { Category } from '../models/Category';
import { env } from '../config/env';

// Restaurant chat assistant: answers menu questions and edits the customer's
// cart through tools. The cart lives on the client, so the tools never write
// anything server-side — they validate against the real menu, update a working
// copy of the cart for the rest of the turn, and return a list of actions the
// client then applies to its own cart.
//
// Two interchangeable model providers: Claude (paid) when ANTHROPIC_API_KEY is
// set, otherwise Gemini, whose API has a free tier, when GEMINI_API_KEY is set.

const CLAUDE_MODEL = 'claude-opus-5-5';
const MAX_TOOL_ROUNDS = 6;

/** Ignore the template placeholders in .env / .env.example. */
const isRealKey = (k: string) => !!k && !/^(MY|YOUR)_/.test(k);

export type ChatProvider = 'claude' | 'gemini';
export const chatProvider = (): ChatProvider | null =>
  isRealKey(env.ANTHROPIC_API_KEY) ? 'claude' : isRealKey(env.GEMINI_API_KEY) ? 'gemini' : null;
export const chatEnabled = () => chatProvider() !== null;

let claude: Anthropic | null = null;
let gemini: GoogleGenAI | null = null;

export interface ChatTurn { role: 'user' | 'assistant'; content: string }
export interface CartLine { id: string; quantity: number; note?: string }

export type ChatAction =
  | { type: 'add'; itemId: string; quantity: number; note: string }
  | { type: 'set'; itemId: string; quantity: number }
  | { type: 'checkout' };

export interface ChatInput {
  restaurant: { name: string; cuisine: string[]; currency: string; address?: string; openTime?: string; closeTime?: string; prepTime?: string };
  restaurantId: string;
  isOpen: boolean;
  lang: 'en' | 'ar';
  table?: string;
  history: ChatTurn[];
  cart: CartLine[];
}

export interface ChatResult { reply: string; actions: ChatAction[] }

interface ToolOutcome { content: string; isError?: boolean }

interface ToolDef { name: string; description: string; schema: Record<string, unknown> }

const TOOLS: ToolDef[] = [
  {
    name: 'add_to_cart',
    description: 'Add one or more menu items to the customer\'s cart. Use only item_id values from the menu. Call this as soon as the customer clearly asks for a dish; if a request is ambiguous (e.g. "a burger" when there are several), ask which one first instead of guessing.',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              item_id: { type: 'string', description: 'The id shown in [brackets] in the menu.' },
              quantity: { type: 'integer', description: 'How many to add (1 or more).' },
              note: { type: 'string', description: 'Special request for the kitchen, e.g. "no onions". Empty string if none.' },
            },
            required: ['item_id', 'quantity', 'note'],
            additionalProperties: false,
          },
        },
      },
      required: ['items'],
      additionalProperties: false,
    },
  },
  {
    name: 'set_item_quantity',
    description: 'Change how many of an item are in the cart. Use quantity 0 to remove the item entirely.',
    schema: {
      type: 'object',
      properties: {
        item_id: { type: 'string' },
        quantity: { type: 'integer', description: 'New total quantity for this item; 0 removes it.' },
      },
      required: ['item_id', 'quantity'],
      additionalProperties: false,
    },
  },
  {
    name: 'go_to_checkout',
    description: 'Show the customer a button that takes them to checkout, where they choose dine-in/pickup/delivery, payment and place the order. Call this when the customer says they are done or wants to place the order, and the cart is not empty.',
    schema: { type: 'object', properties: {}, required: [], additionalProperties: false },
  },
];

const claudeTools: Anthropic.Beta.BetaTool[] = TOOLS.map(t => ({
  name: t.name, description: t.description, strict: true, input_schema: t.schema as Anthropic.Beta.BetaTool.InputSchema,
}));
const geminiTools: FunctionDeclaration[] = TOOLS.map(t => ({
  name: t.name, description: t.description, parametersJsonSchema: t.schema,
}));

function buildSystemPrompt(input: ChatInput, menu: { id: string; name: string; category: string; price: number; description: string; ingredients: string[]; allergens: string[]; featured: boolean }[], categoryOrder: string[]) {
  const r = input.restaurant;
  const byCat = new Map<string, typeof menu>();
  for (const name of categoryOrder) byCat.set(name, []);
  for (const item of menu) {
    if (!byCat.has(item.category)) byCat.set(item.category, []);
    byCat.get(item.category)!.push(item);
  }
  const menuText = [...byCat.entries()]
    .filter(([, items]) => items.length)
    .map(([cat, items]) => `## ${cat || 'Other'}\n` + items.map(i => {
      const parts = [`- [${i.id}] ${i.name} — ${i.price.toFixed(2)} ${r.currency}${i.featured ? ' (popular)' : ''}`];
      if (i.description) parts.push(`  ${i.description}`);
      if (i.ingredients.length) parts.push(`  Ingredients: ${i.ingredients.join(', ')}`);
      if (i.allergens.length) parts.push(`  Allergens: ${i.allergens.join(', ')}`);
      return parts.join('\n');
    }).join('\n'))
    .join('\n\n');

  return `You are the ordering assistant for ${r.name}, chatting with a customer inside the Menu Go app. You help them explore the menu, answer questions about dishes, and build their order by adding items to their cart.

Restaurant details:
- Cuisine: ${r.cuisine.join(', ') || 'not specified'}
- Address: ${r.address || 'not specified'}
- Opening hours: ${r.openTime && r.closeTime ? `${r.openTime} – ${r.closeTime}` : 'not specified'}
- Typical preparation time: ${r.prepTime ? `${r.prepTime} minutes` : 'not specified'}
- Prices are in ${r.currency}.

How to help:
- Only recommend and add items that appear on the menu below, at the listed prices. If something isn't on the menu, say so and suggest the closest alternative.
- When the customer asks for a dish, add it with add_to_cart right away and confirm briefly what you added. If several items could match, ask which one they mean.
- Put special requests ("no onions", "extra spicy") in the item's note.
- For allergy or dietary questions, answer from the listed ingredients and allergens, and say that anyone with a severe allergy should confirm with the staff, since the list may be incomplete.
- When they're finished or ask to place the order, call go_to_checkout. You can't take payment, delivery addresses or order type in chat — the checkout screen handles those, so don't ask for them.
- The customer's current cart and whether the restaurant is open are given in a <context> block with each message. If the restaurant is closed, you can still answer questions, but explain that ordering is unavailable until it opens.
- Reply in the language the customer writes in (the app is set to ${input.lang === 'ar' ? 'Arabic' : 'English'}). Keep replies short and friendly — a few sentences, plain text without markdown headings or tables, since they're shown in a small chat bubble.

Menu (item ids in brackets are for tool calls only; never show them to the customer):

${menuText || '(The menu is empty right now.)'}`;
}

export async function runChat(input: ChatInput): Promise<ChatResult> {
  const [items, cats] = await Promise.all([
    MenuItem.find({ restaurantId: input.restaurantId }).sort({ createdAt: -1 }),
    Category.find({ restaurantId: input.restaurantId }),
  ]);
  const menu = items.map(i => ({
    id: i._id.toString(), name: i.name, category: i.category, price: i.price, description: i.description ?? '',
    ingredients: i.ingredients ?? [], allergens: i.allergens ?? [], featured: !!i.featured,
  }));
  const menuById = new Map(menu.map(m => [m.id, m]));

  // Working copy of the cart: item id → quantity, kept in sync with the actions
  // so later tool calls in the same turn see earlier ones.
  const cart = new Map<string, number>();
  for (const line of input.cart) {
    if (menuById.has(line.id)) cart.set(line.id, (cart.get(line.id) ?? 0) + line.quantity);
  }
  const cartSummary = () => {
    if (!cart.size) return 'The cart is empty.';
    let total = 0;
    const lines = [...cart.entries()].map(([id, qty]) => {
      const m = menuById.get(id)!;
      total += m.price * qty;
      return `- ${qty} × ${m.name} (${(m.price * qty).toFixed(2)} ${input.restaurant.currency})`;
    });
    return `${lines.join('\n')}\nSubtotal: ${total.toFixed(2)} ${input.restaurant.currency}`;
  };

  const actions: ChatAction[] = [];

  const runTool = (name: string, args: Record<string, unknown>): ToolOutcome => {
    if (name === 'add_to_cart' || name === 'set_item_quantity') {
      if (!input.isOpen) return { content: 'The restaurant is closed right now, so nothing can be added to the cart.', isError: true };
    }
    switch (name) {
      case 'add_to_cart': {
        const requested = Array.isArray(args.items) ? args.items as { item_id: string; quantity: number; note: string }[] : [];
        const unknown: string[] = [];
        for (const it of requested) {
          const m = menuById.get(it.item_id);
          const qty = Math.min(50, Math.max(1, Math.floor(Number(it.quantity) || 1)));
          if (!m) { unknown.push(it.item_id); continue; }
          cart.set(m.id, (cart.get(m.id) ?? 0) + qty);
          actions.push({ type: 'add', itemId: m.id, quantity: qty, note: String(it.note ?? '').slice(0, 200) });
        }
        const err = unknown.length ? `These ids are not on the menu and were skipped: ${unknown.join(', ')}.\n` : '';
        return { content: `${err}Cart now:\n${cartSummary()}`, isError: unknown.length > 0 && unknown.length === requested.length };
      }
      case 'set_item_quantity': {
        const m = menuById.get(String(args.item_id));
        if (!m) return { content: `Item ${String(args.item_id)} is not on the menu.`, isError: true };
        const qty = Math.min(50, Math.max(0, Math.floor(Number(args.quantity) || 0)));
        if (qty === 0) cart.delete(m.id); else cart.set(m.id, qty);
        actions.push({ type: 'set', itemId: m.id, quantity: qty });
        return { content: `Cart now:\n${cartSummary()}` };
      }
      case 'go_to_checkout': {
        if (!cart.size) return { content: 'The cart is empty — add something before checking out.', isError: true };
        if (!actions.some(a => a.type === 'checkout')) actions.push({ type: 'checkout' });
        return { content: 'A checkout button is now shown to the customer.' };
      }
      default:
        return { content: `Unknown tool ${name}.`, isError: true };
    }
  };

  const context = `<context>
Restaurant is ${input.isOpen ? 'open' : 'CLOSED'} right now.${input.table ? `\nThe customer is seated at table ${input.table}.` : ''}
Current cart:
${cartSummary()}
</context>`;

  const system = buildSystemPrompt(input, menu, cats.map(c => c.name));
  const turn: Turn = { system, context, history: input.history.slice(0, -1), last: input.history[input.history.length - 1].content, runTool };
  const out = chatProvider() === 'claude' ? await claudeTurn(turn) : await geminiTurn(turn);

  if (out.refused) {
    return { reply: input.lang === 'ar' ? 'عذرًا، لا يمكنني المساعدة في ذلك. هل تود أن أقترح عليك شيئًا من القائمة؟' : "Sorry, I can't help with that. Would you like a suggestion from the menu?", actions };
  }
  const reply = out.texts.join('\n\n') || (input.lang === 'ar' ? 'تم! هل تحتاج إلى أي شيء آخر؟' : 'Done! Anything else?');
  return { reply, actions };
}

interface Turn {
  system: string;
  context: string;
  history: ChatTurn[];
  last: string;
  runTool: (name: string, args: Record<string, unknown>) => ToolOutcome;
}
interface TurnOutput { texts: string[]; refused?: boolean }

async function claudeTurn({ system, context, history, last, runTool }: Turn): Promise<TurnOutput> {
  claude ??= new Anthropic();
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...history.map(t => ({ role: t.role, content: t.content })),
    { role: 'user', content: [{ type: 'text', text: context }, { type: 'text', text: last }] },
  ];
  const texts: string[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await claude.beta.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low' },
      cache_control: { type: 'ephemeral' },
      system,
      tools: claudeTools,
      messages,
    });

    if (response.stop_reason === 'refusal') return { texts, refused: true };
    for (const b of response.content) if (b.type === 'text' && b.text.trim()) texts.push(b.text.trim());
    if (response.stop_reason !== 'tool_use') break;

    messages.push({ role: 'assistant', content: response.content });
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = response.content
      .filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use')
      .map(b => {
        const r = runTool(b.name, b.input as Record<string, unknown>);
        return { type: 'tool_result', tool_use_id: b.id, content: r.content, ...(r.isError ? { is_error: true } : {}) };
      });
    messages.push({ role: 'user', content: results });
  }
  return { texts };
}

async function geminiTurn({ system, context, history, last, runTool }: Turn): Promise<TurnOutput> {
  gemini ??= new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const contents: Content[] = [
    ...history.map(t => ({ role: t.role === 'assistant' ? 'model' : 'user', parts: [{ text: t.content }] })),
    { role: 'user', parts: [{ text: context }, { text: last }] },
  ];
  const texts: string[] = [];

  let model = env.GEMINI_MODEL;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    // Only the first round may switch models: later rounds carry the first
    // model's thought signatures, which another model can't validate.
    const { response, usedModel } = await geminiGenerate(gemini, {
      model,
      contents,
      config: { systemInstruction: system, tools: [{ functionDeclarations: geminiTools }] },
    }, round === 0);
    model = usedModel;

    const content = response.candidates?.[0]?.content;
    if (response.promptFeedback?.blockReason || !content) return { texts, refused: true };
    for (const p of content.parts ?? []) if (p.text && !p.thought && p.text.trim()) texts.push(p.text.trim());

    const calls = response.functionCalls ?? [];
    if (!calls.length) break;

    // Append the model turn unchanged so its thought signatures go back with it.
    contents.push(content);
    contents.push({
      role: 'user',
      parts: calls.map(c => {
        const r = runTool(c.name ?? '', c.args ?? {});
        return { functionResponse: { id: c.id, name: c.name, response: r.isError ? { error: r.content } : { result: r.content } } };
      }),
    });
  }
  return { texts };
}

const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const REQUEST_TIMEOUT_MS = 15_000;
const PRIMARY_COOLDOWN_MS = 60_000;
/** While the main model is over quota or overloaded, skip straight to the fallback. */
let primaryRestingUntil = 0;

const isRetryable = (e: unknown) =>
  (e instanceof ApiError && RETRYABLE.has(e.status)) || (e instanceof Error && (e.name === 'AbortError' || e.name === 'TimeoutError'));

/**
 * The free tier often answers 429 (quota) or 503 ("high demand"), and a request
 * can occasionally stall. Each attempt is time-boxed; on a retryable failure the
 * main model rests for a minute and the lighter fallback model takes over.
 */
async function geminiGenerate(ai: GoogleGenAI, req: GenerateContentParameters, allowFallback: boolean) {
  const fallback = allowFallback && env.GEMINI_FALLBACK_MODEL && env.GEMINI_FALLBACK_MODEL !== req.model ? env.GEMINI_FALLBACK_MODEL : null;
  const isPrimary = req.model === env.GEMINI_MODEL;
  const plan = !fallback ? [req.model, req.model]
    : isPrimary && Date.now() < primaryRestingUntil ? [fallback, fallback]
    : [req.model, fallback, fallback];

  for (let i = 0; ; i++) {
    try {
      const response = await ai.models.generateContent({
        ...req, model: plan[i], config: { ...req.config, httpOptions: { timeout: REQUEST_TIMEOUT_MS } },
      });
      return { response, usedModel: plan[i] };
    } catch (e) {
      if (!isRetryable(e) || i === plan.length - 1) throw e;
      if (plan[i] === env.GEMINI_MODEL) primaryRestingUntil = Date.now() + PRIMARY_COOLDOWN_MS;
      console.warn(`Gemini ${plan[i]} failed (${e instanceof ApiError ? e.status : (e as Error).name}); trying ${plan[i + 1]}`);
      await new Promise(r => setTimeout(r, 500));
    }
  }
}
