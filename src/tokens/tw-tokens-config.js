import { makeSdTailwindConfig } from "sd-tailwindcss-transformer";
import StyleDictionary from "style-dictionary";

const config = makeSdTailwindConfig({
  type: "all",
  source: ["src/tokens/build/build-tokens.json"],
  buildPath: "src/tokens/build/",
});

// 이름 충돌이 있으면 경고 대신 빌드 실패 (sd-tokens-config.js와 동일한 정책)
const sd = new StyleDictionary({ ...config, log: { ...config.log, warnings: "error" } });

await sd.hasInitialized;
await sd.buildAllPlatforms();
