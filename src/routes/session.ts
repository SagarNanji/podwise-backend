import { Router } from "express";
import { SessionController } from "../../controllers/session";
import multer from "multer";

const upload = multer({ dest: "uploads/" });

const router = Router();
const controller = new SessionController();

router.get("/", (req, res) => {
    res.send({ status: "ok", message: "Session endpoint is ready to accept POST requests for file uploads." });
});
router.post("/", upload.single("file"), controller.processFile);

export default router;
