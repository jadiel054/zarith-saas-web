import { Router, type IRouter } from "express";
import healthRouter from "./health";
import githubRouter from "./github";
import deployRouter from "./deploy";
import supabaseRouter from "./supabase";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/github", githubRouter);
router.use("/deploy", deployRouter);
router.use("/supabase", supabaseRouter);

export default router;
