"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  boardCopy,
  type BoardCard,
  type BoardEdition,
  type BoardLength,
  type CommandKind,
  type SquareKind,
} from "@/data/boardCopy";
import type { Locale } from "@/data/tools";

interface Square {
  n: number;
  kind: SquareKind;
  to?: number;
}

interface Pending {
  kind: "command" | "ladder" | "snake" | "back" | "card";
  square: number;
  text: string;
  commandKind?: CommandKind;
  to?: number;
  card?: BoardCard;
}

const LADDERS_50: Record<number, number> = { 4: 14, 9: 31, 20: 38, 28: 42, 40: 49 };
const SNAKES_50: Record<number, number> = { 17: 7, 25: 11, 35: 19, 47: 29 };
const LADDERS_100: Record<number, number> = {
  6: 26,
  17: 45,
  32: 68,
  51: 84,
  63: 95,
};
const SNAKES_100: Record<number, number> = {
  28: 12,
  44: 23,
  58: 36,
  72: 54,
  88: 70,
};

const DIE_BASE: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  2: { x: 90, y: 0 },
  3: { x: 0, y: -90 },
  4: { x: 0, y: 90 },
  5: { x: -90, y: 0 },
  6: { x: 0, y: 180 },
};

const KIND_STYLE: Record<SquareKind, string> = {
  start: "bg-[#6ee7a8]/20 text-[#6ee7a8]",
  task: "bg-category-bg text-muted-strong",
  edge: "bg-[#f5a3c8]/20 text-[#f5a3c8]",
  rest: "bg-[#86e3bb]/15 text-[#86e3bb]",
  tough: "bg-[#ff4d6d]/20 text-[#ff8399]",
  rule: "bg-[#b8a4ff]/20 text-[#b8a4ff]",
  snake: "bg-[#ff4d6d]/15 text-[#ff8399]",
  ladder: "bg-[#e6b061]/20 text-[#e6b061]",
  temptation: "bg-[#f5a3c8]/15 text-[#f5a3c8]",
  card: "bg-[#b8a4ff]/15 text-[#b8a4ff]",
  back: "bg-[#ff4d6d]/25 text-[#ff8399]",
  finish: "bg-accent text-white",
};

const KIND_GLYPH: Record<SquareKind, string> = {
  start: "▶",
  task: "•",
  edge: "E",
  rest: "R",
  tough: "T",
  rule: "R",
  snake: "↓",
  ladder: "↗",
  temptation: "!",
  card: "?",
  back: "⟲",
  finish: "★",
};

function buildBoard(length: BoardLength): Square[] {
  const squares: Square[] = Array.from({ length }, (_, index) => ({
    n: index + 1,
    kind: "task" as SquareKind,
  }));
  squares[0].kind = "start";
  squares[length - 1].kind = "finish";

  const cards =
    length === 50 ? [6, 13, 24, 33, 44] : [10, 25, 40, 55, 70, 85];
  const temptations = length === 50 ? [8, 22, 37] : [14, 38, 62, 86];
  const rests = length === 50 ? [3, 12, 27, 39] : [8, 30, 52, 74];
  const rules = length === 50 ? [15, 30, 43] : [20, 46, 78];
  const toughs = length === 50 ? [10, 21, 32, 41] : [18, 42, 66, 90];
  const edges =
    length === 50 ? [5, 11, 18, 26, 34, 45] : [12, 34, 56, 80, 92];

  for (const n of cards) squares[n - 1].kind = "card";
  for (const n of temptations) squares[n - 1].kind = "temptation";
  for (const n of rests) squares[n - 1].kind = "rest";
  for (const n of rules) squares[n - 1].kind = "rule";
  for (const n of toughs) squares[n - 1].kind = "tough";
  for (const n of edges) squares[n - 1].kind = "edge";

  const ladders = length === 50 ? LADDERS_50 : LADDERS_100;
  const snakes = length === 50 ? SNAKES_50 : SNAKES_100;

  for (const [from, to] of Object.entries(ladders)) {
    const square = squares[Number(from) - 1];
    square.kind = "ladder";
    square.to = to;
  }
  for (const [from, to] of Object.entries(snakes)) {
    const square = squares[Number(from) - 1];
    square.kind = "snake";
    square.to = to;
  }
  const backFrom = length === 50 ? 46 : 97;
  squares[backFrom - 1] = { n: backFrom, kind: "back", to: 1 };

  return squares;
}

function randomOf<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function withEdition(text: string, edition: BoardEdition, locale: Locale): string {
  if (edition === "men" || edition === "gay") return text;
  if (locale === "zh") {
    return text
      .replaceAll("可以射", "可以高潮")
      .replaceAll("不许射", "不许高潮")
      .replaceAll("射得不上不下", "毁灭性高潮")
      .replaceAll("用力握紧动", "加快揉抚")
      .replaceAll("每两秒动一下", "每两秒轻抚一下");
  }
  return text
    .replace(/\bstrokes\b/gi, "touches")
    .replace(/\bstroke\b/gi, "touch");
}

export function BoardGame({ locale }: { locale: Locale }) {
  const copy = boardCopy[locale];
  const [hydrated, setHydrated] = useState(false);
  const [edition, setEdition] = useState<BoardEdition>("men");
  const [length, setLength] = useState<BoardLength>(50);
  const [position, setPosition] = useState(1);
  const [fails, setFails] = useState(0);
  const [bounces, setBounces] = useState(0);
  const [rule, setRule] = useState<{ text: string; rollsLeft: number } | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [finished, setFinished] = useState(false);
  const [verdictDie, setVerdictDie] = useState<number | null>(null);
  const [dieTransform, setDieTransform] = useState("");
  const [rollIndex, setRollIndex] = useState(0);
  const [rolling, setRolling] = useState(false);
  const [moving, setMoving] = useState(false);

  const positionRef = useRef(1);
  const failsRef = useRef(0);
  const timersRef = useRef<number[]>([]);

  const board = useMemo(() => buildBoard(length), [length]);

  function clearTimers() {
    for (const id of timersRef.current) {
      window.clearTimeout(id);
    }
    timersRef.current = [];
  }

  function schedule(fn: () => void, ms: number) {
    const id = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((item) => item !== id);
      fn();
    }, ms);
    timersRef.current.push(id);
  }

  useEffect(() => {
    return () => clearTimers();
  }, []);

  useEffect(() => {
    const raw = window.localStorage.getItem("board:settings");
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { edition?: string; length?: number };
        if (
          parsed.edition === "men" ||
          parsed.edition === "women" ||
          parsed.edition === "gay" ||
          parsed.edition === "lesbian"
        ) {
          setEdition(parsed.edition);
        }
        if (parsed.length === 100) setLength(100);
      } catch {
        // Ignore malformed settings.
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(
      "board:settings",
      JSON.stringify({ edition, length }),
    );
  }, [edition, length, hydrated]);

  function resetBoard() {
    clearTimers();
    setPosition(1);
    positionRef.current = 1;
    setFails(0);
    failsRef.current = 0;
    setBounces(0);
    setRule(null);
    setPending(null);
    setFinished(false);
    setVerdictDie(null);
    setRolling(false);
    setMoving(false);
    setDieTransform("");
    setRollIndex(0);
  }

  function applySettings(nextEdition: BoardEdition, nextLength: BoardLength) {
    setEdition(nextEdition);
    setLength(nextLength);
    resetBoard();
  }

  function animateMove(target: number, done: () => void) {
    const clamped = Math.min(length, Math.max(1, target));
    const from = positionRef.current;
    if (from === clamped) {
      done();
      return;
    }
    setMoving(true);
    let current = from;
    const direction = clamped > from ? 1 : -1;
    function step() {
      current += direction;
      positionRef.current = current;
      setPosition(current);
      if (current === clamped) {
        setMoving(false);
        schedule(done, 260);
        return;
      }
      schedule(step, 120);
    }
    step();
  }

  function addFails(amount: number) {
    failsRef.current += amount;
    setFails(failsRef.current);
  }

  function finishGame() {
    setFinished(true);
    setPending(null);
    setRule(null);
  }

  function resolveLanding(n: number) {
    if (n >= length) {
      finishGame();
      return;
    }
    const square = board[n - 1];
    if (square.kind === "start" || square.kind === "finish") return;

    if (square.kind === "ladder") {
      setPending({
        kind: "ladder",
        square: n,
        to: square.to,
        text: withEdition(randomOf(copy.commands.ladder), edition, locale),
      });
      return;
    }
    if (square.kind === "snake") {
      setPending({
        kind: "snake",
        square: n,
        to: square.to,
        text: withEdition(randomOf(copy.commands.snake), edition, locale),
      });
      return;
    }
    if (square.kind === "back") {
      setPending({
        kind: "back",
        square: n,
        to: 1,
        text: withEdition(randomOf(copy.commands.back), edition, locale),
      });
      return;
    }
    if (square.kind === "card") {
      setPending({
        kind: "card",
        square: n,
        text: "",
        card: randomOf(copy.cards),
      });
      return;
    }

    const commandKind = square.kind as CommandKind;
    setPending({
      kind: "command",
      square: n,
      commandKind,
      text: withEdition(randomOf(copy.commands[commandKind]), edition, locale),
    });
  }

  function rollDie() {
    if (rolling || moving || pending || finished) return;

    if (rule) {
      const left = rule.rollsLeft - 1;
      setRule(left > 0 ? { ...rule, rollsLeft: left } : null);
    }

    const value = 1 + Math.floor(Math.random() * 6);
    const base = DIE_BASE[value];
    const index = rollIndex + 1;
    setRollIndex(index);
    setDieTransform(
      `rotateX(${1080 * index + base.x}deg) rotateY(${1440 * index + base.y}deg)`,
    );
    setRolling(true);

    schedule(() => {
      setRolling(false);
      let target = positionRef.current + value;
      let nextBounces = bounces;
      if (target > length) {
        nextBounces = bounces + 1;
        setBounces(nextBounces);
        target = nextBounces >= 3 ? length : length - (target - length);
        if (target < 1) target = 1;
      }
      animateMove(target, () => {
        if (target >= length) finishGame();
        else resolveLanding(target);
      });
    }, 1150);
  }

  function completeCommand() {
    if (!pending || pending.kind !== "command") return;
    const kind = pending.commandKind;
    if (kind === "rule") {
      setRule({ text: pending.text, rollsLeft: 3 });
    }
    if (kind === "temptation") {
      const text = pending.text;
      setPending(null);
      animateMove(positionRef.current + 2, () => {
        if (positionRef.current >= length) finishGame();
        void text;
      });
      return;
    }
    setPending(null);
  }

  function failCommand() {
    if (!pending || pending.kind !== "command") return;
    const slide = pending.commandKind === "tough" ? 3 : 2;
    setPending(null);
    addFails(1);
    animateMove(positionRef.current - slide, () => undefined);
  }

  function passLadder() {
    if (!pending || pending.kind !== "ladder" || !pending.to) return;
    const target = pending.to;
    setPending(null);
    animateMove(target, () => undefined);
  }

  function failLadder() {
    if (!pending || pending.kind !== "ladder") return;
    setPending(null);
    addFails(1);
  }

  function continueSnake() {
    if (!pending || pending.kind !== "snake" || !pending.to) return;
    const target = pending.to;
    setPending(null);
    animateMove(target, () => undefined);
  }

  function resolveBack(held: boolean) {
    if (!pending || pending.kind !== "back") return;
    setPending(null);
    if (held) return;
    addFails(1);
    animateMove(1, () => undefined);
  }

  function applyCard() {
    if (!pending || pending.kind !== "card" || !pending.card) return;
    const card = pending.card;
    setPending(null);
    if (card.fail) addFails(card.fail);
    if (card.move) {
      animateMove(positionRef.current + card.move, () => {
        if (positionRef.current >= length) finishGame();
      });
    }
  }

  const verdict =
    fails === 0
      ? copy.verdict.mayCum
      : fails <= (length === 50 ? 3 : 6)
        ? copy.verdict.dieDecides
        : fails <= (length === 50 ? 6 : 12)
          ? copy.verdict.ruined
          : copy.verdict.denied;

  const orderedSquares = useMemo(() => {
    const cols = 10;
    const rows = length / cols;
    const ordered: Square[] = [];
    for (let row = rows - 1; row >= 0; row -= 1) {
      const base = row * cols + 1;
      const nums = Array.from({ length: cols }, (_, index) => base + index);
      if (row % 2 === 1) nums.reverse();
      for (const n of nums) ordered.push(board[n - 1]);
    }
    return ordered;
  }, [board, length]);

  const commandFailureLabel =
    pending?.kind === "command" ? copy.actions.failed : copy.actions.couldnt;

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      <div className="space-y-3">
        <div className="card rounded-2xl p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted">
            {copy.settings.edition}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {(["men", "women", "gay", "lesbian"] as const).map((option) => (
              <button
                key={option}
                type="button"
                disabled={rolling || moving}
                onClick={() => applySettings(option, length)}
                aria-pressed={edition === option}
                className={`cursor-pointer rounded-lg px-2 py-1.5 text-[11px] font-bold transition-colors disabled:cursor-default ${
                  edition === option
                    ? "bg-accent text-white"
                    : "border border-card-border text-muted-strong"
                }`}
              >
                {copy.settings[option]}
              </button>
            ))}
          </div>

          <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.2em] text-muted">
            {copy.settings.length}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {([50, 100] as const).map((option) => (
              <button
                key={option}
                type="button"
                disabled={rolling || moving}
                onClick={() => applySettings(edition, option)}
                aria-pressed={length === option}
                className={`cursor-pointer rounded-lg px-2 py-1.5 text-[11px] font-bold transition-colors disabled:cursor-default ${
                  length === option
                    ? "bg-accent text-white"
                    : "border border-card-border text-muted-strong"
                }`}
              >
                {option === 50 ? copy.settings.squares50 : copy.settings.squares100}
              </button>
            ))}
          </div>
        </div>

        <div className="card rounded-2xl p-4 text-center">
          <div className="dice-scene mx-auto flex h-[86px] w-[86px] items-center justify-center">
            <div className="dice" style={{ transform: dieTransform || undefined }}>
              {[1, 2, 3, 4, 5, 6].map((face) => (
                <div key={face} className={`dice-face dice-face-${face}`}>
                  {rolling ? "•" : face}
                </div>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={rollDie}
            disabled={rolling || moving || pending !== null || finished}
            className="mt-3 w-full cursor-pointer rounded-xl bg-accent px-3 py-2.5 text-sm font-bold text-white disabled:cursor-default disabled:opacity-50"
          >
            {rolling ? copy.actions.rolling : copy.actions.roll}
          </button>
          <button
            type="button"
            onClick={() => resetBoard()}
            className="mt-2 w-full cursor-pointer rounded-xl border border-card-border px-3 py-2 text-[11px] font-bold text-muted-strong"
          >
            {copy.settings.restart}
          </button>
        </div>

        <div className="card rounded-2xl p-4 text-xs">
          <dl className="space-y-1.5">
            <div className="flex justify-between">
              <dt className="text-muted">{copy.status.position}</dt>
              <dd className="font-bold text-foreground">
                {position} / {length}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">{copy.status.fails}</dt>
              <dd className="font-bold text-[#ff8399]">{fails}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">{copy.status.bounces}</dt>
              <dd className="font-bold text-foreground">{bounces} / 3</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="shrink-0 text-muted">{copy.status.rule}</dt>
              <dd className="text-right font-bold text-[#b8a4ff]">
                {rule ? `${rule.rollsLeft} ${copy.status.ruleLeft}` : copy.status.noRule}
              </dd>
            </div>
          </dl>
          {rule ? (
            <p className="mt-2 rounded-lg bg-[#b8a4ff]/10 px-2 py-1.5 text-[11px] text-[#b8a4ff]">
              {rule.text}
            </p>
          ) : null}
        </div>
      </div>

      <div className="min-w-0">
        <div className="card rounded-2xl p-3 sm:p-4">
          <div className="overflow-x-auto">
            <div className="grid min-w-[620px] grid-cols-10 gap-1">
              {orderedSquares.map((square) => {
                const active = square.n === position;
                return (
                  <div
                    key={square.n}
                    className={`relative flex aspect-square flex-col items-center justify-center rounded-md text-[10px] font-bold ${KIND_STYLE[square.kind]} ${
                      active ? "ring-2 ring-white/80" : ""
                    }`}
                    title={`${square.n} · ${copy.legend[square.kind]}`}
                  >
                    <span>{square.n}</span>
                    <span className="text-[8px] opacity-80">
                      {KIND_GLYPH[square.kind]}
                    </span>
                    {active ? (
                      <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-white shadow" />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-muted">
          {(
            [
              "task",
              "edge",
              "rest",
              "tough",
              "rule",
              "ladder",
              "snake",
              "temptation",
              "card",
              "back",
              "finish",
            ] as const
          ).map((kind) => (
            <span key={kind} className="flex items-center gap-1.5">
              <span
                className={`inline-flex h-3 w-3 items-center justify-center rounded-sm text-[7px] ${KIND_STYLE[kind]}`}
              >
                {KIND_GLYPH[kind]}
              </span>
              {copy.legend[kind]}
            </span>
          ))}
        </div>
      </div>

      {pending ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-3xl border border-card-border bg-background-elevated p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
              {pending.kind === "command"
                ? copy.prompts.command
                : pending.kind === "ladder"
                  ? copy.prompts.ladder
                  : pending.kind === "snake"
                    ? copy.prompts.snake
                    : pending.kind === "back"
                      ? copy.prompts.back
                      : copy.prompts.card}
            </p>
            <p className="mt-1 text-xs text-muted">
              {copy.prompts.landed} {pending.square}
              {pending.kind === "command" && pending.commandKind
                ? ` · ${copy.legend[pending.commandKind]}`
                : ""}
            </p>

            <p className="mt-3 text-sm leading-relaxed text-foreground">
              {pending.kind === "card" ? pending.card?.text : pending.text}
            </p>

            <div className="mt-5 flex flex-col gap-2">
              {pending.kind === "command" ? (
                <>
                  <button
                    type="button"
                    onClick={completeCommand}
                    className="cursor-pointer rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-white"
                  >
                    {copy.actions.done}
                  </button>
                  <button
                    type="button"
                    onClick={failCommand}
                    className="cursor-pointer rounded-xl border border-[#ff4d6d]/40 px-4 py-2.5 text-sm font-bold text-[#ff8399]"
                  >
                    {commandFailureLabel}
                  </button>
                </>
              ) : null}

              {pending.kind === "ladder" ? (
                <>
                  <button
                    type="button"
                    onClick={passLadder}
                    className="cursor-pointer rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-white"
                  >
                    {copy.actions.passed}
                  </button>
                  <button
                    type="button"
                    onClick={failLadder}
                    className="cursor-pointer rounded-xl border border-[#ff4d6d]/40 px-4 py-2.5 text-sm font-bold text-[#ff8399]"
                  >
                    {copy.actions.couldnt}
                  </button>
                </>
              ) : null}

              {pending.kind === "snake" ? (
                <button
                  type="button"
                  onClick={continueSnake}
                  className="cursor-pointer rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-white"
                >
                  {copy.actions.continue}
                </button>
              ) : null}

              {pending.kind === "back" ? (
                <>
                  <button
                    type="button"
                    onClick={() => resolveBack(true)}
                    className="cursor-pointer rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-white"
                  >
                    {copy.actions.held}
                  </button>
                  <button
                    type="button"
                    onClick={() => resolveBack(false)}
                    className="cursor-pointer rounded-xl border border-[#ff4d6d]/40 px-4 py-2.5 text-sm font-bold text-[#ff8399]"
                  >
                    {copy.actions.couldnt}
                  </button>
                </>
              ) : null}

              {pending.kind === "card" ? (
                <button
                  type="button"
                  onClick={applyCard}
                  className="cursor-pointer rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-white"
                >
                  {copy.actions.apply}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {finished ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-3xl border border-card-border bg-background-elevated p-6 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
              {copy.verdict.finished}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-foreground">
              {copy.verdict.title}
            </h2>
            <p className="mt-1 text-xs text-muted">
              {copy.verdict.fails}: {fails}
            </p>
            <p className="mt-4 font-display text-2xl text-accent">
              {withEdition(verdict, edition, locale)}
            </p>

            {verdict === copy.verdict.dieDecides && verdictDie === null ? (
              <>
                <p className="mt-2 text-xs text-muted">
                  {withEdition(copy.verdict.verdictDie, edition, locale)}
                </p>
                <button
                  type="button"
                  onClick={() => setVerdictDie(1 + Math.floor(Math.random() * 6))}
                  className="mt-3 cursor-pointer rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-white"
                >
                  {copy.actions.rollVerdict}
                </button>
              </>
            ) : null}

            {verdict === copy.verdict.dieDecides && verdictDie !== null ? (
              <p className="mt-3 text-sm font-bold text-foreground">
                {withEdition(
                  verdictDie % 2 === 0 ? copy.verdict.even : copy.verdict.odd,
                  edition,
                  locale,
                )}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => resetBoard()}
              className="mt-5 cursor-pointer rounded-xl border border-card-border px-4 py-2.5 text-sm font-bold text-foreground"
            >
              {copy.verdict.playAgain}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
