import { Request, Response } from "express";
import { getDb } from "../utils/db";
import { ObjectId } from "mongodb";
import { Session } from "../models/Session";
import { Chat } from "../models/Chat";

declare module "express-session" {
  interface SessionData {
    user?: { id: string; email: string; name: string; };
  }
}

export class HistoryController {
  // GET /api/history/sessions
  listSessions = async (req: Request, res: Response) => {
    if (!req.session?.user?.id) return res.status(401).json({ message: "Not authenticated" });
    const db = getDb();
    const userId = new ObjectId(req.session.user.id);

    const sessions = await db
      .collection<Session>("sessions")
      .find({ userId })
      .sort({ _id: -1 })
      .toArray();

    const chatIds = sessions.map((s) => s.chatId);
    const chats = await db
      .collection<Chat>("chats")
      .find({ _id: { $in: chatIds } })
      .toArray();

    const chatMap = new Map(chats.map((c) => [c._id!.toString(), c]));
    const data = sessions.map((s) => {
      const ch = chatMap.get(s.chatId.toString());
      const count = ch?.messages?.length ?? 0;
      const last = count ? ch!.messages[count - 1] : null;
      return {
        _id: s._id,
        transcript: s.transcript,
        chatId: s.chatId,
        messageCount: count,
        lastMessagePreview: last?.content?.slice(0, 140) ?? "",
        lastMessageAt: last?.timestamp ?? null,
      };
    });

    res.json({ sessions: data });
  };

  // GET /api/history/chats/:sessionId
  getChatBySession = async (req: Request, res: Response) => {
    if (!req.session?.user?.id) return res.status(401).json({ message: "Not authenticated" });
    const db = getDb();
    const userId = new ObjectId(req.session.user.id);
    const { sessionId } = req.params;

    let sessionObjectId: ObjectId;
    try {
      sessionObjectId = new ObjectId(sessionId);
    } catch {
      return res.status(400).json({ message: "Invalid sessionId" });
    }

    const sess = await db.collection<Session>("sessions").findOne({ _id: sessionObjectId, userId });
    if (!sess) return res.status(404).json({ message: "Session not found" });

    const chat = await db.collection<Chat>("chats").findOne({ _id: sess.chatId });
    if (!chat) return res.status(404).json({ message: "Chat not found" });

    res.json({ chat });
  };
}
