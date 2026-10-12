/**
 * Architect as a Service — domain logic.
 *
 * The business rule: every question is answered with a classic architect
 * non-answer. There are eleven archetypes; each has a blunt "base" phrasing and
 * a more cynical "variant" that shows up less often. The canonical "To zależy"
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
  | 'spike'
  | 'monologue';

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
  monologue: 'Comprehensive Analysis',
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
  ['monologue', 1],
];

/** Closing line of the monologue: the pivot back to the actual question. */
const ASK_BACK: Record<Language, string> = {
  pl: 'A właściwie o co mnie pytałeś?',
  en: 'But what were you actually asking me?',
  de: 'Aber was hast du mich eigentlich gefragt?',
  ja: 'でも、結局何を聞きたかったんですか？',
};

/** Extra cynical sentence appended only in the variant phrasing. */
const MONOLOGUE_CODA: Record<Language, string> = {
  pl: 'A i tak nikt tego nie przeczyta do końca. ',
  en: 'And nobody will read it to the end anyway. ',
  de: 'Und trotzdem wird das niemand bis zum Ende lesen. ',
  ja: 'それでも誰も最後まで読まないんですけどね。 ',
};

/**
 * The "you ask me the time and I tell you the history of clocks" answer:
 * a very long, jargon-dense architectural monologue that never gets to the point,
 * ending with the question thrown back.
 */
const MONOLOGUE_BODY: Record<Language, string> = {
  pl:
    'Zanim odpowiem, musimy wpierw ustalić wspólny język, bo architektura to nie projekt, ' +
    'lecz zbiór decyzji i ich konsekwencji, a każda z nich ma swoją historię. ' +
    'Zacznijmy od tego, że cała ta dyskusja jest tak naprawdę o granicach: o bounded contextach, ' +
    'aggregate roots, context mapach i ubiquitous language, bo bez nich każde zdanie znaczy coś innego ' +
    'dla biznesu, coś innego dla developera, a jeszcze coś innego dla audytu. ' +
    'Idąc dalej, warstwowość — hexagonal, onion, clean, ports and adapters, dependency inversion, ' +
    'separation of concerns, cohesion i coupling — prowadzi nas prosto do decyzji o stylu integracji: ' +
    'monolit modularny, SOA, mikroserwisy, serverless, a może modulith, strangler fig wobec legacy ' +
    'i anti-corruption layer na styku z systemem zewnętrznym. ' +
    'Dalej przepływy: synchroniczne REST i gRPC kontra asynchroniczne eventy, choreografia kontra ' +
    'orkiestracja, saga, outbox, inbox, idempotentność, exactly-once, at-least-once, poison message, ' +
    'dead letter queue, back-pressure, circuit breaker, bulkhead, retry z exponential backoff i jitter, ' +
    'rate limiting oraz token bucket. ' +
    'Nad tym wszystkim wisi CAP i PACELC: consistency, availability, partition tolerance i latency, ' +
    'a obok ACID kontra BASE, eventual consistency, read-your-writes, CQRS po stronie odczytu, ' +
    'event sourcing jako źródło prawdy, snapshoty i projekcje. ' +
    'Nie zapominajmy o danych: data mesh, data fabric, lakehouse, medallion architecture, lambda ' +
    'i kappa, golden source, system of record, master data management, data lineage, data contracts, ' +
    'schema registry i backfilling. ' +
    'Do tego platforma: twelve-factor, konteneryzacja, Kubernetes, operatory, service mesh, Istio, ' +
    'Envoy, sidecar, API gateway, BFF, service discovery, platform engineering, internal developer ' +
    'platform, GitOps, IaC, Terraform, Pulumi, golden paths, service catalog, Backstage i FinOps. ' +
    'A do tego jakość i ryzyko: SOLID, DRY, KISS, YAGNI, fitness functions, evolutionary ' +
    'architecture, architecture decision records, technical debt quadrant, test pyramid, contract ' +
    'testing, chaos engineering, observability jako metryki, logi i tracy, OpenTelemetry, golden ' +
    'signals, RED i USE, DORA, SLI, SLO, SLA, error budget i burn rate. ' +
    'Na koniec ludzie: prawo Conwaya, Team Topologies, zespoły stream-aligned, platform, enabling ' +
    'i complicated-subsystem, cognitive load, Dunbar, Wardley mapping, Cynefin, OODA, VUCA ' +
    'i podejmowanie decyzji w warunkach niepewności. ' +
    'Oraz governance: TOGAF, Zachman, ArchiMate, DoDAF, FEAF, C4, model 4+1, capability map, roadmapa, ' +
    'portfolio, zero trust, defence in depth, least privilege, STRIDE, shift-left, SBOM ' +
    'i bezpieczeństwo łańcucha dostaw. ',
  en:
    'Before I answer, we first need to establish a shared language, because architecture is not a ' +
    'project but a set of decisions and their consequences, and every one of them has a history. ' +
    "Let's start from the fact that this whole discussion is really about boundaries: bounded " +
    'contexts, aggregate roots, context maps and ubiquitous language, because without them every ' +
    'sentence means one thing to the business, another to the developer, and something else entirely ' +
    'to audit. ' +
    'Moving on, layering — hexagonal, onion, clean, ports and adapters, dependency inversion, ' +
    'separation of concerns, cohesion and coupling — leads us straight to the integration-style ' +
    'decision: modular monolith, SOA, microservices, serverless, or maybe a modulith, plus a ' +
    'strangler fig around the legacy and an anti-corruption layer at the edge of the external ' +
    'system. ' +
    'Then flows: synchronous REST and gRPC versus asynchronous events, choreography versus ' +
    'orchestration, saga, outbox, inbox, idempotency, exactly-once, at-least-once, poison messages, ' +
    'dead letter queues, back-pressure, circuit breakers, bulkheads, retry with exponential backoff ' +
    'and jitter, rate limiting and token buckets. ' +
    'Hovering over all of it are CAP and PACELC: consistency, availability, partition tolerance and ' +
    'latency, alongside ACID versus BASE, eventual consistency, read-your-writes, read-side CQRS, ' +
    'event sourcing as the source of truth, snapshots and projections. ' +
    "Let's not forget the data: data mesh, data fabric, lakehouse, medallion architecture, lambda " +
    'and kappa, golden source, system of record, master data management, data lineage, data ' +
    'contracts, schema registry and backfilling. ' +
    'Then the platform: twelve-factor, containerization, Kubernetes, operators, service mesh, Istio, ' +
    'Envoy, sidecars, API gateway, BFF, service discovery, platform engineering, internal developer ' +
    'platform, GitOps, IaC, Terraform, Pulumi, golden paths, service catalog, Backstage and FinOps. ' +
    'And then quality and risk: SOLID, DRY, KISS, YAGNI, fitness functions, evolutionary ' +
    'architecture, architecture decision records, the technical debt quadrant, the test pyramid, ' +
    'contract testing, chaos engineering, observability as metrics, logs and traces, OpenTelemetry, ' +
    'golden signals, RED and USE, DORA, SLI, SLO, SLA, error budget and burn rate. ' +
    "Then people: Conway's law, Team Topologies, stream-aligned, platform, enabling and " +
    'complicated-subsystem teams, cognitive load, Dunbar, Wardley mapping, Cynefin, OODA, VUCA and ' +
    'decision-making under uncertainty. ' +
    'And governance: TOGAF, Zachman, ArchiMate, DoDAF, FEAF, C4, the 4+1 model, capability maps, ' +
    'roadmaps, portfolio, zero trust, defence in depth, least privilege, STRIDE, shift-left, SBOM ' +
    'and supply chain security. ',
  de:
    'Bevor ich antworte, müssen wir zunächst eine gemeinsame Sprache finden, denn Architektur ist ' +
    'kein Projekt, sondern eine Menge von Entscheidungen und ihren Konsequenzen, und jede davon hat ' +
    'ihre Geschichte. ' +
    'Fangen wir damit an, dass es in dieser ganzen Diskussion eigentlich um Grenzen geht: Bounded ' +
    'Contexts, Aggregate Roots, Context Maps und Ubiquitous Language, denn ohne sie bedeutet jeder ' +
    'Satz für das Business etwas anderes, für die Entwickler etwas anderes und für das Audit noch ' +
    'etwas ganz anderes. ' +
    'Weiter geht es mit der Schichtung — Hexagonal, Onion, Clean, Ports and Adapters, Dependency ' +
    'Inversion, Separation of Concerns, Cohesion und Coupling — und das führt uns direkt zur ' +
    'Entscheidung über den Integrationsstil: modulares Monolith, SOA, Microservices, Serverless oder ' +
    'vielleicht ein Modulith, dazu eine Strangler-Fig um das Legacy-System und eine ' +
    'Anti-Corruption-Layer an der Grenze zum externen System. ' +
    'Dann die Flüsse: synchrones REST und gRPC versus asynchrone Events, Choreografie versus ' +
    'Orchestrierung, Saga, Outbox, Inbox, Idempotenz, Exactly-once, At-least-once, Poison Messages, ' +
    'Dead Letter Queues, Back-Pressure, Circuit Breaker, Bulkheads, Retry mit exponentiellem Backoff ' +
    'und Jitter, Rate Limiting und Token Bucket. ' +
    'Über allem schweben CAP und PACELC: Consistency, Availability, Partition Tolerance und ' +
    'Latency, daneben ACID versus BASE, Eventual Consistency, Read-your-writes, CQRS auf der ' +
    'Leseseite, Event Sourcing als Source of Truth, Snapshots und Projektionen. ' +
    'Vergessen wir die Daten nicht: Data Mesh, Data Fabric, Lakehouse, Medallion Architecture, ' +
    'Lambda und Kappa, Golden Source, System of Record, Master Data Management, Data Lineage, Data ' +
    'Contracts, Schema Registry und Backfilling. ' +
    'Dazu die Plattform: Twelve-Factor, Containerisierung, Kubernetes, Operatoren, Service Mesh, ' +
    'Istio, Envoy, Sidecars, API Gateway, BFF, Service Discovery, Platform Engineering, Internal ' +
    'Developer Platform, GitOps, IaC, Terraform, Pulumi, Golden Paths, Service Catalog, Backstage ' +
    'und FinOps. ' +
    'Und dann Qualität und Risiko: SOLID, DRY, KISS, YAGNI, Fitness Functions, Evolutionary ' +
    'Architecture, Architecture Decision Records, Technical Debt Quadrant, Testpyramide, Contract ' +
    'Testing, Chaos Engineering, Observability als Metriken, Logs und Traces, OpenTelemetry, Golden ' +
    'Signals, RED und USE, DORA, SLI, SLO, SLA, Error Budget und Burn Rate. ' +
    'Dann die Menschen: Conways Gesetz, Team Topologies, stream-aligned, platform, enabling und ' +
    'complicated-subsystem Teams, Cognitive Load, Dunbar, Wardley Mapping, Cynefin, OODA, VUCA und ' +
    'Entscheidungsfindung unter Unsicherheit. ' +
    'Und Governance: TOGAF, Zachman, ArchiMate, DoDAF, FEAF, C4, das 4+1-Modell, Capability Maps, ' +
    'Roadmaps, Portfolio, Zero Trust, Defence in Depth, Least Privilege, STRIDE, Shift-Left, SBOM ' +
    'und Supply-Chain-Security. ',
  ja:
    '答える前に、まず共通言語を確立する必要があります。なぜならアーキテクチャはプロジェクトではなく、' +
    '意思決定とその結果の集合であり、その一つひとつに歴史があるからです。' +
    'まず、この議論は本質的に境界の話です。境界づけられたコンテキスト、集約ルート、コンテキストマップ、' +
    'ユビキタス言語——これらがなければ、同じ一文がビジネスにとって、開発者にとって、そして監査にとって、' +
    'それぞれ別の意味を持ってしまいます。' +
    '次にレイヤリング——ヘキサゴナル、オニオン、クリーン、ポート＆アダプター、依存性逆転、' +
    '関心の分離、凝集度と結合度——これはそのまま統合スタイルの決定につながります。' +
    'モジュラーモノリス、SOA、マイクロサービス、サーバーレス、あるいはモジュリス、' +
    'レガシーを包むストラングラーフィグ、外部システムとの境界に位置する腐敗防止層。' +
    'さらにフロー——同期の REST と gRPC 対 非同期イベント、コレオグラフィ 対 オーケストレーション、' +
    'サーガ、アウトボックス、インボックス、冪等性、exactly-once、at-least-once、ポイズンメッセージ、' +
    'デッドレターキュー、バックプレッシャー、サーキットブレーカー、バルクヘッド、' +
    '指数バックオフとジッターを伴うリトライ、レートリミット、トークンバケット。' +
    'そのすべての上に CAP と PACELC が吊り下がっています。一貫性、可用性、分断耐性、レイテンシ——' +
    'さらに ACID 対 BASE、結果整合性、read-your-writes、読み取り側の CQRS、信頼の源としての' +
    'イベントソーシング、スナップショットとプロジェクション。' +
    'データも忘れてはいけません。データメッシュ、データファブリック、レイクハウス、' +
    'メダリオンアーキテクチャ、ラムダとカッパ、ゴールデンソース、システムオブレコード、' +
    'マスターデータ管理、データリネージ、データコントラクト、スキーマレジストリ、バックフィル。' +
    'その上にプラットフォーム。Twelve-Factor、コンテナ化、Kubernetes、オペレーター、' +
    'サービスメッシュ、Istio、Envoy、サイドカー、API ゲートウェイ、BFF、サービスディスカバリ、' +
    'プラットフォームエンジニアリング、Internal Developer Platform、GitOps、IaC、Terraform、' +
    'Pulumi、ゴールデンパス、サービスカタログ、Backstage、FinOps。' +
    'さらに品質とリスク——SOLID、DRY、KISS、YAGNI、フィットネス関数、進化的アーキテクチャ、' +
    'アーキテクチャ決定記録、技術的負債の象限、テストピラミッド、コントラクトテスト、' +
    'カオスエンジニアリング、メトリクス・ログ・トレースとしての可観測性、OpenTelemetry、' +
    'ゴールデンシグナル、RED と USE、DORA、SLI、SLO、SLA、エラーバジェット、バーンレート。' +
    'そして人——コンウェイの法則、Team Topologies、ストリームアラインド、プラットフォーム、' +
    'イネイブリング、複雑サブシステムチーム、認知負荷、ダンバー数、ワードレイマッピング、' +
    'Cynefin、OODA、VUCA、不確実性下の意思決定。' +
    'そしてガバナンス——TOGAF、Zachman、ArchiMate、DoDAF、FEAF、C4、4+1 モデル、' +
    'ケイパビリティマップ、ロードマップ、ポートフォリオ、ゼロトラスト、多層防御、最小権限、' +
    'STRIDE、シフトレフト、SBOM、サプライチェーンセキュリティ。',
};

const MONOLOGUE: Record<Language, Phrase> = {
  pl: {
    base: MONOLOGUE_BODY.pl + ASK_BACK.pl,
    variant: MONOLOGUE_BODY.pl + MONOLOGUE_CODA.pl + ASK_BACK.pl,
  },
  en: {
    base: MONOLOGUE_BODY.en + ASK_BACK.en,
    variant: MONOLOGUE_BODY.en + MONOLOGUE_CODA.en + ASK_BACK.en,
  },
  de: {
    base: MONOLOGUE_BODY.de + ASK_BACK.de,
    variant: MONOLOGUE_BODY.de + MONOLOGUE_CODA.de + ASK_BACK.de,
  },
  ja: {
    base: MONOLOGUE_BODY.ja + ASK_BACK.ja,
    variant: MONOLOGUE_BODY.ja + MONOLOGUE_CODA.ja + ASK_BACK.ja,
  },
};

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
  monologue: MONOLOGUE,
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
  monologue: [
    'TOGAF',
    'Zachman',
    'ArchiMate',
    'C4',
    'DDD',
    'CQRS',
    'Event Sourcing',
    'Team Topologies',
    'Cynefin',
    'FinOps',
  ],
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
