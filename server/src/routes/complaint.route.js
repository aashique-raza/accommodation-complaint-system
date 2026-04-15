import { Router } from "express";
import {
  createComplaint,
  getMyComplaints,
} from "../controllers/complaint.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/", protect, authorize("student"), createComplaint);

router.get("/my", protect, getMyComplaints);

export default router;
