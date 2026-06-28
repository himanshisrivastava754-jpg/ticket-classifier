export default async (request) => {
  const apiKey = process.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Missing API key" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.text();

  const upstream = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    }
  );

  const data = await upstream.text();

  return new Response(data, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
};

export const config = {
  path: "/api/gemini",
};