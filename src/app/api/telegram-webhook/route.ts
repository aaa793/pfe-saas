import { NextRequest, NextResponse } from "next/server";
import { getBot } from "@/lib/telegram/bot";
import { generateAnswer } from "@/lib/telegram/rag";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body?.message;

    if (!message?.text) return NextResponse.json({ ok: true });

    const chatId   = message.chat.id;
    const userId   = message.from?.id;
    const username = message.from?.username || message.from?.first_name || "étudiant";
    const userText = message.text;

    if (userText.startsWith("/")) return NextResponse.json({ ok: true });

    console.log(`Message de @${username}: ${userText}`);

    const answer = await generateAnswer(userText);

    await getBot().telegram.sendMessage(chatId, answer, {
      reply_parameters: { message_id: message.message_id },
      parse_mode: "Markdown",
    });

    try {
      await prisma.telegramConversation.create({
        data: {
          chatId: String(chatId),
          userId: String(userId),
          username,
          question: userText,
          answer,
        },
      });
    } catch (dbError) {
      console.warn("DB log skipped:", dbError);
    }

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error("TELEGRAM WEBHOOK ERROR:", error);
    try {
      await getBot().telegram.sendMessage(
        process.env.TELEGRAM_ADMIN_CHAT_ID!,
        `Erreur webhook:\n${(error as Error).message}`
      );
    } catch {}
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
