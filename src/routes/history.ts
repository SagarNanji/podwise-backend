import { Router } from "express";
import { HistoryController } from "../controllers/history";

const router = Router();
const controller = new HistoryController();

router.get("/sessions", controller.listSessions);
router.get("/chats/:sessionId", controller.getChatBySession);

export default router;
