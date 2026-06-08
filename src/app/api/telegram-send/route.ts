import { NextRequest, NextResponse } from "next/server";
import { getBot } from "@/lib/telegram/bot";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.SAAS_INTERNAL_TOKEN}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, chat_id, content } = await req.json();

    if (type === "message") {
      await getBot().telegram.sendMessage(chat_id, content.text, {
        parse_mode: "Markdown",
      });

    } else if (type === "quiz") {
      const { question, options, correct_index } = content;
      await getBot().telegram.sendMessage(chat_id, `*Quiz*\n\n${question}`, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: options.map((opt: string, i: number) => [
            {
              text: i === correct_index ? `${opt} ✅` : opt,
              callback_data: i === correct_index ? "correct" : `wrong_${i}`,
            },
          ]),
        },
      });

    } else if (type === "document") {
      const { file_url, filename, caption } = content;
      await getBot().telegram.sendDocument(
        chat_id,
        { url: file_url, filename },
        { caption: caption || filename }
      );
    }

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error("TELEGRAM SEND ERROR:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
