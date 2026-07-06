export interface MemeTemplateProfile {
  tags?: string[];
  bestFor?: string[];
  examples?: string[];
  aliases?: string[];
  family?: string;
}

export const templateProfiles: Record<string, MemeTemplateProfile> = {
  drake: {
    family: "contrast",
    tags: [
      "rejection",
      "preference",
      "hot-take",
      "switching-sides",
      "no-vs-yes",
      "disapprove",
      "endorse",
      "binary-choice",
    ],
    bestFor: [
      "Contrasting two options where the subject emphatically dislikes one and prefers the other — classic 'not this, but this' framing. 用对比手法表达对某个选择的嫌弃和对另一个选择的推崇。",
      "Rejecting a popular or conventional approach in favor of a niche or personal preference. 拒绝大众选择，力挺小众偏好的场景。",
    ],
    examples: [
      "top text: using tabs / bottom text: using spaces",
      "top text: company offsite / bottom text: going home early",
    ],
    aliases: [
      "drakeposting",
      "Drake no yes",
      "Drake meme",
      "Drake yes no",
      "Drake hotline",
      "德雷克对比",
    ],
  },

  fine: {
    family: "disaster-calm",
    tags: [
      "denial",
      "catastrophe",
      "everything-on-fire",
      "internal-panic",
      "pretending-situation-normal",
      "spreading-flames",
      "this-is-fine",
    ],
    bestFor: [
      "When everything around you is collapsing — production is down, the build is red, the alerts are screaming — but you insist it is under control. 表面一切尽在掌控，实则周围早已着火崩溃的自欺欺人时刻。",
      "Acknowledging an escalating disaster while outwardly staying calm (or dissociating). 明明灾难在升级但依然保持微笑（或已麻木）。",
    ],
    examples: [
      "top: five critical alerts / bottom: this is fine",
      "top: rewriting the entire codebase / bottom: I know what I'm doing",
    ],
    aliases: [
      "this is fine",
      "dog in fire",
      "everything is fine",
      "thisisfine",
      "burning dog",
      "着火狗",
      "淡定狗",
      "一切都好",
    ],
  },

  scc: {
    family: "realization",
    tags: [
      "epiphany",
      "sudden-insight",
      "obvious-in-hindsight",
      "connecting-dots",
      "late-realization",
      "clarity-strike",
      "oh-wait",
    ],
    bestFor: [
      "Moments of sudden clarity when an answer or mistake that was always there finally clicks — especially the 'oh wait' variety. 突然顿悟某一个早就在眼前的答案或错误，属于'等一下！'那种。",
      "Realizing the real reason behind something you previously explained wrong. 发现之前的解释是错的，突然明白真正原因。",
    ],
    examples: [
      "top: the bug was a typo / bottom: I've been debugging for 3 hours",
      "top: that's why my code worked / bottom: I have no idea what I changed",
    ],
    aliases: [
      "sudden clarity clarence",
      "clarence",
      "sudden realization",
      "顿悟",
      "突然明白",
      "suddlen clarity",
    ],
  },

  facepalm: {
    family: "frustration",
    tags: [
      "obvious-error",
      "self-inflicted",
      "facepalm-gesture",
      "should-have-known",
      "rookie-mistake",
      "exasperation",
      "picard-disappoint",
    ],
    bestFor: [
      "Reacting to a spectacularly obvious mistake — a missing semicolon, a typo in production config, a commit to the wrong branch. 被一个极其明显的低级错误气到捂脸，比如缺分号、配错配置、提交错分支。",
      "When someone (or yourself) should absolutely have known better and the only appropriate response is a palm to the forehead. 对'你本应知道'式错误的唯一合理反应。",
    ],
    examples: [
      "top: forgetting the semicolon / bottom: three hours of debugging",
      "top: the junior dev pushed to main / bottom: on Friday at 5pm",
    ],
    aliases: [
      "picard facepalm",
      "captain picard",
      "star trek facepalm",
      "捂脸",
      "captain facepalm",
    ],
  },

  noidea: {
    family: "confusion",
    tags: [
      "imposter-syndrome",
      "clueless-mastery",
      "faking-it",
      "know-nothing",
      "technical-confusion",
      "dog-at-keyboard",
      "in-over-my-head",
    ],
    bestFor: [
      "Pretending to be competent at a task you are completely unqualified for — the universal developer experience of reading your own code from six months ago. 假装会做一件事但其实完全不懂，比如读自己半年前写的代码。",
      "When you have no plan, no idea, and are just clicking around hoping something works. 完全不知道自己在干什么但依然装作很忙。",
    ],
    examples: [
      "top: asked to explain my architecture / bottom: I have no idea what I'm doing",
      "top: production incident / bottom: clicking random buttons",
    ],
    aliases: [
      "i have no idea what I'm doing",
      "chemistry dog",
      "lab dog",
      "不知道狗",
      "no idea dog",
      "science dog",
    ],
  },

  harold: {
    family: "suppressed-pain",
    tags: [
      "forced-smile",
      "internal-suffering",
      "dead-inside",
      "customer-service-face",
      "suppressed-agony",
      "professional-mask",
      "smile-through-pain",
    ],
    bestFor: [
      "When you are suffering deeply inside but must maintain a pleasant exterior — the universal experience of customer support, performance reviews, and Monday standups. 内心已经崩溃但脸上还得挂着专业微笑，适用于客服、绩效面谈和周一站会。",
      "Acknowledging a painful reality (bad code, impossible deadline, legacy system) while outwardly pretending everything is fine. 明明现实很痛苦（烂代码/不可能期限/祖传系统），脸上却写着'没事'。",
    ],
    examples: [
      "top: the legacy codebase has 4000-line files / bottom: *smiling* it's got great test coverage",
      "top: PM added three features to the sprint / bottom: sounds great, no problem at all",
    ],
    aliases: [
      "hide the pain harold",
      "hide pain harold",
      "harold pain",
      "强颜欢笑",
      "疼痛哈罗德",
      "pain harold",
    ],
  },

  success: {
    family: "victory",
    tags: [
      "small-win",
      "accidental-success",
      "fist-pump",
      "triumph",
      "nailed-it",
      "undeserved-victory",
      "baby-fist",
    ],
    bestFor: [
      "Celebrating a small, often accidental victory — the PR merged on first try, a regex worked without unit testing, or the estimate was actually right. 庆祝小但意外的胜利：PR 一次合入、正则一次写对、估计时间居然刚好。",
      "The triumphant feeling of something working despite all odds. 面对重重困难竟然成功了的欣慰与侥幸。",
    ],
    examples: [
      "top: wrote a regex / bottom: it worked on the first try",
      "top: estimated 3 days / bottom: actually took 3 days",
    ],
    aliases: [
      "success kid",
      "success baby",
      "fist pump baby",
      "成功小孩",
      "I hate sandcastles",
    ],
  },

  feelsgood: {
    family: "victory",
    tags: [
      "pure-relief",
      "satisfaction",
      "unburdened",
      "emotional-release",
      "genuine-happiness",
      "stress-lifted",
    ],
    bestFor: [
      "Genuine uncomplicated happiness — a deadline met, a vacation starting, or simply a moment of pure satisfaction without irony or suffering. 真诚无杂质的开心：项目准时交付、假期终于开始、或只是单纯的满足感——没有讽刺、没有痛苦。",
    ],
    examples: [
      "top: the last commit before vacation / bottom: logs out immediately",
      "top: CI finally passes / bottom: all 72 tests are green",
    ],
    aliases: [
      "feels good man",
      "feelsgoodman",
      "pepe feels good",
      "心情好",
      "舒服了",
      "舒坦",
    ],
  },

  crazypills: {
    family: "gaslighting",
    tags: [
      "questioning-reality",
      "everyone-else-insane",
      "gaslit",
      "am-i-crazy",
      "improbable-explanation",
      "conspiracy-thinking",
      "only-sane-person",
    ],
    bestFor: [
      "When everyone around you seems to have collectively lost their mind — the team decides to rewrite in a new framework next sprint, or management insists the timeline is realistic. 感觉身边所有人都疯了，比如团队决定下个 sprint 用新框架重写，或者管理层坚称排期完全合理。",
      "Describing an absurd situation where the only explanation feels like mass delusion. 描述一种极其荒谬、除了集体幻觉外无法解释的处境。",
    ],
    examples: [
      "top: PM says we can ship the entire rewrite by Friday / bottom: I feel like I'm taking crazy pills",
      "top: they said it's not a bug, it's a feature / bottom: am I the insane one",
    ],
    aliases: [
      "crazy pills",
      "taking crazy pills",
      "zoolander",
      "mugatu",
      "疯了药丸",
      "i feel like im taking crazy pills",
      "will ferrell crazy pills",
    ],
  },

  fry: {
    family: "suspicion",
    tags: [
      "not-sure-if",
      "uncertain-judgment",
      "ambiguous-motive",
      "double-meaning",
      "squinting-skepticism",
      "hidden-intent",
      "suspicious",
    ],
    bestFor: [
      "Expressing uncertainty about whether someone's action is genuine, sarcastic, brilliant, or dumb — the 'not sure if X or Y' framing. 不确定某人的行为是真诚还是讽刺、是聪明还是蠢——经典'搞不清是X还是Y'结构。",
      "Calling out ambiguous situations where two interpretations are equally plausible. 当两种解释都说得通的暧昧场景。",
    ],
    examples: [
      "top: not sure if great architecture / bottom: or just over-engineering",
      "top: not sure if the bug is in my code / bottom: or in the framework",
    ],
    aliases: [
      "futurama fry",
      "not sure if",
      "philip j fry",
      "不确定",
      "squinting fry",
      "fry meme",
      "futurama meme",
    ],
  },

  disastergirl: {
    family: "chaos-watching",
    tags: [
      "arsonist-smirk",
      "watching-chaos",
      "caused-it",
      "enjoying-disaster",
      "collateral-damage",
      "smug-inferno",
      "instigator",
    ],
    bestFor: [
      "When you (or someone) are the direct cause of a catastrophe and are watching it unfold with a knowing smirk — a deploy gone wrong, a data pipeline on fire, a refactor that broke everything. 你就是灾难的源头，却带着一丝微笑看着一切燃烧——发版爆炸、数据管道着火、重构搞崩一切。",
      "Observing the chaos you set in motion from a calculated distance. 从安全距离冷静（或得意地）观察你引发的事故。",
    ],
    examples: [
      "top: me deploying to production / bottom: the monitoring dashboard turning red",
      "top: saying 'it should be fine' / bottom: it was not fine",
    ],
    aliases: [
      "disaster girl",
      "girl fire",
      "smiling girl fire",
      "灾难女孩",
      "arson girl",
      "房子着火女孩",
    ],
  },

  gru: {
    family: "plan-backfire",
    tags: [
      "three-steps-forward",
      "last-step-fail",
      "plan-collapse",
      "overconfidence",
      "sequential-failure",
      "four-panel-plan",
      "step-four-betrayal",
    ],
    bestFor: [
      "Describing multi-step plans where the first steps go perfectly and the final step spectacularly collapses — a classic four-panel downfall narrative. 四步走计划，前三步顺风顺水，最后一步全线崩塌。",
      "Mocking the gap between ambitious planning and disastrous execution. 嘲讽雄心勃勃计划与实际灾难性执行之间的落差。",
    ],
    examples: [
      "panel 1: write tests / panel 2: refactor / panel 3: code review / panel 4: production broke anyway",
      "panel 1: learn Rust / panel 2: build a project / panel 3: get hired / panel 4: it's all JavaScript",
    ],
    aliases: [
      "grus plan",
      "despicable me gru",
      "gru plan",
      "gru meme",
      "gru steps",
      "小黄人计划",
      "gru四宫格",
    ],
  },

  badchoice: {
    family: "regret",
    tags: [
      "instant-regret",
      "poor-life-choice",
      "sweating-crisis",
      "immediate-consequence",
      "bad-decision",
      "anchorman-will-ferrell",
      "what-have-i-done",
    ],
    bestFor: [
      "Expressing immediate regret after a decision — the moment you realize a refactor was unnecessary, a meeting could have been an email, or staying up late was a terrible idea. 立刻后悔：重构其实没必要、会议本可一封邮件解决、熬夜是个坏主意。",
      "Depicting the sweaty aftermath of a choice you cannot undo. 无法撤销的决定导致满头冒汗的后悔时刻。",
    ],
    examples: [
      "top: I'll just do a quick refactor / bottom: it's 3am and nothing compiles",
      "top: agreed to join the architecture review / bottom: milk was a bad choice",
    ],
    aliases: [
      "milk was a bad choice",
      "anchorman bad choice",
      "bad choice",
      "ron burgundy",
      "后悔奶",
      "anchorman meme",
    ],
  },

  db: {
    family: "temptation",
    tags: [
      "three-way-choice",
      "wandering-eye",
      "disloyal-preference",
      "old-vs-new",
      "three-party-conflict",
      "distracted-boyfriend",
      "forbidden-option",
    ],
    bestFor: [
      "Depicting three-way conflicts where the subject is distracted by a tempting but irresponsible option while ignoring the faithful one — choosing a shiny new tech over the stable stack. 三向冲突：被一个诱人但不靠谱的选择分心，忽略了真正靠谱的那个——比如抛弃稳定技术栈去追新的。",
      "Showing misplaced priorities where the attention goes to the wrong thing. 目光被错误的东西吸引，忽略应有的关注对象。",
    ],
    examples: [
      "girlfriend: fixing existing bugs / boyfriend: rewriting in the latest framework / new girl: the latest framework",
      "girlfriend: writing documentation / boyfriend: me / new girl: adding more features",
    ],
    aliases: [
      "distracted boyfriend",
      "distracted boyfriend meme",
      "three panel boyfriend",
      "注意力分散男友",
      "花心男友",
      "db meme",
    ],
  },

  dbg: {
    family: "contrast",
    tags: [
      "expectations-betrayed",
      "overhyped-letdown",
      "promise-vs-reality",
      "optimistic-plan",
      "harsh-truth",
      "disappointed-black-guy",
      "reality-check",
    ],
    bestFor: [
      "Confronting the brutal gap between what you expected and what you actually got — a project plan vs. the technical debt aftermath, a conference talk title vs. its content. 期望与现实之间的残酷差距：项目计划 vs. 遗留技术债，会议标题 vs. 实际内容。",
      "Two-panel contrast where the first panel is the dream and the second is the disappointing truth. 两格对比：第一格是美梦，第二格是残酷真相。",
    ],
    examples: [
      "panel 1: clean architecture diagram / panel 2: the actual codebase",
      "panel 1: promised a microservices migration / panel 2: it's a monolith with extra steps",
    ],
    aliases: [
      "expectation vs reality",
      "disappointed black guy",
      "expectation reality",
      "期望与现实",
      "dbg meme",
      "disappointed guy",
    ],
  },

  gandalf: {
    family: "confusion",
    tags: [
      "memory-lapse",
      "forgotten-something",
      "senior-moment",
      "blank-mind",
      "what-was-i-saying",
      "context-loss",
      "confused-gandalf",
    ],
    bestFor: [
      "Forgetting what you were about to do or say — the universal developer experience of getting interrupted, looking back at the code, and having no idea what you were doing. 被打断后回头看代码，完全不记得刚才在干什么的经典开发者体验。",
      "A humorous depiction of mental blankness, especially when you should know the answer. 应该知道答案却大脑一片空白的幽默时刻。",
    ],
    examples: [
      "top: got a Slack message / bottom: I have no memory of this code I wrote yesterday",
      "top: the junior asks me to explain my architecture / bottom: I have no memory of this place",
    ],
    aliases: [
      "confused gandalf",
      "gandalf confused",
      "gandalf forgot",
      "甘道夫迷惑",
      "gandalf meme",
      "lotr gandalf",
    ],
  },

  astronaut: {
    family: "realization",
    tags: [
      "conspiracy-reveal",
      "always-has-been",
      "hidden-truth",
      "pointing-gun",
      "retroactive-revelation",
      "wait-its-all",
      "cosmic-realization",
    ],
    bestFor: [
      "Revealing that something has always been a certain way and the subject is just now realizing it — often with a conspiratorial or duplicitous tone. 揭示某件事一直都是某个样子，带有阴谋论或双重意味的'等等，一直都是...'。",
      "The 'wait, it's all X? always has been' meme format for retroactive revelations. 经典'等等，一直都是X？一直都是'的追溯式揭示格式。",
    ],
    examples: [
      "panel 1: wait, it's all tech debt? / panel 2: always has been",
      "panel 1: wait, the framework already does this? / panel 2: always has been",
    ],
    aliases: [
      "always has been",
      "wait its all",
      "its all ohio",
      "astronaut meme",
      "astronaut gun",
      "宇航员枪",
      "一直如此",
    ],
  },

  gb: {
    family: "escalation",
    tags: [
      "intelligence-spectrum",
      "idea-escalation",
      "overthinking",
      "simple-to-absurd",
      "brain-size-power",
      "galaxy-brain",
      "four-panel-brain",
    ],
    bestFor: [
      "Illustrating increasingly sophisticated (or absurd) takes on a single idea — from small-brain to galaxy-brain, the classic escalating hot-take format. 展示对同一主题从脑子小到脑子大到银河脑的逐渐离谱解读。",
      "Providing progressively more convoluted reasoning for a simple concept. 对简单概念进行越来越复杂（或荒谬）的推理递进。",
    ],
    examples: [
      "panel 1: using console.log / panel 2: using a debugger / panel 3: using printf / panel 4: staring at the code until the bug reveals itself",
      "panel 1: fixing the bug / panel 2: writing a test / panel 3: rewriting the module / panel 4: the bug is now a feature",
    ],
    aliases: [
      "galaxy brain",
      "expanding brain",
      "brain meme",
      "big brain",
      "宇宙脑",
      "galaxy brain meme",
      "brain expansion",
    ],
  },

  rollsafe: {
    family: "clever-hack",
    tags: [
      "loophole",
      "temple-tap",
      "rigging-system",
      "cheat-code",
      "cant-fail-if",
      "backwards-logic",
      "hollow-victory",
    ],
    bestFor: [
      "Pointing out a technically correct but absurdly clever shortcut that sidesteps a problem entirely — 'can't have bugs if you don't write code.' 提出一个技术上正确但荒谬至极的取巧方案来回避问题——'不写代码就不会有bug'。",
      "Highlighting loopholes and system-gaming logic with the signature finger-to-temple gesture. 用手指敲太阳穴的经典'我没那么傻'取巧逻辑。",
    ],
    examples: [
      "top: can't have production incidents / bottom: if you never deploy",
      "top: can't fail the code review / bottom: if you never open a PR",
    ],
    aliases: [
      "roll safe",
      "think about it",
      "temple tap",
      "clever guy",
      "can't fail",
      "聪明哥",
      "rollsafe meme",
      "黑人敲头",
    ],
  },

  awkward: {
    family: "social-pain",
    tags: [
      "uncomfortable-silence",
      "social-anxiety",
      "cringey-moment",
      "foot-in-mouth",
      "awkward-interaction",
      "socially-awkward-penguin",
      "wish-i-hadnt-said-that",
    ],
    bestFor: [
      "Describing socially uncomfortable situations where you said the wrong thing, misread the room, or wish you could disappear — sending a message to the wrong Slack channel, or replying-all accidentally. 说错话、会错意、发错频道、不小心回复全体的社死瞬间。",
      "Capturing that secondhand embarrassment feeling when someone else's social misstep makes you cringe. 旁观别人的社死现场让你也跟着尴尬的时刻。",
    ],
    examples: [
      "top: replied all to the company-wide announcement / bottom: with a complaint about the CEO",
      "top: walked past someone in the hallway / bottom: turned around at the same time, twice",
    ],
    aliases: [
      "socially awkward penguin",
      "awkward penguin",
      "socially awkward",
      "社死企鹅",
      "尴尬企鹅",
      "penguin meme",
    ],
  },

  cryingfloor: {
    family: "defeat",
    tags: [
      "collapse",
      "overwhelmed",
      "fetal-position",
      "given-up",
      "utter-failure",
      "crushing-defeat",
      "curled-up-crying",
    ],
    bestFor: [
      "When a situation has completely and irrevocably defeated you — the pipeline has been red for hours, the client changed every requirement, and you are curled on the floor sobbing. 被情况彻底击垮：管道红了几个小时、客户改了所有需求，你崩溃在地上哭泣。",
      "Depicting absolute surrender in the face of an insurmountable problem. 面对不可逾越的问题时的彻底投降。",
    ],
    examples: [
      "top: the bug only reproduces on the CEO's machine / bottom: on a Tuesday at 9am",
      "top: the client changed all requirements / bottom: one day before launch",
    ],
    aliases: [
      "crying on floor",
      "crying on the floor",
      "defeated on floor",
      "崩溃躺地",
      "hold the door",
      "crying floor",
    ],
  },

  headaches: {
    family: "frustration",
    tags: [
      "information-overload",
      "too-many-options",
      "mental-exhaustion",
      "analysis-paralysis",
      "cant-decide",
      "everything-hurts",
    ],
    bestFor: [
      "Too many problems at once — every tech stack, every framework, every requirement hitting you simultaneously. Not literal headaches; the meme shows classes of headaches as a metaphor for overwhelming choices. 太多问题同时涌现——每个技术栈、每个框架、每个需求同时砸过来。不是真的头痛，而是选择太多让人炸裂。",
    ],
    examples: [
      "top: picking a JS framework / bottom: all of them at once",
      "top: reading the error log / bottom: 4000 stack frames",
    ],
    aliases: ["types of headaches", "headaches meme", "头痛分类", "选择困难"],
  },

  yuno: {
    family: "frustration",
    tags: [
      "passive-aggressive",
      "demanding-explanation",
      "why-wont-you",
      "basic-request",
      "broken-expectation",
      "rage-comic",
      "y-u-no",
    ],
    bestFor: [
      "Demanding to know why something fundamental hasn't happened — why the test wasn't written, why the docs are outdated, why there are no logs in production. 质问为什么某件基础的事没发生：为什么没写测试、为什么文档是旧的、为什么生产没有日志。",
      "Expressing frustration at a broken social or technical contract in the classic rage-comic style. 用经典暴走漫画风格表达对某个被破坏的基本约定的愤怒。",
    ],
    examples: [
      "top: I can't reproduce the bug / bottom: Y U NO WRITE STEPS TO REPRODUCE",
      "top: the API always worked in dev / bottom: Y U NO TEST IN STAGING",
    ],
    aliases: [
      "y u no",
      "y u no guy",
      "why you no",
      "rage guy",
      "为什么你不",
      "暴走漫画",
      "y u no meme",
    ],
  },
};
