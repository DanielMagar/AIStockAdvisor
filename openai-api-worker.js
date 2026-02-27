import OpenAI from 'openai';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const NEWS_FEEDS = {
  us: [
    'https://news.google.com/rss/search?q=US+stock+market+OR+NYSE+OR+NASDAQ&hl=en-US&gl=US&ceid=US:en'
  ],
  india: [
    'https://news.google.com/rss/search?q=Indian+stock+market+OR+NSE+OR+BSE&hl=en-IN&gl=IN&ceid=IN:en'
  ]
};

function decodeEntities(input = '') {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripTags(input = '') {
  return decodeEntities(input.replace(/<[^>]+>/g, '').trim());
}

function getTagValue(item, tag) {
  const m = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? stripTags(m[1]) : '';
}

function parseRss(xml = '', feedRegion = 'global', limit = 12) {
  const items = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  return items.slice(0, limit).map((item) => {
    const title = getTagValue(item, 'title');
    const link = getTagValue(item, 'link');
    const pubDate = getTagValue(item, 'pubDate');
    const source = getTagValue(item, 'source') || 'News Source';
    const description = getTagValue(item, 'description').slice(0, 220);
    return {
      title,
      link,
      source,
      description,
      publishedAt: pubDate,
      region: feedRegion
    };
  }).filter((x) => x.title && x.link);
}

function inferSentiment(text = '') {
  const t = text.toLowerCase();
  if (/(surge|beat|upgrade|rally|gain|growth|record high|profit rises)/.test(t)) return 'bullish';
  if (/(fall|drop|downgrade|miss|loss|decline|sell-off|regulatory hit)/.test(t)) return 'bearish';
  return 'neutral';
}

async function summarizeNewsWithAI(openai, items, region) {
  if (!items.length) return { marketBrief: 'No major headlines available right now.', mapped: [] };
  const compact = items.slice(0, 10).map((item, idx) => ({
    id: idx,
    title: item.title,
    source: item.source,
    region: item.region
  }));

  const messages = [
    {
      role: 'system',
      content: 'You are a financial news assistant. Return strict JSON only.'
    },
    {
      role: 'user',
      content: JSON.stringify({
        task: 'Summarize headlines without quoting full articles. Label each headline sentiment as bullish/neutral/bearish and give one-line why-it-matters.',
        region,
        headlines: compact,
        output_schema: {
          marketBrief: 'string (max 40 words)',
          items: [{ id: 'number', sentiment: 'bullish|neutral|bearish', why: 'string max 22 words' }]
        }
      })
    }
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-5.2',
      messages,
      temperature: 0.2
    });
    const raw = completion.choices?.[0]?.message?.content || '{}';
    const jsonBlock = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonBlock ? jsonBlock[0] : raw);
    return {
      marketBrief: parsed.marketBrief || 'Latest stock headlines summarized from licensed/public feeds.',
      mapped: Array.isArray(parsed.items) ? parsed.items : []
    };
  } catch (_) {
    return {
      marketBrief: 'Latest stock headlines collected from public feed metadata.',
      mapped: compact.map((h) => ({ id: h.id, sentiment: inferSentiment(h.title), why: 'Headline may influence sentiment; review source before acting.' }))
    };
  }
}

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const host = "https://gateway.ai.cloudflare.com";
    const endpoint =
      "/v1/5f464d76e2d9fe16f727cebee80a0051/stock-prediction/compat";
    const openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      baseURL: host + endpoint,
    });
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname.endsWith('/news')) {
      try {
        const region = (url.searchParams.get('region') || 'all').toLowerCase();
        const ticker = (url.searchParams.get('ticker') || '').trim().toUpperCase();

        const selectedFeeds = region === 'us'
          ? NEWS_FEEDS.us.map((u) => ({ url: u, region: 'us' }))
          : region === 'india'
            ? NEWS_FEEDS.india.map((u) => ({ url: u, region: 'india' }))
            : [...NEWS_FEEDS.us.map((u) => ({ url: u, region: 'us' })), ...NEWS_FEEDS.india.map((u) => ({ url: u, region: 'india' }))];

        const fetched = await Promise.all(
          selectedFeeds.map(async (feed) => {
            const res = await fetch(feed.url, { headers: { 'User-Agent': 'AIStockAdvisorNews/1.0' } });
            if (!res.ok) return [];
            const xml = await res.text();
            return parseRss(xml, feed.region, 12);
          })
        );

        let items = fetched.flat();
        const seen = new Set();
        items = items.filter((item) => {
          const key = `${item.title}|${item.link}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        if (ticker) {
          items = items.filter((item) => item.title.toUpperCase().includes(ticker) || item.description.toUpperCase().includes(ticker));
        }

        items = items.slice(0, 20);
        const ai = await summarizeNewsWithAI(openai, items, region);
        const aiMap = new Map((ai.mapped || []).map((x) => [x.id, x]));

        const enriched = items.map((item, idx) => {
          const aiItem = aiMap.get(idx);
          return {
            ...item,
            sentiment: aiItem?.sentiment || inferSentiment(item.title),
            aiWhy: aiItem?.why || 'Review source context before making decisions.'
          };
        });

        return new Response(
          JSON.stringify({
            region,
            ticker: ticker || null,
            marketBrief: ai.marketBrief,
            legal: {
              mode: 'headlines_only',
              note: 'Only feed metadata (title/source/link/time) is shown. Full article content is not stored or republished.'
            },
            items: enriched
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Failed to fetch news feed', details: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    try {
      const messages = await request.json()
      const chatCompletion = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages,
        temperature: 1.1,
        presence_penalty: 0,
        frequency_penalty: 0
      });
      const response = chatCompletion.choices[0].message;

      return new Response(JSON.stringify(response), { headers: corsHeaders });
    } catch (e) {
      return new Response(e, { headers: corsHeaders });
    }
  },
};
