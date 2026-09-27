import { register } from "@tokens-studio/sd-transforms";
import StyleDictionary from "style-dictionary";

register(StyleDictionary);

const sd = new StyleDictionary({
  source: ["src/tokens/sd-*.json"], // sd-alias.generated.json도 이 glob에 포함된다
  log: {
    verbosity: "verbose", // 누가 참조 깨졌는지까지 출력
    // 이름이 겹쳐 서로 덮어쓰는 토큰이 있으면 빌드를 실패시킨다.
    // (Figma에서 이름을 바꿔도 Tokens Studio export에 옛 이름이 남아 충돌한 적이 있다)
    warnings: "error",
  },
  preprocessors: ["tokens-studio"],
  platforms: {
    css: {
      transformGroup: "tokens-studio",
      transforms: ["name/kebab"], // 만들어질 token 이름 형태
      buildPath: "src/tokens/build/",
      files: [
        {
          destination: "build-tokens.json",
          format: "json",
        },
      ],
    },
  },
});

await sd.cleanAllPlatforms();
await sd.buildAllPlatforms();
