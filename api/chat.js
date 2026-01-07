// api/chat.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const admin = require("firebase-admin");

// Inisialisasi Firebase Admin (Gunakan Service Account)
// Simpan kredensial ini di Environment Variables (Vercel)
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL
    });
}

const db = admin.database();

// Konfigurasi Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
    // Keamanan sederhana: Cek Secret Key agar tidak sembarang orang bisa trigger
    const { secret, type } = req.query; 
    if (secret !== process.env.CRON_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        // Tentukan Tipe (Artikel / Materi) & Topik
        // Tips: Kamu bisa membuat array topik di database agar AI tidak mengulang topik
        let prompt = "";
        let contentType = type || "artikel"; // default artikel
        
        const topics = ["Sastra", "Teknologi", "Psikologi", "Sejarah", "Filsafat", "Seni Kreatif"];
        const randomTopic = topics[Math.floor(Math.random() * topics.length)];

        if (contentType === "materi") {
            prompt = `Buatlah sebuah materi pembelajaran mendalam tentang "${randomTopic}" untuk web Cendekia Aksara.
            Format output harus JSON dengan struktur: { "title": "Judul Materi", "content": "Isi materi dalam format MARKDOWN lengkap" }.
            Dalam konten markdown, wajib gunakan bold, italic, list, dan minimal satu tabel perbandingan. Jelaskan secara akademis tapi mudah dipahami.`;
        } else {
            prompt = `Buatlah sebuah artikel opini atau edukasi ringan tentang "${randomTopic}".
            Format output harus JSON dengan struktur: { "title": "Judul Artikel", "content": "Isi artikel dalam format MARKDOWN" }.
            Gunakan gaya bahasa santai namun berbobot. Gunakan formatting bold untuk poin penting.`;
        }

        // Generate Content
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Bersihkan formatting markdown JSON ```json ... ``` jika ada
        const cleanText = text.replace(/```json/g, "").replace(/```/g, "");
        const contentData = JSON.parse(cleanText);

        // Simpan ke Firebase Realtime Database
        const newPostRef = db.ref('posts').push();
        await newPostRef.set({
            title: contentData.title,
            content: contentData.content,
            type: contentType, // 'artikel' atau 'materi'
            topic: randomTopic,
            timestamp: admin.database.ServerValue.TIMESTAMP
        });

        return res.status(200).json({ success: true, message: `Berhasil membuat ${contentType}`, data: contentData.title });

    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ error: error.message });
    }
}
