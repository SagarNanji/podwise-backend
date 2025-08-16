import { Request, Response } from "express";
import { processChatMessage } from "../services/chat";

export class ChatController {
    processChat = async (req: Request, res: Response) => {
        const { sessionId } = req.params;
        const { message } = req.body;

        if (!sessionId || !message) {
            return res.status(400).json({ message: "Session ID and message are required." });
        }

        try {
            const response = await processChatMessage(sessionId, message);
            res.json({ response });
        } catch (error) {
            console.error("Error processing chat message:", error);
            res.status(500).json({ message: "Error processing chat message." });
        }
    };
}