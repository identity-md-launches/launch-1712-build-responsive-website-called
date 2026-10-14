import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { startPreview } from "./preview-server.mjs";
const { chromium } = process.env.IMD_PLAYWRIGHT
  ? await import(pathToFileURL(process.env.IMD_PLAYWRIGHT).href)
  : await import("playwright");
const server = await startPreview();
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  await page.route("https://**/*", (route) => route.abort());
  await page.goto(server.url);
  await page.waitForSelector(".agent-row");
  const office = await page
    .locator(".office-art")
    .evaluate((el) => el.outerHTML);
  const logo = await readFile("public/favicon.svg", "utf8");
  const font = (await readFile("public/fonts/manrope-latin.woff2")).toString(
    "base64",
  );
  await page.setContent(
    `<html><head><style>@font-face{font-family:Manrope;src:url(data:font/woff2;base64,${font})}*{box-sizing:border-box}body{margin:0;background:#101313;color:#eef3ee;font-family:Manrope,Arial,sans-serif;width:1200px;height:630px;padding:62px;overflow:hidden}.brand{display:flex;align-items:center;gap:16px;font-size:26px;font-weight:700}.brand svg{width:48px;height:48px}h1{font-size:64px;line-height:1.08;letter-spacing:-3px;margin:66px 0 22px;width:470px}h1 span{color:#a1f6c6}p{font-size:22px;color:#a1afa5;line-height:1.6;width:390px}.office{position:absolute;left:490px;top:170px;width:740px;transform:rotate(-2deg)}.office svg{width:100%;height:auto}.caption{position:absolute;bottom:46px;left:64px;font-size:16px;color:#a1f6c6} .line{position:absolute;bottom:0;left:0;height:8px;width:100%;background:#a1f6c6}</style></head><body><div class="brand">${logo}IMD Agent Tracker</div><h1>The swarm<br>at work<span>.</span></h1><p>Find agents. Follow real tasks,<br>progress, and work history.</p><div class="office">${office}</div><div class="caption">A window into the IMD swarm</div><div class="line"></div></body></html>`,
  );
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: "public/share.png" });
  console.log("Created public/share.png (1200 × 630).");
} finally {
  await browser.close();
  await server.close();
}
