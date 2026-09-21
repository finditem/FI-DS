import * as fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 현재 파일의 절대 경로 가져오기
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// tokens.json 파일 읽기 (절대 경로 사용)
const tokensPath = path.join(__dirname, "tokens.json");
const tokens = JSON.parse(fs.readFileSync(tokensPath, "utf-8"));

// `$metadata.tokenSetOrder`에 정의된 토큰 세트 순서 가져오기
const tokenSets = tokens.$metadata?.tokenSetOrder ?? [];

// 파일로 생성하지 않을 토큰 세트
// - comp: Tokens Studio에서 비활성화했는데도 생성되는 이슈 방지
// - Colors/*: 같은 키를 가진 모드별 세트라 함께 빌드하면 서로 덮어쓴다.
//   다크 모드가 없으므로 Light만 빌드한다.
const SKIP_SETS = ["comp", "Colors/Dark", "Colors/IC - Light", "Colors/IC - Dark"];

// 세트 안에서 제거할 토큰 (모드 이름 표시용이라 FE에서 쓰지 않음)
const OMIT_TOKENS = { "Colors/Light": ["Mode"] };

// 이전 실행에서 만들어진 세트 파일 정리 (제외·삭제된 세트가 빌드에 섞이지 않도록)
for (const f of fs.readdirSync(__dirname)) {
  if (f.startsWith("sd-") && f.endsWith(".json") && f !== "sd-alias.generated.json") {
    fs.rmSync(path.join(__dirname, f));
  }
}

// 각 토큰 세트에 대해 JSON 파일 생성
for (const set of tokenSets) {
  if (SKIP_SETS.includes(set)) continue;
  if (!tokens[set]) continue;

  const setTokens = { ...tokens[set] };
  for (const key of OMIT_TOKENS[set] ?? []) delete setTokens[key];

  const data = JSON.stringify(setTokens, null, 2);

  // 파일 이름으로 사용할 안전한 문자열 생성
  // "Primitive/Value" → "Primitive-Value" 형태로 변경
  const safeSet = set.replace(/[\/\\\s]+/g, "-");

  // 출력 경로 설정 (예: sd-Primitive-Value.json)
  const outputPath = path.join(__dirname, `sd-${safeSet}.json`);

  // 상위 디렉터리가 없을 경우 자동 생성
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  // JSON 파일 생성
  fs.writeFileSync(outputPath, data);
  console.log(`sd-${safeSet}.json 파일이 생성되었습니다.`);
}

console.log("JSON 파일 분리가 완료되었습니다.");