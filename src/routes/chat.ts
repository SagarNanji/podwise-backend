import { Router } from "express";
import { ChatController } from "../controllers/chat";

const router = Router();
const controller = new ChatController();

router.post("/:sessionId", controller.processChat);

export default router;