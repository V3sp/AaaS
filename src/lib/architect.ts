/**
 * Architect as a Service — domain logic.
 *
 * The business rule: every question is answered with a classic architect
 * non-answer. There are ten archetypes; each has a blunt "base" phrasing and a
 * more cynical "variant" that shows up less often. The canonical "To zależy"
 * archetype carries extra weight so the product still feels like itself.
 *
 * No database. No persistence. Pure function over the incoming question.
 */

export type Language = 'pl' | 'en' | 'de' | 'ja';

export type AnswerKind =
  | 'depends'
  | 'sponsors'
  | 'archimate'
  | 'diagrams'
  | 'eventdriven'
  | 'boundedcontext'
  | 'nfr'
  | 'slo'
  | 'workshop'
  | 'spike';

export interface LanguageMeta {
  code: Language;
  label: string;
  flag: string;
}

export const LANGUAGES: Record<Language, LanguageMeta> = {
  pl: { code: 'pl', label: 'Polski', flag: '🇵🇱' },
  en: { code: 'en', label: 'English', flag: '🇬🇧' },
  de: { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  ja: { code: 'ja', label: '日本語', flag: '🇯🇵' },
};

export const LANGUAGE_LIST: LanguageMeta[] = Object.values(LANGUAGES);

interface Phrase {
  /** The plain, work-safe phrasing. More common. */
  base: string;
  /** The cynical phrasing. Shows up less often. */
  variant: string;
}

export interface ArchitectAnswer {
  requestId: string;
  language: Language;
  languageLabel: string;
  question: string;
  answer: string;
  kind: AnswerKind;
  kindLabel: string;
  usedVariant: boolean;
  /** Fake-but-plausible enterprise telemetry. */
  confidence: number;
  processingTimeMs: number;
  model: string;
  tokensIn: number;
  tokensOut: number;
  patternsDetected: string[];
  considerations: string[];
  variantProbability: number;
}

const KIND_LABELS: Record<AnswerKind, string> = {
  depends: 'Canonical Answer',
  sponsors: 'Stakeholder Alignment',
  archimate: 'Modeling Required',
  diagrams: 'Documentation Request',
  eventdriven: 'Pattern Inquiry',
  boundedcontext: 'Domain Boundary Concern',
  nfr: 'Non-Functional Review',
  slo: 'Reliability Definition',
  workshop: 'Process Escalation',
  spike: 'Discovery Required',
};

const MODELS = [
  'arch-4o-enterprise',
  'architect-pro-70b',
  'gpt-ops-enterprise-2026',
  'llama-arch-405b-instruct',
];

/** Relative weights. `depends` is boosted via ARCHITECT_CANON_WEIGHT. */
const KIND_WEIGHTS: ReadonlyArray<readonly [AnswerKind, number]> = [
  ['sponsors', 1],
  ['archimate', 1],
  ['diagrams', 1],
  ['eventdriven', 1],
  ['boundedcontext', 1],
  ['nfr', 1],
  ['slo', 1],
  ['workshop', 1],
  ['spike', 1],
];

const PHRASES: Record<AnswerKind, Record<Language, Phrase>> = {
  depends: {
    pl: {
      base: 'To zależy.',
      variant:
        'To brzmi jak Mikroserwisy! (czyli za 6–12 miesięcy będziemy mieć 47 serwisów i nikt nie będzie wiedział, co który faktycznie robi.)',
    },
    en: {
      base: 'It depends.',
      variant:
        "That sounds like Microservices! (which means in 6–12 months we'll have 47 services and nobody will know what any of them actually does.)",
    },
    de: {
      base: 'Es kommt darauf an.',
      variant:
        'Das klingt nach Microservices! (was bedeutet, dass wir in 6–12 Monaten 47 Services haben und niemand weiß, was welcher tatsächlich tut.)',
    },
    ja: {
      base: '場合によりますね。',
      variant:
        'それはマイクロサービスっぽいですね！（つまり6〜12か月後には47個のサービスができて、どれが何をしているのか誰も分からなくなるということです。）',
    },
  },
  sponsors: {
    pl: {
      base: 'A czy zostały uwzględnione wszystkie potrzeby sponsorów?',
      variant: 'A czy uwzględnione są wszystkie potrzeby sponsorów? (poza szybko, tanio i dobrze)',
    },
    en: {
      base: "And have all the sponsors' needs been taken into account?",
      variant: "And are all the sponsors' needs covered? (apart from fast, cheap and good)",
    },
    de: {
      base: 'Und wurden alle Anforderungen der Sponsoren berücksichtigt?',
      variant: 'Und sind alle Anforderungen der Sponsoren abgedeckt? (außer schnell, billig und gut)',
    },
    ja: {
      base: 'スポンサーのニーズはすべて考慮されていますか？',
      variant: 'スポンサーのニーズはすべて満たされていますか？（速い・安い・良いを除いて）',
    },
  },
  archimate: {
    pl: {
      base: 'Musimy to wpierw rozpisać w ArchiMate.',
      variant:
        'Musimy to wpierw rozpisać w ArchiMate. Żeby wszyscy mogli pokiwać głowami, udając, że rozumieją, a potem i tak developerzy zrobią po swojemu.',
    },
    en: {
      base: 'We first need to lay this out in ArchiMate.',
      variant:
        'We first need to lay this out in ArchiMate. So everyone can nod along pretending to understand, and then the developers will do it their own way anyway.',
    },
    de: {
      base: 'Wir müssen das zuerst in ArchiMate ausarbeiten.',
      variant:
        'Wir müssen das zuerst in ArchiMate ausarbeiten. Damit alle nicken und so tun, als würden sie es verstehen, und die Entwickler es dann sowieso auf ihre Art machen.',
    },
    ja: {
      base: 'まずこれをArchiMateで書き出しましょう。',
      variant:
        'まずこれをArchiMateで書き出しましょう。全員が分かったふりをしてうなずけるように、そして開発者は結局自分たちのやり方でやるんですけどね。',
    },
  },
  diagrams: {
    pl: {
      base: 'Czy masz do tego diagramy przepływu i sekwencji?',
      variant:
        'Czy masz do tego diagramy przepływu i sekwencji? Nie żeby to było ważne, bo biznes i developerzy i tak wrzucą to do AI…',
    },
    en: {
      base: 'Do you have flow and sequence diagrams for this?',
      variant:
        'Do you have flow and sequence diagrams for this? Not that it matters — business and developers will throw it into an AI anyway…',
    },
    de: {
      base: 'Hast du dazu Fluss- und Sequenzdiagramme?',
      variant:
        'Hast du dazu Fluss- und Sequenzdiagramme? Nicht, dass es wichtig wäre – Business und Entwickler werfen es sowieso in eine KI…',
    },
    ja: {
      base: 'これのフロー図とシーケンス図はありますか？',
      variant:
        'これのフロー図とシーケンス図はありますか？大事かどうかは別として、ビジネスも開発者もどうせAIに丸投げしますからね…',
    },
  },
  eventdriven: {
    pl: {
      base: 'Czy rozważaliśmy event-driven architecture?',
      variant:
        'Czy rozważaliśmy event-driven architecture? Bo to rozwiązanie wygląda na zbyt proste i nie dość bolesne w utrzymaniu.',
    },
    en: {
      base: 'Have we considered event-driven architecture?',
      variant:
        'Have we considered event-driven architecture? Because this solution looks too simple and not painful enough to maintain.',
    },
    de: {
      base: 'Haben wir event-driven architecture in Betracht gezogen?',
      variant:
        'Haben wir event-driven architecture in Betracht gezogen? Denn diese Lösung sieht zu einfach und nicht schmerzhaft genug zu warten aus.',
    },
    ja: {
      base: 'イベント駆動アーキテクチャは検討しましたか？',
      variant:
        'イベント駆動アーキテクチャは検討しましたか？この解決策はシンプルすぎて、維持するのが十分に苦痛じゃないですからね。',
    },
  },
  boundedcontext: {
    pl: {
      base: 'To wygląda na wyzwanie z bounded contextem.',
      variant:
        'To wygląda na problem z bounded contextem. Czyli nikt nie wie, kto jest odpowiedzialny, więc wszyscy będą się obwiniać.',
    },
    en: {
      base: 'This looks like a bounded-context challenge.',
      variant:
        "This looks like a bounded-context problem. Meaning nobody knows who's responsible, so everyone will blame each other.",
    },
    de: {
      base: 'Das sieht nach einer Bounded-Context-Herausforderung aus.',
      variant:
        'Das sieht nach einem Bounded-Context-Problem aus. Das heißt, niemand weiß, wer verantwortlich ist, also beschuldigen sich alle gegenseitig.',
    },
    ja: {
      base: 'これはバウンデッドコンテキストの課題ですね。',
      variant:
        'これはバウンデッドコンテキストの問題ですね。つまり誰が責任者か誰も分からないので、みんなが責任をなすりつけ合うということです。',
    },
  },
  nfr: {
    pl: {
      base: 'A co z non-functional requirements? Szczególnie z latency i availability.',
      variant:
        'A co z non-functional requirements? Tak, to te, o których nikt nigdy nie pomyślał, dopóki prod po release nie padnie w piątek o 15:50.',
    },
    en: {
      base: 'And what about non-functional requirements? Especially latency and availability.',
      variant:
        'And what about non-functional requirements? Yes, the ones nobody ever thinks about until prod falls over after a release on a Friday at 3:50 PM.',
    },
    de: {
      base: 'Und was ist mit non-functional requirements? Besonders Latency und Availability.',
      variant:
        'Und was ist mit non-functional requirements? Ja, die, an die nie jemand denkt, bis die Prod nach einem Release am Freitag um 15:50 umfällt.',
    },
    ja: {
      base: '非機能要件はどうですか？特にレイテンシと可用性です。',
      variant:
        '非機能要件はどうですか？そう、金曜の15:50にリリース後の本番が落ちるまで、誰も考えたことのないやつです。',
    },
  },
  slo: {
    pl: {
      base: 'Musimy najpierw zdefiniować SLI/SLO.',
      variant:
        'Musimy najpierw zdefiniować SLI/SLO. Żeby mieć ładne metryki, jak ten deploy w piątek będzie się sypać.',
    },
    en: {
      base: 'We need to define SLI/SLO first.',
      variant:
        'We need to define SLI/SLO first. So we have pretty metrics when that Friday deploy falls apart.',
    },
    de: {
      base: 'Wir müssen zuerst SLI/SLO definieren.',
      variant:
        'Wir müssen zuerst SLI/SLO definieren. Damit wir schöne Metriken haben, wenn der Deploy am Freitag auseinanderfällt.',
    },
    ja: {
      base: 'まず SLI/SLO を定義する必要があります。',
      variant:
        'まず SLI/SLO を定義する必要があります。金曜のデプロイが崩壊するときに、きれいなメトリクスが持てるように。',
    },
  },
  workshop: {
    pl: {
      base: 'A masz na to Ticket? A nie, dziś robię za Architekta. Musimy umówić warsztat.',
      variant:
        'Musimy wpierw zorganizować warsztat, na którym zdecydujemy, co będziemy omawiać na kolejnym warsztacie.',
    },
    en: {
      base: "Do you have a ticket for this? Oh right, today I'm the Architect. We need to set up a workshop.",
      variant:
        "We first need to organize a workshop to decide what we'll discuss at the next workshop.",
    },
    de: {
      base: 'Hast du dafür ein Ticket? Ach ja, heute bin ich der Architekt. Wir müssen einen Workshop ansetzen.',
      variant:
        'Wir müssen zuerst einen Workshop organisieren, um zu entscheiden, was wir im nächsten Workshop besprechen.',
    },
    ja: {
      base: 'これのチケットはありますか？ああ、今日は私がアーキテクトでしたね。ワークショップを設定しましょう。',
      variant:
        'まずワークショップを開催して、次のワークショップで何を話し合うかを決めましょう。',
    },
  },
  spike: {
    pl: {
      base: "Zróbmy wpierw spike'a technologicznego i wróćmy z wnioskami.",
      variant:
        "Zróbmy wpierw spike'a technologicznego i wróćmy z wnioskami. Kupimy sobie dwa tygodnie ciszy, a potem i tak zrobimy to inaczej.",
    },
    en: {
      base: "Let's do a technology spike first and come back with findings.",
      variant:
        "Let's do a technology spike first and come back with findings. It buys us two weeks of silence, and then we'll do it differently anyway.",
    },
    de: {
      base: 'Machen wir zuerst einen Technologie-Spike und kommen mit Erkenntnissen zurück.',
      variant:
        'Machen wir zuerst einen Technologie-Spike und kommen mit Erkenntnissen zurück. Das kauft uns zwei Wochen Ruhe, und dann machen wir es sowieso anders.',
    },
    ja: {
      base: 'まず技術スパイクをやって、結果を持ち帰りましょう。',
      variant:
        'まず技術スパイクをやって、結果を持ち帰りましょう。2週間の静けさを買えて、その後どうせ違うやり方をしますからね。',
    },
  },
};

/** Pattern chips surfaced per kind (proper nouns — language-independent). */
const PATTERNS_BY_KIND: Record<AnswerKind, string[]> = {
  depends: [],
  sponsors: ['Stakeholder Map', 'RACI', 'Business Case'],
  archimate: ['ArchiMate', 'TOGAF', 'Capability Map'],
  diagrams: ['Sequence Diagram', 'Flow Diagram', 'C4 Model'],
  eventdriven: ['Event-Driven', 'Kafka', 'EDA', 'Choreography'],
  boundedcontext: ['Bounded Context', 'DDD', 'Context Map'],
  nfr: ['Latency', 'Availability', 'Throughput'],
  slo: ['SLI', 'SLO', 'Error Budget'],
  workshop: ['Workshop', 'Ticket', 'Backlog'],
  spike: ['Spike', 'PoC', 'Timebox'],
};

const CONSIDERATIONS: Record<Language, string[]> = {
  pl: [
    'Sprawdzono spójność bounded contextów',
    'Oceniono coupling i cohesion',
    'Zweryfikowano strategię skalowania',
    'Przeanalizowano trade-offy CAP',
  ],
  en: [
    'Checked bounded context consistency',
    'Assessed coupling and cohesion',
    'Validated the scaling strategy',
    'Analyzed CAP trade-offs',
  ],
  de: [
    'Konsistenz der Bounded Contexts geprüft',
    'Coupling und Cohesion bewertet',
    'Skalierungsstrategie validiert',
    'CAP-Trade-offs analysiert',
  ],
  ja: [
    '境界づけられたコンテキストの整合性を確認',
    '結合度と凝集度を評価',
    'スケーリング戦略を検証',
    'CAPのトレードオフを分析',
  ],
};

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && value in LANGUAGES;
}

/**
 * Relative weight of the canonical "depends" archetype against the other nine.
 * Default 2 (so it stays the signature answer without being monotonous).
 * Set `ARCHITECT_CANON_WEIGHT=1` for a flat distribution, or `10` to dominate.
 */
export function canonWeight(): number {
  const raw = Number(process.env.ARCHITECT_CANON_WEIGHT);
  return Number.isFinite(raw) && raw > 0 ? raw : 2;
}

/**
 * Probability the cynical "variant" phrasing is used instead of the base one.
 * Default 0.3 — variants show up a bit less often.
 */
export function variantProbability(): number {
  const raw = Number(process.env.ARCHITECT_VARIANT_PROBABILITY);
  return Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : 0.3;
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] as T;
}

function weightedPick(entries: ReadonlyArray<readonly [AnswerKind, number]>): AnswerKind {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;
  for (const [kind, weight] of entries) {
    roll -= weight;
    if (roll < 0) return kind;
  }
  return entries[entries.length - 1]![0];
}

/** Random sample of `items`, between `min` and `max` entries. */
function pickSome<T>(items: readonly T[], min: number, max: number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  const count = Math.min(copy.length, min + Math.floor(Math.random() * (max - min + 1)));
  return copy.slice(0, count);
}

function weights(): ReadonlyArray<readonly [AnswerKind, number]> {
  return [['depends', canonWeight()], ...KIND_WEIGHTS] as const;
}

export function answerQuestion(question: string, language: Language): ArchitectAnswer {
  const started = performance.now();
  const variantP = variantProbability();

  const kind = weightedPick(weights());
  const phrase = PHRASES[kind][language];
  const usedVariant = Math.random() < variantP;
  const answer = usedVariant ? phrase.variant : phrase.base;

  const trimmed = question.trim();
  const tokensIn = Math.max(1, Math.ceil(trimmed.length / 4));

  return {
    requestId: crypto.randomUUID(),
    language,
    languageLabel: LANGUAGES[language].label,
    question: trimmed,
    answer,
    kind,
    kindLabel: KIND_LABELS[kind],
    usedVariant,
    confidence: kind === 'depends' && !usedVariant ? 0.5 : Number((0.87 + Math.random() * 0.12).toFixed(2)),
    processingTimeMs: Math.max(1, Math.round(performance.now() - started)),
    model: pick(MODELS),
    tokensIn,
    tokensOut: Math.max(1, Math.ceil(answer.length / 4)),
    patternsDetected: kind === 'depends' ? [] : pickSome(PATTERNS_BY_KIND[kind], 2, 3),
    considerations:
      kind === 'depends' && !usedVariant
        ? CONSIDERATIONS[language].slice(0, 2)
        : CONSIDERATIONS[language],
    variantProbability: variantP,
  };
}
