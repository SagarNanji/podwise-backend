import {getDb} from "../utils/db";
import {ObjectId} from "mongodb";
import {Session} from "../models/Session";
import {Chat} from "../models/Chat";
import {GoogleGenerativeAI} from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set in environment variables.");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash"});

export const processChatMessage = async (sessionId: string, userMessage: string): Promise<string> => {
    const db = getDb();

    const session = await db.collection<Session>("sessions").findOne({ _id: new ObjectId(sessionId) });
    if (!session) {
        throw new Error("Session not found.");
    }

    const chat = await db.collection<Chat>("chats").findOne({ _id: session.chatId });
    if (!chat) {
        throw new Error("Chat not found.");
    }

    // Add user message to chat history
    chat.messages.push({ sender: "user", content: userMessage, timestamp: new Date() });

    // Construct prompt for Mistral
    const chatHistory = chat.messages.map(msg => `${msg.sender}: ${msg.content}`).join("\n");
    const prompt = `You are an AI assistant that answers questions based on the provided audio transcript. If the answer is not in the transcript, state that you don't know.\n\nAudio Transcript: ${session.transcript}\n\nConversation History:\n${chatHistory}\n\nUser: ${userMessage}\nAI:`;

    const chatResponse = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const aiResponse: string = chatResponse.response.text();

    // Add AI response to chat history
    chat.messages.push({ sender: "bot", content: aiResponse, timestamp: new Date() });

    // Update chat document in database
    await db.collection<Chat>("chats").updateOne(
        { _id: chat._id },
        { $set: { messages: chat.messages } }
    );

    return aiResponse;
};
