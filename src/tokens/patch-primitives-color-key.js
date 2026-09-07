// 토큰 세트 루트의 단일 "Color" 토큰이 "color" 팔레트와 경로 충돌하는 문제를 방지
//
// Figma의 각 변수 컬렉션 루트에 흰색 스칼라 변수 "Color"가 실수로 만들어지는 경우가 있다.
// 이게 그대로 빌드되면 sd-tailwindcss-transformer가 "Color"와 "color"를 같은 키로
// 정규화하면서, 스칼라가 원색 팔레트(color.Cyan/Lime/FlatGray/...) 그룹 전체를 덮어쓴다.
// DS에서 Figma 원본을 고칠 수 없으므로 빌드 단계에서 차단한다.
//
// 과거에는 sd-Primitive-Value.json만 검사했는데, Semantic (Color) 컬렉션에도 같은
// 변수가 생기면서 그대로 새어 나갔다. 이제 모든 sd-*.json 세트를 검사한다.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 루트 "Color"를 옮겨 둘 새 키. 여기 없는 세트는 그냥 제거한다.
// (Primitive/Value는 예전부터 BaseColor로 FE에 나가고 있어 호환을 위해 유지.
//  다른 세트까지 BaseColor로 옮기면 이번엔 baseColor끼리 충돌한다.)
const RENAME_TO = {
  "sd-Primitive-Value.json": "BaseColor",
};

const isScalarToken = (v) =>
  v !== null && typeof v === "object" && "$value" in v;

const files = fs
  .readdirSync(__dirname)
  .filter(
    (f) =>
      f.startsWith("sd-") &&
      f.endsWith(".json") &&
      f !== "sd-alias.generated.json"
  )
  .sort();

for (const file of files) {
  const full = path.join(__dirname, file);
  const json = JSON.parse(fs.readFileSync(full, "utf-8"));
  let changed = false;

  // 1) 루트의 단일 "Color" 토큰 처리
  if (isScalarToken(json["Color"])) {
    const newKey = RENAME_TO[file];
    if (newKey) {
      json[newKey] = json["Color"];
      console.log(`[patch] ${file}: "Color" -> "${newKey}" (color 팔레트 충돌 방지)`);
    } else {
      console.log(`[patch] ${file}: 루트 "Color" 토큰 제거 (color 팔레트 충돌 방지)`);
    }
    delete json["Color"];
    changed = true;
  }

  // 2) 안전 차원: "color"가 문자열이면(이미 충돌 발생한 상태) 객체로 교체
  if (typeof json["color"] === "string") {
    console.log(`[patch] ${file}: "color"가 문자열이라 빈 그룹으로 교체`);
    json["color"] = {}; // 팔레트가 뒤에서 다시 채워짐
    changed = true;
  }

  if (changed) fs.writeFileSync(full, JSON.stringify(json, null, 2));
}

console.log("[patch] 완료");
