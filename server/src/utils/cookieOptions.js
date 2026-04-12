export const getRefreshTokenCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/api/v1/users",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
};