import { Router } from "express";
import { getComplaintHistory } from "../controllers/complainActivity.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/:id/history", protect, getComplaintHistory);

export default router;
