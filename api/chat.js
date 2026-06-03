export default async function handler(req, res) {
    // Enable CORS for frontend requests
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Handle CORS preflight request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { query, portfolioData } = req.body;
        const key = process.env.GROQ_API_KEY;

        if (!key) {
            return res.status(500).json({ error: 'Groq API Key is not configured in Vercel environment variables.' });
        }

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    {
                        role: 'system',
                        content: 'You are Poorna Seshaseyan\'s portfolio assistant. Answer only using the context below. Be concise, professional, and friendly. Do not use bullet points or numbered lists; instead, write in clear paragraphs with bold labels if needed.\n\nContext:\n' + JSON.stringify(portfolioData)
                    },
                    { role: 'user', content: query }
                ],
                temperature: 0.6,
                max_tokens: 350
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Groq API error: ${response.status} - ${errText}`);
        }

        const data = await response.json();
        if (data && data.choices && data.choices[0] && data.choices[0].message) {
            return res.status(200).json({ content: data.choices[0].message.content });
        }
        
        throw new Error('Invalid response structure from Groq API');
    } catch (error) {
        console.error('Serverless Function Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
