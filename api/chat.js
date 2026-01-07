export default async function handler(request, response) {
    // 1. Cek apakah metode request benar (harus POST)
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    // 2. Ambil API Key dari "Brankas" Vercel (Environment Variables)
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return response.status(500).json({ error: 'Server Error: API Key belum disetting di Vercel.' });
    }

    try {
        // 3. Ambil topik yang dikirim dari Frontend
        const { topic } = JSON.parse(request.body);

        const prompt = `Buatlah satu artikel edukatif mendalam tentang teknik menulis NOVEL untuk penulis pemula dengan TOPIK: ${topic}. 
        Struktur Jawaban WAJIB:
        Baris 1: Judul Menarik (Tanpa tanda bintang atau #)
        Baris Berikutnya: Isi materi dalam format HTML (gunakan p, h3, blockquote untuk kutipan novel, ul, li).
        Berikan contoh 'Bedah Kutipan' dari sebuah novel terkenal. Penulis: Aksa AI.`;

        // 4. Panggil Google Gemini (Dari sisi server, jadi aman!)
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        
        const fetchResponse = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await fetchResponse.json();

        // 5. Cek jika ada error dari Google
        if (data.error) {
            throw new Error(data.error.message);
        }

        // 6. Kirim hasil bersih ke Frontend
        const rawText = data.candidates[0].content.parts[0].text;
        return response.status(200).json({ result: rawText });

    } catch (error) {
        console.error("AI Error:", error);
        return response.status(500).json({ error: error.message });
    }
}
