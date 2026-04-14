import { Router } from "express";
import {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const router = Router();

// Public/User/Admin - category list and single category dekh sakte hain
router.get("/", protect, getAllCategories);
router.get("/:id", protect, getCategoryById);

// Only Admin - create, update, delete
router.post("/", protect, authorize("admin"), createCategory);
router.patch("/:id", protect, authorize("admin"), updateCategory);
router.delete("/:id", protect, authorize("admin"), deleteCategory);

export default router;