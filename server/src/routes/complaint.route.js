import { Router } from "express";
import { createComplaint } from "../controllers/complaint.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/", protect, authorize("student"), createComplaint);

export default router;
