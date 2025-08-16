import { ObjectId } from "mongodb";

export interface Session {
    _id?: ObjectId;
    userId: ObjectId;  
    audioChunkIds: ObjectId[];
    transcript: string | null;
    chatId: ObjectId;
}