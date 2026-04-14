import express from "express";
import cors from "cors";
import userRoutes from "./routes/user.route.js";
import hostelRoutes from "./routes/hostel.route.js";
import errorHandler from "./middlewares/error.middleware.js";
import categoryRoutes from "./routes/category.routes.js";

import ApiError from "./utils/apiError.js";
import cookieParser from "cookie-parser";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running successfully",
  });
});

app.use("/api/v1/users", userRoutes);
app.use("/api/v1/hostels", hostelRoutes);
app.use("/api/v1/categories", categoryRoutes);

app.use((req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.originalUrl}`));
});

app.use(errorHandler);

export default app;
