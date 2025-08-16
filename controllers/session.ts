import { Request, Response } from "express";
import { splitAudio } from "../services/audio";
import { getDb } from "../src/utils/db";
import { Session } from "../models/Session";
import { Chat } from "../models/Chat";
import { ObjectId } from "mongodb";
import { transcribeAudio } from "../services/mistral";

declare module "express-session" {
  interface SessionData {
    user?: { id: string; email: string; name: string; };
  }
}

export class SessionController {
  processFile = async (req: Request, res: Response) => {
    console.log("Processing file upload...");

    if (!req.session?.user?.id) {
      console.log("Unauthorized upload attempt (no session user).");
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!req.file) {
      console.log("No file uploaded.");
      return res.status(400).json({ message: "No file uploaded" });
    }

    try {
      const db = getDb();
      const userObjectId = new ObjectId(req.session.user.id);

      console.log(`File received: ${req.file.originalname}`);
      console.log("Splitting audio file...");
      const audioChunkIds = await splitAudio(req.file.path);
      console.log(`Audio split into ${audioChunkIds.length} chunks.`);

      console.log("Transcribing audio chunks...");
      let fullTranscript = "";
      for (const chunkId of audioChunkIds) {
        const transcript = await transcribeAudio(chunkId);
        fullTranscript += transcript + " ";
        console.log(`Transcribed chunk ${chunkId}: ${transcript.substring(0, 50)}...`);
      }
      fullTranscript = fullTranscript.trim();
      console.log("Audio transcription complete.");

      console.log("Creating new chat...");
      const newChat: Chat = {
        userId: userObjectId,
        messages: [],
      };
      const chatResult = await db.collection<Chat>("chats").insertOne(newChat);
      const chatId = chatResult.insertedId;
      console.log(`New chat created with ID: ${chatId}`);

      console.log("Creating new session...");
      const newSession: Session = {
        userId: userObjectId,
        audioChunkIds,
        transcript: fullTranscript || null,
        chatId: chatId as ObjectId,
      };

      const sessionResult = await db.collection<Session>("sessions").insertOne(newSession);
      console.log(`New session created with ID: ${sessionResult.insertedId}`);

      res.json({
        message: "File uploaded and processed successfully.",
        sessionId: sessionResult.insertedId,
      });
    } catch (error) {
      console.error("Error processing file:", error);
      res.status(500).json({ message: "Error processing file" });
    }
  };
}
