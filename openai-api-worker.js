import OpenAI from 'openai';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

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
        apiKey: env.OPENAI_API_KEY, // or "DUMMY" if stored in Gateway
        baseURL: host + endpoint,
        
      });

    /* Challenge: 
        - Pass the chat completions endpoint the `messages`
          array sent from the client. 
    */

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