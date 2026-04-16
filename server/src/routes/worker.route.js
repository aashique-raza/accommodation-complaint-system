import { Router } from "express";
import {
  createWorker,
  getAllWorkers,
  getMyWorkerProfile,
  getWorkerById,
  updateMyWorkerProfile,
  updateWorker
} from "../controllers/worker.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(protect);

// worker self profile
router.get("/me", authorize("worker"), getMyWorkerProfile);
router.patch("/me", authorize("worker"), updateMyWorkerProfile);

// admin routes
router.use(authorize("admin", "super_admin"));

router.post("/", createWorker);
router.get("/", getAllWorkers);
router.get("/:id", getWorkerById);
router.patch("/:id", updateWorker);

export default router;
