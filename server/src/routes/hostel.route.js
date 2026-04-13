import express from "express";
import {
  createHostel,
  getAllHostels,
  getHostelById,
  updateHostel,
  deleteHostel,
} from "../controllers/hostel.controller.js";
import { protect , authorize} from "../middlewares/auth.middleware.js";

const router = express.Router();

// router.use(protect);

router.get("/", getAllHostels);
router.post("/", protect,authorize("admin", "super_admin"), createHostel);

router.get("/:id", getHostelById);
router.patch("/:id", protect,authorize("admin", "super_admin"), updateHostel);
router.delete("/:id", protect,authorize("admin", "super_admin"), deleteHostel);

export default router;
