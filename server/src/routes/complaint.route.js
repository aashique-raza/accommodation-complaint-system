import { Router } from "express";
import {
  createComplaint,
  getMyComplaints,
  getComplaintById,
  getAllComplaints,
} from "../controllers/complaint.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/", protect, authorize("student"), createComplaint);

router.get("/my", protect, getMyComplaints);

router.get(
  "/admin",
  protect,
  authorize("admin", "super_admin"),
  getAllComplaints,
);

router.get("/:id", protect, getComplaintById);

export default router;
