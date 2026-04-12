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

router.use(protect);

router
  .route("/")
  .get(getAllHostels)
  .post(authorize("admin", "super_admin"), createHostel);

router
  .route("/:id")
  .get(getHostelById)
  .patch(authorize("admin", "super_admin"), updateHostel)
  .delete(authorize("admin", "super_admin"), deleteHostel);

export default router;
