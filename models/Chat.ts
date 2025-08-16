import { ObjectId } from "mongodb";

export interface Chat {
    _id?: ObjectId;
    userId?: ObjectId; 
    messages: {
        sender: "user" | "bot";
        content: string;
        timestamp: Date;
    }[];
}