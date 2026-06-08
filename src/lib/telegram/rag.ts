import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Lazy singletons — instantiated on first request, not at module load time,
// so `next build` succeeds even without the env vars present locally.
let _pinecone: Pinecone | null = null;
let _genAI: GoogleGenerativeAI | null = null;

function getPinecone(): Pinecone {
  if (!_pinecone) {
    if (!process.env.PINECONE_API_KEY) {
      throw new Error("PINECONE_API_KEY manquant dans .env");
    }
    _pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  }
  return _pinecone;
}

function getGenAI(): GoogleGenerativeAI {
  if (!_genAI) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY manquant dans .env");
    }
    _genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return _genAI;
}

async function embedText(text: string): Promise<number[]> {
  const model = getGenAI().getGenerativeModel({ model: "text-embedding-004" });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

async function searchKnowledge(question: string): Promise<string> {
  const index = getPinecone().index("school-knowledge");
  const vector = await embedText(question);

  const results = await index.query({
    vector,
    topK: 5,
    includeMetadata: true,
  });

  if (!results.matches || results.matches.length === 0) return "";

  return results.matches
    .map((m) => m.metadata?.text || m.metadata?.content || "")
    .filter(Boolean)
    .join("\n\n");
}

export async function generateAnswer(question: string): Promise<string> {
  const context = await searchKnowledge(question);
  const model = getGenAI().getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = context
    ? `Tu es un assistant pédagogique pour des étudiants.
Réponds à la question en te basant sur le contexte du cours fourni.
Sois clair, concis et pédagogique. Réponds dans la langue de la question.

Contexte du cours :
${context}

Question de l'étudiant : ${question}

Réponse :`
    : `Tu es un assistant pédagogique.
Réponds clairement et pédagogiquement.
Réponds dans la langue de la question.

Question : ${question}

Réponse :`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
