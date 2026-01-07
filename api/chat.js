import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  // Pastikan metode request adalah POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Mengambil API KEY dari "Brankas" Vercel
  const apiKey = process.env.GOOGLE_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'API Key belum disetting di Vercel!' });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Mengambil pesan dari frontend (index.html)
    const { prompt } = req.body;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Kirim jawaban kembali ke frontend
    return res.status(200).json({ answer: text });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
