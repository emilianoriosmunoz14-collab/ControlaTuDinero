export {};
declare global {
  namespace Express {
    interface Request {
      authUserId?: number;
    }
  }
}
