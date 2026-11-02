import { Router, type IRouter } from "express";
import healthRouter from "./health";
import githubRouter from "./github";
import deployRouter from "./deploy";
import supabaseRouter from "./supabase";
import databaseRouter from "./database";
import vercelRouter from "./vercel";
import visionRouter from "./vision";
import webRouter from "./web";
import filesRouter from "./files";
import chatRouter from "./chat";
import versionRouter from "./version";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/github", githubRouter);
router.use("/deploy", deployRouter);
router.use("/supabase", supabaseRouter);
router.use("/database", databaseRouter);
router.use("/vercel", vercelRouter);
router.use("/vision", visionRouter);
router.use("/web", webRouter);
router.use("/files", filesRouter);
router.use("/chat", chatRouter);
router.use("/version", versionRouter);

export default router;
