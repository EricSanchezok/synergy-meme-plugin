function normalize(value: string) {
  return value.toLocaleLowerCase().normalize("NFKC").trim();
}

function asciiTokens(value: string) {
  return normalize(value).match(/[a-z0-9]+/g) ?? [];
}

/**
 * Extract CJK tokens from normalized text.
 * Finds contiguous CJK character runs (Unicode Han script) and returns
 * all 2-grams. Single and double-character runs also include the whole string.
 */
export function cjkTokens(normalized: string): string[] {
  const tokens: string[] = [];
  const cjkRuns = normalized.match(/\p{Script=Han}+/gu) ?? [];
  for (const run of cjkRuns) {
    const chars = [...run];
    // 2-grams
    for (let i = 0; i < chars.length - 1; i++) {
      tokens.push(chars[i] + chars[i + 1]);
    }
    // Short runs: include the whole string
    if (chars.length <= 2) {
      tokens.push(run);
    }
  }
  return tokens;
}

/**
 * Tokenize text for BM25 document indexing.
 * Extracts ASCII tokens and CJK 2-grams for indexable documents.
 */
export function documentTokens(text: string): string[] {
  const normalized = normalize(text);
  return [...asciiTokens(normalized), ...cjkTokens(normalized)];
}

// Query expansion rules — semantic keyword mapping for Chinese/English queries.
const queryExpansions: Array<{ match: RegExp; tokens: string[] }> = [
  {
    match:
      /程序员|开发|代码|编程|软件|工程师|debug|调试|bug|错误|报错|分号|semicolon|programmer|developer|coding|code/i,
    tokens: [
      "developer",
      "programming",
      "code",
      "debug",
      "bug",
      "mistake",
      "confused",
    ],
  },
  {
    match: /崩溃|爆炸|抓狂|绝望|破防|裂开|panic|crash|breakdown|rage|stress/i,
    tokens: [
      "panic",
      "stress",
      "pain",
      "frustrated",
      "disaster",
      "fire",
      "insane",
      "questioning",
    ],
  },
  {
    match:
      /释然|解决|修好|终于|原来|恍然大悟|成功|爽|win|success|fixed|finally|relief/i,
    tokens: ["success", "relief", "finally", "realization", "happy", "good"],
  },
  {
    match: /困惑|不懂|迷茫|懵|confused|lost|what|why/i,
    tokens: ["confused", "lost", "unsure", "question", "what"],
  },
  {
    match: /懂|明白|理解|看懂|没完全|似懂非懂|原来如此|i see|understand/i,
    tokens: [
      "realization",
      "confused",
      "awkward",
      "question",
      "clarity",
      "ambiguity",
      "uncertainty",
      "suspicion",
    ],
  },
  {
    match: /选择|对比|相比|以前|现在|旧|新|vs|versus|choice|prefer/i,
    tokens: ["choice", "contrast", "old", "new", "prefer"],
  },
  {
    match:
      /老板|经理|产品|需求|客户|甲方|改了|改需求|变更|scope|requirement|product|manager|client/i,
    tokens: [
      "work",
      "product",
      "change",
      "backfire",
      "stress",
      "mistake",
      "plan",
      "steps",
      "regret",
      "overconfidence",
      "collapse",
    ],
  },
  {
    match:
      /简单|很快|五分钟|一天|三天|半天|以为|实际|easy|simple|quick|expectation|reality/i,
    tokens: ["expectation", "reality", "underestimate", "pain", "work"],
  },
  {
    match:
      /上线|部署|生产|线上|监控|告警|报警|全红|ci|build|deploy|production|monitor|alert/i,
    tokens: [
      "deploy",
      "production",
      "failure",
      "disaster",
      "fire",
      "panic",
      "debug",
    ],
  },
  {
    match: /脑洞|升级|越来越|复杂|架构|plan|brain|smart|clever|complex/i,
    tokens: ["brain", "complexity", "plan", "clever", "escalation"],
  },
  {
    match: /尴尬|假装|微笑|awkward|pretend|smile|pain/i,
    tokens: ["awkward", "pain", "pretend", "smile"],
  },
  {
    match: /狗|狗狗|柴犬|dog|doge|puppy/i,
    tokens: ["dog", "doge", "confused"],
  },
  {
    match: /随机|随便|任意|random|whatever|surprise/i,
    tokens: ["classic", "random"],
  },
];

/**
 * Tokenize a user query text.
 * Builds on documentTokens and adds semantic expansion tokens from
 * Chinese/English keyword matches. Query expansion only applies to
 * user queries, not template documents.
 */
export function queryTokens(query: string): string[] {
  const tokens = new Set(documentTokens(query));

  for (const expansion of queryExpansions) {
    if (!expansion.match.test(query)) continue;
    for (const token of expansion.tokens) tokens.add(token);
  }

  return [...tokens];
}
